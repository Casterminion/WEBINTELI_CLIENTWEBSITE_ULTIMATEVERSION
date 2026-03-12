"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useSkipAnimation } from '@/lib/hooks';
import styles from './FeatureSection.module.css';

interface FeatureProps {
  number: string;
  title: string;
  description: string;
  image?: string;
  reverse?: boolean;
}

const FeatureSection: React.FC<FeatureProps> = ({ number, title, description, image, reverse }) => {
  const skipAnim = useSkipAnimation(title.toLowerCase().replace(/ /g, '-')); // Fallback logic or just false if no ID

  return (
    <section className={styles.section}>
      <div className={`container ${styles.flexContainer} ${reverse ? styles.reverse : ''}`}>
        <div className={styles.contentWrap}>
          <motion.div 
            initial={skipAnim ? false : { opacity: 0, x: reverse ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className={styles.number}>{number}</div>
            <h2 className={styles.title}>
              {title.split(' ').map((word, i) => (
                <span key={i} className={i % 2 === 1 ? 'thin' : ''}>{word} </span>
              ))}
            </h2>
            <p className={styles.description}>
              {description}
            </p>
          </motion.div>
        </div>
        <div className={styles.imageWrap}>
          <motion.div 
            className={styles.imageContainer}
            initial={skipAnim ? false : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {image ? (
                <Image 
                  src={image} 
                  alt={title} 
                  className={styles.img} 
                  width={600} 
                  height={400} 
                  style={{ objectFit: 'cover' }}
                />
            ) : (
                <div className={styles.placeholder}>Image Placeholder</div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
