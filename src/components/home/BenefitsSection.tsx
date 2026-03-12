"use client";

import React from 'react';
import { motion } from 'framer-motion';
import PremiumButton from '../ui/PremiumButton';
import styles from './BenefitsSection.module.css';

const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      num: "I.",
      text: "<strong>Didina</strong> svetainės pozicijas Google paieškoje"
    },
    {
      num: "II.",
      text: "<strong>Pagerina</strong> konversijų rodiklius ir pardavimus"
    },
    {
      num: "III.",
      text: "<strong>Padeda</strong> aplenkti konkurentus paieškos rezultatuose"
    }
  ];

  return (
    <section className={styles.section}>
      <div className="container">
        <motion.div 
          className={styles.header}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className={styles.title}>Kodėl tai <span className="thin">svarbu?</span></h2>
          <h3 className={styles.subtitle}>Geresnis Google PageSpeed balas užtikrina geresnį matomumą internete</h3>
          <p className={styles.description}>
            Google PageSpeed balai tiesiogiai veikia jūsų paieškos pozicijas ir matomumą internete. 
            Greitesnės svetainės išlaiko daugiau lankytojų, didina jų įsitraukimą ir skatina konversijas. 
            Lėta svetainė ne tik mažina vartotojų pasitenkinimą, bet ir lemia žymiai blogesnius SEO rezultatus.
          </p>
        </motion.div>

        <div className={styles.grid}>
          {benefits.map((b, i) => (
            <motion.div 
              key={i}
              className={styles.card}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
            >
              <div className={styles.num}>{b.num}</div>
              <p className={styles.cardText} dangerouslySetInnerHTML={{ __html: b.text }} />
            </motion.div>
          ))}
        </div>

        <motion.div 
          className={styles.footer}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <PremiumButton variant="outline-black" href="/pagespeed-reiksme">
            PAGESPEED SVARBA PAIEŠKOS REZULTATAMS
          </PremiumButton>
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;
