"use client";

import React from "react";
import Link from "next/link";
import styles from "./UpdatingOverlay.module.css";
import dynamic from "next/dynamic";

const Galaxy = dynamic(() => import("./Galaxy"), { ssr: false });

interface UpdatingOverlayProps {
  /** Optional page title shown above the message (default: "Currently Updating") */
  title?: string;
  /** Main message (default: "Currently Updating") */
  message?: string;
  /** Subtext below the message */
  subtext?: string;
  /** Show back to home link */
  showBackLink?: boolean;
}

export function UpdatingOverlay({
  title,
  message = "Currently Updating",
  subtext = "System optimization in progress. Check back soon for the updated experience.",
  showBackLink = true,
}: UpdatingOverlayProps) {
  const secondaryMessage = title || message;
  const [typedTitle, setTypedTitle] = React.useState("");
  const [typedSubtext, setTypedSubtext] = React.useState("");
  const [isTitleDone, setIsTitleDone] = React.useState(false);

  // Typewriter for Title
  React.useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      setTypedTitle(secondaryMessage.slice(0, currentIdx + 1));
      currentIdx++;
      if (currentIdx >= secondaryMessage.length) {
        clearInterval(interval);
        setTimeout(() => setIsTitleDone(true), 300); // 300ms pause before subtext starts
      }
    }, 50);

    return () => clearInterval(interval);
  }, [secondaryMessage]);

  // Typewriter for Subtext - starts after title is done
  React.useEffect(() => {
    if (!subtext || !isTitleDone) return;
    
    let currentIdx = 0;
    const interval = setInterval(() => {
      setTypedSubtext(subtext.slice(0, currentIdx + 1));
      currentIdx++;
      if (currentIdx >= subtext.length) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [subtext, isTitleDone]);


  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.galaxyBackground}>
        <Galaxy 
          mouseRepulsion
          mouseInteraction
          density={1}
          glowIntensity={0.3}
          saturation={0}
          hueShift={140}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          repulsionStrength={2}
          autoCenterRepulsion={0}
          starSpeed={0.5}
          speed={1}
          transparent={false}
        />

      </div>

      {showBackLink && (
        <Link href="/" className={styles.backLink}>
          ← BACK TO HOME
        </Link>
      )}

      <div className={styles.content}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.mainTitle}>
            {typedTitle}
            {!isTitleDone && <span className={styles.cursor}>_</span>}
          </h1>
          <div className={styles.titleUnderline} />
        </div>
        
        <div className={styles.textWrap}>
          {typedSubtext && (
            <p className={styles.subtext}>
              {typedSubtext}
              <span className={styles.cursor}>_</span>
            </p>
          )}
        </div>
      </div>


      <div className={styles.statusIndicator}>
        <div className={styles.blink} />
        <span>System Status: OFFLINE / UPDATING</span>
      </div>
    </div>
  );
}





