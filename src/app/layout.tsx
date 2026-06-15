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
    // og:image is supplied automatically by app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    // twitter:image is supplied automatically by app/twitter-image.tsx
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
