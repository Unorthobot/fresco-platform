import { ImageResponse } from 'next/og';

// Social share card (1200×630), served from a plain route handler so the URL
// stays clean: `/opengraph-image`, no auto-appended ?<hash>. X is finicky
// about query-string image URLs for cards (LinkedIn/Slack tolerate them); the
// clean path is what the marketing site already points to and what previews
// reliably on X. Referenced explicitly from layout metadata, and by
// frescolab.io, so both domains share one card.
//
// It leads with the positioning, not a sample verdict. A link preview gets a
// second from someone who has never heard of Fresco, and a specific sentence
// of truth out of context reads like a different product entirely. The hero
// on the marketing site can show a worked verdict because the headline sits
// beside it; this has no such support.
//
// What carries the brand instead is the verdict SYSTEM: the four outcomes on
// the STOP-to-GO spectrum, in the app's own dark-mode accents.
//
// Everything is drawn inline. No font fetch, no logo fetch: a failed network
// call inside the edge function means no preview at all.

export const runtime = 'edge';

const BG = '#121212';
const WHITE = '#ffffff';
const MUTED = '#8a8a8a';
const RULE = 'rgba(255,255,255,0.07)';

// Dark-mode verdict accents, matching globals.css.
const STOP = '#e07878', SIGNAL = '#88a4d4', PIVOT = '#e0ad65', GO = '#5ec48a';

// Spectrum geometry mirrors VerdictVisual in the app.
const AXIS_W = 1010;
const MARKS = [
  { at: 0.06, label: 'STOP', colour: STOP },
  { at: 0.36, label: 'NEEDS MORE SIGNAL', colour: SIGNAL },
  { at: 0.66, label: 'PIVOT', colour: PIVOT },
  { at: 0.95, label: 'GO', colour: GO },
];

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
            so it renders identically wherever Satori runs. */}
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
          <div style={{ display: 'flex', fontSize: 20, color: MUTED, letterSpacing: '0.04em' }}>
            app.frescolab.io
          </div>
        </div>

        {/* The positioning */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex', fontSize: 68, fontWeight: 600, color: WHITE,
            lineHeight: 1.14, letterSpacing: '-0.025em', maxWidth: 1000,
          }}>
            A decision engine for startup founders.
          </div>
          <div style={{ display: 'flex', fontSize: 27, color: MUTED, marginTop: 26, lineHeight: 1.4, maxWidth: 1056 }}>
            Describe the decision. Get a verdict, with the reasoning that produced it.
          </div>
        </div>

        {/* The verdict system: four outcomes, no specific call */}
        <div style={{ display: 'flex', position: 'relative', width: AXIS_W, height: 62 }}>
          <div style={{ position: 'absolute', left: 0, top: 10, width: AXIS_W, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          {MARKS.map(m => (
            <div key={m.label} style={{ position: 'absolute', left: Math.round(m.at * AXIS_W) - 5, top: 5, width: 11, height: 11, borderRadius: 6, background: m.colour }} />
          ))}
          {MARKS.map(m => {
            // Centre each label on its own dot. Satori cannot measure text, so
            // approximate: 16px caps plus 0.15em tracking is about 11.7px/char.
            const half = Math.round((m.label.length * 11.7) / 2);
            const left = Math.max(0, Math.min(AXIS_W - m.label.length * 11.7, Math.round(m.at * AXIS_W) - half));
            return (
              <div
                key={`l${m.label}`}
                style={{
                  position: 'absolute', left, top: 32,
                  display: 'flex', fontSize: 16, letterSpacing: '0.15em', color: m.colour,
                }}
              >
                {m.label}
              </div>
            );
          })}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
