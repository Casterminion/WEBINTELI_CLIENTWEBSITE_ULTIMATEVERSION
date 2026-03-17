"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SERVICE_OPTIONS = ["SEO", "PPC", "Content", "Other"];

type EditForm = {
  name: string;
  email: string;
  phone: string;
  business_owner_name: string;
  city: string;
  industry: string;
  service: string;
  package_price_display: string;
};

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
  package_slug: string;
  created_at: string;
  assigned_to: string | null;
  status: string;
  loom_url: string | null;
  claimed_at: string | null;
  outreach_email: string | null;
};

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

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"called" | "emailed" | "loom_sent" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [markingLost, setMarkingLost] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    email: "",
    phone: "",
    business_owner_name: "",
    city: "",
    industry: "",
    service: "SEO",
    package_price_display: "",
  });

  const loadLead = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("intake_submissions")
      .select("*")
      .eq("id", id)
      .single();
    if (err) {
      setError(err.message || "Lead not found.");
      setLead(null);
    } else {
      setLead(data as Lead);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadLead();
  }, [loadLead]);

  const handleClaim = async () => {
    if (!id || !action) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitting(true);
    const dueDates = getFollowUpDueDates();
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("intake_submissions")
      .update({
        assigned_to: user.id,
        status: action,
        claimed_at: now,
      })
      .eq("id", id);
    if (updateErr) {
      setError(updateErr.message);
      setSubmitting(false);
      return;
    }
    const taskRows = dueDates.map((due_date) => ({
      lead_id: id,
      assigned_to: user.id,
      due_date,
      task_type: "follow_up",
    }));
    const { error: insertErr } = await supabase.from("tasks").insert(taskRows);
    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    router.push("/admin/my-leads");
  };

  const handleMarkLost = async () => {
    if (!id) return;
    setMarkingLost(true);
    const { error: err } = await supabase
      .from("intake_submissions")
      .update({ status: "lost" })
      .eq("id", id);
    if (err) setError(err.message);
    else await loadLead();
    setMarkingLost(false);
  };

  const handleMarkSold = async () => {
    if (!id) return;
    setMarkingSold(true);
    const { error: err } = await supabase
      .from("intake_submissions")
      .update({ status: "sold" })
      .eq("id", id);
    if (err) setError(err.message);
    else await loadLead();
    setMarkingSold(false);
  };

  const startEditing = useCallback(() => {
    if (!lead) return;
    setEditForm({
      name: lead.name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      business_owner_name: lead.business_owner_name ?? "",
      city: lead.city ?? "",
      industry: lead.industry ?? "",
      service: lead.service ?? "SEO",
      package_price_display: lead.package_price_display ?? "",
    });
    setError(null);
    setIsEditing(true);
  }, [lead]);

  const handleSaveEdit = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("intake_submissions")
      .update({
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        business_owner_name: editForm.business_owner_name.trim() || null,
        city: editForm.city.trim(),
        industry: editForm.industry.trim(),
        service: editForm.service.trim() || "SEO",
        package_price_display: editForm.package_price_display.trim(),
      })
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(err.message || "Failed to save.");
      return;
    }
    await loadLead();
    setIsEditing(false);
  };

  const formatDate = (value: string) => {
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

  if (!id) {
    return (
      <div className="space-y-6">
        <p style={{ color: "var(--admin-text-muted)" }}>Invalid lead ID.</p>
        <Link href="/admin/client-requests" className="text-sm" style={{ color: "var(--admin-accent)" }}>
          Back to Client Requests
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
        <p style={{ color: "var(--admin-text-muted)" }}>Loading lead…</p>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" style={{ color: "var(--admin-accent)" }} />
          <p style={{ color: "var(--admin-text)" }}>{error}</p>
        </div>
        <Link href="/admin/client-requests" className="text-sm" style={{ color: "var(--admin-accent)" }}>
          Back to Client Requests
        </Link>
      </div>
    );
  }

  const isUnclaimed = lead && (lead.status === "new" || !lead.status) && !lead.assigned_to;

  return (
    <div className="space-y-6">
      <section
        className="rounded-xl border overflow-hidden"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-panel)",
          boxShadow: "var(--admin-shadow)",
        }}
      >
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <Link
              href="/admin/client-requests"
              className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
              style={{ color: "var(--admin-text-muted)" }}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Back to Client Requests</span>
            </Link>
            {!isUnclaimed && !isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  borderColor: "var(--admin-border)",
                  color: "var(--admin-text)",
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Email *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Business owner</label>
                  <input
                    type="text"
                    value={editForm.business_owner_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, business_owner_name: e.target.value }))}
                    className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                    className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Industry</label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm((p) => ({ ...p, industry: e.target.value }))}
                    className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Service</label>
                  <select
                    value={editForm.service}
                    onChange={(e) => setEditForm((p) => ({ ...p, service: e.target.value }))}
                    className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    {SERVICE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--admin-text-muted)" }}>Package / price</label>
                  <input
                    type="text"
                    value={editForm.package_price_display}
                    onChange={(e) => setEditForm((p) => ({ ...p, package_price_display: e.target.value }))}
                    className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. 397 € / mėn."
                  />
                </div>
              </div>
              {error && <p className="text-sm" style={{ color: "var(--admin-accent)" }}>{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--admin-accent)", color: "var(--admin-bg)" }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setError(null); }}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-muted)" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-xl font-semibold" style={{ color: "var(--admin-text)" }}>
                {lead?.name}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--admin-text-muted)" }}>
                {lead?.email}
              </p>

              <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            {lead?.phone && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Phone</dt>
                <dd style={{ color: "var(--admin-text)" }}>{lead.phone}</dd>
              </div>
            )}
            {lead?.business_owner_name && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Business owner</dt>
                <dd style={{ color: "var(--admin-text)" }}>{lead.business_owner_name}</dd>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>City</dt>
              <dd style={{ color: "var(--admin-text)" }}>{lead?.city}</dd>
            </div>
            {lead?.outreach_email && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Sent from email</dt>
                <dd style={{ color: "var(--admin-text)" }}>{lead.outreach_email}</dd>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Industry</dt>
              <dd style={{ color: "var(--admin-text)" }}>{lead?.industry}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Service</dt>
              <dd style={{ color: "var(--admin-text)" }}>{lead?.service}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Package</dt>
              <dd style={{ color: "var(--admin-text)" }}>{lead?.package_price_display || lead?.package_slug || "—"}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Submitted</dt>
              <dd style={{ color: "var(--admin-text)" }}>{lead?.created_at ? formatDate(lead.created_at) : "—"}</dd>
            </div>
            {lead?.claimed_at && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Claimed</dt>
                <dd style={{ color: "var(--admin-text)" }}>{formatDate(lead.claimed_at)}</dd>
              </div>
            )}
            {lead?.status && lead.status !== "new" && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Status</dt>
              <dd style={{ color: "var(--admin-text)" }}>
                {lead.status === "loom_sent" ? "Sent loom video" : lead.status === "sold" ? "Sold" : lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </dd>
              </div>
            )}
          </dl>
            </>
          )}
        </div>

        {isUnclaimed ? (
          <div
            className="border-t px-6 py-6 space-y-5"
            style={{ borderColor: "var(--admin-border)" }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>
              Claim this lead: choose how you contacted them (required).
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAction("called")}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: action === "called" ? "var(--admin-accent)" : "var(--admin-border)",
                  background: action === "called" ? "var(--admin-accent-dim)" : "transparent",
                  color: action === "called" ? "var(--admin-accent)" : "var(--admin-text)",
                }}
              >
                Called
              </button>
              <button
                type="button"
                onClick={() => setAction("emailed")}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: action === "emailed" ? "var(--admin-accent)" : "var(--admin-border)",
                  background: action === "emailed" ? "var(--admin-accent-dim)" : "transparent",
                  color: action === "emailed" ? "var(--admin-accent)" : "var(--admin-text)",
                }}
              >
                Emailed
              </button>
              <button
                type="button"
                onClick={() => setAction("loom_sent")}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: action === "loom_sent" ? "var(--admin-accent)" : "var(--admin-border)",
                  background: action === "loom_sent" ? "var(--admin-accent-dim)" : "transparent",
                  color: action === "loom_sent" ? "var(--admin-accent)" : "var(--admin-text)",
                }}
              >
                Sent loom video
              </button>
            </div>
            {error && (
              <p className="text-sm" style={{ color: "var(--admin-accent)" }}>{error}</p>
            )}
            <button
              type="button"
              onClick={handleClaim}
              disabled={!action || submitting}
              className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "var(--admin-accent)",
                color: "var(--admin-bg)",
              }}
            >
              {submitting ? "Claiming…" : "Claim lead & create follow-ups"}
            </button>
          </div>
        ) : (
          <div
            className="border-t px-6 py-6 flex flex-col gap-4"
            style={{ borderColor: "var(--admin-border)" }}
          >
            {lead?.loom_url && (
              <div>
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>Loom</span>
                <a
                  href={lead.loom_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1 text-sm break-all"
                  style={{ color: "var(--admin-accent)" }}
                >
                  {lead.loom_url}
                </a>
              </div>
            )}
            {lead?.status !== "lost" && lead?.status !== "sold" && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleMarkSold}
                  disabled={markingSold}
                  className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    borderColor: "var(--admin-accent)",
                    background: "var(--admin-accent-dim)",
                    color: "var(--admin-accent)",
                  }}
                >
                  {markingSold ? "Updating…" : "Mark as sold"}
                </button>
                <button
                  type="button"
                  onClick={handleMarkLost}
                  disabled={markingLost}
                  className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    borderColor: "var(--admin-border)",
                    color: "var(--admin-text-muted)",
                  }}
                >
                  {markingLost ? "Updating…" : "Mark as lost"}
                </button>
              </div>
            )}
            {lead?.status === "lost" && (
              <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>This lead is marked as lost.</p>
            )}
            {lead?.status === "sold" && (
              <p className="text-sm" style={{ color: "var(--admin-accent)" }}>This lead is marked as sold.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
