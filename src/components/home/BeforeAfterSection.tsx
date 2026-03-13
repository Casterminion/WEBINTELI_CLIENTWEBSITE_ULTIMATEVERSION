"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSkipAnimation } from '@/lib/hooks';
import styles from './BeforeAfterSection.module.css';

const HeatmapMap = dynamic(() => import('./HeatmapMap'), { ssr: false });

const BeforeAfterSection: React.FC = () => {
  const { locale, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');
  const isBad = activeTab === 'before';

  const BEFORE_METRICS = [
    { label: t.beforeAfter.metrics.ranking, value: '86' },
    { label: t.beforeAfter.metrics.marketshare, value: '1%' },
    { label: t.beforeAfter.metrics.clicks, value: '5' },
    { label: t.beforeAfter.metrics.customers, value: '1-2' },
  ];

  const AFTER_METRICS = [
    { label: t.beforeAfter.metrics.ranking, value: '1-3' },
    { label: t.beforeAfter.metrics.marketshare, value: '75%' },
    { label: t.beforeAfter.metrics.clicks, value: '300+' },
    { label: t.beforeAfter.metrics.customers, value: '15-30+' },
  ];

  const metrics = activeTab === 'before' ? BEFORE_METRICS : AFTER_METRICS;
  const companyAddress = locale === 'lt' ? 'Pavyzdinis adresas, Kaunas, Lietuva' : 'Example Address 12, London SW1A 1AA, UK';

  return (
    <section className={styles.section} id="before-after">
      <div className="container">
        <div className={styles.header}>
          <p className={styles.tag}>{t.beforeAfter.tag}</p>
          <h2 className={styles.title}>{t.beforeAfter.title}</h2>
        </div>

        <motion.div
          className={styles.card}
          initial={useSkipAnimation('before-after') ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.cardGrid}>
            <div className={styles.leftPanel}>
              <div className={styles.tabs}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'before' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('before')}
                  aria-pressed={activeTab === 'before'}
                >
                  {t.beforeAfter.tabs.before}
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'after' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('after')}
                  aria-pressed={activeTab === 'after'}
                >
                  {t.beforeAfter.tabs.after}
                </button>
              </div>

              <div className={styles.companyBlock}>
                <h3 className={styles.companyTitle}>
                  <svg className={styles.companyIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {t.beforeAfter.company}
                </h3>
                <p className={styles.companyAddress}>{companyAddress}</p>
              </div>

              <div className={styles.metricsList}>
                {metrics.map(({ label, value }) => (
                  <div key={label} className={styles.metricBox}>
                    <span className={styles.metricLabel}>{label}</span>
                    <span className={isBad ? styles.valuePillBad : styles.valuePillGood}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.rightPanel}>
              <div className={styles.heatmapContainer}>
                <HeatmapMap mode={activeTab} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BeforeAfterSection;
