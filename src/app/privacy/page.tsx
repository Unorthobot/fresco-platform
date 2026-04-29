import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Fresco',
  description: 'How Fresco collects, uses, and protects your personal information.',
};

const LAST_UPDATED = 'March 14, 2026';
const CONTACT_EMAIL = 'info@frescolab.io';
const APP_URL = 'https://app.frescolab.io';

export default function PrivacyPage() {
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
          <h1 style={{ fontSize: 36, fontWeight: 500, color: '#1a1a1a', marginBottom: 12, lineHeight: 1.2 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: '#8a8a8a' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.8, color: '#4a4a4a' }}>

          <Section title="Overview">
            <p>Fresco ("we", "us", or "our") operates the Fresco platform at app.frescolab.io (the "Service"). This Privacy Policy explains what information we collect, how we use it, and your rights in relation to it.</p>
            <p>By using the Service, you agree to the collection and use of information in accordance with this policy.</p>
          </Section>

          <Section title="Information we collect">
            <Subsection title="Account information">
              <p>When you sign up, we collect your name, email address, and authentication credentials. If you sign in with Google, we receive your name, email, and profile picture from Google's OAuth service.</p>
            </Subsection>
            <Subsection title="Content you create">
              <p>We store the content you create within Fresco — workspaces, sessions, notes, and AI-generated outputs — in order to provide the Service. This content is yours.</p>
            </Subsection>
            <Subsection title="Usage data">
              <p>We may collect information about how you use the Service, including pages visited, features used, and actions taken. This helps us improve Fresco.</p>
            </Subsection>
            <Subsection title="Payment information">
              <p>If you subscribe to a paid plan, payment is handled by our payment processor (Lemon Squeezy). We do not store your full card details. We receive confirmation of payment and your subscription status.</p>
            </Subsection>
          </Section>

          <Section title="How we use your information">
            <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
              <li style={{ marginBottom: 8 }}>To provide, maintain, and improve the Service</li>
              <li style={{ marginBottom: 8 }}>To authenticate your identity and manage your account</li>
              <li style={{ marginBottom: 8 }}>To process payments and manage subscriptions</li>
              <li style={{ marginBottom: 8 }}>To send you service-related communications (account notices, security alerts)</li>
              <li style={{ marginBottom: 8 }}>To respond to support requests</li>
              <li style={{ marginBottom: 8 }}>To understand how the Service is used and improve it</li>
            </ul>
            <p style={{ marginTop: 16 }}>We do not sell your personal data to third parties.</p>
          </Section>

          <Section title="AI processing">
            <p>Fresco uses the Anthropic Claude API to generate AI outputs from content you submit. Content you provide to the AI generation features is sent to Anthropic for processing. Anthropic's use of this data is governed by their own privacy policy and API terms.</p>
            <p>We do not use your content to train our own models.</p>
          </Section>

          <Section title="Data storage and security">
            <p>Your data is stored in a hosted database. We take reasonable technical and organisational measures to protect your information against unauthorised access, loss, or misuse.</p>
            <p>No method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we are committed to protecting your data.</p>
          </Section>

          <Section title="Data retention">
            <p>We retain your account data and content for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or compliance reasons.</p>
          </Section>

          <Section title="Third-party services">
            <p>The Service integrates with the following third-party services, each with their own privacy policies:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
              <li style={{ marginBottom: 8 }}><strong>Google OAuth</strong> — for sign-in</li>
              <li style={{ marginBottom: 8 }}><strong>Anthropic</strong> — for AI generation</li>
              <li style={{ marginBottom: 8 }}><strong>Lemon Squeezy</strong> — for payment processing</li>
              <li style={{ marginBottom: 8 }}><strong>Supabase / Neon / PlanetScale</strong> — for database hosting</li>
            </ul>
          </Section>

          <Section title="Your rights">
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
              <li style={{ marginBottom: 8 }}><strong>Access</strong> — request a copy of the data we hold about you</li>
              <li style={{ marginBottom: 8 }}><strong>Correction</strong> — ask us to correct inaccurate data</li>
              <li style={{ marginBottom: 8 }}><strong>Deletion</strong> — request that we delete your account and data</li>
              <li style={{ marginBottom: 8 }}><strong>Portability</strong> — request your data in a portable format</li>
              <li style={{ marginBottom: 8 }}><strong>Objection</strong> — object to certain types of processing</li>
            </ul>
            <p style={{ marginTop: 16 }}>To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#1a1a1a', fontWeight: 500 }}>{CONTACT_EMAIL}</a>.</p>
          </Section>

          <Section title="Cookies">
            <p>We use cookies and similar technologies to maintain your session and remember your preferences. We do not use advertising cookies or sell cookie data.</p>
          </Section>

          <Section title="Children's privacy">
            <p>The Service is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it.</p>
          </Section>

          <Section title="Changes to this policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.</p>
          </Section>

          <Section title="Contact">
            <p>For any questions about this Privacy Policy or your data, please contact us at:</p>
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
          <Link href="/privacy" style={{ color: '#1a1a1a', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: '#8a8a8a', textDecoration: 'none' }}>Terms of Service</Link>
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
