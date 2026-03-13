"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPackageBySlug } from '@/data/packages';
import styles from './IntakePage.module.css';
import { useLanguage } from '@/contexts/LanguageContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationCode = 'name_length' | 'email_invalid' | 'city_length' | 'industry_length';

function validateForm(data: {
  name: string;
  email: string;
  city: string;
  industry: string;
}): ValidationCode | null {
  const name = data.name.trim();
  const email = data.email.trim();
  const city = data.city.trim();
  const industry = data.industry.trim();
  if (name.length < 2 || name.length > 100) return 'name_length';
  if (email.length < 5 || email.length > 255 || !EMAIL_REGEX.test(email)) return 'email_invalid';
  if (city.length < 2 || city.length > 200) return 'city_length';
  if (industry.length < 2 || industry.length > 200) return 'industry_length';
  return null;
}

type ResolvedParams = { slug?: string | string[] };

type Props = { params: ResolvedParams };

export default function IntakePageClient({ params }: Props) {
  const { t } = useLanguage();
  const slug = typeof params.slug === 'string' ? params.slug : params.slug?.[0];
  const rawPkg = slug ? getPackageBySlug(slug) : undefined;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    city: '',
    industry: '',
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const formOpenedAtRef = useRef<string | null>(null);

  if (!rawPkg) {
    notFound();
  }

  // Use translated package data
  const pkg = {
    ...rawPkg,
    ...(t.pricing.packages as any)[rawPkg.slug]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErr = validateForm(formData);
    if (validationErr) {
      const errors = t.intake.form.validationErrors as Record<string, string> | undefined;
      setSubmitError(errors?.[validationErr] ?? t.intake.form.errorMessage);
      return;
    }

    setIsSubmitting(true);
    const packagePriceDisplay = pkg.priceSub
      ? `${pkg.price} ${pkg.priceSub}`.trim()
      : pkg.price;

    const body = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      city: formData.city.trim(),
      industry: formData.industry.trim(),
      package_slug: pkg.slug,
      service: 'SEO',
      package_price_display: packagePriceDisplay,
      website: honeypotRef.current?.value ?? '',
      form_opened_at: formOpenedAtRef.current ?? undefined,
    };

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setShowConfirmation(true);
        setFormData({ name: '', email: '', city: '', industry: '' });
        return;
      }

      if (res.status === 429) {
        setSubmitError(t.intake.form.rateLimitMessage);
        return;
      }

      const errors = t.intake.form.validationErrors as Record<string, string> | undefined;
      const message =
        typeof data.code === 'string' && errors?.[data.code]
          ? errors[data.code]
          : typeof data.message === 'string'
            ? data.message
            : t.intake.form.errorMessage;
      setSubmitError(message);
    } catch {
      setSubmitError(t.intake.form.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!formOpenedAtRef.current) {
      formOpenedAtRef.current = new Date().toISOString();
    }
  }, []);

  useEffect(() => {
    if (!showConfirmation) return;
    closeButtonRef.current?.focus();
  }, [showConfirmation]);

  useEffect(() => {
    if (!showConfirmation) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowConfirmation(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [showConfirmation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const confirmationModal = showConfirmation && typeof document !== 'undefined' && createPortal(
    <div
      className={styles.modalOverlay}
      onClick={() => setShowConfirmation(false)}
      role="presentation"
    >
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-confirmation-title"
        aria-describedby="intake-confirmation-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalIconWrap} aria-hidden>
          <svg className={styles.modalCheckIcon} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 id="intake-confirmation-title" className={styles.modalTitle}>
          {t.intake.confirmation.title}
        </h2>
        <p id="intake-confirmation-message" className={styles.modalMessage}>
          {t.intake.confirmation.message}
        </p>
        <button
          type="button"
          ref={closeButtonRef}
          className={styles.modalCloseBtn}
          onClick={() => setShowConfirmation(false)}
        >
          {t.intake.confirmation.close}
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <div className={styles.main}>
      {confirmationModal}
      <div className={styles.sectionWrapper}>
        <div className={styles.grid}>
          {/* Left: Form */}
          <div className={styles.formColumn}>
            <h1 className={styles.formTitle}>{t.intake.title}</h1>
            <p className={styles.formIntro}>
              {t.intake.intro}
            </p>
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                ref={honeypotRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className={styles.honeypot}
                aria-hidden
              />
              <label className={styles.label}>
                {t.intake.form.nameLabel}
                <input
                  type="text"
                  name="name"
                  placeholder={t.intake.form.namePlaceholder}
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </label>
              <label className={styles.label}>
                {t.intake.form.emailLabel}
                <input
                  type="email"
                  name="email"
                  placeholder={t.intake.form.emailPlaceholder}
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </label>
              <label className={styles.label}>
                {t.intake.form.cityLabel}
                <input
                  type="text"
                  name="city"
                  placeholder={t.intake.form.cityPlaceholder}
                  value={formData.city}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </label>
              <label className={styles.label}>
                {t.intake.form.industryLabel}
                <input
                  type="text"
                  name="industry"
                  placeholder={t.intake.form.industryPlaceholder}
                  value={formData.industry}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </label>
              {submitError && (
                <p className={styles.formError} role="alert">
                  {submitError}
                </p>
              )}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? '...' : t.intake.form.button}
              </button>
              <p className={styles.formPrivacyNotice}>
                {t.intake.form.privacyAgreePrefix}
                <Link href="/privacy">{t.nav.privacyPolicy}</Link>.
              </p>
            </form>
          </div>

          {/* Right: Package card */}
          <div className={styles.cardColumn}>
            <Link href="/#pricing" className={styles.backLink}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {t.intake.back}
            </Link>
            <div className={styles.packageCard}>
              <div className={styles.cardHeader}>
                <span className={styles.pkgLabel}>{pkg.name}</span>
                <div className={styles.pkgPrice}>{pkg.price}</div>
                {pkg.priceSub && <div className={styles.pkgPriceSub}>{pkg.priceSub}</div>}
                <p className={styles.guaranteeLine}>{pkg.guarantee}</p>
              </div>
              <ul className={styles.featureList}>
                {pkg.features.map((feature: string, idx: number) => (
                  <li key={idx} className={styles.featureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <p className={styles.trustNote}>
                {t.pricing.trustNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
