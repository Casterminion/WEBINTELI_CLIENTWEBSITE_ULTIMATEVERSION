"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeEmailHtml } from "@/lib/emailHtmlPurify";
import EmailHtmlPreview from "@/components/admin/EmailHtmlPreview";
import {
  completeTodayTasksForLead,
  ensureNextOpenFollowUpTask,
} from "@/lib/followUpSchedule";

export type OutreachChannel = "call" | "email" | "live" | "sms";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // matches migration file_size_limit

type Props = {
  open: boolean;
  leadId: string;
  channel: OutreachChannel;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  labels: {
    title: (ch: OutreachChannel) => string;
    summary: string;
    pasteEmailHint: string;
    pasteEmailFocus: string;
    emailPastedReady: string;
    emailPreview: string;
    clearEmail: string;
    audioLabel: string;
    livePlaceholder: string;
    save: string;
    cancel: string;
    saving: string;
    uploading: string;
    summaryRequired: string;
    audioTooLarge: string;
    genericError: string;
  };
};

export default function LeadOutreachModal({
  open,
  leadId,
  channel,
  onClose,
  onSuccess,
  labels,
}: Props) {
  const [summary, setSummary] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [liveReference, setLiveReference] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSummary("");
    setEmailHtml("");
    setLiveReference("");
    setAudioFile(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, channel, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  const handlePasteEmail = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    const raw = html?.trim()
      ? html
      : plain?.trim()
        ? `<p>${plain.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
        : "";
    if (!raw) return;
    setEmailHtml(sanitizeEmailHtml(raw));
  }, []);

  const handleSave = async () => {
    const sum = summary.trim();
    if (!sum) {
      setError(labels.summaryRequired);
      return;
    }
    setError(null);
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setError(labels.genericError);
      setSubmitting(false);
      return;
    }

    let audioPath: string | null = null;
    if (channel === "call" && audioFile) {
      if (audioFile.size > MAX_AUDIO_BYTES) {
        setError(labels.audioTooLarge);
        setSubmitting(false);
        return;
      }
      const ext = audioFile.name.toLowerCase().endsWith(".wav") ? "wav" : "mp3";
      const objectPath = `${leadId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("lead-outreach").upload(objectPath, audioFile, {
        contentType: audioFile.type || "audio/mpeg",
        upsert: false,
      });
      if (upErr) {
        setError(upErr.message || labels.genericError);
        setSubmitting(false);
        return;
      }
      audioPath = objectPath;
    }

    const sanitizedEmail =
      channel === "email" && emailHtml.trim() ? sanitizeEmailHtml(emailHtml) : null;

    const { error: insErr } = await supabase.from("lead_outreach_events").insert({
      lead_id: leadId,
      created_by: user.id,
      created_by_email: user.email ?? null,
      channel,
      summary: sum,
      email_body_html: sanitizedEmail,
      audio_storage_path: audioPath,
      live_reference:
        channel === "live" && liveReference.trim() ? liveReference.trim() : null,
    });

    if (insErr) {
      if (audioPath) {
        await supabase.storage.from("lead-outreach").remove([audioPath]);
      }
      setError(insErr.message || labels.genericError);
      setSubmitting(false);
      return;
    }

    const doneToday = await completeTodayTasksForLead(supabase, leadId);
    if (doneToday.error) {
      setError(doneToday.error.message);
      setSubmitting(false);
      return;
    }

    const ensure = await ensureNextOpenFollowUpTask(supabase, leadId, user.id);
    if (ensure.error) {
      setError(ensure.error.message);
      setSubmitting(false);
      return;
    }

    await onSuccess();
    reset();
    onClose();
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outreach-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-xl"
        style={{
          background: "var(--admin-panel)",
          border: "1px solid var(--admin-border)",
          boxShadow: "var(--admin-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 id="outreach-modal-title" className="text-lg font-semibold" style={{ color: "var(--admin-text)" }}>
            {labels.title(channel)}
          </h2>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>
              {labels.summary}
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="admin-input w-full rounded-lg px-3 py-2 text-sm"
              disabled={submitting}
            />
          </div>

          {channel === "email" && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>
                {labels.pasteEmailHint}
              </label>
              <div
                tabIndex={0}
                className="min-h-[100px] rounded-lg border border-dashed px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-offset-2"
                style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-muted)" }}
                onPaste={handlePasteEmail}
              >
                {emailHtml.trim() ? (
                  <span className="text-xs" style={{ color: "var(--admin-accent)" }}>
                    {labels.emailPastedReady}
                  </span>
                ) : (
                  <span>{labels.pasteEmailFocus}</span>
                )}
              </div>
              {emailHtml.trim() ? (
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                    {labels.emailPreview}
                  </span>
                  <div
                    className="rounded border max-h-48 overflow-auto text-sm"
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    <EmailHtmlPreview html={emailHtml} className="p-2" />
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium w-fit"
                    style={{ color: "var(--admin-accent)" }}
                    disabled={submitting}
                    onClick={() => setEmailHtml("")}
                  >
                    {labels.clearEmail}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {channel === "call" && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>
                {labels.audioLabel}
              </label>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
                disabled={submitting}
                className="text-sm w-full"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--admin-text-muted)" }}>
                Max 50 MB (MP3 / WAV).
              </p>
            </div>
          )}

          {channel === "live" && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>
                {labels.livePlaceholder}
              </label>
              <input
                type="text"
                value={liveReference}
                onChange={(e) => setLiveReference(e.target.value)}
                className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                placeholder="https://…"
                disabled={submitting}
              />
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: "var(--admin-accent)" }}>
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium border transition-opacity disabled:opacity-50"
              style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
              disabled={submitting}
              onClick={onClose}
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "var(--admin-accent)",
                color: "var(--admin-bg)",
              }}
              disabled={submitting}
              onClick={() => void handleSave()}
            >
              {submitting ? (audioFile && channel === "call" ? labels.uploading : labels.saving) : labels.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
