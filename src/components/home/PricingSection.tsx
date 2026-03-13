"use client";

import React from 'react';
import { motion } from 'framer-motion';
import PremiumButton from '../ui/PremiumButton';
import { PACKAGES } from '@/data/packages';
import { useSkipAnimation } from '@/lib/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import { PHONE_DISPLAY, PHONE_TEL } from '@/lib/phone';
import styles from './PricingSection.module.css';

const PricingSection: React.FC = () => {
  const { t } = useLanguage();
  const skipAnim = useSkipAnimation('pricing');

  // Map packages to translations
  const packages = PACKAGES.map((pkg) => {
    const translatedPkg = (t.pricing.packages as any)[pkg.slug];
    return {
      ...pkg,
      ...translatedPkg,
      link: `/intake/${pkg.slug}`,
    };
  });

  return (
    <section className={styles.section} id="pricing">
      <div className="container">
        <motion.div 
          className={styles.header}
          initial={skipAnim ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className={styles.tag}>{t.pricing.tag}</p>
          <h2 className={styles.title}>
            {t.pricing.title.includes('Clients') || t.pricing.title.includes('klientų') ? (
              <>
                {t.pricing.title.split(t.pricing.title.includes('Clients') ? 'Clients' : 'klientų')[0]}
                <span className="thin">{t.pricing.title.includes('Clients') ? 'Clients' : 'klientų'}</span>
              </>
            ) : t.pricing.title}
          </h2>
        </motion.div>

        <div className={styles.sectionWrapper}>
          <div className={styles.grid}>
            {packages.map((pkg, i) => (
              <motion.div 
                key={i}
                className={styles.card}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.pkgLabel}>{pkg.name}</span>
                  <div className={styles.pkgPrice}>{pkg.price}</div>
                  {pkg.priceSub && <div className={styles.subPrice}>{pkg.priceSub}</div>}
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

                <div className={styles.cardFooter}>
                  <PremiumButton 
                    href={pkg.link} 
                    variant={pkg.highlight ? 'primary' : 'outline-black'}
                    className={styles.fullBtn}
                  >
                    {t.pricing.getStartedBtn}
                  </PremiumButton>
                  <a
                    href={`tel:${PHONE_TEL}`}
                    className={styles.callBtn}
                    aria-label={`Call ${PHONE_DISPLAY}`}
                  >
                    {t.pricing.callBtn}
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
