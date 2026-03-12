import { motion } from "framer-motion";
import FeatureSection from "@/components/home/FeatureSection";
import { useLanguage } from "@/contexts/LanguageContext";
import styles from "./page.module.css";

export default function PaslaugosPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.main}>
      <section className={styles.services}>
        <div className="container">
          <motion.div
            className={styles.servicesHeader}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className={styles.sectionTitle}>
              {t.paslaugosPage.title.split(t.paslaugosPage.highlight)[0]}
              <span className="thin">{t.paslaugosPage.highlight}</span>
              {t.paslaugosPage.title.split(t.paslaugosPage.highlight)[1]}
            </h1>
            <p className={styles.sectionSubtitle}>
              {t.paslaugosPage.subtitle}
            </p>
          </motion.div>
        </div>

        {t.paslaugosPage.features.map((feature: any, idx: number) => (
          <FeatureSection
            key={idx}
            number={feature.num}
            title={feature.title}
            description={feature.desc}
            image={idx % 2 === 0 ? "/wp-content/uploads/2024/11/Greitu-svetainiu-kurimas.webp" : "/wp-content/uploads/2024/11/Internetiniu-parduotuviu-kurimas-v01.webp"}
            reverse={idx % 2 !== 0}
          />
        ))}
      </section>
    </div>
  );
}
