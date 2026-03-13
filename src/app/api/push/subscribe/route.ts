import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SubscriptionKeys = {
  p256dh: string;
  auth: string;
};

type PushSubscriptionDTO = {
  endpoint: string;
  expirationTime: number | null;
  keys: SubscriptionKeys;
};

function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration for push subscriptions.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PushSubscriptionDTO | null;

    if (!body || !body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
    }

    const supabase = getAdminSupabaseClient();

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("push/subscribe Supabase error:", error.message);
      }
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("push/subscribe error:", error);
    }
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}

