"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function AdminInstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;

    setIsStandalone(checkStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
    };
  }, []);

  if (dismissed || isStandalone || !deferredPrompt) {
    return null;
  }

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const onClose = () => {
    setDismissed(true);
  };

  return (
    <div
      className="mb-4 rounded-xl border px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: "var(--admin-border)",
        background: "var(--admin-panel)",
        boxShadow: "var(--admin-shadow)",
      }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>
          {t.admin?.installTitle ?? "Install Webinteli Admin on your phone"}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
          {t.admin?.installDescription ?? "Add this dashboard to your home screen for one-tap access and faster lead calling."}
        </p>
      </div>
      <div className="flex gap-2 mt-2 sm:mt-0">
        <button
          type="button"
          onClick={onInstallClick}
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{
            background: "var(--admin-accent)",
            color: "#020617",
          }}
        >
          {t.admin?.installApp ?? "Install app"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{
            borderColor: "var(--admin-border)",
            color: "var(--admin-text-muted)",
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          {t.admin?.notNow ?? "Not now"}
        </button>
      </div>
    </div>
  );
}

