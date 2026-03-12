"use client";

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPage() {
  const { t } = useLanguage();
  const p = t.privacyPage;

  return (
    <div className="legalPage">
      <div className="legalWrap">
        <h1>{p.title}</h1>
        <p className="legalUpdated">{p.updated}</p>

        <p>{p.intro}</p>
        <ul>
          {p.compliance.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p>{p.agree}</p>

        <section>
          <h2>{p.sections.controller.title}</h2>
          <p><strong>webinteli</strong></p>
          <p>{p.sections.controller.address}</p>
          <p>{p.sections.controller.email} <a href="mailto:data@webinteli.lt">data@webinteli.lt</a></p>
          <p>{p.sections.controller.phone}</p>
        </section>

        <section>
          <h2>{p.sections.collect.title}</h2>
          <p>{p.sections.collect.intro}</p>

          <h3>{p.sections.collect.provideTitle}</h3>
          <ul>
            {p.sections.collect.provideItems.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <h3>{p.sections.collect.autoTitle}</h3>
          <ul>
            {p.sections.collect.autoItems.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <h3>{p.sections.collect.aiTitle}</h3>
          <p>{p.sections.collect.aiIntro}</p>
          <ul>
            {p.sections.collect.aiItems.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p><strong>{p.sections.collect.aiImportant}</strong></p>
        </section>

        <section>
          <h2>{p.sections.purposes.title}</h2>
          <p>{p.sections.purposes.groundsIntro}</p>
          <ul>
            {p.sections.purposes.grounds.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{p.sections.purposes.purposesIntro}</p>
          <ul>
            {p.sections.purposes.purposes.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{p.sections.retention.title}</h2>
          <ul>
            {p.sections.retention.items.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{p.sections.retention.outro}</p>
        </section>

        <section>
          <h2>{p.sections.storage.title}</h2>
          <p>{p.sections.storage.intro}</p>

          <h3>{p.sections.storage.euTitle}</h3>
          <p>{p.sections.storage.euIntro}</p>
          <ul>
            {p.sections.storage.euItems.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{p.sections.storage.euCompliance}</p>

          <h3>{p.sections.storage.usTitle}</h3>
          <p>{p.sections.storage.usIntro}</p>
          <ul>
            {p.sections.storage.usItems.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{p.sections.storage.usMeasuresIntro}</p>
          <ul>
            {p.sections.storage.usMeasures.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{p.sections.rights.title}</h2>
          <p>{p.sections.rights.intro}</p>
          <ul>
            {p.sections.rights.items.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{p.sections.rights.outro}</p>
          <p>{p.sections.rights.response}</p>
        </section>

        <section>
          <h2>{p.sections.security.title}</h2>
          <p>{p.sections.security.intro}</p>
          <ul>
            {p.sections.security.items.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{p.sections.cookies.title}</h2>
          <p><em>{p.sections.cookies.fullVersion}</em></p>

          <h3>{p.sections.cookies.whatTitle}</h3>
          <p>{p.sections.cookies.whatIntro}</p>

          <h3>{p.sections.cookies.typesTitle}</h3>
          <h4>{p.sections.cookies.types.essential.title}</h4>
          <p>{p.sections.cookies.types.essential.desc}</p>

          <h4>{p.sections.cookies.types.analytics.title}</h4>
          <p>{p.sections.cookies.types.analytics.desc}</p>

          <h4>{p.sections.cookies.types.functional.title}</h4>
          <p>{p.sections.cookies.types.functional.desc}</p>

          <h4>{p.sections.cookies.types.marketing.title}</h4>
          <p>{p.sections.cookies.types.marketing.desc}</p>

          <h3>{p.sections.cookies.managementTitle}</h3>
          <p>{p.sections.cookies.managementIntro}</p>
          <ul>
            {p.sections.cookies.managementItems.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <h3>{p.sections.cookies.thirdPartyTitle}</h3>
          <p>{p.sections.cookies.thirdPartyIntro}</p>

          <h3>{p.sections.cookies.updatesTitle}</h3>
          <p>{p.sections.cookies.updatesIntro}</p>
        </section>

        <section>
          <h2>{p.sections.contact.title}</h2>
          <p>
            {p.sections.contact.intro} <a href="mailto:data@webinteli.lt">data@webinteli.lt</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
