"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPackageBySlug } from '@/data/packages';
import styles from './IntakePage.module.css';

type Props = { params: Promise<{ slug?: string | string[] }> };

import { useLanguage } from '@/contexts/LanguageContext';

type Props = { params: Promise<{ slug?: string | string[] }> };

export default function IntakePage({ params }: Props) {
  const { t } = useLanguage();
  const resolvedParams = React.use(params);
  const slug = typeof resolvedParams.slug === 'string' ? resolvedParams.slug : resolvedParams.slug?.[0];
  const rawPkg = slug ? getPackageBySlug(slug) : undefined;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    industry: '',
  });

  if (!rawPkg) {
    notFound();
  }

  // Use translated package data
  const pkg = {
    ...rawPkg,
    ...(t.pricing.packages as any)[rawPkg.slug]
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Intake submit', pkg.slug, formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className={styles.main}>
      <div className={styles.sectionWrapper}>
        <div className={styles.grid}>
          {/* Left: Form */}
          <div className={styles.formColumn}>
            <h1 className={styles.formTitle}>{t.intake.title}</h1>
            <p className={styles.formIntro}>
              {t.intake.intro}
            </p>
            <form onSubmit={handleSubmit} className={styles.form}>
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
                {t.intake.form.phoneLabel}
                <input
                  type="tel"
                  name="phone"
                  placeholder={t.intake.form.phonePlaceholder}
                  value={formData.phone}
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
              <button type="submit" className={styles.submitBtn}>
                {t.intake.form.button}
              </button>
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
