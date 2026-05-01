// FRESCO — RecoveryPanel
//
// Always-visible bottom-right link that lets the user recover from a blank
// screen without opening DevTools. Two functions:
//
//   1. "Recover" — clears all session/workspace IDs from the Zustand store,
//      navigates to home via window.location. Brute-force escape hatch when
//      the React tree is wedged.
//
//   2. "Show diagnostics" — pops a panel showing the contents of all the
//      breadcrumb keys we write (errors, blank-screen, orphan-session) so
//      the user can read or copy them and send them back. Replaces the
//      DevTools console workflow.
//
// This component is rendered OUTSIDE the main ErrorBoundary at the root of
// FrescoAppContent so that even if the entire app subtree is wedged or
// blank, the recover link is still mounted and clickable.

'use client';

import { useState } from 'react';

const KEYS = [
  'fresco-error-breadcrumbs',
  'fresco-blank-breadcrumbs',
  'fresco-orphan-session-breadcrumbs',
] as const;

const STORE_KEY = 'fresco-storage';

function readBreadcrumbs() {
  const out: Record<string, unknown> = {};
  for (const k of KEYS) {
    try {
      out[k] = JSON.parse(localStorage.getItem(k) || '[]');
    } catch {
      out[k] = `<parse error>`;
    }
  }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    out.storeState = raw ? JSON.parse(raw).state : null;
  } catch {
    out.storeState = `<parse error>`;
  }
  return out;
}

export function RecoveryPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const recover = () => {
    // Wipe just the navigation-related keys from the persisted store so the
    // user lands fresh on home. Don't nuke workspaces/sessions/user — those
    // should survive. Then full reload.
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state) {
          parsed.state.activeWorkspaceId = null;
          parsed.state.activeSessionId = null;
          parsed.state.activeSection = 'home';
          localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
        }
      }
    } catch { /* ignore */ }
    window.location.href = '/';
  };

  const copyDiagnostics = async () => {
    try {
      const data = readBreadcrumbs();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          zIndex: 99999,
          display: 'flex',
          gap: 8,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '0.5px solid rgba(0,0,0,0.15)',
            color: '#666',
            padding: '4px 8px',
            fontSize: 10,
            cursor: 'pointer',
            opacity: 0.6,
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'; }}
          title="Open recovery panel"
        >
          Recover
        </button>
      </div>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              border: '0.5px solid rgba(0,0,0,0.15)',
              maxWidth: 720,
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Recovery</p>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', gap: 8, borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
              <button
                onClick={recover}
                style={{
                  background: '#111',
                  color: 'white',
                  border: 'none',
                  padding: '8px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Reset to home
              </button>
              <button
                onClick={copyDiagnostics}
                style={{
                  background: 'white',
                  color: '#111',
                  border: '0.5px solid rgba(0,0,0,0.2)',
                  padding: '8px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {copied ? 'Copied ✓' : 'Copy diagnostics'}
              </button>
            </div>
            <div style={{ padding: '14px 18px', overflow: 'auto', flex: 1 }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                If you saw a blank screen, copy the diagnostics below and paste them in chat. They include any caught errors and the state at the moment of failure.
              </p>
              <pre
                style={{
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  fontSize: 11,
                  background: '#f7f7f7',
                  border: '0.5px solid rgba(0,0,0,0.08)',
                  padding: 12,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: 360,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(readBreadcrumbs(), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
