"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "webinteli-cookie-consent";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
}

function parseStored(value: string | null): CookiePreferences | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as CookiePreferences;
    if (
      typeof parsed.essential === "boolean" &&
      typeof parsed.analytics === "boolean" &&
      typeof parsed.functional === "boolean" &&
      typeof parsed.marketing === "boolean"
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function savePreferences(prefs: CookiePreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

const ALL_ACCEPTED: CookiePreferences = {
  essential: true,
  analytics: true,
  functional: true,
  marketing: true,
};

const ONLY_ESSENTIAL: CookiePreferences = {
  essential: true,
  analytics: false,
  functional: false,
  marketing: false,
};

export default function CookieBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [functional, setFunctional] = useState(true);
  const [marketing, setMarketing] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const stored = parseStored(window.localStorage.getItem(STORAGE_KEY));
    if (!stored) {
      setVisible(true);
      return;
    }
    setVisible(false);
    setAnalytics(stored.analytics);
    setFunctional(stored.functional);
    setMarketing(stored.marketing);
  }, [mounted]);

  const hideAndSave = useCallback((prefs: CookiePreferences) => {
    savePreferences(prefs);
    setVisible(false);
    setModalOpen(false);
  }, []);

  const handleAcceptAll = useCallback(() => {
    hideAndSave(ALL_ACCEPTED);
  }, [hideAndSave]);

  const handleRejectOptional = useCallback(() => {
    hideAndSave(ONLY_ESSENTIAL);
  }, [hideAndSave]);

  const handleSavePreferences = useCallback(() => {
    hideAndSave({
      essential: true,
      analytics,
      functional,
      marketing,
    });
  }, [hideAndSave, analytics, functional, marketing]);

  const openModal = useCallback(() => {
    previousFocusRef.current =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement) : null;
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    previousFocusRef.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (!modalOpen || !modalRef.current) return;
    const focusables = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  const cookieTypes = t.privacyPage?.sections?.cookies?.types;
  if (!cookieTypes) return null;

  if (!mounted || !visible) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Cookie consent"
        className="fixed bottom-0 left-0 right-0 z-[9998] w-full"
      >
        <div
          className={cn(
            "w-full rounded-t-2xl border-t border-border",
            "bg-background/95 backdrop-blur-xl shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)]",
            "dark:bg-popover/95 dark:shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.3)]"
          )}
        >
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t.cookieBanner.message}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={openModal}
                className="text-xs uppercase tracking-wider"
              >
                {t.cookieBanner.customize}
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="text-xs uppercase tracking-wider"
              >
                {t.cookieBanner.acceptAll}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              ref={modalRef}
              id="cookie-modal"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "w-full max-w-xl rounded-2xl border border-border bg-popover text-popover-foreground",
                "shadow-[0_24px_48px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.4)]",
                "overflow-hidden"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2
                  id="cookie-modal-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  {t.cookieBanner.title}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeModal}
                  aria-label="Close"
                  className="h-9 w-9 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Essential - always on */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cookieTypes.essential.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cookieTypes.essential.desc}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t.cookieBanner.alwaysActive}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Optional: Analytics */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {cookieTypes.analytics.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cookieTypes.analytics.desc}
                    </p>
                  </div>
                  <Switch
                    checked={analytics}
                    onCheckedChange={setAnalytics}
                    className="shrink-0 mt-0.5"
                  />
                </div>

                {/* Optional: Functional */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {cookieTypes.functional.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cookieTypes.functional.desc}
                    </p>
                  </div>
                  <Switch
                    checked={functional}
                    onCheckedChange={setFunctional}
                    className="shrink-0 mt-0.5"
                  />
                </div>

                {/* Optional: Marketing */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {cookieTypes.marketing.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cookieTypes.marketing.desc}
                    </p>
                  </div>
                  <Switch
                    checked={marketing}
                    onCheckedChange={setMarketing}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              </div>

              <div className="border-t border-border bg-muted/30 px-6 py-4">
                <div className="flex flex-col gap-4">
                  <Link
                    href="/privacy"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-fit"
                  >
                    {t.cookieBanner.privacyLink}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRejectOptional}
                      className="text-xs uppercase tracking-wider shrink-0"
                    >
                      {t.cookieBanner.rejectOptional}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSavePreferences}
                      className="text-xs uppercase tracking-wider shrink-0"
                    >
                      {t.cookieBanner.savePreferences}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAcceptAll}
                      className="text-xs uppercase tracking-wider shrink-0"
                    >
                      {t.cookieBanner.acceptAll}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
