"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSkipAnimation } from '@/lib/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './FAQSection.module.css';

const FAQSection: React.FC = () => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const skipAnim = useSkipAnimation('questions');

  return (
    <section className={styles.section} id="questions">
      <div className="container">
        <motion.div 
          className={styles.header}
          initial={skipAnim ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className={styles.tag}>{t.faq.tag}</p>
          <h2 className={styles.title}>{t.faq.title}</h2>
        </motion.div>

        <div className={styles.faqList}>
          {t.faq.questions.map((faq: any, i: number) => (
            <motion.div 
              key={i} 
              className={`${styles.faqItem} ${openIndex === i ? styles.open : ''}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <button 
                className={styles.questionBtn} 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span className={styles.questionText}>{faq.q}</span>
                <span className={`${styles.icon} ${openIndex === i ? styles.iconOpen : ''}`} aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={styles.answerWrapper}
                  >
                    <div className={styles.answerInner}>
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
