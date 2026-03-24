import type { SupabaseClient } from "@supabase/supabase-js";

/** Local calendar YYYY-MM-DD (for `<input type="date">`). */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Default next-day follow-up date in local calendar. */
export function defaultNextFollowUpLocalISODate(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return toLocalISODate(t);
}

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

/** Open follow-ups whose due date is before today (UTC) — incomplete stale reminders. */
export async function deleteStaleOpenFollowUpTasks(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ error: Error | null }> {
  const today = todayISODateUtc();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("lead_id", leadId)
    .eq("task_type", "follow_up")
    .is("completed_at", null)
    .lt("due_date", today);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

/**
 * After saving a manual follow-up: drop all auto follow-ups for this lead, and any other open manual ones.
 * Keeps `keepTaskId` plus completed manual rows (history).
 */
export async function pruneFollowUpsAfterManualSchedule(
  supabase: SupabaseClient,
  leadId: string,
  keepTaskId: string
): Promise<{ error: Error | null }> {
  const { error: e1 } = await supabase
    .from("tasks")
    .delete()
    .eq("lead_id", leadId)
    .eq("task_type", "follow_up")
    .neq("id", keepTaskId)
    .eq("creation_source", "auto");

  if (e1) return { error: new Error(e1.message) };

  const { error: e2 } = await supabase
    .from("tasks")
    .delete()
    .eq("lead_id", leadId)
    .eq("task_type", "follow_up")
    .neq("id", keepTaskId)
    .eq("creation_source", "manual")
    .is("completed_at", null);

  return { error: e2 ? new Error(e2.message) : null };
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
  const { data: leadRow, error: leadErr } = await supabase
    .from("intake_submissions")
    .select("status")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr) return { error: new Error(leadErr.message) };
  if (leadRow?.status === "lost") return { error: null };

  const stale = await deleteStaleOpenFollowUpTasks(supabase, leadId);
  if (stale.error) return stale;

  const today = todayISODateUtc();

  const { data: openDueTodayOrFuture, error: e1 } = await supabase
    .from("tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("task_type", "follow_up")
    .is("completed_at", null)
    .gte("due_date", today)
    .limit(1);
  if (e1) return { error: new Error(e1.message) };
  if (openDueTodayOrFuture?.length) return { error: null };

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
    creation_source: "auto",
  });
  if (e3) return { error: new Error(e3.message) };
  return { error: null };
}
