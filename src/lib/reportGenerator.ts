// Fresco report and deck generators

interface HouseResult {
  house: string;
  verdict: string;
  verdictRationale: string;
  sentenceOfTruth: string;
  keyIssues: string[];
  necessaryMoves: string[];
  fitLabel?: string;
  fitStrength?: string;
  povStatement?: string;
  suggestedNextHouse?: string;
  suggestedNextHouseReason?: string;
  systemsOutput?: any;
  outputLabel?: string;
}

interface ReportData {
  houseName: string;
  formalLabel: string;
  result: HouseResult;
  agentEvents?: { displayName: string; signal: string; structured_artifact?: string }[];
  date?: string;
}

const VERDICT_LABELS: Record<string, string> = {
  'GO': 'Proceed with confidence',
  'PIVOT': 'Change direction first',
  'STOP': "Don't proceed",
  'INVESTIGATE FURTHER': 'You need more signal first',
};

// ── HTML Report (opens in new tab, print to PDF via Cmd+P) ──────────────────

export function generatePDFReport(data: ReportData): void {
  const verdictLabel = VERDICT_LABELS[data.result.verdict] || data.result.verdict;
  const tag = data.result.verdict === 'INVESTIGATE FURTHER' ? 'MORE SIGNAL' : data.result.verdict;
  const dateStr = data.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const so = data.result.systemsOutput;

  const section = (label: string, content: string) => `
    <div class="section">
      <div class="section-label">${label}</div>
      ${content}
    </div>`;

  const itemList = (items: string[], filled = false) =>
    items.map((item, i) => `
      <div class="list-row">
        <span class="list-num ${filled ? 'filled' : ''}">${i + 1}</span>
        <p>${item}</p>
      </div>`).join('');

  const icebergHTML = so?.icebergLevels ? section('Iceberg Analysis', `
    <div class="iceberg">
      ${[
        { l: 'Event', v: so.icebergLevels.event, depth: 0 },
        { l: 'Pattern', v: so.icebergLevels.pattern, depth: 1 },
        { l: 'Structure', v: so.icebergLevels.structure, depth: 2 },
        { l: 'Mental model', v: so.icebergLevels.mentalModel, depth: 3 },
      ].filter(r => r.v).map(r => `
        <div class="ice-row" style="margin-left:${r.depth * 16}px; border-left-width:${2 + r.depth}px; opacity:${1 - r.depth * 0.06}">
          <span class="ice-label">${r.l}</span>
          <span class="ice-val">${r.v}</span>
        </div>`).join('')}
    </div>`) : '';

  const archetypeHTML = so?.archetype?.name && so.archetype.name !== 'null' ? section('System Archetype', `
    <div class="archetype-card">
      <div class="archetype-name">${so.archetype.name}</div>
      ${so.archetype.description ? `<p class="archetype-desc">${so.archetype.description}</p>` : ''}
      ${so.archetype.loop ? `<div class="archetype-row"><span class="archetype-row-label">How it shows up</span><p>${so.archetype.loop}</p></div>` : ''}
      ${so.archetype.escape ? `<div class="archetype-row"><span class="archetype-row-label">How to break out</span><p>${so.archetype.escape}</p></div>` : ''}
    </div>`) : '';

  const leverageHTML = so?.leverageMap?.length ? section('Leverage Map', `
    <div class="leverage-list">
      ${so.leverageMap.map((opt: any) => {
        const levels = ['parameters','feedback','information','rules','goals','paradigms'];
        const idx = levels.indexOf(opt.leverageLevel?.toLowerCase());
        const pct = idx === -1 ? 50 : Math.round(((idx + 1) / levels.length) * 100);
        return `<div class="leverage-row">
          <div class="lev-track"><div class="lev-fill" style="width:${pct}%"></div></div>
          <div class="lev-text">
            <span class="lev-name">${opt.option}</span>
            <span class="lev-level">${opt.leverageLevel || ''}</span>
          </div>
          ${opt.impact ? `<p class="lev-impact">${opt.impact}</p>` : ''}
        </div>`;
      }).join('')}
    </div>`) : '';

  const simHTML = so?.currentStateSimulation ? section('If Nothing Changes', `
    <blockquote class="sim-quote">${so.currentStateSimulation}</blockquote>`) : '';

  const agentHTML = data.agentEvents?.length ? section('Agent Analysis', `
    <div class="agents">
      ${data.agentEvents.map(ev => `
        <div class="agent-row">
          <div class="agent-name">${ev.displayName}</div>
          <p class="agent-signal">${ev.signal}</p>
          ${ev.structured_artifact ? `<p class="agent-artifact">${ev.structured_artifact}</p>` : ''}
        </div>`).join('')}
    </div>`) : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Fresco · ${data.houseName} · ${dateStr}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #0a0a0a; --white: #ffffff; --off: #fafafa;
    --border: #e8e8e8; --muted: #999; --text: #1a1a1a;
    --text-secondary: #555;
  }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #f0f0f0; color: var(--text);
    padding: 40px 20px;
  }

  .page {
    max-width: 760px; margin: 0 auto;
    background: var(--white);
    box-shadow: 0 4px 40px rgba(0,0,0,0.12);
  }

  /* Cover */
  .cover {
    background: var(--black); color: var(--white);
    padding: 56px 64px 48px;
    position: relative; overflow: hidden;
  }
  .cover::after {
    content: ''; position: absolute; top: 0; right: 0;
    width: 200px; height: 200px;
    background: radial-gradient(circle at top right, rgba(255,255,255,0.04), transparent);
  }
  .cover-meta {
    font-size: 10px; font-weight: 500; letter-spacing: 0.14em;
    text-transform: uppercase; color: rgba(255,255,255,0.35);
    margin-bottom: 36px;
  }
  .cover-tag {
    display: inline-block; font-size: 10px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    border: 1px solid rgba(255,255,255,0.2); padding: 3px 10px;
    border-radius: 100px; color: rgba(255,255,255,0.5);
    margin-bottom: 16px;
  }
  .cover-headline {
    font-size: 36px; font-weight: 500; line-height: 1.15;
    letter-spacing: -0.02em; color: var(--white);
    margin-bottom: 28px;
  }
  .cover-insight {
    font-size: 14px; font-style: italic; line-height: 1.6;
    color: rgba(255,255,255,0.65); border-left: 2px solid rgba(255,255,255,0.2);
    padding-left: 16px; margin-bottom: 24px;
  }
  .cover-rationale {
    font-size: 12px; line-height: 1.65; color: rgba(255,255,255,0.45);
  }

  /* Body */
  .body { padding: 0 64px 64px; }

  .section {
    padding: 32px 0; border-bottom: 1px solid var(--border);
  }
  .section:last-child { border-bottom: none; }

  .section-label {
    font-size: 9px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 16px;
  }

  /* Sentence of Truth */
  .sot-box {
    background: var(--off); border-left: 3px solid var(--black);
    padding: 20px 24px; font-size: 15px; font-style: italic;
    line-height: 1.6; color: var(--text);
  }

  /* POV */
  .pov-box {
    background: var(--off); border-left: 4px solid var(--black);
    padding: 16px 20px; font-size: 14px; font-weight: 500;
    line-height: 1.55; color: var(--text);
  }

  /* Lists */
  .list-row {
    display: flex; align-items: flex-start; gap: 12px;
    margin-bottom: 12px;
  }
  .list-num {
    width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
    border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 600; color: var(--muted);
    margin-top: 1px;
  }
  .list-num.filled {
    background: var(--black); border-color: var(--black); color: var(--white);
  }
  .list-row p { font-size: 13px; line-height: 1.55; color: #333; padding-top: 4px; }

  /* Next house */
  .next-box {
    background: var(--off); padding: 20px 24px;
    display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
  }
  .next-label { font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
  .next-name { font-size: 15px; font-weight: 500; }
  .next-reason { font-size: 12px; color: var(--muted); margin-top: 4px; }

  /* Iceberg */
  .iceberg { margin-top: 4px; }
  .ice-row {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 10px 14px; margin-bottom: 4px;
    background: var(--off); border-left-color: var(--muted);
    border-left-style: solid;
  }
  .ice-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); width: 76px; flex-shrink: 0;
    padding-top: 2px;
  }
  .ice-val { font-size: 12px; color: #333; line-height: 1.5; }

  /* Archetype */
  .archetype-card { border: 1px solid var(--border); overflow: hidden; }
  .archetype-name {
    background: var(--black); color: var(--white);
    padding: 14px 20px; font-size: 15px; font-weight: 500;
  }
  .archetype-desc { padding: 14px 20px 0; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
  .archetype-row { padding: 12px 20px; border-top: 1px solid var(--border); display: flex; gap: 12px; }
  .archetype-row-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); width: 96px; flex-shrink: 0; padding-top: 2px;
  }
  .archetype-row p { font-size: 12px; color: #333; line-height: 1.5; }

  /* Leverage */
  .leverage-row { margin-bottom: 16px; }
  .lev-track { height: 2px; background: var(--border); border-radius: 2px; margin-bottom: 6px; }
  .lev-fill { height: 100%; background: var(--black); border-radius: 2px; }
  .lev-text { display: flex; align-items: baseline; gap: 10px; margin-bottom: 2px; }
  .lev-name { font-size: 13px; font-weight: 500; }
  .lev-level { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .lev-impact { font-size: 11px; color: var(--muted); }

  /* Simulation */
  .sim-quote {
    border-left: 3px solid var(--border); padding: 12px 16px;
    font-size: 13px; font-style: italic; line-height: 1.6;
    color: var(--text-secondary);
  }

  /* Agents */
  .agent-row { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .agent-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .agent-name { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 6px; }
  .agent-signal { font-size: 12px; line-height: 1.6; color: #333; }
  .agent-artifact { font-size: 11px; color: var(--muted); margin-top: 6px; font-style: italic; }

  /* Footer */
  .footer {
    padding: 24px 64px; border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-brand { font-size: 11px; font-weight: 500; color: var(--muted); }
  .footer-date { font-size: 10px; color: var(--border); }

  /* Print */
  @media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; max-width: 100%; }
    .section { page-break-inside: avoid; }
    .cover { page-break-after: always; }
    .no-print { display: none; }
  }

  /* Print button */
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: var(--black); color: var(--white);
    padding: 12px 24px; display: flex; align-items: center; justify-content: space-between;
  }
  .print-bar p { font-size: 12px; color: rgba(255,255,255,0.6); }
  .print-btn {
    background: var(--white); color: var(--black); border: none;
    padding: 8px 20px; font-size: 12px; font-weight: 600; cursor: pointer;
    letter-spacing: 0.04em;
  }
  .print-btn:hover { background: #f0f0f0; }
  @media print { .print-bar { display: none; } }
</style>
</head>
<body>

<div class="print-bar no-print">
  <p>Fresco · ${data.houseName} Analysis · ${dateStr}</p>
  <button class="print-btn" onclick="window.print()">Save as PDF →</button>
</div>

<div style="margin-top:60px" class="no-print"></div>

<div class="page">
  <div class="cover">
    <div class="cover-meta">${data.houseName} · ${data.formalLabel} · ${dateStr}</div>
    <div class="cover-tag">${tag}</div>
    <h1 class="cover-headline">${verdictLabel}</h1>
    <div class="cover-insight">"${data.result.sentenceOfTruth}"</div>
    <p class="cover-rationale">${data.result.verdictRationale}</p>
  </div>

  <div class="body">
    ${data.result.sentenceOfTruth ? section('The Insight', `<div class="sot-box">"${data.result.sentenceOfTruth}"</div>`) : ''}
    ${data.result.povStatement ? section('Point of View', `<div class="pov-box">${data.result.povStatement}</div>`) : ''}
    ${data.result.keyIssues?.length ? section('Key Issues', `<div>${itemList(data.result.keyIssues, false)}</div>`) : ''}
    ${data.result.necessaryMoves?.length ? section('Recommended Moves', `<div>${itemList(data.result.necessaryMoves, true)}</div>`) : ''}
    ${data.result.suggestedNextHouse ? section('Next Step', `
      <div class="next-box">
        <div>
          <div class="next-label">Run this next</div>
          <div class="next-name">${data.result.suggestedNextHouse.charAt(0).toUpperCase() + data.result.suggestedNextHouse.slice(1)}</div>
          ${data.result.suggestedNextHouseReason ? `<div class="next-reason">${data.result.suggestedNextHouseReason}</div>` : ''}
        </div>
      </div>`) : ''}
    ${icebergHTML}
    ${archetypeHTML}
    ${leverageHTML}
    ${simHTML}
    ${agentHTML}
  </div>

  <div class="footer">
    <span class="footer-brand">Fresco · frescolab.io</span>
    <span class="footer-date">${dateStr}</span>
  </div>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

// ── HTML Presentation Deck ────────────────────────────────────────────────────

export function generateHTMLDeck(data: ReportData): void {
  const verdictLabel = VERDICT_LABELS[data.result.verdict] || data.result.verdict;
  const tag = data.result.verdict === 'INVESTIGATE FURTHER' ? 'MORE SIGNAL' : data.result.verdict;
  const dateStr = data.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const so = data.result.systemsOutput;

  const slides: { dark: boolean; content: string }[] = [];

  // Slide 1 — Cover
  slides.push({ dark: true, content: `
    <div class="s-eyebrow">${data.houseName} · ${data.formalLabel} · ${dateStr}</div>
    <div class="s-tag">${tag}</div>
    <h1 class="s-headline">${verdictLabel}</h1>
    <div class="s-insight">"${data.result.sentenceOfTruth}"</div>
    <p class="s-rationale">${data.result.verdictRationale}</p>
  `});

  // Slide 2 — Issues + Moves (two column)
  if (data.result.keyIssues?.length || data.result.necessaryMoves?.length) {
    slides.push({ dark: false, content: `
      <div class="s-two-col">
        ${data.result.keyIssues?.length ? `<div>
          <div class="s-col-label">Key Issues</div>
          ${data.result.keyIssues.map((issue, i) => `
            <div class="s-list-row">
              <span class="s-num">${i + 1}</span>
              <p>${issue}</p>
            </div>`).join('')}
        </div>` : ''}
        ${data.result.necessaryMoves?.length ? `<div>
          <div class="s-col-label">Recommended Moves</div>
          ${data.result.necessaryMoves.map((move, i) => `
            <div class="s-list-row">
              <span class="s-num filled">${i + 1}</span>
              <p>${move}</p>
            </div>`).join('')}
        </div>` : ''}
      </div>
    `});
  }

  // Slide 3 — POV (Investigate only)
  if (data.result.povStatement) {
    slides.push({ dark: false, content: `
      <div class="s-label">Your Point of View</div>
      <div class="s-pov">${data.result.povStatement}</div>
    `});
  }

  // Slide 4 — Iceberg
  if (so?.icebergLevels) {
    slides.push({ dark: false, content: `
      <div class="s-label">Iceberg Analysis</div>
      <div class="s-iceberg">
        ${[
          { l: 'Event', v: so.icebergLevels.event, d: 0 },
          { l: 'Pattern', v: so.icebergLevels.pattern, d: 1 },
          { l: 'Structure', v: so.icebergLevels.structure, d: 2 },
          { l: 'Mental model', v: so.icebergLevels.mentalModel, d: 3 },
        ].filter(r => r.v).map(r => `
          <div class="s-ice-row" style="margin-left:${r.d * 24}px; opacity:${1 - r.d * 0.08}">
            <span class="s-ice-label">${r.l}</span>
            <span>${r.v}</span>
          </div>`).join('')}
      </div>
    `});
  }

  // Slide 5 — Archetype
  if (so?.archetype?.name && so.archetype.name !== 'null') {
    slides.push({ dark: true, content: `
      <div class="s-label" style="color:rgba(255,255,255,0.35)">System Archetype</div>
      <h2 class="s-arch-name">${so.archetype.name}</h2>
      ${so.archetype.loop ? `<p class="s-arch-loop">${so.archetype.loop}</p>` : ''}
      ${so.archetype.escape ? `<div class="s-escape">
        <span class="s-escape-label">How to break out</span>
        <p>${so.archetype.escape}</p>
      </div>` : ''}
    `});
  }

  // Slide 6 — Leverage Map
  if (so?.leverageMap?.length) {
    slides.push({ dark: false, content: `
      <div class="s-label">Leverage Map</div>
      <div class="s-leverage">
        ${so.leverageMap.map((opt: any) => {
          const levels = ['parameters','feedback','information','rules','goals','paradigms'];
          const idx = levels.indexOf(opt.leverageLevel?.toLowerCase());
          const pct = idx === -1 ? 40 : Math.round(((idx + 1) / levels.length) * 100);
          return `<div class="s-lev-row">
            <div class="s-lev-track"><div class="s-lev-fill" style="width:${pct}%"></div></div>
            <div class="s-lev-meta">
              <span class="s-lev-name">${opt.option}</span>
              <span class="s-lev-level">${opt.leverageLevel || ''}</span>
            </div>
            ${opt.impact ? `<p class="s-lev-impact">${opt.impact}</p>` : ''}
          </div>`;
        }).join('')}
      </div>
    `});
  }

  // Slide 7 — Next step + closing
  slides.push({ dark: true, content: `
    ${data.result.suggestedNextHouse ? `
      <div class="s-label" style="color:rgba(255,255,255,0.35)">Suggested Next Step</div>
      <h2 class="s-next-name">${data.result.suggestedNextHouse.charAt(0).toUpperCase() + data.result.suggestedNextHouse.slice(1)}</h2>
      ${data.result.suggestedNextHouseReason ? `<p class="s-next-reason">${data.result.suggestedNextHouseReason}</p>` : ''}
      <div class="s-divider"></div>
    ` : ''}
    <div class="s-brand">Fresco · frescolab.io</div>
    <p class="s-brand-sub">Decision intelligence for product teams.</p>
  `});

  const total = slides.length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fresco · ${data.houseName} · ${dateStr}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #0a0a0a; --white: #fff; --gray: #f5f5f5;
    --border: #e8e8e8; --muted: #999; --text: #1a1a1a;
  }

  html, body { width: 100%; height: 100%; overflow: hidden; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #111; }

  .deck { width: 100%; height: 100vh; position: relative; }

  .slide {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity 0.3s ease;
    background: var(--white);
    padding: 0 10vw;
  }
  .slide.dark { background: var(--black); color: var(--white); }
  .slide.active { opacity: 1; pointer-events: auto; }
  .slide-inner { max-width: 800px; width: 100%; }

  .s-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 20px;
  }
  .s-eyebrow {
    font-size: 10px; font-weight: 500; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 24px;
  }
  .s-tag {
    display: inline-block; font-size: 10px; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    border: 1px solid rgba(255,255,255,0.2); padding: 4px 12px;
    border-radius: 100px; color: rgba(255,255,255,0.45); margin-bottom: 16px;
  }
  .s-headline {
    font-size: clamp(28px, 4.5vw, 52px); font-weight: 500;
    letter-spacing: -0.025em; line-height: 1.12; margin-bottom: 28px;
  }
  .s-insight {
    font-size: clamp(13px, 1.5vw, 16px); font-style: italic;
    line-height: 1.65; color: rgba(255,255,255,0.6);
    border-left: 2px solid rgba(255,255,255,0.15);
    padding-left: 18px; margin-bottom: 20px; max-width: 640px;
  }
  .s-rationale {
    font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.38); max-width: 560px;
  }

  .s-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; }
  .s-col-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 20px; }
  .s-list-row { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
  .s-num {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 600; color: var(--muted); margin-top: 1px;
  }
  .s-num.filled { background: var(--black); border-color: var(--black); color: var(--white); }
  .s-list-row p { font-size: 13px; line-height: 1.55; color: #333; padding-top: 3px; }

  .s-pov {
    font-size: clamp(14px, 2vw, 18px); font-weight: 500; line-height: 1.5;
    border-left: 4px solid var(--black); padding-left: 24px; max-width: 640px;
  }

  .s-iceberg { margin-top: 4px; }
  .s-ice-row {
    display: flex; gap: 12px; padding: 10px 16px; margin-bottom: 5px;
    background: var(--gray); border-left: 2px solid var(--border);
  }
  .s-ice-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); width: 80px; flex-shrink: 0; padding-top: 2px;
  }
  .s-ice-row span:last-child { font-size: 13px; color: #333; line-height: 1.45; }

  .s-arch-name {
    font-size: clamp(22px, 3.5vw, 40px); font-weight: 500;
    letter-spacing: -0.02em; margin-bottom: 20px;
  }
  .s-arch-loop { font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.55); margin-bottom: 20px; max-width: 560px; }
  .s-escape { padding: 16px 20px; border: 1px solid rgba(255,255,255,0.12); }
  .s-escape-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.3); display: block; margin-bottom: 6px; }
  .s-escape p { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.5; }

  .s-leverage {}
  .s-lev-row { margin-bottom: 18px; }
  .s-lev-track { height: 2px; background: var(--border); border-radius: 2px; margin-bottom: 8px; }
  .s-lev-fill { height: 100%; background: var(--black); border-radius: 2px; }
  .s-lev-meta { display: flex; align-items: baseline; gap: 10px; }
  .s-lev-name { font-size: 14px; font-weight: 500; }
  .s-lev-level { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .s-lev-impact { font-size: 11px; color: var(--muted); margin-top: 3px; }

  .s-next-name { font-size: clamp(24px, 3.5vw, 42px); font-weight: 500; margin-bottom: 12px; }
  .s-next-reason { font-size: 14px; color: rgba(255,255,255,0.45); max-width: 480px; }
  .s-divider { width: 40px; height: 1px; background: rgba(255,255,255,0.15); margin: 32px 0; }
  .s-brand { font-size: 20px; font-weight: 500; opacity: 0.5; }
  .s-brand-sub { font-size: 12px; color: rgba(255,255,255,0.25); margin-top: 8px; }

  /* Nav */
  .nav {
    position: fixed; bottom: 28px; right: 28px; z-index: 100;
    display: flex; flex-direction: column; gap: 6px;
  }
  .nav-btn {
    width: 36px; height: 36px; background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7);
    border-radius: 50%; cursor: pointer; font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px); transition: all 0.15s;
  }
  .nav-btn:hover { background: rgba(255,255,255,0.2); color: white; }

  .progress {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 2px; background: rgba(255,255,255,0.08);
  }
  .progress-fill { height: 100%; background: rgba(255,255,255,0.4); transition: width 0.3s ease; }

  .slide-counter {
    position: fixed; bottom: 28px; left: 28px;
    font-size: 10px; color: rgba(255,255,255,0.25);
    letter-spacing: 0.1em; font-family: 'Inter', sans-serif;
  }
</style>
</head>
<body>
<div class="deck">
  ${slides.map((s, i) => `
    <div class="slide${s.dark ? ' dark' : ''}${i === 0 ? ' active' : ''}" id="slide-${i}">
      <div class="slide-inner">${s.content}</div>
    </div>`).join('')}
</div>

<div class="nav">
  <button class="nav-btn" onclick="go(-1)" title="Previous (↑)">↑</button>
  <button class="nav-btn" onclick="go(1)" title="Next (↓)">↓</button>
</div>
<div class="progress"><div class="progress-fill" id="prog"></div></div>
<div class="slide-counter" id="counter">1 / ${total}</div>

<script>
  let cur = 0;
  const total = ${total};
  function go(dir) {
    const next = Math.max(0, Math.min(total - 1, cur + dir));
    if (next === cur) return;
    document.getElementById('slide-' + cur).classList.remove('active');
    cur = next;
    document.getElementById('slide-' + cur).classList.add('active');
    document.getElementById('prog').style.width = ((cur + 1) / total * 100) + '%';
    document.getElementById('counter').textContent = (cur + 1) + ' / ' + total;
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  document.getElementById('prog').style.width = (1 / total * 100) + '%';
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}
