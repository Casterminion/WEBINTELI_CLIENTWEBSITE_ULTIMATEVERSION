"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { InlineEditableField } from "@/components/admin/InlineEditableField";
import { ADMIN_SERVICE_OPTIONS, DEFAULT_ADMIN_SERVICE } from "@/data/adminServiceOptions";
import { normalizeExternalUrl } from "@/lib/url";

const STATUS_VALUES = [
  { value: "contacted", key: "statusContacted" as const },
  { value: "replies", key: "statusReplies" as const },
  { value: "meeting_agreed", key: "statusMeetingAgreed" as const },
  { value: "agreed_to_pay", key: "statusAgreedToPay" as const },
  { value: "sent_agreement", key: "statusSentAgreement" as const },
  { value: "current_client", key: "statusCurrentClient" as const },
  { value: "lost", key: "statusLost" as const },
] as const;

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
  notes: string | null;
  website: string | null;
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

function formatStatus(status: string, t: { admin?: Record<string, string> }): string {
  const opt = STATUS_VALUES.find((o) => o.value === status);
  if (opt) return t.admin?.[opt.key] ?? opt.value;
  if (status === "new") return t.admin?.statusNew ?? "New";
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

export default function LeadDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();

  const STATUS_OPTIONS = useMemo(
    () => STATUS_VALUES.map((o) => ({ value: o.value, label: t.admin?.[o.key] ?? o.value })),
    [t]
  );
  const id = params?.id as string | undefined;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  const serviceSelectOptions = useMemo(() => {
    const base = [...ADMIN_SERVICE_OPTIONS] as string[];
    const v = lead?.service?.trim();
    if (v && !base.includes(v)) {
      return [v, ...base];
    }
    return base;
  }, [lead?.service]);

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
      setError(err.message || (t.admin?.loadingLead ?? "Lead not found."));
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
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitting(true);
    const dueDates = getFollowUpDueDates();
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("intake_submissions")
      .update({
        assigned_to: user.id,
        status: "contacted",
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

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setUpdatingStatus(true);
    const { error: err } = await supabase
      .from("intake_submissions")
      .update({ status: newStatus })
      .eq("id", id);
    if (err) setError(err.message);
    else await loadLead();
    setUpdatingStatus(false);
  };

  const saveField = useCallback(
    async (field: keyof Lead, value: string | null) => {
      if (!id) return;
      setSavingField(field);
      setError(null);
      const optionalFields = ["phone", "business_owner_name", "notes", "website"];
      const dbValue =
        value === null || value.trim() === ""
          ? optionalFields.includes(field)
            ? null
            : field === "package_price_display" || field === "service"
              ? field === "service"
                ? DEFAULT_ADMIN_SERVICE
                : ""
              : ""
          : value.trim();
      const { error: err } = await supabase
        .from("intake_submissions")
        .update({ [field]: dbValue })
        .eq("id", id);
      setSavingField(null);
      if (err) {
        setError(err.message || (t.admin?.saving ?? "Failed to save."));
        return;
      }
      await loadLead();
    },
    [id, loadLead]
  );

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
        <p style={{ color: "var(--admin-text-muted)" }}>{t.admin?.invalidLeadId ?? "Invalid lead ID."}</p>
        <Link href="/admin/client-requests" className="text-sm" style={{ color: "var(--admin-accent)" }}>
          {t.admin?.backToClientRequests ?? "Back to Client Requests"}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
        <p style={{ color: "var(--admin-text-muted)" }}>{t.admin?.loadingLead ?? "Loading lead…"}</p>
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
          {t.admin?.backToClientRequests ?? "Back to Client Requests"}
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
              <span>{t.admin?.backToClientRequests ?? "Back to Client Requests"}</span>
            </Link>
          </div>

          <>
            <h1 className="text-xl font-semibold" style={{ color: "var(--admin-text)" }}>
              <InlineEditableField
                as="span"
                value={lead?.name ?? null}
                onSave={(v) => saveField("name", v)}
                disabled={!!isUnclaimed}
                saving={savingField === "name"}
              />
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--admin-text-muted)" }}>
              <InlineEditableField
                as="span"
                value={lead?.email ?? null}
                onSave={(v) => saveField("email", v)}
                type="email"
                disabled={!!isUnclaimed}
                saving={savingField === "email"}
              />
            </p>

            <div className="mt-3 flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
                {t.admin?.website ?? "Website"}
              </span>
              <InlineEditableField
                value={lead?.website ?? null}
                onSave={(v) => saveField("website", v)}
                type="text"
                placeholder={t.admin?.websitePlaceholder ?? "https://"}
                disabled={!!isUnclaimed}
                saving={savingField === "website"}
              />
              {lead?.website?.trim() && (
                <a
                  href={normalizeExternalUrl(lead.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium w-fit"
                  style={{ color: "var(--admin-accent)" }}
                >
                  {t.admin?.openWebsite ?? "Open website"} →
                </a>
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm" style={{ color: "var(--admin-accent)" }}>
                {error}
              </p>
            )}

            <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.phone ?? "Phone"}</dt>
                <InlineEditableField
                  value={lead?.phone ?? null}
                  onSave={(v) => saveField("phone", v)}
                  type="tel"
                  disabled={!!isUnclaimed}
                  saving={savingField === "phone"}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.businessOwner ?? "Business owner"}</dt>
                <InlineEditableField
                  value={lead?.business_owner_name ?? null}
                  onSave={(v) => saveField("business_owner_name", v)}
                  disabled={!!isUnclaimed}
                  saving={savingField === "business_owner_name"}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.city ?? "City"}</dt>
                <InlineEditableField
                  value={lead?.city ?? null}
                  onSave={(v) => saveField("city", v)}
                  disabled={!!isUnclaimed}
                  saving={savingField === "city"}
                />
              </div>
              {lead?.outreach_email && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.sentFromEmail ?? "Sent from email"}</dt>
                  <dd style={{ color: "var(--admin-text)" }}>{lead.outreach_email}</dd>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.industry ?? "Industry"}</dt>
                <InlineEditableField
                  value={lead?.industry ?? null}
                  onSave={(v) => saveField("industry", v)}
                  disabled={!!isUnclaimed}
                  saving={savingField === "industry"}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.service ?? "Service"}</dt>
                <InlineEditableField
                  value={lead?.service ?? null}
                  onSave={(v) => saveField("service", v)}
                  type="select"
                  options={serviceSelectOptions}
                  disabled={!!isUnclaimed}
                  saving={savingField === "service"}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.package ?? "Package"}</dt>
                <InlineEditableField
                  value={lead?.package_price_display || lead?.package_slug || null}
                  onSave={(v) => saveField("package_price_display", v)}
                  placeholder={t.admin?.packagePlaceholder ?? "e.g. 397 € / mėn."}
                  disabled={!!isUnclaimed}
                  saving={savingField === "package_price_display"}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.submitted ?? "Submitted"}</dt>
                <dd style={{ color: "var(--admin-text)" }}>{lead?.created_at ? formatDate(lead.created_at) : "—"}</dd>
              </div>
              {lead?.claimed_at && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.claimed ?? "Claimed"}</dt>
                  <dd style={{ color: "var(--admin-text)" }}>{formatDate(lead.claimed_at)}</dd>
                </div>
              )}
              {lead?.status && lead.status !== "new" && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.status ?? "Status"}</dt>
                  <dd style={{ color: "var(--admin-text)" }}>{formatStatus(lead.status, t)}</dd>
                </div>
              )}
              <div className="flex flex-col gap-0.5 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.notes ?? "Notes"}</dt>
                <InlineEditableField
                  value={lead?.notes ?? null}
                  onSave={(v) => saveField("notes", v)}
                  type="textarea"
                  rows={3}
                  placeholder={t.admin?.notesPlaceholder ?? "Internal notes about this lead…"}
                  disabled={!!isUnclaimed}
                  saving={savingField === "notes"}
                />
              </div>
            </dl>
          </>
        </div>

        {isUnclaimed ? (
          <div
            className="border-t px-6 py-6 space-y-5"
            style={{ borderColor: "var(--admin-border)" }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>
              {t.admin?.claimPrompt ?? "Claim this lead to assign it to yourself and set status to Contacted."}
            </p>
            {error && (
              <p className="text-sm" style={{ color: "var(--admin-accent)" }}>{error}</p>
            )}
            <button
              type="button"
              onClick={handleClaim}
              disabled={submitting}
              className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "var(--admin-accent)",
                color: "var(--admin-bg)",
              }}
            >
              {submitting ? (t.admin?.claiming ?? "Claiming…") : (t.admin?.claimLead ?? "Claim lead & create follow-ups")}
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
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.status ?? "Status"}</label>
              <select
                value={lead?.status ?? "contacted"}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                className="admin-input rounded-lg px-3 py-2 text-sm max-w-xs"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {updatingStatus && (
                <span className="ml-2 text-xs" style={{ color: "var(--admin-text-muted)" }}>{t.admin?.updating ?? "Updating…"}</span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
