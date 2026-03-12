"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useSkipAnimation } from '@/lib/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './ProcessSection.module.css';

const ProcessSection: React.FC = () => {
  const { t } = useLanguage();
  const skipAnim = useSkipAnimation('process');

  return (
    <section className={styles.section} id="process">
      <div className="container">
        <motion.div 
          className={styles.header}
          initial={skipAnim ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className={styles.tag}>{t.process.tag}</p>
          <h2 className={styles.title}>
            {t.process.title.includes('easy') || t.process.title.includes('paprasta') ? (
              <>
                {t.process.title.split(t.process.title.includes('easy') ? 'easy' : 'paprasta')[0]}
                <span className="thin">{t.process.title.includes('easy') ? 'easy.' : 'paprasta.'}</span>
              </>
            ) : t.process.title}
          </h2>
        </motion.div>

        <div className={styles.stepsContainer}>
          {t.process.steps.map((step: any, i: number) => (
            <motion.div 
              key={i}
              className={styles.stepCard}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <div className={styles.stepNum}>{step.num}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
