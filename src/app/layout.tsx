import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from '@/lib/theme';
import { SessionProvider } from '@/components/providers/SessionProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Fresco — The thinking layer for your product team',
  description: 'Run any product decision through four specialist agents. Get a GO, PIVOT, STOP, or NEEDS MORE SIGNAL verdict — with the structure beneath it.',
  icons: {
    icon: '/fresco-logo.png',
    apple: '/fresco-logo.png',
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
