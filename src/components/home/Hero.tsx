"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNativeCountryName } from '@/data/nativeCountryNames';
import PremiumButton from '../ui/PremiumButton';
import styles from './Hero.module.css';

const Hero: React.FC = () => {
  const { t } = useLanguage();
  const [location, setLocation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/?fields=city,country_name,country_code');
        if (!res.ok) throw new Error('Geo fetch failed');
        const data = await res.json() as { city?: string; country_name?: string; country_code?: string };
        const city = data?.city ?? '';
        const countryEnglish = data?.country_name ?? '';
        const countryCode = data?.country_code ?? '';
        const country = getNativeCountryName(countryCode, countryEnglish);
        if (!cancelled && (city || country)) {
          setLocation([country, city].filter(Boolean).join(', '));
        }
      } catch {
        /* Leave location null so the block is hidden */
      }
    };
    fetchLocation();
    return () => { cancelled = true; };
  }, []);

  // Split title to apply formatting
  const titleParts = t.hero.title.split(',');

  return (
    <section className={styles.hero}>
      {/* Sliding Gradient Background */}
      <div className={styles.animatedBg}>
        <div className={styles.bgChunk} />
        <div className={styles.bgChunk2} />
        <div className={styles.bgChunk3} />
      </div>

      <div className={`container ${styles.container}`}>
        <div className={styles.heroGrid}>
          <div className={styles.heroLeft}>
            {location ? (
              <motion.p 
                className={styles.location}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              >
                <span className={styles.locationDot} /> {location}
              </motion.p>
            ) : null}

            <motion.h1 
              className={styles.title}
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            >
              <span className="thin">{titleParts[0]}{titleParts.length > 1 ? ',' : ''}</span> {titleParts.length > 1 && <em>{titleParts[1]}</em>}
            </motion.h1>

            <motion.p 
              className={styles.subtitle}
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 0.8, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            >
              {t.hero.subtitle}
            </motion.p>

            <motion.div 
              className={styles.ctas}
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            >
              <PremiumButton href="#pricing" iconDirection="down">{t.hero.packagesBtn}</PremiumButton>
              <PremiumButton href="#process" variant="white" iconDirection="right">{t.hero.howItWorksBtn}</PremiumButton>
            </motion.div>
          </div>

          <motion.div 
            className={styles.heroRight}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <div className={styles.videoPlaceholder}>
              <video
                ref={videoRef}
                className={styles.videoPreview}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-label="Hero video preview"
              >
                <source src="/wp-content/uploads/2024/11/background.mp4" type="video/mp4" />
              </video>
              <button
                type="button"
                className={styles.playButton}
                onClick={() => {
                  const video = videoRef.current;
                  if (video) {
                    video.muted = false;
                    video.play().catch(() => {});
                    setIsPlaying(true);
                  }
                }}
                aria-label="Play video with sound"
                style={{ opacity: isPlaying ? 0 : 1, pointerEvents: isPlaying ? 'none' : 'auto' }}
              >
                <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.25)" />
                  <path d="M10 8v8l6-4-6-4z" fill="#fff" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className={styles.metrics}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
        >
          <div className={styles.metric}>
            <span className={styles.metricIcon} aria-hidden>👤</span>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>24+</span>
              <span className={styles.metricLabel}>{t.hero.metrics.clients}</span>
            </div>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricIcon} aria-hidden>🌱</span>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>4</span>
              <span className={styles.metricLabel}>{t.hero.metrics.experience}</span>
            </div>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricIcon} aria-hidden>⚡</span>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{t.hero.metrics.lightning}</span>
              <span className={styles.metricLabel}>{t.hero.metrics.results}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
