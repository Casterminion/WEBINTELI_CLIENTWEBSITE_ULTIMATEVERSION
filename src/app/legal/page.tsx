import Link from 'next/link';

export default function LegalPage() {
  return (
    <div className="legalPage">
      <div className="legalWrap">
        <h1>Legal</h1>
        <p>Legal information for Webinteli. Please review our policies below.</p>
        <ul>
          <li>
            <Link href="/terms">Terms of Service</Link>
          </li>
          <li>
            <Link href="/privacy">Privacy Policy</Link>
          </li>
        </ul>
        <p style={{ marginTop: '2.5rem', fontSize: '0.875rem' }}>
          For further legal information, contact us at{' '}
          <a href="mailto:kontaktai@webinteli.lt">kontaktai@webinteli.lt</a>.
        </p>
      </div>
    </div>
  );
}
