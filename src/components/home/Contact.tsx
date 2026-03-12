import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSkipAnimation } from '@/lib/hooks';
import PremiumButton from '../ui/PremiumButton';
import styles from './Contact.module.css';

const Contact: React.FC = () => {
  const { t } = useLanguage();
  const skipAnim = useSkipAnimation('kontaktai');

  return (
    <section id="kontaktai" className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          <motion.div 
            className={styles.content}
            initial={skipAnim ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={styles.title}>
              {t.contact.title.includes(t.contact.highlight) ? (
                <>
                  {t.contact.title.split(t.contact.highlight)[0]}
                  <span className="thin">{t.contact.highlight}</span>
                </>
              ) : t.contact.title}
            </h2>
            <p className={styles.subtitle}>
              {t.contact.subtitle}
            </p>
            
            <div className={styles.info}>
                <div className={styles.infoItem}>
                    <span>{t.contact.emailLabel}</span>
                    <a href="mailto:kontaktai@webinteli.lt">kontaktai@webinteli.lt</a>
                </div>
                <div className={styles.infoItem}>
                    <span>{t.contact.phoneLabel}</span>
                    <a href="tel:+37060521705">+370 605 21705</a>
                </div>
            </div>
          </motion.div>

          <motion.form 
            id="SEO"
            className={styles.form}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className={styles.inputGroup}>
                <input type="text" placeholder={t.contact.form.name} required />
            </div>
            <div className={styles.inputGroup}>
                <input type="email" placeholder={t.contact.form.email} required />
            </div>
            <div className={styles.inputGroup}>
                <input type="text" placeholder={t.contact.form.website} />
            </div>
            <div className={styles.inputGroup}>
                <textarea placeholder={t.contact.form.message} rows={4} required></textarea>
            </div>
            <PremiumButton className={styles.submitBtn}>{t.contact.form.button}</PremiumButton>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
