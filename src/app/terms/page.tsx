import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Fresco',
  description: 'The terms and conditions governing your use of the Fresco platform.',
};

const LAST_UPDATED = 'June 15, 2026';
const CONTACT_EMAIL = 'info@frescolab.io';
const APP_URL = 'https://app.frescolab.io';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter, sans-serif)' }}>
      {/* Nav */}
      <header style={{ borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/fresco-logo.png" alt="Fresco" style={{ width: 28, height: 28 }} />
            <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>Fresco</span>
          </Link>
          <Link href={APP_URL} style={{ fontSize: 13, color: '#6b6b6b', textDecoration: 'none' }}>
            Back to app →
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 120px' }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8a8a8a', marginBottom: 16 }}>Legal</p>
          <h1 style={{ fontSize: 36, fontWeight: 500, color: '#1a1a1a', marginBottom: 12, lineHeight: 1.2 }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: '#8a8a8a' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.8, color: '#4a4a4a' }}>

          <Section title="Agreement to terms">
            <p>By accessing or using the Fresco platform at app.frescolab.io (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.</p>
            <p>We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </Section>

          <Section title="Description of service">
            <p>Fresco is a decision engine for startup founders. It runs the decision you describe through structured AI-assisted analysis and returns a verdict — GO, PIVOT, STOP, or NEEDS MORE SIGNAL — together with the reasoning behind it, alongside workspace tools to record and revisit your decisions over time.</p>
            <p>The Service is provided on a subscription basis. A free tier may be available with limited functionality. Paid plans unlock additional features as described on the pricing page.</p>
          </Section>

          <Section title="Accounts">
            <p>You must create an account to use the Service. You are responsible for:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
              <li style={{ marginBottom: 8 }}>Maintaining the confidentiality of your account credentials</li>
              <li style={{ marginBottom: 8 }}>All activity that occurs under your account</li>
              <li style={{ marginBottom: 8 }}>Ensuring your account information is accurate and up to date</li>
            </ul>
            <p style={{ marginTop: 16 }}>You must be at least 16 years old to use the Service. By creating an account, you confirm that you meet this requirement.</p>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to use the Service to:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
              <li style={{ marginBottom: 8 }}>Violate any applicable laws or regulations</li>
              <li style={{ marginBottom: 8 }}>Infringe the intellectual property rights of others</li>
              <li style={{ marginBottom: 8 }}>Upload or transmit harmful, offensive, or illegal content</li>
              <li style={{ marginBottom: 8 }}>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
              <li style={{ marginBottom: 8 }}>Interfere with or disrupt the Service or its servers</li>
              <li style={{ marginBottom: 8 }}>Use automated tools to scrape, crawl, or extract data from the Service without permission</li>
              <li style={{ marginBottom: 8 }}>Resell or redistribute access to the Service without our prior written consent</li>
            </ul>
          </Section>

          <Section title="Your content">
            <p>You retain ownership of the content you create within Fresco — your workspaces, sessions, notes, and any other material you submit ("Your Content").</p>
            <p>By using the Service, you grant us a limited, non-exclusive licence to store, process, and display Your Content solely as necessary to provide the Service to you.</p>
            <p>You are solely responsible for Your Content. We do not review content for accuracy or appropriateness, and we are not liable for any content you create or submit.</p>
          </Section>

          <Section title="AI-generated content">
            <p>The Service uses AI models to generate outputs based on content you provide. AI-generated content is provided as-is and may not always be accurate, complete, or appropriate for your purposes.</p>
            <p>You are responsible for reviewing and verifying any AI-generated content before relying on it for decisions. We make no warranty regarding the accuracy, reliability, or fitness of AI outputs.</p>
            <p>You retain ownership of AI outputs generated from Your Content within the Service, subject to any applicable terms from our AI providers.</p>
          </Section>

          <Section title="Subscriptions and billing">
            <Subsection title="Paid plans">
              <p>Paid subscriptions are billed in advance on a monthly or annual basis. Prices are displayed on the pricing page and may change with notice.</p>
            </Subsection>
            <Subsection title="Cancellation">
              <p>You may cancel your subscription at any time from your account settings. Your access to paid features will continue until the end of the current billing period. We do not provide refunds for partial periods unless required by law.</p>
            </Subsection>
            <Subsection title="Free trial">
              <p>If we offer a free trial, it will be described at the time of sign-up. After the trial period, your subscription will automatically convert to a paid plan unless you cancel.</p>
            </Subsection>
          </Section>

          <Section title="Intellectual property">
            <p>The Service, including its design, code, branding, and all content created by Fresco (excluding Your Content), is owned by us and protected by intellectual property laws.</p>
            <p>You may not copy, modify, distribute, sell, or otherwise use our intellectual property without our prior written consent, except as expressly permitted by these Terms.</p>
          </Section>

          <Section title="Disclaimers">
            <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
              <li style={{ marginBottom: 8 }}>The Service will be uninterrupted, error-free, or secure</li>
              <li style={{ marginBottom: 8 }}>Any content or AI outputs will be accurate or reliable</li>
              <li style={{ marginBottom: 8 }}>The Service will meet your specific requirements</li>
            </ul>
            <p style={{ marginTop: 16 }}>To the fullest extent permitted by law, we disclaim all implied warranties, including merchantability and fitness for a particular purpose.</p>
          </Section>

          <Section title="Limitation of liability">
            <p>To the maximum extent permitted by applicable law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the Service — including but not limited to loss of profits, data, or goodwill.</p>
            <p>Our total liability to you for any claim arising out of or relating to these Terms or the Service shall not exceed the amount you paid us in the twelve months preceding the claim, or £100 (whichever is greater).</p>
          </Section>

          <Section title="Termination">
            <p>We may suspend or terminate your access to the Service at any time if we reasonably believe you have violated these Terms, with or without notice.</p>
            <p>You may delete your account at any time from your account settings. On termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination (including intellectual property, disclaimers, and limitation of liability) will do so.</p>
          </Section>

          <Section title="Governing law">
            <p>These Terms are governed by and construed in accordance with applicable law. Any disputes will be resolved in the courts of competent jurisdiction.</p>
          </Section>

          <Section title="Contact">
            <p>For any questions about these Terms, please contact us at:</p>
            <p style={{ marginTop: 12 }}>
              <strong>Fresco</strong><br />
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#1a1a1a' }}>{CONTACT_EMAIL}</a>
            </p>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e5e5e5', padding: '32px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 24, fontSize: 13, color: '#8a8a8a' }}>
          <Link href="/privacy" style={{ color: '#8a8a8a', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: '#1a1a1a', textDecoration: 'none', fontWeight: 500 }}>Terms of Service</Link>
          <span style={{ marginLeft: 'auto' }}>© {new Date().getFullYear()} Fresco</span>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1a1a1a', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e5e5e5' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 500, color: '#2d2d2d', marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}
