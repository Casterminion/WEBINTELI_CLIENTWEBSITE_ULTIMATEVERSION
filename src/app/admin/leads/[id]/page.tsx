"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Plus, Phone, Mail, Video, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { InlineEditableField } from "@/components/admin/InlineEditableField";
import LeadOutreachModal, { type OutreachChannel } from "@/components/admin/LeadOutreachModal";
import EmailHtmlPreview from "@/components/admin/EmailHtmlPreview";
import { ADMIN_SERVICE_OPTIONS, DEFAULT_ADMIN_SERVICE } from "@/data/adminServiceOptions";
import { normalizeExternalUrl } from "@/lib/url";
import { getFollowUpDueDates } from "@/lib/followUpSchedule";

const STATUS_VALUES = [
  { value: "new", key: "statusNew" as const },
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
  status_changed_by_email: string | null;
  status_changed_at: string | null;
};

type OutreachEventRow = {
  id: string;
  channel: string;
  summary: string;
  email_body_html: string | null;
  audio_storage_path: string | null;
  live_reference: string | null;
  created_at: string;
  created_by_email: string | null;
};

function formatStatus(status: string, t: { admin?: Record<string, string> }): string {
  const opt = STATUS_VALUES.find((o) => o.value === status);
  if (opt) return t.admin?.[opt.key] ?? opt.value;
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

function outreachChannelLabel(channel: string, a: Record<string, string> | undefined): string {
  switch (channel) {
    case "call":
      return a?.outreachChannelCall ?? "Call";
    case "email":
      return a?.outreachChannelEmail ?? "Email";
    case "live":
      return a?.outreachChannelLive ?? "Live";
    case "sms":
      return a?.outreachChannelSms ?? "SMS";
    default:
      return channel;
  }
}

function OutreachAudioPlayer({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.storage.from("lead-outreach").createSignedUrl(path, 3600);
      if (cancelled) return;
      if (error || !data?.signedUrl) setFailed(true);
      else setSrc(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed) return null;
  if (!src) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--admin-text-muted)" }}>
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>…</span>
      </div>
    );
  }
  return <audio controls className="w-full mt-2 max-w-md" src={src} preload="metadata" />;
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
  const [leadTab, setLeadTab] = useState<"info" | "history">("info");
  const [outreachEvents, setOutreachEvents] = useState<OutreachEventRow[]>([]);
  const [loadingOutreach, setLoadingOutreach] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachChannel, setOutreachChannel] = useState<OutreachChannel>("call");

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
  }, [id, t.admin?.loadingLead]);

  const loadOutreach = useCallback(async () => {
    if (!id) return;
    setLoadingOutreach(true);
    const { data, error: err } = await supabase
      .from("lead_outreach_events")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false });
    if (!err && data) setOutreachEvents(data as OutreachEventRow[]);
    setLoadingOutreach(false);
  }, [id]);

  useEffect(() => {
    void loadLead();
  }, [loadLead]);

  useEffect(() => {
    if (leadTab === "history" && id) void loadOutreach();
  }, [leadTab, id, loadOutreach]);

  const outreachLabels = useMemo(
    () => ({
      title: (ch: OutreachChannel) => {
        const a = t.admin;
        switch (ch) {
          case "call":
            return a?.outreachModalCall ?? "Log call";
          case "email":
            return a?.outreachModalEmail ?? "Log email";
          case "live":
            return a?.outreachModalLive ?? "Log live touchpoint";
          case "sms":
            return a?.outreachModalSms ?? "Log SMS";
          default:
            return "";
        }
      },
      summary: t.admin?.outreachSummary ?? "Summary",
      pasteEmailHint: t.admin?.outreachPasteEmailHint ?? "Pasted email (optional)",
      pasteEmailFocus: t.admin?.outreachPasteEmailFocus ?? "Click here and paste to capture HTML.",
      emailPastedReady: t.admin?.outreachEmailPasted ?? "Email HTML captured.",
      emailPreview: t.admin?.outreachEmailPreview ?? "Preview",
      clearEmail: t.admin?.outreachClearEmail ?? "Clear pasted email",
      audioLabel: t.admin?.outreachAudio ?? "Recording (optional)",
      livePlaceholder: t.admin?.outreachLiveRef ?? "Meeting link or note (optional)",
      save: t.admin?.outreachSave ?? "Save",
      cancel: t.admin?.cancel ?? "Cancel",
      saving: t.admin?.outreachSaving ?? "Saving…",
      uploading: t.admin?.outreachUploading ?? "Uploading…",
      summaryRequired: t.admin?.outreachSummaryRequired ?? "Please enter a short summary.",
      audioTooLarge: t.admin?.outreachAudioTooLarge ?? "Audio file must be under 50 MB.",
      genericError: t.admin?.outreachError ?? "Something went wrong.",
    }),
    [t.admin]
  );

  const openOutreach = (ch: OutreachChannel) => {
    setOutreachChannel(ch);
    setOutreachOpen(true);
  };

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
        status_changed_by_email: user.email ?? null,
        status_changed_at: now,
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
    if (!id || !lead) return;
    setUpdatingStatus(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setError(t.admin?.signInError ?? "Not signed in.");
      setUpdatingStatus(false);
      return;
    }
    const prev = lead.status || "new";
    const payload: Record<string, string | null> = { status: newStatus };

    if (newStatus === "new") {
      payload.status_changed_by_email = null;
      payload.status_changed_at = null;
    } else if (prev === "new" && newStatus !== "new") {
      payload.assigned_to = user.id;
      payload.status_changed_by_email = user.email;
      payload.status_changed_at = new Date().toISOString();
      if (!lead.claimed_at) {
        payload.claimed_at = new Date().toISOString();
      }
    }

    const { error: err } = await supabase.from("intake_submissions").update(payload).eq("id", id);
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
        <Link href="/admin/my-leads" className="text-sm" style={{ color: "var(--admin-accent)" }}>
          {t.admin?.backToMyLeads ?? "Back to My leads"}
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
        <Link href="/admin/my-leads" className="text-sm" style={{ color: "var(--admin-accent)" }}>
          {t.admin?.backToMyLeads ?? "Back to My leads"}
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
              href="/admin/my-leads"
              className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
              style={{ color: "var(--admin-text-muted)" }}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{t.admin?.backToMyLeads ?? "Back to My leads"}</span>
            </Link>
            <Link
              href="/admin/my-leads?add=1"
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 shrink-0"
              style={{
                background: "var(--admin-accent)",
                color: "#ffffff",
              }}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              {t.admin?.addLead ?? "Add lead"}
            </Link>
          </div>

          <div
            className="flex gap-1 mb-6 border-b"
            style={{ borderColor: "var(--admin-border)" }}
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={leadTab === "info"}
              className="px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
              style={{
                borderColor: leadTab === "info" ? "var(--admin-accent)" : "transparent",
                color: leadTab === "info" ? "var(--admin-text)" : "var(--admin-text-muted)",
              }}
              onClick={() => setLeadTab("info")}
            >
              {t.admin?.leadTabInformation ?? "Information"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={leadTab === "history"}
              className="px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
              style={{
                borderColor: leadTab === "history" ? "var(--admin-accent)" : "transparent",
                color: leadTab === "history" ? "var(--admin-text)" : "var(--admin-text-muted)",
              }}
              onClick={() => setLeadTab("history")}
            >
              {t.admin?.leadTabHistory ?? "History"}
            </button>
          </div>

          {leadTab === "history" ? (
            <div className="space-y-4" role="tabpanel">
              {loadingOutreach ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--admin-text-muted)" }}>
                  <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                  {t.admin?.loadingOutreachHistory ?? "Loading history…"}
                </div>
              ) : outreachEvents.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
                  {t.admin?.outreachHistoryEmpty ?? "No outreach logged yet."}
                </p>
              ) : (
                <ul className="space-y-4">
                  {outreachEvents.map((ev) => {
                    return (
                      <li
                        key={ev.id}
                        className="rounded-lg border p-4 text-sm"
                        style={{ borderColor: "var(--admin-border)" }}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold" style={{ color: "var(--admin-text)" }}>
                            {outreachChannelLabel(ev.channel, t.admin)}
                          </span>
                          <time className="text-xs" style={{ color: "var(--admin-text-muted)" }} dateTime={ev.created_at}>
                            {formatDate(ev.created_at)}
                          </time>
                        </div>
                        {ev.created_by_email && (
                          <p className="mt-1 text-xs" style={{ color: "var(--admin-text-muted)" }}>
                            {ev.created_by_email}
                          </p>
                        )}
                        <p className="mt-2 whitespace-pre-wrap" style={{ color: "var(--admin-text)" }}>
                          {ev.summary}
                        </p>
                        {ev.live_reference?.trim() && (
                          <p className="mt-2 text-xs break-all" style={{ color: "var(--admin-accent)" }}>
                            {ev.live_reference}
                          </p>
                        )}
                        {ev.audio_storage_path && <OutreachAudioPlayer path={ev.audio_storage_path} />}
                        {ev.email_body_html?.trim() ? (
                          <details className="mt-3 rounded border" style={{ borderColor: "var(--admin-border)" }}>
                            <summary
                              className="cursor-pointer px-3 py-2 text-xs font-medium"
                              style={{ color: "var(--admin-accent)" }}
                            >
                              {t.admin?.outreachShowEmail ?? "Email content"}
                            </summary>
                            <div
                              className="border-t px-3 py-2 max-h-64 overflow-auto text-sm"
                              style={{ borderColor: "var(--admin-border)" }}
                            >
                              <EmailHtmlPreview html={ev.email_body_html} />
                            </div>
                          </details>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {leadTab === "info" ? (
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
          ) : null}
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
                value={lead?.status === "new" || !lead?.status ? "new" : lead.status}
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
              {lead?.status_changed_by_email && lead.status !== "new" && (
                <p className="mt-2 text-xs max-w-lg" style={{ color: "var(--admin-text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--admin-text)" }}>
                    {t.admin?.statusChangedBy ?? "Status set by"}
                  </span>
                  {": "}
                  {lead.status_changed_by_email}
                  {lead.status_changed_at && (
                    <>
                      {" · "}
                      {formatDate(lead.status_changed_at)}
                    </>
                  )}
                </p>
              )}
            </div>

            <div
              className="mt-4 pt-4 flex flex-col gap-2"
              style={{ borderTop: "1px solid var(--admin-border)" }}
            >
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
                {t.admin?.followUpActions ?? "Follow-up"}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openOutreach("call")}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition-opacity hover:opacity-90"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {t.admin?.outreachCall ?? "Call"}
                </button>
                <button
                  type="button"
                  onClick={() => openOutreach("email")}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition-opacity hover:opacity-90"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {t.admin?.outreachEmail ?? "Email"}
                </button>
                <button
                  type="button"
                  onClick={() => openOutreach("live")}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition-opacity hover:opacity-90"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
                >
                  <Video className="h-4 w-4 shrink-0" />
                  {t.admin?.outreachLive ?? "Live"}
                </button>
                <button
                  type="button"
                  onClick={() => openOutreach("sms")}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition-opacity hover:opacity-90"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  {t.admin?.outreachSms ?? "SMS"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {id && (
        <LeadOutreachModal
          open={outreachOpen}
          leadId={id}
          channel={outreachChannel}
          onClose={() => setOutreachOpen(false)}
          onSuccess={async () => {
            await loadLead();
            await loadOutreach();
          }}
          labels={outreachLabels}
        />
      )}
    </div>
  );
}
