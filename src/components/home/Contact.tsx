'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSkipAnimation } from '@/lib/hooks';
import { PHONE_DISPLAY, PHONE_TEL } from '@/lib/phone';
import PremiumButton from '../ui/PremiumButton';
import styles from './Contact.module.css';

const Contact: React.FC = () => {
  const { t } = useLanguage();
  const skipAnim = useSkipAnimation('kontaktai');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    city: '',
    industry: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact SEO form submit', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <section id="kontaktai" className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          <motion.div 
            className={styles.content}
            initial={skipAnim ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={styles.title}>
              {t.contact.title.includes(t.contact.highlight) ? (
                <>
                  {t.contact.title.split(t.contact.highlight)[0]}
                  <span className="thin">{t.contact.highlight}</span>
                </>
              ) : t.contact.title}
            </h2>
            <p className={styles.subtitle}>
              {t.contact.subtitle}
            </p>
            
            <div className={styles.info}>
                <div className={styles.infoItem}>
                    <span>{t.contact.emailLabel}</span>
                    <a href="mailto:kontaktai@webinteli.lt">kontaktai@webinteli.lt</a>
                </div>
                <div className={styles.infoItem}>
                    <span>{t.contact.phoneLabel}</span>
                    <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
                </div>
            </div>
          </motion.div>

          <motion.form 
            id="SEO"
            className={styles.form}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            onSubmit={handleSubmit}
          >
            <p className={styles.formIntro}>{t.intake.intro}</p>
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
            <PremiumButton type="submit" className={styles.submitBtn}>
              {t.intake.form.button}
            </PremiumButton>
            <Link href="/#pricing" className={styles.backLink}>
              {t.intake.back}
            </Link>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
