import type { SupabaseClient } from "@supabase/supabase-js";

/** Same sequence as legacy claim / add-lead: next 7 days then +10..+28 offsets from local midnight “today”. */
export function getFollowUpDueDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  for (const offset of [10, 13, 16, 19, 22, 25, 28]) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Calendar date string aligned with existing tasks / my-leads filters (UTC). */
export function todayISODateUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Mark all tasks for this lead due today as completed. */
export async function completeTodayTasksForLead(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ error: Error | null }> {
  const today = todayISODateUtc();
  const now = new Date().toISOString();
  const { data: rows, error: fetchErr } = await supabase
    .from("tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("due_date", today)
    .is("completed_at", null);
  if (fetchErr) return { error: new Error(fetchErr.message) };
  const ids = (rows ?? []).map((r: { id: string }) => r.id);
  if (ids.length === 0) return { error: null };
  const { error: upErr } = await supabase.from("tasks").update({ completed_at: now }).in("id", ids);
  if (upErr) return { error: new Error(upErr.message) };
  return { error: null };
}

/**
 * If there is no open follow-up with due_date strictly after today, insert one.
 * Picks the first date from getFollowUpDueDates() that is > today and not already used for this lead;
 * if all are taken, uses max(existing due_date, today) + 1 calendar day.
 */
export async function ensureNextOpenFollowUpTask(
  supabase: SupabaseClient,
  leadId: string,
  assignedToUserId: string
): Promise<{ error: Error | null }> {
  const today = todayISODateUtc();

  const { data: openFuture, error: e1 } = await supabase
    .from("tasks")
    .select("id")
    .eq("lead_id", leadId)
    .is("completed_at", null)
    .gt("due_date", today)
    .limit(1);
  if (e1) return { error: new Error(e1.message) };
  if (openFuture?.length) return { error: null };

  const { data: existing, error: e2 } = await supabase.from("tasks").select("due_date").eq("lead_id", leadId);
  if (e2) return { error: new Error(e2.message) };
  const existingDates = new Set((existing ?? []).map((t: { due_date: string }) => t.due_date));

  const candidates = getFollowUpDueDates();
  let picked: string | null = null;
  for (const d of candidates) {
    if (d > today && !existingDates.has(d)) {
      picked = d;
      break;
    }
  }

  if (!picked) {
    let maxDue = today;
    for (const row of existing ?? []) {
      if (row.due_date > maxDue) maxDue = row.due_date;
    }
    picked = addDaysToISODate(maxDue, 1);
  }

  const { error: e3 } = await supabase.from("tasks").insert({
    lead_id: leadId,
    assigned_to: assignedToUserId,
    due_date: picked,
    task_type: "follow_up",
  });
  if (e3) return { error: new Error(e3.message) };
  return { error: null };
}
