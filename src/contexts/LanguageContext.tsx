"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations, Locale as LocaleType } from '@/data/translations';

export type Locale = LocaleType;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: any; // Using any for simplicity in accessing nested translation objects
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'webinteli-locale';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'lt' || stored === 'en') {
      setLocaleState(stored as Locale);
      setMounted(true);
      return;
    }
    const detectLocale = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/?fields=country_code');
        if (!res.ok) return;
        const data = await res.json() as { country_code?: string };
        const code = (data?.country_code ?? '').toUpperCase();
        const detected: Locale = code === 'LT' ? 'lt' : 'en';
        setLocaleState(detected);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, detected);
        }
      } catch {
        setLocaleState('en');
      } finally {
        setMounted(true);
      }
    };
    detectLocale();
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next === 'lt' ? 'lt' : 'en';
      window.dispatchEvent(new Event('languageChange'));
    }
  }, []);

  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'lt' ? 'lt' : 'en';
    }
  }, [mounted, locale]);

  const t = useMemo(() => translations[locale], [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (ctx === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
