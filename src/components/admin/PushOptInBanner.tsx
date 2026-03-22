"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const applicationServerKeyBase64 = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushOptInBanner() {
  const { t } = useLanguage();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !isStandalone) {
      setSupported(false);
      return;
    }

    setSupported(true);

    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration || !registration.pushManager) return;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setSubscribed(true);
      }
    })();
  }, []);

  if (!supported || subscribed || !applicationServerKeyBase64) {
    return null;
  }

  const handleEnable = async () => {
    if (!applicationServerKeyBase64) return;
    try {
      setLoading(true);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setLoading(false);
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKeyBase64) as unknown as ArrayBuffer,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      });

      setSubscribed(true);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to enable push notifications", error);
      }
    } finally {
      setLoading(false);
    }
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
          {t.admin?.pushTitle ?? "Enable background lead alerts"}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
          {t.admin?.pushDescription ?? "Get push notifications on this device when a new client request comes in."}
        </p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleEnable}
        className="mt-2 sm:mt-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        style={{
          background: "var(--admin-accent)",
          color: "#020617",
        }}
      >
        {loading ? (t.admin?.enabling ?? "Enabling…") : (t.admin?.enablePush ?? "Enable push alerts")}
      </button>
    </div>
  );
}

