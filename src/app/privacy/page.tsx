export default function PrivacyPage() {
  return (
    <div className="legalPage">
      <div className="legalWrap">
        <h1>Privacy Policy</h1>
        <p className="legalUpdated">Last updated: December 1, 2025</p>

        <p>
          This privacy policy explains how webinteli (&quot;We&quot;, &quot;Our&quot;, &quot;Company&quot;) collects, processes, and protects your personal data. We comply with:
        </p>
        <ul>
          <li>EU GDPR (Regulation 2016/679)</li>
          <li>ePrivacy Directive</li>
          <li>Lithuanian Republic Law on Legal Protection of Personal Data</li>
          <li>International Data Transfer Rules</li>
          <li>AI Sector Best Practices</li>
        </ul>
        <p>By using our website and services, you agree to this policy.</p>

        <section>
          <h2>1. Data Controller</h2>
          <p><strong>webinteli</strong></p>
          <p>Address: Kaunas</p>
          <p>Email: <a href="mailto:data@webinteli.lt">data@webinteli.lt</a></p>
          <p>Phone: +370 605 21705</p>
        </section>

        <section>
          <h2>2. What Personal Data We Collect</h2>
          <p>We only collect data necessary for providing services, fulfilling legal obligations, and website operation.</p>

          <h3>2.1. Data you provide</h3>
          <ul>
            <li>First name, last name</li>
            <li>Email</li>
            <li>Phone number</li>
            <li>Company name and details</li>
            <li>Inquiry / consultation content</li>
            <li>Information provided in projects</li>
          </ul>

          <h3>2.2. Automatically collected data</h3>
          <ul>
            <li>IP address</li>
            <li>Device type</li>
            <li>Browser information</li>
            <li>Access logs</li>
            <li>Cookies</li>
            <li>Usage events (event logs)</li>
          </ul>

          <h3>2.3. AI and automation data</h3>
          <p>When using our AI agents, voice systems, automation, or document analysis, you may provide:</p>
          <ul>
            <li>Conversation text</li>
            <li>Voice recordings (if voice technology is used)</li>
            <li>Documents for analysis (PDF, DOCX, etc.)</li>
            <li>Structured data from integrations</li>
            <li>CRM records</li>
            <li>Emails / tasks (if integrated)</li>
          </ul>
          <p><strong>Important:</strong> We never use your data to train AI models unless you explicitly consent in writing.</p>
        </section>

        <section>
          <h2>3. Data Processing Purposes and Legal Basis</h2>
          <p>Data processing grounds according to GDPR:</p>
          <ul>
            <li>Consent — GDPR 6(1)(a)</li>
            <li>Contract performance — GDPR 6(1)(b)</li>
            <li>Legitimate interest — GDPR 6(1)(f)</li>
            <li>Legal obligations compliance — GDPR 6(1)(c)</li>
          </ul>
          <p>Data usage purposes:</p>
          <ul>
            <li>Providing consultations</li>
            <li>AI systems development and maintenance</li>
            <li>Project execution</li>
            <li>Customer relationship management</li>
            <li>System security assurance</li>
            <li>Market analysis and service improvement</li>
            <li>Accounting and legal obligations</li>
            <li>Marketing communication (only with consent)</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Retention Period</h2>
          <ul>
            <li><strong>Inquiries:</strong> 24 months</li>
            <li><strong>AI logs:</strong> max. 30 days, unless otherwise agreed</li>
            <li><strong>CRM data:</strong> according to contract</li>
            <li><strong>Financial data:</strong> 10 years (according to Lithuanian law)</li>
            <li><strong>Cookies:</strong> according to cookie type (see cookie policy)</li>
          </ul>
          <p>After the retention period, data is deleted or anonymized.</p>
        </section>

        <section>
          <h2>5. Data Storage and Server Location</h2>
          <p>Our data infrastructure is mixed, designed for high security.</p>

          <h3>5.1. EU / EEA servers (primary location)</h3>
          <p>Data is stored in:</p>
          <ul>
            <li>Supabase (EU data centers)</li>
            <li>PostgreSQL EU regions</li>
            <li>European cloud service providers</li>
          </ul>
          <p>✔ All EU servers are 100% GDPR compliant.</p>

          <h3>5.2. US servers (when using AI or cloud infrastructure)</h3>
          <p>When using AI provider services, data may be processed in the US:</p>
          <ul>
            <li>OpenAI (Azure OpenAI or API regions)</li>
            <li>Anthropic</li>
            <li>Google Cloud</li>
            <li>AWS</li>
            <li>Azure</li>
            <li>Meta LLaMA API</li>
          </ul>
          <p>The following legal protection measures apply:</p>
          <ul>
            <li>SCC (Standard Contractual Clauses)</li>
            <li>Data pseudonymization</li>
            <li>Data minimization</li>
            <li>Option to use EU regional models (if client requests)</li>
            <li>Encrypted data transmission (TLS 1.2+)</li>
            <li>Data not used for training</li>
          </ul>
        </section>

        <section>
          <h2>8. Your Rights Under GDPR</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your data (Art. 15)</li>
            <li>Rectify data (Art. 16)</li>
            <li>Erasure (&quot;right to be forgotten&quot;) (Art. 17)</li>
            <li>Restrict processing (Art. 18)</li>
            <li>Data portability (Art. 20)</li>
            <li>Object to processing (Art. 21)</li>
            <li>Withdraw consent at any time</li>
            <li>Lodge a complaint with the DPA (Art. 77)</li>
          </ul>
          <p>
            Requests should be sent via email: <a href="mailto:data@webinteli.lt">data@webinteli.lt</a>
          </p>
          <p>We respond within 30 days.</p>
        </section>

        <section>
          <h2>9. Data Security</h2>
          <p>We implement high-level security:</p>
          <ul>
            <li>✔ Encryption (HTTPS, TLS)</li>
            <li>✔ Access controls</li>
            <li>✔ Security audits</li>
            <li>✔ Data minimization</li>
            <li>✔ User authentication</li>
            <li>✔ Isolated databases</li>
            <li>✔ Backup policy</li>
          </ul>
        </section>

        <section>
          <h2>Cookie Policy</h2>
          <p><em>Full version</em></p>

          <h3>1. What are cookies</h3>
          <p>Cookies are small text files stored in your browser.</p>

          <h3>2. Cookie types</h3>
          <h4>2.1. Essential cookies</h4>
          <p>Enable the website to function.</p>

          <h4>2.2. Analytics cookies</h4>
          <p>Used to collect statistics (Google Analytics, etc.).</p>

          <h4>2.3. Functional cookies</h4>
          <p>Save preferences.</p>

          <h4>2.4. Marketing cookies</h4>
          <p>Google Ads, Meta Pixel, TikTok Pixel. Only used with your explicit consent.</p>

          <h3>3. Cookie Management</h3>
          <p>You can:</p>
          <ul>
            <li>Grant / withdraw consent via cookie banner</li>
            <li>Delete cookies in your browser</li>
            <li>Block cookies in browser settings</li>
          </ul>

          <h3>4. Third-Party Cookies</h3>
          <p>Third parties may set their own cookies. Their policies may differ.</p>

          <h3>5. Cookie Policy Updates</h3>
          <p>Will be updated according to technology and legal changes.</p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For privacy-related questions or requests, contact us at <a href="mailto:data@webinteli.lt">data@webinteli.lt</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
