"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-xl"
        style={{
          background: "var(--admin-panel)",
          border: "1px solid var(--admin-border)",
          boxShadow: "var(--admin-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 p-6">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: variant === "danger" ? "rgba(239,68,68,0.15)" : "var(--admin-bg-elevated)",
              color: variant === "danger" ? "#ef4444" : "var(--admin-accent)",
            }}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold"
              style={{ color: "var(--admin-text)" }}
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-desc"
              className="mt-1.5 text-sm"
              style={{ color: "var(--admin-text-muted)" }}
            >
              {message}
            </p>
          </div>
        </div>
        <div
          className="flex flex-row-reverse gap-3 border-t px-6 py-4"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <button
            type="button"
            onClick={() => !loading && onConfirm()}
            disabled={loading}
            className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              background: variant === "danger" ? "#dc2626" : "var(--admin-accent)",
              color: "#fff",
            }}
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--admin-border)",
              color: "var(--admin-text)",
              background: "transparent",
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
