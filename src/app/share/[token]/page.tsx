import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import type { Metadata } from 'next';

// Public, read-only view of a shared house verdict. No auth — anyone with
// the token can read it. The payload was frozen at share time.

export const metadata: Metadata = {
  title: 'Shared verdict — Fresco',
  robots: { index: false },
};

const VERDICT_HEADLINES: Record<string, string> = {
  'GO': 'Proceed with confidence',
  'PIVOT': 'Change direction first',
  'STOP': "Don't proceed",
  'INVESTIGATE FURTHER': 'Needs more signal',
};

export default async function SharedResultPage({ params }: { params: { token: string } }) {
  const shared = await prisma.sharedResult.findUnique({
    where: { token: params.token },
  });

  if (!shared) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-medium text-gray-900 mb-2">This link doesn&apos;t exist</h1>
          <p className="text-sm text-gray-500 mb-6">It may have been mistyped, or the share was never created.</p>
          <Link href="/" className="text-sm font-medium text-gray-900 underline underline-offset-4">Go to Fresco</Link>
        </div>
      </div>
    );
  }

  const r = shared.payload as any;
  const verdict: string = r.verdict || 'INVESTIGATE FURTHER';
  const headline = VERDICT_HEADLINES[verdict] || VERDICT_HEADLINES['INVESTIGATE FURTHER'];
  const dateStr = shared.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fresco-logo.png" alt="Fresco" className="w-5 h-5" />
          <span className="text-base font-semibold text-gray-900">Fresco</span>
        </div>
        <Link href="/" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
          Run your own analysis →
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
          {shared.houseName} · shared {dateStr}
        </p>

        <div className="border border-gray-200 border-l-4 border-l-gray-900 p-6 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            {verdict === 'INVESTIGATE FURTHER' ? 'MORE SIGNAL' : verdict}
          </p>
          <h1 className="text-2xl font-medium text-gray-900 mb-3">{headline}</h1>
          {r.sentenceOfTruth && (
            <p className="text-base italic text-gray-700 leading-relaxed mb-3">&ldquo;{r.sentenceOfTruth}&rdquo;</p>
          )}
          {r.verdictRationale && (
            <p className="text-sm text-gray-600 leading-relaxed">{r.verdictRationale}</p>
          )}
        </div>

        {Array.isArray(r.keyIssues) && r.keyIssues.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">Key issues</h2>
            <ol className="space-y-2">
              {r.keyIssues.map((issue: string, i: number) => (
                <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-3">
                  <span className="text-gray-400 tabular-nums">{i + 1}.</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {Array.isArray(r.necessaryMoves) && r.necessaryMoves.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">Recommended moves</h2>
            <ol className="space-y-2">
              {r.necessaryMoves.map((move: string, i: number) => (
                <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-3">
                  <span className="text-gray-400 tabular-nums">{i + 1}.</span>
                  <span>{move}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="border-t border-gray-100 pt-6 mt-12">
          <p className="text-xs text-gray-400">
            Generated with Fresco — a decision engine for startup founders.{' '}
            <Link href="/" className="text-gray-600 underline underline-offset-2">Try it free</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
