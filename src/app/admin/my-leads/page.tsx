"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Loader2, Search, Plus, X, Filter, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_owner_name: string | null;
  city: string;
  industry: string;
  service: string;
  package_price_display: string;
  status: string;
  claimed_at: string | null;
  created_at: string;
  outreach_email: string | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "called", label: "Called" },
  { value: "emailed", label: "Emailed" },
  { value: "loom_sent", label: "Sent loom video" },
  { value: "sold", label: "Sold" },
];

const SERVICE_OPTIONS = ["SEO", "PPC", "Content", "Other"];

const OUTREACH_EMAIL_OPTIONS = [
  "arijus@webinteli.lt",
  "joris@webinteli.lt",
] as const;
const DEFAULT_OUTREACH_EMAIL = OUTREACH_EMAIL_OPTIONS[0];

function getFollowUpDueDates(): string[] {
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

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MyLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [todayLeadIds, setTodayLeadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [followUpToday, setFollowUpToday] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadSubmitting, setAddLeadSubmitting] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    business_owner_name: "",
    service: "SEO",
    outreach_email: DEFAULT_OUTREACH_EMAIL,
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const [leadsRes, tasksRes] = await Promise.all([
        supabase
          .from("intake_submissions")
          .select("id, name, email, phone, business_owner_name, city, industry, service, package_price_display, status, claimed_at, created_at, outreach_email")
          .eq("assigned_to", user.id)
          .neq("status", "lost")
          .order("claimed_at", { ascending: false }),
        supabase
          .from("tasks")
          .select("lead_id")
          .eq("assigned_to", user.id)
          .eq("due_date", todayISODate())
          .is("completed_at", null),
      ]);
      if (leadsRes.error) {
        setError(leadsRes.error.message);
        setLeads([]);
      } else {
        setLeads((leadsRes.data as Lead[]) ?? []);
      }
      if (!tasksRes.error && tasksRes.data) {
        setTodayLeadIds(new Set((tasksRes.data as { lead_id: string }[]).map((t) => t.lead_id)));
      } else {
        setTodayLeadIds(new Set());
      }
      setLoading(false);
    };
    void load();
  }, []);

  const servicesFromData = useMemo(
    () => Array.from(new Set(leads.map((l) => l.service).filter(Boolean))).sort(),
    [leads]
  );

  const filtered = useMemo(() => {
    let list = leads;
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((l) => {
        const haystack = [l.name, l.email, l.phone, l.business_owner_name].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(term);
      });
    }
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    if (serviceFilter !== "all") list = list.filter((l) => l.service === serviceFilter);
    if (followUpToday) list = list.filter((l) => todayLeadIds.has(l.id));
    return list;
  }, [leads, search, statusFilter, serviceFilter, followUpToday, todayLeadIds]);

  const handleAddLead = async () => {
    const { name, email, service } = addLeadForm;
    if (!name.trim() || !email.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setAddLeadSubmitting(true);
    const { data: inserted, error: insertErr } = await supabase
      .from("intake_submissions")
      .insert({
        name: name.trim(),
        email: email.trim(),
        phone: addLeadForm.phone.trim() || null,
        business_owner_name: addLeadForm.business_owner_name.trim() || null,
        city: "—",
        industry: "—",
        package_slug: "manual",
        package_price_display: "",
        service: service || "SEO",
        outreach_email: addLeadForm.outreach_email || null,
        assigned_to: user.id,
        status: "new",
        claimed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insertErr) {
      setError(insertErr.message);
      setAddLeadSubmitting(false);
      return;
    }
    const leadId = (inserted as { id: string }).id;
    const dueDates = getFollowUpDueDates();
    const taskRows = dueDates.map((due_date) => ({
      lead_id: leadId,
      assigned_to: user.id,
      due_date,
      task_type: "follow_up",
    }));
    const { error: taskErr } = await supabase.from("tasks").insert(taskRows);
    if (taskErr) {
      setError(taskErr.message);
      setAddLeadSubmitting(false);
      return;
    }
    setAddLeadForm({ name: "", email: "", phone: "", business_owner_name: "", service: "SEO", outreach_email: DEFAULT_OUTREACH_EMAIL });
    setAddLeadOpen(false);
    setAddLeadSubmitting(false);
    setError(null);
    const { data: refreshed } = await supabase
      .from("intake_submissions")
      .select("id, name, email, phone, business_owner_name, city, industry, service, package_price_display, status, claimed_at, created_at, outreach_email")
      .eq("assigned_to", user.id)
      .neq("status", "lost")
      .order("claimed_at", { ascending: false });
    setLeads((refreshed as Lead[]) ?? []);
    setTodayLeadIds((prev) => new Set([...prev, leadId]));
  };

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("lt-LT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const formatStatus = (status: string) => {
    if (status === "loom_sent") return "Sent loom video";
    if (status === "sold") return "Sold";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const openDeleteConfirm = useCallback((e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(leadId);
  }, []);

  const performDelete = useCallback(async () => {
    const id = deleteConfirmId;
    if (!id) return;
    setDeletingId(id);
    setError(null);
    const { data: deleted, error: err } = await supabase
      .from("intake_submissions")
      .delete()
      .eq("id", id)
      .select("id");
    setDeletingId(null);
    setDeleteConfirmId(null);
    if (err) {
      setError(err.message || "Failed to delete.");
      return;
    }
    if (!deleted?.length) {
      setError("Delete was not allowed. You may need to be logged in.");
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTodayLeadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [deleteConfirmId]);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={closeDeleteConfirm}
        onConfirm={performDelete}
        title="Delete lead?"
        message="This lead and its follow-up tasks will be removed. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deletingId === deleteConfirmId}
      />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
            My leads
          </h1>
          <p className="mt-0.5 max-w-xl text-xs" style={{ color: "var(--admin-text-muted)" }}>
            Leads assigned to you. Click a row to open the lead.
          </p>
        </div>
        <div className="admin-metric flex items-center gap-4 rounded-md px-4 py-2.5 tabular-nums">
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
            Total
          </span>
          <span className="text-xl font-semibold">
            {filtered.length}
          </span>
        </div>
      </header>

      <section
        className="rounded-md border overflow-hidden"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-panel)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors hover:bg-[var(--admin-bg-elevated)]"
            style={{
              borderColor: filtersOpen ? "var(--admin-accent)" : "var(--admin-border)",
              background: filtersOpen ? "var(--admin-accent-dim)" : "transparent",
              color: filtersOpen ? "var(--admin-accent)" : "var(--admin-text-muted)",
            }}
          >
            <Filter className="h-3.5 w-3.5 shrink-0" />
            Filters
            {(search || statusFilter !== "all" || serviceFilter !== "all" || followUpToday) && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "var(--admin-accent-dim)", color: "var(--admin-accent)" }}>
                Active
              </span>
            )}
            {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
          </button>
          <button
            type="button"
            onClick={() => setAddLeadOpen(true)}
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--admin-accent)",
              color: "#ffffff",
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add lead
          </button>
        </div>
        {filtersOpen && (
          <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: "var(--admin-border)" }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--admin-text-muted)" }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, email, phone…"
                    className="admin-input w-full rounded-lg py-2 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>Service</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All services</option>
                  {servicesFromData.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {SERVICE_OPTIONS.filter((s) => !servicesFromData.includes(s)).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer py-2" style={{ color: "var(--admin-text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={followUpToday}
                    onChange={(e) => setFollowUpToday(e.target.checked)}
                    className="rounded border"
                    style={{ borderColor: "var(--admin-border)" }}
                  />
                  Follow up today
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      {addLeadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => !addLeadSubmitting && setAddLeadOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-md border p-5"
            style={{
              borderColor: "var(--admin-border)",
              background: "var(--admin-panel)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--admin-text)" }}>Add lead</h2>
              <button
                type="button"
                onClick={() => !addLeadSubmitting && setAddLeadOpen(false)}
                className="p-1 rounded"
                style={{ color: "var(--admin-text-muted)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); handleAddLead(); }}
            >
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Name *</label>
                <input
                  type="text"
                  value={addLeadForm.name}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  placeholder="Lead name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Email *</label>
                <input
                  type="email"
                  value={addLeadForm.email}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Phone</label>
                <input
                  type="tel"
                  value={addLeadForm.phone}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, phone: e.target.value }))}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  placeholder="+370..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Business owner name</label>
                <input
                  type="text"
                  value={addLeadForm.business_owner_name}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, business_owner_name: e.target.value }))}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  placeholder="Owner name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Service *</label>
                <select
                  value={addLeadForm.service}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, service: e.target.value }))}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  {SERVICE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Sent from email</label>
                <select
                  value={addLeadForm.outreach_email}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, outreach_email: e.target.value }))}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  {OUTREACH_EMAIL_OPTIONS.map((addr) => (
                    <option key={addr} value={addr}>{addr}</option>
                  ))}
                </select>
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
                  Which email you used for this cold outreach (for your reference).
                </p>
              </div>
              {error && <p className="text-sm" style={{ color: "var(--admin-accent)" }}>{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={addLeadSubmitting}
                  className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--admin-accent)", color: "var(--admin-bg)" }}
                >
                  {addLeadSubmitting ? "Adding…" : "Add lead & create follow-ups"}
                </button>
                <button
                  type="button"
                  onClick={() => !addLeadSubmitting && setAddLeadOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-muted)" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section
        className="flex flex-col rounded-md border overflow-hidden"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-panel)",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 px-5 py-16 self-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
            <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>Loading…</p>
          </div>
        ) : error && !addLeadOpen ? (
          <div className="px-5 py-16 text-sm" style={{ color: "var(--admin-accent)" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-16">
            <Inbox className="h-12 w-12" style={{ color: "var(--admin-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
              {leads.length === 0 ? "No leads assigned to you." : "No leads match your filters."}
            </p>
          </div>
        ) : (
          <>
            {/* ── MOBILE CARDS (below md) ── */}
            <div className="md:hidden divide-y" style={{ borderColor: "var(--admin-border)" }}>
              {filtered.map((lead) => (
                <div key={lead.id} className="px-4 py-4" style={{ borderBottomColor: "var(--admin-border)" }}>
                  {/* Top: name + email */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--admin-text)" }}>
                        {lead.name}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--admin-text-muted)" }}>
                        {lead.email}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5"
                      style={{
                        background: "var(--admin-accent-dim)",
                        color: "var(--admin-accent)",
                      }}
                    >
                      {formatStatus(lead.status)}
                    </span>
                  </div>

                  {/* Middle: label-value grid */}
                  <div
                    className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md px-3 py-2.5 mb-3"
                    style={{ background: "var(--admin-bg)", border: "1px solid var(--admin-border)" }}
                  >
                    {([
                      ["City", lead.city],
                      ["Service", lead.service],
                      ["Phone", lead.phone || "—"],
                      ["Owner", lead.business_owner_name || "—"],
                      ...(lead.outreach_email ? [["From", lead.outreach_email]] as [string, string][] : []),
                    ] as [string, string][]).map(([label, val]) => (
                      <div key={label}>
                        <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: "var(--admin-text-muted)" }}>
                          {label}
                        </p>
                        <p className="text-xs" style={{ color: "var(--admin-text)" }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bottom: claimed date + actions */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] tabular-nums" style={{ color: "var(--admin-text-muted)" }}>
                      {formatDate(lead.claimed_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => openDeleteConfirm(e, lead.id)}
                        disabled={deletingId === lead.id}
                        className="inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 hover:bg-red-500/10 hover:text-red-500"
                        style={{ color: "var(--admin-text-muted)" }}
                        title="Delete"
                      >
                        {deletingId === lead.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/leads/${lead.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ background: "var(--admin-accent)", color: "#ffffff" }}
                      >
                        Open Lead
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── DESKTOP TABLE (md and up) ── */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="min-w-full text-sm" style={{ tableLayout: "auto" }}>
                <thead>
                  <tr
                    className="text-left text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--admin-text-muted)", background: "var(--admin-bg)" }}
                  >
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5 hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-2.5 hidden md:table-cell">Business owner</th>
                    <th className="px-4 py-2.5">City</th>
                    <th className="px-4 py-2.5">Service</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Claimed</th>
                    <th className="w-12 px-4 py-2.5 text-right" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      className="admin-table-row cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid var(--admin-border)" }}
                      onClick={() => router.push(`/admin/leads/${lead.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/admin/leads/${lead.id}`);
                        }
                      }}
                    >
                      <td className="px-4 py-2 font-medium text-sm" style={{ color: "var(--admin-text)" }}>{lead.name}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: "var(--admin-text-muted)" }}>{lead.email}</td>
                      <td className="px-4 py-2 hidden sm:table-cell tabular-nums text-sm" style={{ color: "var(--admin-text)" }}>{lead.phone || "—"}</td>
                      <td className="px-4 py-2 hidden md:table-cell text-sm" style={{ color: "var(--admin-text)" }}>{lead.business_owner_name || "—"}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: "var(--admin-text)" }}>{lead.city}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: "var(--admin-text)" }}>{lead.service}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: "var(--admin-text)" }}>{formatStatus(lead.status)}</td>
                      <td className="px-4 py-2 text-xs tabular-nums whitespace-nowrap" style={{ color: "var(--admin-text-muted)" }}>
                        {formatDate(lead.claimed_at)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => openDeleteConfirm(e, lead.id)}
                          disabled={deletingId === lead.id}
                          className="inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 hover:bg-red-500/10 hover:text-red-500"
                          style={{ color: "var(--admin-text-muted)" }}
                          title="Delete"
                          aria-label="Delete lead"
                        >
                          {deletingId === lead.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
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
