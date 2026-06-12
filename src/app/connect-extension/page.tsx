'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/* ──────────────────────────────────────────────────────────────────────────
   /connect-extension

   The Fresco Evaluate Chrome extension opens this page in a new tab when
   the user clicks "Connect to Fresco" in the extension setup screen.

   Flow:
   1. Page checks session. If not signed in, bounce to /login?next=/connect-extension.
   2. Page displays a "Generate key" button.
   3. On click, POST /api/account/extension-keys; receive plaintext key
      (shown once).
   4. Display key with copy button. If the extension is listening on
      window.postMessage, post the key so the extension captures it
      automatically; otherwise the user copies and pastes manually.
   5. Show a "Done — you can close this tab" state.
   ────────────────────────────────────────────────────────────────────────── */

export default function ConnectExtensionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?next=/connect-extension');
    }
  }, [status, router]);

  // When a key is generated, post it back to any extension that's listening
  // via window.postMessage. The extension's content script (running in the
  // page's context) can pick this up and pass it to background.js.
  useEffect(() => {
    if (!generatedKey) return;
    try {
      window.postMessage(
        { source: 'fresco-connect-extension', type: 'fresco_extension_key', key: generatedKey },
        window.location.origin
      );
      // Wait briefly to give the extension a chance to acknowledge.
      const t = setTimeout(() => setPosted(true), 500);
      return () => clearTimeout(t);
    } catch {
      // No extension listening — that's fine; user copies manually
    }
  }, [generatedKey]);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch('/api/account/extension-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Fresco Evaluate (Chrome)' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setGeneratedKey(data.key.plaintext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-fresco-off-white text-fresco-black p-12">
        <div className="font-mono text-fresco-xs uppercase tracking-widest text-fresco-graphite-light">
          Loading…
        </div>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="min-h-screen bg-fresco-off-white text-fresco-black flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <header className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fresco-graphite-light mb-2">
            FRSC · Connect extension
          </p>
          <h1 className="text-fresco-3xl font-normal mb-3">Set up Fresco Evaluate</h1>
          <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed">
            Evaluate any page, compare versions, and trace user journeys —
            without leaving your browser. Two steps: install the extension,
            then connect it to this account.
          </p>
        </header>

        {!generatedKey && (
          <>
            {/* Step 1 — install. The page previously assumed the extension
                was already installed, which left first-time visitors with a
                key and nowhere to put it. */}
            <div className="bg-white border border-fresco-border p-6 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-3">
                Step 1 · Install the extension
              </p>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-4 leading-relaxed">
                Already installed? Skip to step 2.
              </p>
              <a
                href="https://frescolab.io/fresco-evaluate-extension.zip"
                className="block w-full text-center px-4 py-3 border border-fresco-black text-fresco-black text-fresco-sm font-medium hover:bg-fresco-black hover:text-white transition-colors mb-4"
              >
                Download Fresco Evaluate (.zip)
              </a>
              <ol className="space-y-2 text-fresco-xs text-fresco-graphite-mid leading-relaxed list-decimal pl-4">
                <li>Unzip the download — you&apos;ll get a <span className="font-mono">fresco-evaluate</span> folder</li>
                <li>Open <span className="font-mono">chrome://extensions</span> in Chrome</li>
                <li>Turn on <span className="text-fresco-black">Developer mode</span> (top right)</li>
                <li>Click <span className="text-fresco-black">Load unpacked</span> and choose the unzipped folder</li>
                <li>Pin Fresco Evaluate from the puzzle-piece menu so it&apos;s a click away</li>
              </ol>
            </div>

            {/* Step 2 — connect */}
            <div className="bg-white border border-fresco-border p-6 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-3">
                Step 2 · Connect it to your account
              </p>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-5 leading-relaxed">
                Signed in as <span className="text-fresco-black">{session.user?.email}</span>.
                Generate a key — it&apos;s shown once, and the extension picks it
                up automatically if its side panel is open.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full px-4 py-3 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating…' : 'Generate extension key'}
              </button>
              {error && (
                <p className="mt-3 text-fresco-xs text-red-600">{error}</p>
              )}
            </div>
          </>
        )}

        {generatedKey && (
          <div className="space-y-4">
            <div className="bg-white border border-fresco-border p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-3">
                Your extension key — shown once
              </p>
              <div className="bg-fresco-light-gray border border-fresco-border-light p-3 font-mono text-[11px] text-fresco-black break-all leading-relaxed mb-3">
                {generatedKey}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full px-4 py-2 border border-fresco-black text-fresco-black text-fresco-sm font-medium hover:bg-fresco-black hover:text-white transition-colors"
              >
                {copied ? 'Copied ✓' : 'Copy key'}
              </button>
            </div>

            <div className="bg-white border border-fresco-border p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fresco-graphite-light mb-2">
                {posted ? 'Extension picked it up — you can close this tab' : 'If the extension didn\u2019t pick it up automatically'}
              </p>
              <p className="text-fresco-xs text-fresco-graphite-mid leading-relaxed">
                Open the Fresco Evaluate side panel, choose Manual paste, and
                paste the key. The key won&apos;t be shown again — if you lose it,
                generate a new one and revoke this one from your account.
              </p>
            </div>

            <p className="text-[10px] text-fresco-graphite-light italic leading-relaxed">
              Manage existing keys at{' '}
              <a href="/account/extensions" className="underline hover:text-fresco-black">
                /account/extensions
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
