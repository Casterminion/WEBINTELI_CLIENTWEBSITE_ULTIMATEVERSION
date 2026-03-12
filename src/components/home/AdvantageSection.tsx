import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSkipAnimation } from '@/lib/hooks';
import styles from './AdvantageSection.module.css';

const AdvantageSection: React.FC = () => {
  const { t } = useLanguage();
  const skipAnim = useSkipAnimation('advantage');

  // Logic to handle the 'thin' part (usually the last 2 words if they are "Worth It?" or similar)
  // For simplicity, we can split by a custom marker or just handle it as we did for Hero.
  const titleParts = t.advantage.title.split('?');

  return (
    <section className={styles.section} id="advantage">
      <div className="container">
        <motion.div 
          className={styles.header}
          initial={skipAnim ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className={styles.tag}>{t.advantage.tag}</p>
          <h2 className={styles.title}>
            {t.advantage.title.includes('Worth It') || t.advantage.title.includes('verta') ? (
              <>
                {t.advantage.title.split(t.advantage.title.includes('Worth It') ? 'Worth It' : 'verta')[0]}
                <span className="thin">{t.advantage.title.includes('Worth It') ? 'Worth It?' : 'verta?'}</span>
              </>
            ) : t.advantage.title}
          </h2>
        </motion.div>

        <div className={styles.grid}>
          {t.advantage.cards.map((adv: any, i: number) => (
            <motion.div
              key={i}
              className={styles.card}
              initial={skipAnim ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: skipAnim ? 0 : i * 0.2 }}
            >
              <h3 className={styles.cardTitle}>{adv.title}</h3>
              <p className={styles.cardText}>{adv.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdvantageSection;
