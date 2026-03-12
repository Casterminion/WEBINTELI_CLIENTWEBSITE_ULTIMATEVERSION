"use client";

import React from 'react';
import { motion } from 'framer-motion';
import PremiumButton from '../ui/PremiumButton';
import styles from './WhyUsSection.module.css';

const WhyUsSection: React.FC = () => {
  const points = [
    "Individualus dėmesys kiekvienam projektui",
    "Jokių standartinių šablonų. Kiekvienam projektui sukuriama speciali tema",
    "Speciali programavimo technika leidžianti pasiekti idealius GOOGLE rodiklius be jokių kešavimo įskiepių",
    "Jokių mėnesinių ar priežiūros mokesčių – prižiūrėkite svetaines ar elektronines parduotuves patys",
    "Protingos kainos, greitas kūrimas"
  ];

  return (
    <section className={styles.section}>
      <div className={styles.videoBg}>
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          className={styles.video}
        >
          <source src="/wp-content/uploads/2024/11/background.mp4" type="video/mp4" />
        </video>
        <div className={styles.overlay} />
      </div>

      <div className="container relative z-10">
        <motion.div 
          className={styles.content}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className={styles.title}>Kodėl<span className="thin"> rinktis mus?</span></h2>
          
          <div className={styles.points}>
            {points.map((p, i) => (
              <motion.h3 
                key={i} 
                className={styles.point}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              >
                {p}
              </motion.h3>
            ))}
          </div>

          <motion.div 
            className={styles.footer}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <PremiumButton href="#kontaktai">SUSISIEKITE</PremiumButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyUsSection;
