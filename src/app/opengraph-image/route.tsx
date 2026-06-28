import { ImageResponse } from 'next/og';

// Social share card (1200×630), served from a plain route handler so the URL
// stays clean — `/opengraph-image`, no auto-appended ?<hash>. X is finicky
// about query-string image URLs for cards (LinkedIn/Slack tolerate them); the
// clean path is what the marketing site already points to and what previews
// reliably on X. Referenced explicitly from layout metadata.

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '76px 84px',
          fontFamily: 'sans-serif',
          border: '14px solid #0a0a0a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 36, fontWeight: 600, color: '#0a0a0a' }}>
          Fresco
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 70, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            A decision engine for startup founders.
          </div>
          <div style={{ fontSize: 30, color: '#555555', marginTop: 30, lineHeight: 1.4, maxWidth: 900 }}>
            Describe the decision. Get a verdict — with the reasoning that produced it.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, letterSpacing: '0.12em', color: '#444444' }}>
          GO&nbsp;&nbsp;·&nbsp;&nbsp;PIVOT&nbsp;&nbsp;·&nbsp;&nbsp;STOP&nbsp;&nbsp;·&nbsp;&nbsp;NEEDS MORE SIGNAL
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
