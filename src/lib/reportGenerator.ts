// Client-side report and deck generators for Fresco analysis exports

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

// ── PDF Report ────────────────────────────────────────────────────────────────

export async function generatePDFReport(data: ReportData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MARGIN = 48;
  const CONTENT_W = W - MARGIN * 2;
  let y = MARGIN;

  const verdictLabel = VERDICT_LABELS[data.result.verdict] || data.result.verdict;
  const dateStr = data.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Helper: add new page if needed
  const checkPage = (needed = 40) => {
    if (y + needed > H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // Helper: wrapped text
  const addText = (text: string, fontSize: number, color: [number,number,number], indent = 0, lineHeight = 1.4) => {
    if (!text?.trim()) return;
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_W - indent);
    checkPage(lines.length * fontSize * lineHeight + 8);
    doc.text(lines, MARGIN + indent, y);
    y += lines.length * fontSize * lineHeight + 4;
  };

  const addLabel = (text: string) => {
    checkPage(24);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'bold');
    doc.text(text.toUpperCase(), MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += 14;
  };

  const addDivider = () => {
    checkPage(16);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 12;
  };

  const addSpacer = (h = 12) => { y += h; };

  // ── Cover section ──────────────────────────────────────────────────────────
  // Black header bar
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, W, 120, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text('FRESCO', MARGIN, 36);
  doc.text(`${data.houseName.toUpperCase()} · ${data.formalLabel.toUpperCase()}`, MARGIN, 52);

  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(dateStr, MARGIN, 68);

  // Verdict headline in header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  const vLines = doc.splitTextToSize(verdictLabel, CONTENT_W);
  doc.text(vLines, MARGIN, 98);

  y = 140;

  // ── Sentence of Truth ──────────────────────────────────────────────────────
  addLabel('Insight');
  doc.setFillColor(245, 245, 245);
  const sotLines = doc.splitTextToSize(`"${data.result.sentenceOfTruth}"`, CONTENT_W - 16);
  const sotHeight = sotLines.length * 14 * 1.4 + 20;
  checkPage(sotHeight + 8);
  doc.roundedRect(MARGIN, y - 4, CONTENT_W, sotHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(sotLines, MARGIN + 10, y + 12);
  y += sotHeight + 8;
  addSpacer(8);

  // ── Verdict rationale ──────────────────────────────────────────────────────
  addLabel('Why');
  addText(data.result.verdictRationale, 10, [60, 60, 60]);
  addSpacer(8);
  addDivider();

  // ── POV (Investigate only) ─────────────────────────────────────────────────
  if (data.result.povStatement) {
    addLabel('Point of view');
    doc.setFillColor(240, 240, 240);
    const povLines = doc.splitTextToSize(data.result.povStatement, CONTENT_W - 16);
    const povH = povLines.length * 11 * 1.4 + 16;
    checkPage(povH + 8);
    doc.rect(MARGIN, y - 4, 3, povH, 'F');
    doc.setFillColor(248, 248, 248);
    doc.rect(MARGIN + 3, y - 4, CONTENT_W - 3, povH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(povLines, MARGIN + 12, y + 10);
    y += povH + 8;
    addSpacer(8);
    addDivider();
  }

  // ── Key issues ─────────────────────────────────────────────────────────────
  if (data.result.keyIssues?.length) {
    addLabel('Key issues');
    data.result.keyIssues.forEach((issue, i) => {
      checkPage(32);
      doc.setFillColor(245, 245, 245);
      doc.circle(MARGIN + 8, y + 4, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${i + 1}`, MARGIN + 8 - (i < 9 ? 2 : 4), y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const issueLines = doc.splitTextToSize(issue, CONTENT_W - 24);
      doc.text(issueLines, MARGIN + 20, y + 7);
      y += issueLines.length * 14 + 8;
    });
    addSpacer(4);
    addDivider();
  }

  // ── Recommended moves ──────────────────────────────────────────────────────
  if (data.result.necessaryMoves?.length) {
    addLabel('Recommended moves');
    data.result.necessaryMoves.forEach((move, i) => {
      checkPage(32);
      doc.setFillColor(0, 0, 0);
      doc.circle(MARGIN + 8, y + 4, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`${i + 1}`, MARGIN + 8 - (i < 9 ? 2 : 4), y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const moveLines = doc.splitTextToSize(move, CONTENT_W - 24);
      doc.text(moveLines, MARGIN + 20, y + 7);
      y += moveLines.length * 14 + 8;
    });
    addSpacer(4);
    addDivider();
  }

  // ── Suggested next house ───────────────────────────────────────────────────
  if (data.result.suggestedNextHouse) {
    addLabel('Suggested next step');
    doc.setFillColor(245, 245, 245);
    checkPage(52);
    doc.rect(MARGIN, y - 4, CONTENT_W, 48, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Run ${data.result.suggestedNextHouse.charAt(0).toUpperCase() + data.result.suggestedNextHouse.slice(1)} next`, MARGIN + 10, y + 14);
    if (data.result.suggestedNextHouseReason) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const reasonLines = doc.splitTextToSize(data.result.suggestedNextHouseReason, CONTENT_W - 20);
      doc.text(reasonLines, MARGIN + 10, y + 28);
    }
    y += 56;
    addDivider();
  }

  // ── Systems outputs ────────────────────────────────────────────────────────
  const so = data.result.systemsOutput;
  if (so) {
    // Iceberg
    if (so.icebergLevels) {
      checkPage(120);
      addLabel('Iceberg analysis');
      const levels = [
        { label: 'Event', value: so.icebergLevels.event },
        { label: 'Pattern', value: so.icebergLevels.pattern },
        { label: 'Structure', value: so.icebergLevels.structure },
        { label: 'Mental model', value: so.icebergLevels.mentalModel },
      ];
      levels.forEach((l, i) => {
        if (!l.value) return;
        checkPage(36);
        const indent = i * 12;
        doc.setFillColor(245 - i * 5, 245 - i * 5, 245 - i * 5);
        const lLines = doc.splitTextToSize(l.value, CONTENT_W - 80 - indent);
        const rowH = lLines.length * 11 * 1.3 + 12;
        doc.rect(MARGIN + indent, y - 2, CONTENT_W - indent, rowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(l.label.toUpperCase(), MARGIN + indent + 6, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(lLines, MARGIN + indent + 70, y + 8);
        y += rowH + 4;
      });
      addSpacer(8);
      addDivider();
    }

    // Archetype
    if (so.archetype?.name && so.archetype.name !== 'null') {
      checkPage(80);
      addLabel('System archetype');
      doc.setFillColor(0, 0, 0);
      doc.rect(MARGIN, y - 4, CONTENT_W, 28, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(so.archetype.name, MARGIN + 10, y + 12);
      y += 32;
      if (so.archetype.loop) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        addText(`How it shows up here: ${so.archetype.loop}`, 9, [60, 60, 60]);
      }
      if (so.archetype.escape) {
        addText(`How to break out: ${so.archetype.escape}`, 9, [60, 60, 60]);
      }
      addSpacer(4);
      addDivider();
    }

    // Leverage map
    if (so.leverageMap?.length) {
      addLabel('Leverage map');
      so.leverageMap.forEach((opt: any) => {
        if (!opt.option) return;
        checkPage(36);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        addText(`${opt.option} [${opt.leverageLevel || ''}]`, 9, [0, 0, 0]);
        if (opt.impact) addText(opt.impact, 9, [100, 100, 100], 12);
        addSpacer(4);
      });
      addDivider();
    }

    // Current state simulation
    if (so.currentStateSimulation) {
      addLabel('If nothing changes');
      doc.setFillColor(248, 248, 248);
      const simLines = doc.splitTextToSize(so.currentStateSimulation, CONTENT_W - 20);
      const simH = simLines.length * 11 * 1.4 + 16;
      checkPage(simH + 8);
      doc.rect(MARGIN, y - 4, CONTENT_W, simH, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(simLines, MARGIN + 10, y + 10);
      y += simH + 8;
      addDivider();
    }
  }

  // ── Agent signals ──────────────────────────────────────────────────────────
  if (data.agentEvents?.length) {
    checkPage(40);
    addLabel('Agent analysis');
    data.agentEvents.forEach(ev => {
      if (!ev.signal) return;
      checkPage(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(ev.displayName.toUpperCase(), MARGIN, y);
      y += 13;
      addText(ev.signal, 9, [60, 60, 60]);
      if (ev.structured_artifact) {
        addText(ev.structured_artifact, 8, [120, 120, 120], 8);
      }
      addSpacer(6);
    });
    addDivider();
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('Fresco · frescolab.io', MARGIN, H - 20);
    doc.text(`${i} / ${pageCount}`, W - MARGIN, H - 20, { align: 'right' });
  }

  doc.save(`fresco-${data.houseName.toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── HTML Deck ─────────────────────────────────────────────────────────────────

export function generateHTMLDeck(data: ReportData): void {
  const verdictLabel = VERDICT_LABELS[data.result.verdict] || data.result.verdict;
  const dateStr = data.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const so = data.result.systemsOutput;

  const slide = (content: string, dark = false) => `
    <section class="slide${dark ? ' dark' : ''}">
      <div class="slide-inner">${content}</div>
    </section>`;

  const issuesList = (data.result.keyIssues || []).map((issue, i) => `
    <div class="list-item">
      <span class="num">${i + 1}</span>
      <p>${issue}</p>
    </div>`).join('');

  const movesList = (data.result.necessaryMoves || []).map((move, i) => `
    <div class="list-item filled">
      <span class="num">${i + 1}</span>
      <p>${move}</p>
    </div>`).join('');

  const icebergSlide = so?.icebergLevels ? slide(`
    <div class="label">Iceberg Analysis</div>
    <div class="iceberg">
      ${[
        { l: 'Event', v: so.icebergLevels.event, d: 0 },
        { l: 'Pattern', v: so.icebergLevels.pattern, d: 1 },
        { l: 'Structure', v: so.icebergLevels.structure, d: 2 },
        { l: 'Mental model', v: so.icebergLevels.mentalModel, d: 3 },
      ].filter(r => r.v).map(r => `
        <div class="ice-row" style="margin-left:${r.d * 20}px; opacity:${1 - r.d * 0.1}">
          <span class="ice-label">${r.l}</span>
          <span class="ice-val">${r.v}</span>
        </div>`).join('')}
    </div>`) : '';

  const archetypeSlide = so?.archetype?.name && so.archetype.name !== 'null' ? slide(`
    <div class="label">System Archetype</div>
    <h2>${so.archetype.name}</h2>
    ${so.archetype.loop ? `<p class="body">${so.archetype.loop}</p>` : ''}
    ${so.archetype.escape ? `<div class="escape-box"><span class="escape-label">How to break out</span><p>${so.archetype.escape}</p></div>` : ''}`) : '';

  const leverageSlide = so?.leverageMap?.length ? slide(`
    <div class="label">Leverage Map</div>
    <div class="leverage-list">
      ${so.leverageMap.map((opt: any, i: number) => `
        <div class="leverage-item">
          <div class="lev-bar" style="width:${Math.round((['parameters','feedback','information','rules','goals','paradigms'].indexOf(opt.leverageLevel?.toLowerCase()) + 1) / 6 * 100)}%"></div>
          <div class="lev-content">
            <span class="lev-name">${opt.option}</span>
            <span class="lev-level">${opt.leverageLevel || ''}</span>
          </div>
        </div>`).join('')}
    </div>`) : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fresco · ${data.houseName} Analysis · ${dateStr}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --black: #000000; --white: #ffffff; --gray: #f4f4f4;
    --border: #e5e5e5; --muted: #888; --text: #1a1a1a;
    --slide-h: 100vh;
  }
  body { font-family: -apple-system, 'Inter', sans-serif; background: #111; color: var(--text); }

  .deck { width: 100%; }

  .slide {
    width: 100%; min-height: var(--slide-h);
    display: flex; align-items: stretch;
    background: var(--white); border-bottom: 1px solid #333;
    page-break-after: always;
  }
  .slide.dark { background: var(--black); color: var(--white); }
  .slide-inner {
    width: 100%; max-width: 960px; margin: 0 auto;
    padding: 80px 64px; display: flex; flex-direction: column; justify-content: center;
  }

  .label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 20px;
  }
  .dark .label { color: rgba(255,255,255,0.4); }

  h1 { font-size: clamp(28px, 4vw, 52px); font-weight: 500; line-height: 1.15; }
  h2 { font-size: clamp(22px, 3vw, 36px); font-weight: 500; line-height: 1.2; margin-bottom: 16px; }
  .body { font-size: 16px; line-height: 1.6; color: #555; max-width: 640px; }
  .dark .body { color: rgba(255,255,255,0.65); }

  .meta { font-size: 12px; color: rgba(255,255,255,0.35); margin-bottom: 32px; }
  .verdict-tag {
    display: inline-block; font-size: 11px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    border: 1px solid rgba(255,255,255,0.25); padding: 4px 12px;
    border-radius: 100px; color: rgba(255,255,255,0.6); margin-bottom: 20px;
  }

  .insight-box {
    margin: 28px 0; padding: 28px 32px;
    border-left: 3px solid var(--black); background: var(--gray);
    font-size: 17px; font-style: italic; line-height: 1.55; color: var(--text);
  }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
  .col-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 16px; }

  .list-item { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
  .num {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 1px;
  }
  .list-item.filled .num { background: var(--black); border-color: var(--black); color: var(--white); }
  .list-item p { font-size: 15px; line-height: 1.5; color: #333; padding-top: 3px; }

  .next-box {
    margin-top: 32px; padding: 24px 28px; background: var(--gray);
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px;
  }
  .next-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 4px; }
  .next-name { font-size: 16px; font-weight: 600; }
  .next-reason { font-size: 13px; color: var(--muted); margin-top: 4px; }

  .iceberg { margin-top: 8px; }
  .ice-row {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 10px 14px; margin-bottom: 6px; background: var(--gray);
    border-left: 2px solid var(--border);
  }
  .ice-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); width: 80px; flex-shrink: 0; padding-top: 2px; }
  .ice-val { font-size: 13px; color: #333; line-height: 1.45; }

  .escape-box { margin-top: 20px; padding: 16px 20px; border: 1px solid var(--border); }
  .escape-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); display: block; margin-bottom: 6px; }
  .escape-box p { font-size: 13px; color: #444; line-height: 1.5; }

  .leverage-list { margin-top: 8px; }
  .leverage-item { margin-bottom: 16px; }
  .lev-bar { height: 3px; background: var(--black); margin-bottom: 8px; border-radius: 2px; }
  .lev-content { display: flex; align-items: baseline; gap: 10px; }
  .lev-name { font-size: 14px; font-weight: 500; }
  .lev-level { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }

  .footer-slide .slide-inner { min-height: auto; padding: 60px 64px; }
  .footer-branding { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 32px; }

  .nav {
    position: fixed; bottom: 24px; right: 24px; z-index: 100;
    display: flex; gap: 8px;
  }
  .nav button {
    width: 40px; height: 40px; background: rgba(0,0,0,0.8); color: white;
    border: none; border-radius: 50%; cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .nav button:hover { background: rgba(0,0,0,1); }
  .slide-count { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 100; font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; }

  @media print {
    body { background: white; }
    .nav, .slide-count { display: none; }
    .slide { min-height: 100vh; border: none; }
    .slide + .slide { page-break-before: always; }
  }
</style>
</head>
<body>
<div class="deck" id="deck">

  ${slide(`
    <div class="meta">${data.houseName.toUpperCase()} · ${data.formalLabel.toUpperCase()} · ${dateStr}</div>
    <div class="verdict-tag">${data.result.verdict === 'INVESTIGATE FURTHER' ? 'MORE SIGNAL' : data.result.verdict}</div>
    <h1>${verdictLabel}</h1>
    <div class="insight-box">${data.result.sentenceOfTruth}</div>
    <p class="body">${data.result.verdictRationale}</p>
  `, true)}

  ${issuesList || movesList ? slide(`
    <div class="two-col">
      ${issuesList ? `<div>
        <div class="col-label">Key Issues</div>
        ${issuesList}
      </div>` : ''}
      ${movesList ? `<div>
        <div class="col-label">Recommended Moves</div>
        ${movesList}
      </div>` : ''}
    </div>
  `) : ''}

  ${data.result.suggestedNextHouse ? slide(`
    <div class="label">Next Step</div>
    <div class="next-box">
      <div>
        <div class="next-label">Recommended next house</div>
        <div class="next-name">${data.result.suggestedNextHouse.charAt(0).toUpperCase() + data.result.suggestedNextHouse.slice(1)}</div>
        ${data.result.suggestedNextHouseReason ? `<div class="next-reason">${data.result.suggestedNextHouseReason}</div>` : ''}
      </div>
    </div>
  `) : ''}

  ${icebergSlide}
  ${archetypeSlide}
  ${leverageSlide}

  ${slide(`
    <div class="label">Generated by Fresco</div>
    <h2 style="color:white">frescolab.io</h2>
    <p class="body" style="margin-top:12px">Decision intelligence for product teams.</p>
    <div class="footer-branding">${data.houseName} · ${dateStr}</div>
  `, true)}

</div>

<div class="nav">
  <button onclick="scroll(-1)" title="Previous">↑</button>
  <button onclick="scroll(1)" title="Next">↓</button>
</div>
<div class="slide-count" id="count"></div>

<script>
  const slides = document.querySelectorAll('.slide');
  let current = 0;
  function scroll(dir) {
    current = Math.max(0, Math.min(slides.length - 1, current + dir));
    slides[current].scrollIntoView({ behavior: 'smooth' });
    document.getElementById('count').textContent = (current + 1) + ' / ' + slides.length;
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') scroll(1);
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') scroll(-1);
  });
  document.getElementById('count').textContent = '1 / ' + slides.length;
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
