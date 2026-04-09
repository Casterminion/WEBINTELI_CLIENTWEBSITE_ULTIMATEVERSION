"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { InvoicePayload } from "@/lib/invoices/types";

type Props = {
  data: InvoicePayload;
  loadingLabel: string;
};

/**
 * Live PDF preview via the same pipeline as downloads (Node render or PDF_WORKER_URL).
 * Avoids @react-pdf/renderer’s browser PDFViewer (blob iframe + font fetch + CSP edge cases).
 */
export function InvoicePdfPreview({ data, loadingLabel }: Props) {
  const payloadJson = useMemo(() => JSON.stringify(data), [data]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** 400 from API while we still have no PDF (draft incomplete). */
  const [needsValidForm, setNeedsValidForm] = useState(false);
  const urlRef = useRef<string | null>(null);
  const fetchGen = useRef(0);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const gen = ++fetchGen.current;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        if (gen !== fetchGen.current) return;
        setLoading(true);
        setError(null);
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (gen !== fetchGen.current) return;
          if (!session?.access_token) {
            setError("unauthorized");
            setNeedsValidForm(false);
            return;
          }

          const res = await fetch("/api/admin/invoices/pdf", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: payloadJson,
            signal: ac.signal,
          });
          if (gen !== fetchGen.current) return;
          if (!res.ok) {
            if (res.status === 400) {
              setNeedsValidForm(!urlRef.current);
              return;
            }
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
            setPdfUrl(null);
            const j = (await res.json().catch(() => ({}))) as { error?: string };
            setError(typeof j.error === "string" ? j.error : `HTTP ${res.status}`);
            setNeedsValidForm(false);
            return;
          }
          const blob = await res.blob();
          if (gen !== fetchGen.current) return;
          const looksPdf =
            blob.size > 0 && (!blob.type || blob.type.includes("pdf") || blob.type === "application/octet-stream");
          if (!looksPdf) {
            setError("invalid_pdf_response");
            setNeedsValidForm(false);
            return;
          }
          const next = URL.createObjectURL(blob);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = next;
          setPdfUrl(next);
          setNeedsValidForm(false);
        } catch (e) {
          if (ac.signal.aborted || gen !== fetchGen.current) return;
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
          setPdfUrl(null);
          setError(e instanceof Error ? e.message : "preview_failed");
          setNeedsValidForm(false);
        } finally {
          if (gen === fetchGen.current) setLoading(false);
        }
      })();
    }, 320);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [payloadJson]);

  const showPlaceholder = !pdfUrl && !loading && !error && needsValidForm;

  return (
    <div
      className="relative rounded-lg border overflow-hidden"
      style={{
        borderColor: "var(--admin-border)",
        background: "var(--admin-bg-elevated)",
        minHeight: 520,
      }}
    >
      {loading ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--admin-bg) 55%, transparent)" }}
        >
          <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
            {loadingLabel}…
          </span>
        </div>
      ) : null}

      {error && !pdfUrl ? (
        <div
          className="flex min-h-[520px] items-center justify-center px-4 text-center text-xs"
          style={{ color: "var(--admin-text-muted)" }}
        >
          {error}
        </div>
      ) : null}

      {pdfUrl ? (
        <iframe
          title={loadingLabel}
          src={`${pdfUrl}#toolbar=0`}
          className="block w-full border-0"
          style={{ height: 520, background: "#525659" }}
        />
      ) : null}

      {showPlaceholder ? (
        <div
          className="flex min-h-[520px] items-center justify-center px-4 text-center text-xs"
          style={{ color: "var(--admin-text-muted)" }}
        >
          Užpildykite privalomus laukus — peržiūra atsiras automatiškai.
        </div>
      ) : null}
    </div>
  );
}
