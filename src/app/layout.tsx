import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from '@/lib/theme';
import { SessionProvider } from '@/components/providers/SessionProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const TITLE = 'Fresco — A decision engine for startup founders';
const DESCRIPTION =
  'Run the decision you\'re facing through structured analysis and get a clear verdict — GO, PIVOT, STOP, or NEEDS MORE SIGNAL — with the reasoning that produced it.';

export const metadata: Metadata = {
  // Absolute base so the file-based opengraph-image/twitter-image routes
  // resolve to absolute URLs (required by X, Slack, etc.).
  metadataBase: new URL('https://app.frescolab.io'),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: '/fresco-logo.png',
    apple: '/fresco-logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Fresco',
    url: 'https://app.frescolab.io',
    title: TITLE,
    description: DESCRIPTION,
    // Clean image URL (no ?hash) served by app/opengraph-image/route.tsx —
    // X won't reliably card a query-string image URL.
    images: [{ url: 'https://app.frescolab.io/opengraph-image', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://app.frescolab.io/opengraph-image'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
