'use client';

// WP0 funnel tracker — fire-and-forget, never blocks or breaks the flow.
// Server-side persistence via /api/events; analysis in /api/admin/usage.
//
// trackOnce() dedupes per (event, scope) in localStorage so funnel steps
// like first_input_focused fire once per session id even across reloads.
// track() sends unconditionally (callers own their dedupe semantics).

type FunnelEvent =
  | 'signup'
  | 'first_input_focused'
  | 'first_submit'
  | 'routing_complete'
  | 'verdict_rendered'      // meta.degraded distinguishes a real verdict from the local fallback
  | 'analysis_complete'     // the deep systems pass landed — Analysis tab is whole
  | 'upgrade_clicked'       // intent to pay; not derivable from any table
  | 'second_session_14d';

export function track(name: FunnelEvent, opts?: { sessionId?: string; meta?: Record<string, unknown> }) {
  try {
    const payload = JSON.stringify({ name, sessionId: opts?.sessionId, meta: opts?.meta });
    // sendBeacon survives page unloads; fetch keepalive is the fallback.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* analytics must never break the product */
  }
}

export function trackOnce(name: FunnelEvent, scope: string, opts?: { sessionId?: string; meta?: Record<string, unknown> }) {
  const key = `fresco-evt-${name}-${scope}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    /* storage unavailable — send anyway, server dedupe is cheap at read time */
  }
  track(name, opts);
}
