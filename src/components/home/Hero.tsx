"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import PremiumButton from "../ui/PremiumButton";
import styles from "./Hero.module.css";

const GUMLET_ASSET_ID = "69c14fc024ffd038ef73ab00";

function buildGumletEmbedUrl(opts: {
  autoplay: boolean;
  muted?: boolean;
  cacheBust?: number;
}): string {
  const params = new URLSearchParams({
    background: "false",
    autoplay: String(opts.autoplay),
    loop: "false",
    disable_player_controls: "false",
    // Gumlet: omit default subtitles on load (no auto captions overlay)
    captions: "false",
  });
  if (opts.muted !== undefined) {
    params.set("muted", String(opts.muted));
  }
  if (opts.cacheBust != null) {
    params.set("_rc", String(opts.cacheBust));
  }
  return `https://play.gumlet.io/embed/${GUMLET_ASSET_ID}?${params.toString()}`;
}

type GumletHeroPlayerProps = {
  tapLabel: string;
  playHint: string;
};

/** Muted autoplay preview; first tap reloads embed from 0 (no autoplay) so user can press play with sound in Gumlet UI. */
function GumletHeroPlayer({ tapLabel, playHint }: GumletHeroPlayerProps) {
  const [engaged, setEngaged] = useState(false);
  const [engageToken, setEngageToken] = useState(0);

  const src = engaged
    ? buildGumletEmbedUrl({ autoplay: false, cacheBust: engageToken })
    : buildGumletEmbedUrl({ autoplay: true, muted: true });

  const onEngage = useCallback(() => {
    setEngageToken(Date.now());
    setEngaged(true);
  }, []);

  return (
    <div className={styles.gumletWrap}>
      <iframe
        key={engaged ? `engaged-${engageToken}` : "preview"}
        loading="lazy"
        title="Gumlet video player"
        src={src}
        className={styles.gumletIframe}
        referrerPolicy="origin"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
      />
      {!engaged && (
        <button
          type="button"
          className={styles.gumletOverlay}
          onClick={onEngage}
          aria-label={tapLabel}
        >
          <span className={styles.gumletOverlayText}>{tapLabel}</span>
          <span className={styles.gumletPlayCircle} aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 8v8l6-4-6-4z" fill="#fff" />
            </svg>
          </span>
        </button>
      )}
      {engaged && (
        <p className={styles.gumletHint} role="status">
          {playHint}
        </p>
      )}
    </div>
  );
}

const Hero: React.FC = () => {
  const { t } = useLanguage();

  // Split title to apply formatting
  const titleParts = t.hero.title.split(",");

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
            <motion.p
              className={styles.location}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            >
              <span className={styles.locationDot} aria-hidden />
              {t.hero.spotsLeftThisMonth ?? "1 spot left this month…"}
            </motion.p>

            <motion.h1
              className={styles.title}
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            >
              <span className="thin">
                {titleParts[0]}
                {titleParts.length > 1 ? "," : ""}
              </span>{" "}
              {titleParts.length > 1 && <em>{titleParts[1]}</em>}
            </motion.h1>

            {/* Mobile-only inline video between title and subtitle */}
            <div className={styles.mobileInlineVideo}>
              <div className={styles.videoPlaceholder}>
                <GumletHeroPlayer
                  tapLabel={t.hero.gumletTapToWatch}
                  playHint={t.hero.gumletPlayHint}
                />
              </div>
            </div>

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
              <PremiumButton href="#pricing" iconDirection="down">
                {t.hero.packagesBtn}
              </PremiumButton>
              <PremiumButton href="#process" variant="white" iconDirection="right">
                {t.hero.howItWorksBtn}
              </PremiumButton>
            </motion.div>
          </div>

          <motion.div
            className={styles.heroRight}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <div className={styles.videoPlaceholder}>
              <GumletHeroPlayer
                tapLabel={t.hero.gumletTapToWatch}
                playHint={t.hero.gumletPlayHint}
              />
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
            <span className={styles.metricIcon} aria-hidden>
              👤
            </span>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>24+</span>
              <span className={styles.metricLabel}>{t.hero.metrics.clients}</span>
            </div>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricIcon} aria-hidden>
              🌱
            </span>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>4</span>
              <span className={styles.metricLabel}>{t.hero.metrics.experience}</span>
            </div>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricIcon} aria-hidden>
              ⚡
            </span>
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
