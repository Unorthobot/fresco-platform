'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type ExtensionKey = {
  id: string;
  prefix: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
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

export default function AccountExtensionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [keys, setKeys] = useState<ExtensionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/account/extension-keys');
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?next=/account/extensions');
      return;
    }
    if (status === 'authenticated') {
      reload();
    }
  }, [status, router, reload]);

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key? Anything using it will stop working immediately.')) return;
    setRevokingId(id);
    try {
      const res = await fetch(`/api/account/extension-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRevokingId(null);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-fresco-off-white text-fresco-black p-12">
        <div className="font-mono text-fresco-xs uppercase tracking-widest text-fresco-graphite-light">
          Loading…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-fresco-off-white text-fresco-black">
      <div className="max-w-3xl mx-auto p-12">
        <header className="border-b border-fresco-black pb-6 mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fresco-graphite-light mb-2">
            FRSC · Account · Extensions
          </p>
          <h1 className="text-fresco-3xl font-normal">Extension keys</h1>
          <p className="text-fresco-sm text-fresco-graphite-soft italic mt-2">
            Keys used by the Fresco Evaluate Chrome extension to sign in to your account.
          </p>
        </header>

        <div className="flex justify-between items-center mb-6">
          <p className="text-fresco-sm text-fresco-graphite-mid">
            {keys.length === 0
              ? 'No keys yet.'
              : `${keys.filter(k => !k.revokedAt).length} active${keys.some(k => k.revokedAt) ? `, ${keys.filter(k => k.revokedAt).length} revoked` : ''}`}
          </p>
          <a
            href="/connect-extension"
            className="px-4 py-2 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite-soft transition-colors"
          >
            New key
          </a>
        </div>

        {error && (
          <p className="text-fresco-xs text-red-600 mb-4">{error}</p>
        )}

        {keys.length === 0 ? (
          <div className="bg-white border border-fresco-border p-8 text-center">
            <p className="text-fresco-sm text-fresco-graphite-mid italic">
              You haven&apos;t generated any extension keys yet.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-fresco-border">
            <div className="grid grid-cols-[1fr,140px,110px,110px,90px] gap-4 p-4 border-b border-fresco-border font-mono text-[9px] uppercase tracking-[0.14em] text-fresco-graphite-light">
              <div>Key</div>
              <div>Label</div>
              <div className="text-right">Created</div>
              <div className="text-right">Last used</div>
              <div></div>
            </div>
            {keys.map((k, idx) => (
              <div
                key={k.id}
                className={`grid grid-cols-[1fr,140px,110px,110px,90px] gap-4 p-4 items-center ${idx > 0 ? 'border-t border-fresco-border-light' : ''} ${k.revokedAt ? 'opacity-50' : ''}`}
              >
                <div className="font-mono text-fresco-xs text-fresco-black">
                  {k.prefix}…
                  {k.revokedAt && (
                    <span className="ml-2 font-sans text-[10px] italic text-fresco-graphite-light">
                      revoked {formatDate(k.revokedAt)}
                    </span>
                  )}
                </div>
                <div className="text-fresco-xs text-fresco-graphite-mid truncate">
                  {k.label || '—'}
                </div>
                <div className="text-right font-mono text-[10px] text-fresco-graphite-mid">
                  {formatDate(k.createdAt)}
                </div>
                <div className="text-right font-mono text-[10px] text-fresco-graphite-mid">
                  {formatDate(k.lastUsedAt)}
                </div>
                <div className="text-right">
                  {!k.revokedAt && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      className="text-fresco-xs text-fresco-graphite-mid hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {revokingId === k.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
