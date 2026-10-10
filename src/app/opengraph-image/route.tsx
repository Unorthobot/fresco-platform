import { ImageResponse } from 'next/og';

// Social share card (1200×630), served from a plain route handler so the URL
// stays clean: `/opengraph-image`, no auto-appended ?<hash>. X is finicky
// about query-string image URLs for cards (LinkedIn/Slack tolerate them); the
// clean path is what the marketing site already points to and what previews
// reliably on X. Referenced explicitly from layout metadata.
//
// The card is the verdict, not a tagline. A black card carrying a sentence of
// truth is the product's signature element (the marketing hero leads with the
// same one), and it survives a feed thumbnail far better than a paragraph.
// Everything is drawn inline: no font fetch, no logo fetch, because a failed
// network call inside the edge function means no preview at all.

export const runtime = 'edge';

const BG = '#121212';
const WHITE = '#ffffff';
const MUTED = '#7c7c7c';
const RULE = 'rgba(255,255,255,0.07)';
const PIVOT = '#d97706';

// Verdict spectrum geometry, mirroring VerdictVisual in the app.
const AXIS_W = 560, PIVOT_AT = 0.65;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', background: BG, padding: '62px 72px',
          fontFamily: 'sans-serif', position: 'relative',
        }}
      >
        {/* Grid texture, drawn as hairlines rather than a repeating gradient
            so it renders identically everywhere Satori runs. */}
        {[150, 300, 450, 600, 750, 900, 1050].map(x => (
          <div key={`v${x}`} style={{ position: 'absolute', left: x, top: 0, width: 1, height: 630, background: RULE }} />
        ))}
        {[158, 316, 474].map(y => (
          <div key={`h${y}`} style={{ position: 'absolute', left: 0, top: y, width: 1200, height: 1, background: RULE }} />
        ))}

        {/* Masthead */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="1.7" strokeLinecap="round">
              <circle cx="3.2" cy="3" r="2.2" /><circle cx="3.2" cy="12" r="2.2" /><circle cx="3.2" cy="21" r="2.2" />
              <circle cx="20" cy="3" r="2.2" /><circle cx="12" cy="12" r="2.2" />
              <path d="M3.2 5.2 L3.2 9.8 M3.2 14.2 L3.2 18.8 M5.4 3 L17.8 3 M5.4 12 L9.8 12" />
            </svg>
            <div style={{ fontSize: 34, fontWeight: 600, color: WHITE, marginLeft: 16, letterSpacing: '-0.01em' }}>
              Fresco
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 17, letterSpacing: '0.17em', color: MUTED }}>
            A DECISION ENGINE FOR STARTUP FOUNDERS
          </div>
        </div>

        {/* The verdict itself */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
            <div style={{ width: 11, height: 11, borderRadius: 6, background: PIVOT }} />
            <div style={{ fontSize: 19, letterSpacing: '0.2em', color: WHITE, marginLeft: 13 }}>PIVOT</div>
          </div>
          <div style={{
            display: 'flex', fontSize: 56, fontStyle: 'italic', color: WHITE,
            lineHeight: 1.26, letterSpacing: '-0.015em', maxWidth: 1010,
            borderLeft: `4px solid ${PIVOT}`, paddingLeft: 30,
          }}>
            “Session length isn’t your metric. Task completion is.”
          </div>
        </div>

        {/* Spectrum + domain */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', position: 'relative', width: AXIS_W + 24, height: 56 }}>
            <div style={{ position: 'absolute', left: 0, top: 22, width: AXIS_W, height: 1, background: 'rgba(255,255,255,0.22)' }} />
            {[0.08, 0.38, 0.65, 0.92].map(t => (
              <div key={t} style={{ position: 'absolute', left: Math.round(t * AXIS_W), top: 18, width: 1, height: 9, background: 'rgba(255,255,255,0.3)' }} />
            ))}
            <div style={{
              position: 'absolute', left: Math.round(PIVOT_AT * AXIS_W) - 7, top: 15,
              width: 15, height: 15, borderRadius: 9, background: PIVOT,
            }} />
            <div style={{ position: 'absolute', left: 0, top: 34, display: 'flex', fontSize: 14, letterSpacing: '0.16em', color: '#5e5e5e' }}>STOP</div>
            <div style={{ position: 'absolute', left: AXIS_W - 24, top: 34, display: 'flex', fontSize: 14, letterSpacing: '0.16em', color: '#5e5e5e' }}>GO</div>
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: MUTED, letterSpacing: '0.04em' }}>
            app.frescolab.io
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
