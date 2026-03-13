import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type NewLeadPayload = {
  id: string;
  name: string;
  city: string | null;
  service: string | null;
  created_at: string;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration for push notifications.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function verifySignature(request: NextRequest): boolean {
  const expected = process.env.PUSH_WEBHOOK_SECRET;
  if (!expected) return true;
  const received = request.headers.get("x-webinteli-signature");
  return !!received && received === expected;
}

export async function POST(request: NextRequest) {
  if (!verifySignature(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const contact = process.env.WEB_PUSH_CONTACT || "mailto:kontaktai@webinteli.lt";

  if (!publicKey || !privateKey) {
    if (process.env.NODE_ENV === "development") {
      console.error("WEB_PUSH_PUBLIC_KEY or WEB_PUSH_PRIVATE_KEY not configured.");
    }
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);

  let payload: NewLeadPayload;
  try {
    payload = (await request.json()) as NewLeadPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("notify-new-lead Supabase error:", error.message);
    }
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 }, { status: 200 });
  }

  const notificationTitle = payload.name ? `New lead: ${payload.name}` : "New lead";
  const parts: string[] = [];
  if (payload.city) parts.push(payload.city);
  if (payload.service) parts.push(payload.service);
  const body = parts.length ? parts.join(" · ") : "New client request received.";
  const url = `/admin/leads/${payload.id}`;

  const jsonPayload = JSON.stringify({
    title: notificationTitle,
    body,
    url,
    tag: payload.id,
  });

  const toDelete: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint as string,
        keys: {
          p256dh: sub.p256dh as string,
          auth: sub.auth as string,
        },
      };
      try {
        await webpush.sendNotification(pushSub as any, jsonPayload);
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          toDelete.push(sub.id as string);
        } else if (process.env.NODE_ENV === "development") {
          console.error("Error sending push notification", err);
        }
      }
    })
  );

  if (toDelete.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", toDelete);
  }

  return NextResponse.json({ ok: true, sent: subscriptions.length }, { status: 200 });
}

