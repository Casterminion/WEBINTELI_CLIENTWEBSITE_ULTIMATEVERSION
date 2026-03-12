"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LegalPage() {
  const { t } = useLanguage();

  return (
    <div className="legalPage">
      <div className="legalWrap">
        <h1>{t.legalPage.title}</h1>
        <p>{t.legalPage.intro}</p>
        <ul>
          <li>
            <Link href="/terms">{t.termsPage.title}</Link>
          </li>
          <li>
            <Link href="/privacy">{t.privacyPage.title}</Link>
          </li>
        </ul>
        <p style={{ marginTop: '2.5rem', fontSize: '0.875rem' }}>
          {t.legalPage.contact}{' '}
          <a href="mailto:kontaktai@webinteli.lt">kontaktai@webinteli.lt</a>.
        </p>
      </div>
    </div>
  );
}
