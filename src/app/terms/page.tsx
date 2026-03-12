"use client";

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsPage() {
  const { t } = useLanguage();
  const tm = t.termsPage;

  return (
    <div className="legalPage">
      <div className="legalWrap">
        <h1>{tm.title}</h1>
        <p className="legalUpdated">{tm.updated}</p>

        <section>
          <h2>{tm.sections.agreement.title}</h2>
          <p>{tm.sections.agreement.text}</p>
        </section>

        <section>
          <h2>{tm.sections.offer.title}</h2>
          <p>{tm.sections.offer.text}</p>
        </section>

        <section>
          <h2>{tm.sections.scope.title}</h2>
          <ul>
            {tm.sections.scope.items.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{tm.sections.need.title}</h2>
          <p>{tm.sections.need.text}</p>
        </section>

        <section>
          <h2>{tm.sections.guarantee.title}</h2>
          <p>{tm.sections.guarantee.text}</p>
        </section>

        <section>
          <h2>{tm.sections.exclusivity.title}</h2>
          <p>{tm.sections.exclusivity.text}</p>
        </section>

        <section>
          <h2>{tm.sections.nextSteps.title}</h2>
          <p>{tm.sections.nextSteps.intro}</p>
          <p>{tm.sections.nextSteps.paymentIntro}</p>
          <ul>
            {tm.sections.nextSteps.paymentMethods.map((method: string, idx: number) => (
              <li key={idx}>{method}</li>
            ))}
          </ul>
          <p>{tm.sections.nextSteps.onboarding}</p>
        </section>

        <section>
          <p>
            {tm.sections.contact.intro} <a href="mailto:kontaktai@webinteli.lt">kontaktai@webinteli.lt</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
