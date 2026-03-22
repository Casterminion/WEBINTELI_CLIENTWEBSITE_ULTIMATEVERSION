"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Loader2, Check, Calendar, ListTodo } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";

type TaskRow = {
  id: string;
  lead_id: string;
  assigned_to: string;
  due_date: string;
  task_type: string;
  completed_at: string | null;
  created_at: string;
  lead_name: string | null;
  lead_email: string | null;
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

type ViewMode = "all" | "today" | "upcoming";

export default function TasksPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("today");

  useEffect(() => {
    const load = async () => {
      const { data: tasksData, error: tasksErr } = await supabase
        .from("tasks")
        .select("id, lead_id, assigned_to, due_date, task_type, completed_at, created_at")
        .order("due_date", { ascending: true });
      if (tasksErr) {
        setError(tasksErr.message);
        setTasks([]);
        setLoading(false);
        return;
      }
      const rows = (tasksData ?? []) as TaskRow[];
      if (rows.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }
      const leadIds = [...new Set(rows.map((r) => r.lead_id))];
      const { data: leadsData } = await supabase
        .from("intake_submissions")
        .select("id, name, email")
        .in("id", leadIds);
      const leadMap = new Map(
        (leadsData ?? []).map((l: { id: string; name: string; email: string }) => [l.id, { name: l.name, email: l.email }])
      );
      const withLead = rows.map((t) => ({
        ...t,
        lead_name: leadMap.get(t.lead_id)?.name ?? null,
        lead_email: leadMap.get(t.lead_id)?.email ?? null,
      }));
      setTasks(withLead);
      setLoading(false);
    };
    void load();
  }, []);

  const filteredTasks = useMemo(() => {
    const today = todayISODate();
    if (viewMode === "today") return tasks.filter((t) => t.due_date === today);
    if (viewMode === "upcoming") return tasks.filter((t) => t.due_date >= today);
    return tasks;
  }, [tasks, viewMode]);

  const toggleComplete = async (taskId: string, completed: boolean) => {
    const { error: err } = await supabase
      .from("tasks")
      .update({ completed_at: completed ? new Date().toISOString() : null })
      .eq("id", taskId);
    if (!err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed_at: completed ? new Date().toISOString() : null } : t
        )
      );
    }
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("lt-LT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
            {t.admin?.tasks ?? "Tasks"}
          </h1>
          <p className="mt-0.5 max-w-xl text-xs" style={{ color: "var(--admin-text-muted)" }}>
            {t.admin?.tasksDescription ?? "All follow-up and other tasks. Click a row to open the lead."}
          </p>
        </div>
        <div className="admin-metric flex items-center gap-4 rounded-md px-4 py-2.5 tabular-nums">
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
            {t.admin?.total ?? "Total"}
          </span>
          <span className="text-xl font-semibold">
            {filteredTasks.length}
          </span>
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-panel)",
        }}
      >
        <span className="text-[10px] font-medium uppercase tracking-wider mr-2" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.view ?? "View"}:</span>
        <button
          type="button"
          onClick={() => setViewMode("today")}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors"
          style={{
            borderColor: viewMode === "today" ? "var(--admin-accent)" : "var(--admin-border)",
            background: viewMode === "today" ? "var(--admin-accent-dim)" : "transparent",
            color: viewMode === "today" ? "var(--admin-accent)" : "var(--admin-text-muted)",
          }}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t.admin?.today ?? "Today"}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("upcoming")}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors"
          style={{
            borderColor: viewMode === "upcoming" ? "var(--admin-accent)" : "var(--admin-border)",
            background: viewMode === "upcoming" ? "var(--admin-accent-dim)" : "transparent",
            color: viewMode === "upcoming" ? "var(--admin-accent)" : "var(--admin-text-muted)",
          }}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t.admin?.upcoming ?? "Upcoming"}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("all")}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors"
          style={{
            borderColor: viewMode === "all" ? "var(--admin-accent)" : "var(--admin-border)",
            background: viewMode === "all" ? "var(--admin-accent-dim)" : "transparent",
            color: viewMode === "all" ? "var(--admin-accent)" : "var(--admin-text-muted)",
          }}
        >
          <ListTodo className="h-3.5 w-3.5" />
          {t.admin?.allTasks ?? "All tasks"}
        </button>
      </div>

      <section
        className="rounded-md border overflow-hidden"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-panel)",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 px-5 py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
            <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.loadingTasks ?? "Loading tasks…"}</p>
          </div>
        ) : error ? (
          <div className="px-5 py-16 text-sm" style={{ color: "var(--admin-accent)" }}>{error}</div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-16">
            <Inbox className="h-12 w-12" style={{ color: "var(--admin-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
              {tasks.length === 0 ? (t.admin?.noTasks ?? "No tasks yet.") : (viewMode === "today" ? (t.admin?.noTasksToday ?? "No tasks in today.") : (t.admin?.noTasksUpcoming ?? "No tasks in upcoming."))}
            </p>
          </div>
        ) : (
          <>
            {/* ── MOBILE CARDS (below md) ── */}
            <div className="md:hidden divide-y" style={{ borderColor: "var(--admin-border)" }}>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="px-4 py-4"
                  style={{ borderBottomColor: "var(--admin-border)" }}
                >
                  {/* Top: lead name + email + done toggle */}
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => toggleComplete(task.id, !task.completed_at)}
                      className="shrink-0 flex h-6 w-6 items-center justify-center rounded border transition-colors mt-0.5"
                      style={{
                        borderColor: "var(--admin-border)",
                        background: task.completed_at ? "var(--admin-success)" : "transparent",
                        color: task.completed_at ? "#000" : "var(--admin-text-muted)",
                      }}
                    >
                      {task.completed_at ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{
                          color: "var(--admin-text)",
                          opacity: task.completed_at ? 0.5 : 1,
                          textDecoration: task.completed_at ? "line-through" : "none",
                        }}
                      >
                        {task.lead_name ?? "—"}
                      </p>
                      {task.lead_email && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--admin-text-muted)" }}>
                          {task.lead_email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: label-value data */}
                  <div
                    className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md px-3 py-2.5 mb-3"
                    style={{ background: "var(--admin-bg)", border: "1px solid var(--admin-border)" }}
                  >
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.dueDate ?? "Due date"}</p>
                      <p className="text-xs tabular-nums" style={{ color: "var(--admin-text)" }}>{formatDate(task.due_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.type ?? "Type"}</p>
                      <p className="text-xs capitalize" style={{ color: "var(--admin-text)" }}>{task.task_type.replace("_", " ")}</p>
                    </div>
                  </div>

                  {/* Bottom: open lead action */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/leads/${task.lead_id}`)}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ background: "var(--admin-accent)", color: "#ffffff" }}
                    >
                      {t.admin?.openLead ?? "Open Lead"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── DESKTOP TABLE (md and up) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--admin-text-muted)", background: "var(--admin-bg)" }}
                  >
                    <th className="px-4 py-2.5 w-10">{t.admin?.done ?? "Done"}</th>
                    <th className="px-4 py-2.5">{t.admin?.dueDate ?? "Due date"}</th>
                    <th className="px-4 py-2.5">{t.admin?.lead ?? "Lead"}</th>
                    <th className="px-4 py-2.5">{t.admin?.type ?? "Type"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="admin-table-row cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid var(--admin-border)" }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button")) return;
                        router.push(`/admin/leads/${task.lead_id}`);
                      }}
                    >
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleComplete(task.id, !task.completed_at)}
                          className="flex h-5 w-5 items-center justify-center rounded border transition-colors"
                          style={{
                            borderColor: "var(--admin-border)",
                            background: task.completed_at ? "var(--admin-success)" : "transparent",
                            color: task.completed_at ? "#000" : "var(--admin-text-muted)",
                          }}
                        >
                          {task.completed_at ? <Check className="h-3 w-3" /> : null}
                        </button>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-sm" style={{ color: "var(--admin-text)" }}>
                        {formatDate(task.due_date)}
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium text-sm" style={{ color: "var(--admin-text)" }}>{task.lead_name ?? "—"}</span>
                        {task.lead_email && (
                          <span className="ml-1.5 text-xs" style={{ color: "var(--admin-text-muted)" }}>{task.lead_email}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 capitalize text-sm" style={{ color: "var(--admin-text-muted)" }}>
                        {task.task_type.replace("_", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
