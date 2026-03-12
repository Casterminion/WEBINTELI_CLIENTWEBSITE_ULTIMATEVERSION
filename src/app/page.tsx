"use client";

import Hero from "@/components/home/Hero";
import AdvantageSection from "@/components/home/AdvantageSection";
import BeforeAfterSection from "@/components/home/BeforeAfterSection";
import ProcessSection from "@/components/home/ProcessSection";
import PricingSection from "@/components/home/PricingSection";
import FAQSection from "@/components/home/FAQSection";
import Contact from "@/components/home/Contact";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.main}>
      <Hero />
      <AdvantageSection />
      <BeforeAfterSection />
      <ProcessSection />
      <FAQSection />
      <PricingSection />

      <section className={styles.bottomCta}>
        <div className="container text-center">
            <h2 className={styles.ctaTitle}>Ready to Dominate Your <span className="thin">Local Market?</span></h2>
            <div className={styles.ctaWrap}>
                <a href="/#kontaktai" className={styles.mainCta}>
                    <span className={styles.ctaText}>Let's Talk Results</span>
                </a>
            </div>
        </div>
      </section>

      <Contact />
    </div>
  );
}
