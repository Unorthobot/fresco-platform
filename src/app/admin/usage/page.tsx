'use client';

import { useEffect, useState } from 'react';

type Summary = {
  totalUsers: number;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  activatedUsers: number;
  activationRate: number;
  medianTtvMs: number | null;
};

type HouseRow = { house: string; total: number; completed: number };
type VerdictRow = { verdict: string; count: number };
type Tester = {
  email: string;
  name: string | null;
  signedUpAt: string;
  totalSessions: number;
  completedSessions: number;
  lastActive: string | null;
  housesUsed: string[];
};
type DailyActivity = { date: string; sessions: number };

type UsageData = {
  summary: Summary;
  houseBreakdown: HouseRow[];
  verdictBreakdown: VerdictRow[];
  testers: Tester[];
  dailyActivity: DailyActivity[];
  generatedAt: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toISOString().slice(0, 10);
}

function houseLabel(house: string): string {
  const map: Record<string, string> = {
    investigate: 'Investigate',
    innovate: 'Innovate',
    validate: 'Validate',
    evaluate: 'Evaluate',
  };
  return map[house.toLowerCase()] || house;
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/usage')
      .then(async res => {
        if (res.status === 403) {
          setError('Forbidden — your account is not in the ADMIN_EMAILS list.');
          return null;
        }
        if (!res.ok) {
          setError(`Request failed (${res.status})`);
          return null;
        }
        return res.json();
      })
      .then(json => {
        if (json) setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-fresco-off-white text-fresco-black p-12">
        <div className="font-mono text-fresco-xs uppercase tracking-widest text-fresco-graphite-light">
          Loading usage…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-fresco-off-white text-fresco-black p-12">
        <div className="max-w-2xl">
          <div className="font-mono text-fresco-xs uppercase tracking-widest text-fresco-graphite-light mb-2">
            Admin · Usage
          </div>
          <h1 className="text-fresco-2xl mb-6">Access denied</h1>
          <p className="text-fresco-base text-fresco-graphite-soft">
            {error}
          </p>
          <p className="text-fresco-sm text-fresco-graphite-mid mt-6 italic">
            To grant access, set the <code className="font-mono">ADMIN_EMAILS</code> env var on Vercel
            to a comma-separated list of emails (e.g. your operator email).
          </p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const { summary, houseBreakdown, verdictBreakdown, testers, dailyActivity, generatedAt } = data;

  // For the daily chart — find the max so we can scale bars
  const maxDaily = Math.max(1, ...dailyActivity.map(d => d.sessions));

  return (
    <main className="min-h-screen bg-fresco-off-white text-fresco-black">
      <div className="max-w-fresco-content mx-auto p-12">

        {/* Header — same convention as the posters */}
        <header className="border-b border-fresco-black pb-6 mb-12 flex justify-between items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fresco-graphite-light mb-2">
              FRSC · Internal · Admin
            </div>
            <h1 className="text-fresco-3xl font-normal">Usage</h1>
            <p className="text-fresco-sm text-fresco-graphite-soft italic mt-2">
              Beta cohort engagement, refreshed on each visit.
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fresco-graphite-light">
            Generated · {generatedAt.slice(0, 19).replace('T', ' ')}
          </div>
        </header>

        {/* HEADLINE — activation rate (WP0 rebuild baseline) */}
        <section className="mb-8">
          <div className="bg-fresco-black text-white p-8 flex items-end justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/50 mb-2">
                Activation rate · signed up → started ≥1 session
              </div>
              <div className="text-[56px] leading-none font-light">{summary.activationRate}%</div>
              <div className="font-mono text-[10px] text-white/40 mt-2">
                {summary.activatedUsers} of {summary.totalUsers} testers
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/50 mb-2">
                Median time to verdict
              </div>
              <div className="text-fresco-3xl font-light">
                {summary.medianTtvMs === null
                  ? '—'
                  : summary.medianTtvMs >= 60_000
                    ? `${(summary.medianTtvMs / 60_000).toFixed(1)}m`
                    : `${Math.round(summary.medianTtvMs / 1000)}s`}
              </div>
              {summary.medianTtvMs === null && (
                <div className="font-mono text-[10px] text-white/40 mt-2">no samples yet</div>
              )}
            </div>
          </div>
        </section>

        {/* SUMMARY — four big numbers */}
        <section className="mb-16">
          <div className="grid grid-cols-4 gap-px bg-fresco-border border border-fresco-border">
            <div className="bg-white p-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-2">
                Total testers
              </div>
              <div className="text-fresco-4xl font-light">{summary.totalUsers}</div>
            </div>
            <div className="bg-white p-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-2">
                Sessions started
              </div>
              <div className="text-fresco-4xl font-light">{summary.totalSessions}</div>
            </div>
            <div className="bg-white p-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-2">
                Sessions completed
              </div>
              <div className="text-fresco-4xl font-light">{summary.completedSessions}</div>
            </div>
            <div className="bg-white p-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-2">
                Completion rate
              </div>
              <div className="text-fresco-4xl font-light">{summary.completionRate}%</div>
            </div>
          </div>
        </section>

        {/* DAILY ACTIVITY — bar chart, last 30 days */}
        <section className="mb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-3 pb-2 border-b border-fresco-border">
            Daily sessions · last 30 days
          </div>
          <div className="bg-white border border-fresco-border p-6">
            <div className="flex items-end gap-1 h-32">
              {dailyActivity.map(d => (
                <div
                  key={d.date}
                  className="flex-1 bg-fresco-black relative group"
                  style={{ height: `${(d.sessions / maxDaily) * 100}%`, minHeight: d.sessions > 0 ? '2px' : '1px' }}
                  title={`${d.date}: ${d.sessions} session${d.sessions === 1 ? '' : 's'}`}
                >
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-fresco-black text-white text-[10px] font-mono px-1.5 py-0.5 whitespace-nowrap z-10">
                    {d.date} · {d.sessions}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 font-mono text-[9px] text-fresco-graphite-light">
              <span>{dailyActivity[0]?.date}</span>
              <span>{dailyActivity[dailyActivity.length - 1]?.date}</span>
            </div>
          </div>
        </section>

        {/* TWO COLUMNS: HOUSE BREAKDOWN + VERDICT BREAKDOWN */}
        <section className="grid grid-cols-2 gap-12 mb-16">

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-3 pb-2 border-b border-fresco-border">
              Sessions by house
            </div>
            <div className="bg-white border border-fresco-border">
              {houseBreakdown.length === 0 ? (
                <div className="p-6 text-fresco-sm text-fresco-graphite-mid italic">
                  No sessions yet.
                </div>
              ) : (
                houseBreakdown.map((h, idx) => (
                  <div
                    key={h.house}
                    className={`flex items-center justify-between p-4 ${idx > 0 ? 'border-t border-fresco-border-light' : ''}`}
                  >
                    <div>
                      <div className="text-fresco-base">{houseLabel(h.house)}</div>
                      <div className="font-mono text-[10px] text-fresco-graphite-light mt-0.5">
                        {h.completed} of {h.total} completed
                      </div>
                    </div>
                    <div className="text-fresco-2xl font-light">{h.total}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-3 pb-2 border-b border-fresco-border">
              Verdicts produced
            </div>
            <div className="bg-white border border-fresco-border">
              {verdictBreakdown.length === 0 ? (
                <div className="p-6 text-fresco-sm text-fresco-graphite-mid italic">
                  No verdicts yet — completion rate is the bottleneck to watch.
                </div>
              ) : (
                verdictBreakdown.map((v, idx) => (
                  <div
                    key={v.verdict}
                    className={`flex items-center justify-between p-4 ${idx > 0 ? 'border-t border-fresco-border-light' : ''}`}
                  >
                    <div className="font-mono text-fresco-sm uppercase tracking-wide">
                      {v.verdict}
                    </div>
                    <div className="text-fresco-2xl font-light">{v.count}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* TESTERS TABLE */}
        <section className="mb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-3 pb-2 border-b border-fresco-border">
            Testers · sorted by last active
          </div>
          <div className="bg-white border border-fresco-border">
            <div className="grid grid-cols-[1fr,80px,80px,100px,1fr] gap-4 p-4 border-b border-fresco-border font-mono text-[9px] uppercase tracking-[0.14em] text-fresco-graphite-light">
              <div>Email</div>
              <div className="text-right">Started</div>
              <div className="text-right">Done</div>
              <div className="text-right">Last active</div>
              <div>Houses used</div>
            </div>
            {testers.length === 0 ? (
              <div className="p-6 text-fresco-sm text-fresco-graphite-mid italic">
                No testers signed up yet.
              </div>
            ) : (
              testers.map((t, idx) => (
                <div
                  key={t.email}
                  className={`grid grid-cols-[1fr,80px,80px,100px,1fr] gap-4 p-4 ${idx > 0 ? 'border-t border-fresco-border-light' : ''} items-center`}
                >
                  <div>
                    <div className="text-fresco-sm">{t.email}</div>
                    {t.name && (
                      <div className="text-[11px] text-fresco-graphite-light">{t.name}</div>
                    )}
                  </div>
                  <div className="text-right text-fresco-sm tabular-nums">{t.totalSessions}</div>
                  <div className="text-right text-fresco-sm tabular-nums">{t.completedSessions}</div>
                  <div className="text-right text-fresco-sm font-mono text-[11px] text-fresco-graphite-mid">
                    {formatDate(t.lastActive)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.housesUsed.length === 0 ? (
                      <span className="text-fresco-graphite-light italic text-[11px]">
                        no sessions
                      </span>
                    ) : (
                      t.housesUsed.map(h => (
                        <span
                          key={h}
                          className="font-mono text-[9px] uppercase tracking-wide border border-fresco-border px-2 py-0.5"
                        >
                          {houseLabel(h)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="border-t border-fresco-border pt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-fresco-graphite-light">
          Internal use only · refresh page to update
        </footer>

      </div>
    </main>
  );
}
