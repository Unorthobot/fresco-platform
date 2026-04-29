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
  inputs?: { question: string; answer: string }[];
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

  // ── Helpers ──────────────────────────────────────────────────────────────

  const esc = (s: string) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const section = (label: string, content: string, accent = false) => `
    <div class="section${accent ? ' accent' : ''}">
      <div class="section-label">${label}</div>
      ${content}
    </div>`;

  const numList = (items: string[], filled = false) =>
    `<div class="list">${items.map((item, i) => `
      <div class="list-row">
        <span class="num${filled ? ' filled' : ''}">${i + 1}</span>
        <p>${esc(item)}</p>
      </div>`).join('')}</div>`;

  // ── Inputs section ────────────────────────────────────────────────────────

  const inputsHTML = data.inputs?.length ? section('Your Inputs', `
    <div class="inputs-grid">
      ${data.inputs.filter(i => i.answer?.trim()).map((inp, idx) => `
        <div class="input-item">
          <div class="input-q">${String.fromCharCode(65 + idx)}. ${esc(inp.question)}</div>
          <div class="input-a">${esc(inp.answer).replace(/\n/g, '<br/>')}</div>
        </div>`).join('')}
    </div>`) : '';

  // ── Systems outputs ───────────────────────────────────────────────────────

  const icebergHTML = so?.icebergLevels ? section('Iceberg Analysis', `
    <p class="section-intro">What you see is only the surface. The real causes sit deeper.</p>
    <div class="iceberg">
      ${[
        { l: 'Event', v: so.icebergLevels.event, d: 0 },
        { l: 'Pattern', v: so.icebergLevels.pattern, d: 1 },
        { l: 'Structure', v: so.icebergLevels.structure, d: 2 },
        { l: 'Mental model', v: so.icebergLevels.mentalModel, d: 3 },
      ].filter(r => r.v).map(r => `
        <div class="ice-row" style="margin-left:${r.d * 20}px">
          <div class="ice-depth" style="width:${3 + r.d * 1.5}px; opacity:${1 - r.d * 0.2}"></div>
          <div class="ice-content">
            <span class="ice-label">${r.l}</span>
            <span class="ice-val">${esc(r.v)}</span>
          </div>
        </div>`).join('')}
    </div>`) : '';

  const archetypeHTML = so?.archetype?.name && so.archetype.name !== 'null' ? section('System Archetype', `
    <div class="archetype-card">
      <div class="archetype-head">
        <div class="archetype-eyebrow">System archetype detected</div>
        <div class="archetype-name">${esc(so.archetype.name)}</div>
      </div>
      <div class="archetype-body">
        ${so.archetype.description ? `<p class="archetype-desc">${esc(so.archetype.description)}</p>` : ''}
        ${so.archetype.loop ? `<div class="archetype-row"><span class="archetype-row-label">How it shows up</span><p>${esc(so.archetype.loop)}</p></div>` : ''}
        ${so.archetype.escape ? `<div class="archetype-row"><span class="archetype-row-label">How to break out</span><p>${esc(so.archetype.escape)}</p></div>` : ''}
      </div>
    </div>`) : '';

  const leverageHTML = so?.leverageMap?.length ? section('Leverage Map', `
    <p class="section-intro">Options ranked by systemic leverage — the higher on the map, the more the system shifts.</p>
    <div class="leverage-list">
      ${so.leverageMap.map((opt: any) => {
        const levels = ['parameters','feedback','information','rules','goals','paradigms'];
        const idx = levels.indexOf(opt.leverageLevel?.toLowerCase());
        const pct = idx === -1 ? 40 : Math.round(((idx + 1) / levels.length) * 100);
        return `<div class="leverage-row">
          <div class="lev-top">
            <span class="lev-name">${esc(opt.option)}</span>
            <span class="lev-level">${esc(opt.leverageLevel || '')}</span>
          </div>
          <div class="lev-track"><div class="lev-fill" style="width:${pct}%"></div></div>
          ${opt.impact ? `<p class="lev-impact">${esc(opt.impact)}</p>` : ''}
        </div>`;
      }).join('')}
    </div>`) : '';

  const botgHTML = so?.behaviorOverTime ? section('Behaviour Over Time', `
    <div class="botg">
      <div class="botg-meta">
        <span class="botg-variable">${esc(so.behaviorOverTime.variable || '')}</span>
        ${so.behaviorOverTime.unit ? `<span class="botg-unit">${esc(so.behaviorOverTime.unit)}</span>` : ''}
      </div>
      ${so.behaviorOverTime.trend ? `<p class="botg-trend">${esc(so.behaviorOverTime.trend)}</p>` : ''}
      ${so.behaviorOverTime.projection ? `<div class="botg-projection"><span class="botg-proj-label">Projection</span><p>${esc(so.behaviorOverTime.projection)}</p></div>` : ''}
    </div>`) : '';

  const causalHTML = so?.causalLoop?.nodes?.length ? section('Causal Loop', `
    <div class="causal">
      ${so.causalLoop.dominantLoop ? `<div class="causal-dominant"><span class="causal-loop-label">Dominant loop</span><p>${esc(so.causalLoop.dominantLoop)}</p></div>` : ''}
      <div class="causal-edges">
        ${(so.causalLoop.edges || []).slice(0, 6).map((e: any) => `
          <div class="causal-edge">
            <span class="edge-from">${esc(e.from)}</span>
            <span class="edge-arrow">${e.polarity === '+' ? '→ increases →' : '→ decreases →'}</span>
            <span class="edge-to">${esc(e.to)}</span>
          </div>`).join('')}
      </div>
    </div>`) : '';

  const scenarioHTML = so?.scenarioModel?.variables?.length ? section('Scenario Simulation', `
    <div class="scenario">
      ${so.scenarioModel.outcomeVariable ? `<div class="scenario-outcome"><span class="scenario-outcome-label">Outcome variable</span><p class="scenario-outcome-val">${esc(so.scenarioModel.outcomeVariable)}</p></div>` : ''}
      <div class="scenario-vars">
        ${so.scenarioModel.variables.slice(0, 5).map((v: any) => `
          <div class="scenario-var">
            <div class="svar-top">
              <span class="svar-name">${esc(v.name)}</span>
              <span class="svar-score">${v.sensitivityScore || ''}/10</span>
            </div>
            <div class="svar-track"><div class="svar-fill" style="width:${(v.sensitivityScore || 5) * 10}%"></div></div>
            ${v.effect ? `<p class="svar-effect">${esc(v.effect)}</p>` : ''}
          </div>`).join('')}
      </div>
    </div>`) : '';

  const ipoHTML = so?.ipoMap?.inputs?.length ? section('Input → Process → Output', `
    <div class="ipo-grid">
      <div class="ipo-col">
        <div class="ipo-col-label">Inputs</div>
        ${(so.ipoMap.inputs || []).map((i: any) => `<div class="ipo-item"><span class="ipo-item-label">${esc(i.label)}</span>${i.note ? `<p class="ipo-item-note">${esc(i.note)}</p>` : ''}</div>`).join('')}
      </div>
      <div class="ipo-col">
        <div class="ipo-col-label">Processes</div>
        ${(so.ipoMap.processes || []).map((p: any) => `<div class="ipo-item"><span class="ipo-item-label">${esc(p.label)}</span>${p.note ? `<p class="ipo-item-note">${esc(p.note)}</p>` : ''}</div>`).join('')}
      </div>
      <div class="ipo-col">
        <div class="ipo-col-label">Outputs</div>
        ${(so.ipoMap.outputs || []).map((o: any) => `<div class="ipo-item"><span class="ipo-item-label">${esc(o.label)}</span>${o.note ? `<p class="ipo-item-note">${esc(o.note)}</p>` : ''}</div>`).join('')}
      </div>
    </div>
    ${so.ipoMap.bottleneck ? `<div class="ipo-bottleneck"><span class="ipo-bn-label">Bottleneck</span><p>${esc(so.ipoMap.bottleneck)}</p></div>` : ''}`) : '';

  const agentHTML = data.agentEvents?.length ? section('Agent Analysis', `
    <div class="agents">
      ${data.agentEvents.map(ev => `
        <div class="agent-row">
          <div class="agent-name">${esc(ev.displayName)}</div>
          <p class="agent-signal">${esc(ev.signal)}</p>
          ${ev.structured_artifact ? `<p class="agent-artifact">${esc(ev.structured_artifact)}</p>` : ''}
        </div>`).join('')}
    </div>`) : '';

  // ── New sections added for full-parity export — match the three-beat structure ──
  // Beat 1: surface read
  const povHTML = data.result.povStatement ? section('Your Point of View', `
    <blockquote class="sim-quote">${esc(data.result.povStatement)}</blockquote>`) : '';

  const beliefMapper = data.agentEvents?.find(e => e.displayName === 'Belief Mapper');
  const coreAssumptionHTML = beliefMapper?.structured_artifact ? section('Core Assumption', `
    <p style="font-size: 15px; line-height: 1.6; color: var(--text);">${esc(beliefMapper.structured_artifact)}</p>
    <p style="font-size: 12px; color: var(--mid); margin-top: 8px;">This is the belief being treated as fact. Challenge it before committing to a direction.</p>`) : '';

  const predictedOutcomeHTML = so?.funnelSimulation ? section('Predicted Outcome', `
    <div class="sim-grid">
      ${[
        { l: 'Expected', v: so.funnelSimulation.expected },
        { l: 'Best case', v: so.funnelSimulation.bestCase },
        { l: 'Worst case', v: so.funnelSimulation.worstCase },
      ].filter(r => r.v).map(r => `
        <div class="sim-cell">
          <div class="sim-cell-label">${esc(r.l)}</div>
          <div class="sim-cell-value">${esc(r.v)}</div>
        </div>`).join('')}
    </div>`) : '';

  // Beat 2: structural read
  const interventionForecastHTML = so?.interventionForecast ? section('Intervention Forecast', `
    ${[
      { l: 'Immediate effect', v: so.interventionForecast.immediate },
      { l: 'Over time', v: so.interventionForecast.delayed },
      { l: 'Watch for', v: so.interventionForecast.risk },
    ].filter(r => r.v).map(r => `
      <div class="intervention-row">
        <div class="intervention-label">${esc(r.l)}</div>
        <p>${esc(r.v)}</p>
      </div>`).join('')}`) : '';

  const influenceMapHTML = so?.influenceMap ? section('Influence Map', `
    ${[
      { l: 'Real barrier', v: so.influenceMap.barrier },
      { l: 'What overcomes it', v: so.influenceMap.lever },
      { l: 'Proof required', v: so.influenceMap.proofRequired },
    ].filter(r => r.v).map(r => `
      <div class="intervention-row">
        <div class="intervention-label">${esc(r.l)}</div>
        <p>${esc(r.v)}</p>
      </div>`).join('')}`) : '';

  const systemProjectionHTML = (so?.evolutionProjection || so?.doublLoopLearning || so?.kpiSystemMap) ? section('System Projection', `
    ${so.evolutionProjection ? `<div class="intervention-row"><div class="intervention-label">Evolution projection</div><p>${esc(so.evolutionProjection)}</p></div>` : ''}
    ${so.doublLoopLearning ? `<div class="intervention-row"><div class="intervention-label">Double-loop learning</div><p>${esc(so.doublLoopLearning)}</p></div>` : ''}
    ${so.kpiSystemMap ? `<div class="intervention-row"><div class="intervention-label">KPI system map</div><p>${esc(so.kpiSystemMap)}</p></div>` : ''}`) : '';

  const stockFlowHTML = so?.stockFlow?.stocks?.length ? section('Stock & Flow', `
    <div class="sf-grid">
      <div class="sf-col"><div class="sf-col-label">Stocks</div>${(so.stockFlow.stocks || []).map((s: any) => `<div class="sf-row"><span class="sf-name">${esc(s.name || '')}</span>${s.note ? `<p class="sf-note">${esc(s.note)}</p>` : ''}</div>`).join('')}</div>
      <div class="sf-col"><div class="sf-col-label">Inflows</div>${(so.stockFlow.inflows || []).map((s: any) => `<div class="sf-row"><span class="sf-name">${esc(s.name || '')}</span>${s.note ? `<p class="sf-note">${esc(s.note)}</p>` : ''}</div>`).join('')}</div>
      <div class="sf-col"><div class="sf-col-label">Outflows</div>${(so.stockFlow.outflows || []).map((s: any) => `<div class="sf-row"><span class="sf-name">${esc(s.name || '')}</span>${s.note ? `<p class="sf-note">${esc(s.note)}</p>` : ''}</div>`).join('')}</div>
    </div>
    ${so.stockFlow.keyConstraint ? `<p class="sf-constraint">Key constraint: ${esc(so.stockFlow.keyConstraint)}</p>` : ''}`) : '';

  // Beat 3: actionable read
  const sensitivityHTML = so?.sensitivityAnalysis?.variables?.length ? section('Sensitivity Analysis', `
    <p style="font-size: 12px; color: var(--mid); margin-bottom: 12px;">If you could only change one thing, what would move the needle most?</p>
    <p style="font-size: 13px; color: var(--text); margin-bottom: 16px;">Which variables have the most impact on <strong>${esc(so.sensitivityAnalysis.outcomeVariable || 'outcome')}</strong></p>
    ${(so.sensitivityAnalysis.variables || []).map((v: any) => `
      <div class="sens-row">
        <div class="sens-head">
          <span class="sens-name">${esc(v.name || '')}</span>
          <span class="sens-impact">${v.direction === 'helps' ? '↑ HELPS' : v.direction === 'hurts' ? '↓ HURTS' : ''}</span>
          <span class="sens-score">${v.impact ?? ''}/10</span>
        </div>
        ${v.note ? `<p class="sens-note">${esc(v.note)}</p>` : ''}
      </div>`).join('')}`) : '';

  const simHTML = so?.currentStateSimulation ? section('If Nothing Changes', `
    <blockquote class="sim-quote">${esc(so.currentStateSimulation)}</blockquote>`) : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Fresco · ${data.houseName} · ${dateStr}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #1a1a1a;
    --white: #ffffff;
    --off: #fafafa;
    --light: #f5f5f5;
    --border: #e5e5e5;
    --border-light: #ebebeb;
    --muted: #8a8a8a;
    --mid: #6b6b6b;
    --text: #1a1a1a;
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  body {
    font-family: var(--font);
    background: #ebebeb;
    color: var(--text);
    padding: 48px 24px 80px;
    -webkit-font-smoothing: antialiased;
  }

  .page { max-width: 794px; margin: 0 auto; }

  /* ── PRINT BAR ─────────────────────────────────────────────────── */
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: var(--black); padding: 10px 24px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .print-bar p { font-size: 11px; color: rgba(255,255,255,0.4); }
  .print-btn {
    height: 30px; padding: 0 16px;
    background: var(--white); color: var(--black);
    border: none; font-family: var(--font);
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; cursor: pointer;
  }
  .print-btn:hover { background: #f0f0f0; }

  /* ── COVER ─────────────────────────────────────────────────────── */
  .cover {
    background: var(--black);
    padding: 56px 56px 48px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .cover-grid-bg {
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 24px 24px;
    position: absolute; inset: 0; pointer-events: none;
  }

  .cover-inner { position: relative; }

  .cover-meta {
    font-size: 10px; font-weight: 500; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(255,255,255,0.25);
    margin-bottom: 40px; display: flex; align-items: center; gap: 8px;
  }

  .cover-meta-sep { color: rgba(255,255,255,0.1); }

  .cover-pill {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; padding: 3px 10px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 9999px; color: rgba(255,255,255,0.45);
    margin-bottom: 16px;
  }

  .cover-pill-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(255,255,255,0.4);
  }

  .cover-verdict {
    font-size: 38px; font-weight: 500; line-height: 1.1;
    letter-spacing: -0.025em; color: var(--white);
    margin-bottom: 28px; max-width: 580px;
  }

  .cover-sot {
    font-size: 15px; font-style: italic; line-height: 1.65;
    color: rgba(255,255,255,0.55);
    border-left: 2px solid rgba(255,255,255,0.15);
    padding-left: 18px; margin-bottom: 20px; max-width: 560px;
  }

  .cover-rationale {
    font-size: 12px; line-height: 1.7;
    color: rgba(255,255,255,0.35); max-width: 520px;
  }

  /* ── DECISION SECTION (white bg) ───────────────────────────────── */
  .decision-block {
    background: var(--white);
    padding: 0 56px;
    border-bottom: 1px solid var(--border);
  }

  .decision-header {
    padding: 32px 0 0;
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 0;
  }

  .decision-header-label {
    font-size: 9px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 20px;
  }

  /* ── INPUTS ────────────────────────────────────────────────────── */
  .inputs-block {
    background: var(--off);
    padding: 32px 56px;
    border-bottom: 1px solid var(--border);
  }

  .inputs-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }

  .input-item {
    padding: 16px 0;
    border-bottom: 1px solid var(--border-light);
  }

  .input-item:last-child { border-bottom: none; }

  .input-q {
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 6px;
  }

  .input-a {
    font-size: 13px; color: var(--text); line-height: 1.6;
  }

  /* ── SECTION (analysis) ────────────────────────────────────────── */
  .section {
    background: var(--white);
    padding: 32px 56px;
    border-bottom: 1px solid var(--border);
  }

  .section.accent {
    background: var(--off);
  }

  .section-label {
    font-size: 9px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 16px;
  }

  .section-intro {
    font-size: 12px; color: var(--muted); line-height: 1.6;
    margin-bottom: 16px; font-style: italic;
  }

  /* SOT */
  .sot-box {
    border-left: 3px solid var(--black); padding: 16px 20px;
    background: var(--off); font-size: 15px; font-style: italic;
    line-height: 1.6; color: var(--text);
  }

  /* POV */
  .pov-box {
    border-left: 3px solid var(--black); padding: 16px 20px;
    font-size: 14px; font-weight: 500; line-height: 1.55;
  }

  /* Lists */
  .list { }
  .list-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
  .list-row:last-child { margin-bottom: 0; }

  .num {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 500; color: var(--muted);
    margin-top: 2px;
  }
  .num.filled { background: var(--black); border-color: var(--black); color: var(--white); }
  .list-row p { font-size: 13px; line-height: 1.55; color: #333; padding-top: 3px; }

  /* Next step */
  .next-box {
    background: var(--light); padding: 20px 24px;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .next-label { font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
  .next-name { font-size: 15px; font-weight: 500; }
  .next-reason { font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.5; }

  /* Iceberg */
  .iceberg { }
  .ice-row {
    display: flex; gap: 0; align-items: stretch;
    margin-bottom: 4px;
  }
  .ice-depth {
    background: var(--black); flex-shrink: 0; margin-right: 14px;
  }
  .ice-content {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 10px 14px; background: var(--light); flex: 1;
  }
  .ice-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); width: 76px; flex-shrink: 0;
    padding-top: 2px;
  }
  .ice-val { font-size: 12px; color: #333; line-height: 1.5; }

  /* Archetype */
  .archetype-card { border: 1px solid var(--border); overflow: hidden; }
  .archetype-head { background: var(--black); padding: 16px 20px; }
  .archetype-eyebrow {
    font-size: 9px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 4px;
  }
  .archetype-name { font-size: 16px; font-weight: 500; color: var(--white); }
  .archetype-body { background: var(--white); }
  .archetype-desc { padding: 14px 20px; font-size: 12px; color: var(--mid); line-height: 1.6; }
  .archetype-row {
    padding: 12px 20px; border-top: 1px solid var(--border);
    display: flex; gap: 14px; align-items: flex-start;
  }
  .archetype-row-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); width: 96px; flex-shrink: 0; padding-top: 2px;
  }
  .archetype-row p { font-size: 12px; color: #333; line-height: 1.5; }

  /* Leverage */
  .leverage-row { margin-bottom: 18px; }
  .leverage-row:last-child { margin-bottom: 0; }
  .lev-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
  .lev-name { font-size: 13px; font-weight: 500; }
  .lev-level {
    font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--muted); border: 1px solid var(--border); padding: 2px 7px;
    border-radius: 9999px;
  }
  .lev-track { height: 2px; background: var(--border); margin-bottom: 6px; }
  .lev-fill { height: 100%; background: var(--black); }
  .lev-impact { font-size: 11px; color: var(--muted); line-height: 1.5; }

  /* Behaviour over time */
  .botg { padding: 16px 20px; background: var(--light); }
  .botg-meta { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
  .botg-variable { font-size: 14px; font-weight: 500; }
  .botg-unit { font-size: 11px; color: var(--muted); }
  .botg-trend { font-size: 12px; color: var(--mid); line-height: 1.6; margin-bottom: 10px; }
  .botg-projection {
    border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px;
    display: flex; gap: 12px;
  }
  .botg-proj-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); width: 64px; flex-shrink: 0; padding-top: 2px;
  }
  .botg-projection p { font-size: 12px; color: #333; line-height: 1.5; }

  /* Causal loop */
  .causal { }
  .causal-dominant {
    display: flex; gap: 12px; padding: 12px 16px;
    background: var(--black); margin-bottom: 12px;
    align-items: flex-start;
  }
  .causal-loop-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: rgba(255,255,255,0.35);
    width: 80px; flex-shrink: 0; padding-top: 2px;
  }
  .causal-dominant p { font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.5; }
  .causal-edges { }
  .causal-edge {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0; border-bottom: 1px solid var(--border-light);
  }
  .causal-edge:last-child { border-bottom: none; }
  .edge-from, .edge-to { font-size: 12px; font-weight: 500; color: var(--text); }
  .edge-arrow { font-size: 11px; color: var(--muted); flex-shrink: 0; }

  /* Scenario */
  .scenario { }
  .scenario-outcome {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 12px 16px; background: var(--light);
    border-left: 3px solid var(--black); margin-bottom: 16px;
  }
  .scenario-outcome-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); width: 80px;
    flex-shrink: 0; padding-top: 2px;
  }
  .scenario-outcome-val { font-size: 13px; font-weight: 500; color: var(--text); }
  .scenario-var { margin-bottom: 14px; }
  .scenario-var:last-child { margin-bottom: 0; }
  .svar-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px; }
  .svar-name { font-size: 13px; font-weight: 500; }
  .svar-score { font-size: 10px; color: var(--muted); }
  .svar-track { height: 2px; background: var(--border); margin-bottom: 5px; }
  .svar-fill { height: 100%; background: var(--black); }
  .svar-effect { font-size: 11px; color: var(--muted); line-height: 1.5; }

  /* IPO */
  .ipo-grid {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 0; border: 1px solid var(--border); overflow: hidden;
  }
  .ipo-col { padding: 16px; border-right: 1px solid var(--border); }
  .ipo-col:last-child { border-right: none; }
  .ipo-col-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); margin-bottom: 12px;
    padding-bottom: 10px; border-bottom: 1px solid var(--border-light);
  }
  .ipo-item { margin-bottom: 10px; }
  .ipo-item:last-child { margin-bottom: 0; }
  .ipo-item-label { font-size: 12px; font-weight: 500; color: var(--text); display: block; margin-bottom: 2px; }
  .ipo-item-note { font-size: 10px; color: var(--muted); line-height: 1.45; }
  .ipo-bottleneck {
    display: flex; gap: 12px; padding: 12px 16px;
    border: 1px solid var(--border); border-top: none;
    background: var(--off); align-items: flex-start;
  }
  .ipo-bn-label {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); width: 70px;
    flex-shrink: 0; padding-top: 2px;
  }
  .ipo-bottleneck p { font-size: 12px; color: #333; line-height: 1.5; }

  /* Simulation */
  .sim-quote {
    border-left: 3px solid var(--border); padding: 12px 20px;
    font-size: 13px; font-style: italic; line-height: 1.65;
    color: var(--mid); background: var(--off);
  }

  /* Agents */
  .agents { }
  .agent-row {
    padding: 16px 0; border-bottom: 1px solid var(--border-light);
  }
  .agent-row:last-child { border-bottom: none; }
  .agent-name {
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.12em; color: var(--muted); margin-bottom: 6px;
  }
  .agent-signal { font-size: 12px; line-height: 1.6; color: #333; }
  .agent-artifact { font-size: 11px; color: var(--muted); margin-top: 6px; font-style: italic; }

  /* Footer */
  .footer {
    background: var(--white);
    padding: 20px 56px;
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid var(--border);
  }
  .footer-brand { font-size: 11px; font-weight: 500; color: var(--muted); }
  .footer-date { font-size: 10px; color: var(--border); }

  /* Print */
  @media print {
    body { background: white; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-bar { display: none; }
    .print-spacer { display: none; }
    /* Never suppress whole blocks — only avoid breaks inside small atomic units */
    .list-row { break-inside: avoid; }
    .archetype-card { break-inside: avoid; }
    .ice-row { break-inside: avoid; }
    .leverage-row { break-inside: avoid; }
    .causal-edge { break-inside: avoid; }
    .scenario-var { break-inside: avoid; }
    .input-item { break-inside: avoid; }
    .agent-row { break-inside: avoid; }
    /* Section labels stay with their content */
    .section-label { break-after: avoid; }
    /* Let content flow naturally — no forced page breaks */
    .cover { break-after: auto; }
  }

  /* New sections — full-parity export */
  .intervention-row { padding: 12px 0; border-bottom: 1px solid var(--border-light); }
  .intervention-row:last-child { border-bottom: none; }
  .intervention-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mid); margin-bottom: 4px; }
  .intervention-row p { font-size: 13px; color: var(--text); line-height: 1.55; }
  .sim-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); }
  .sim-cell { background: var(--white); padding: 16px; }
  .sim-cell-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mid); margin-bottom: 6px; }
  .sim-cell-value { font-size: 14px; color: var(--text); line-height: 1.5; }
  .sf-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .sf-col-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mid); margin-bottom: 8px; }
  .sf-row { padding: 8px 0; border-bottom: 1px solid var(--border-light); }
  .sf-name { font-size: 13px; color: var(--text); font-weight: 500; }
  .sf-note { font-size: 12px; color: var(--mid); margin-top: 2px; }
  .sf-constraint { margin-top: 16px; padding: 12px; background: var(--off); border-left: 3px solid var(--black); font-size: 13px; }
  .sens-row { padding: 12px 0; border-bottom: 1px solid var(--border-light); }
  .sens-row:last-child { border-bottom: none; }
  .sens-head { display: flex; align-items: baseline; gap: 12px; }
  .sens-name { flex: 1; font-size: 13px; color: var(--text); font-weight: 500; }
  .sens-impact { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; color: var(--mid); }
  .sens-score { font-size: 12px; color: var(--mid); }
  .sens-note { font-size: 12px; color: var(--mid); margin-top: 4px; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <p>Fresco · ${esc(data.houseName)} Analysis · ${dateStr}</p>
  <button class="print-btn" onclick="window.print()">Save as PDF →</button>
</div>
<div class="print-spacer" style="height:48px"></div>

<div class="page">

  <!-- ── COVER ─────────────────────────────────────────────────────── -->
  <div class="cover" style="position:relative; overflow:hidden">
    <div class="cover-grid-bg"></div>
    <div class="cover-inner">
      <div class="cover-meta">
        <span>${esc(data.houseName)}</span>
        <span class="cover-meta-sep">·</span>
        <span>${esc(data.formalLabel)}</span>
        <span class="cover-meta-sep">·</span>
        <span>${dateStr}</span>
      </div>
      <div class="cover-pill">
        <span class="cover-pill-dot"></span>
        ${esc(tag)}
      </div>
      <h1 class="cover-verdict">${esc(verdictLabel)}</h1>
      ${data.result.sentenceOfTruth ? `<div class="cover-sot">"${esc(data.result.sentenceOfTruth)}"</div>` : ''}
      ${data.result.verdictRationale ? `<p class="cover-rationale">${esc(data.result.verdictRationale)}</p>` : ''}
    </div>
  </div>

  <!-- ── DECISION ───────────────────────────────────────────────────── -->
  <div class="decision-block">
    ${data.result.povStatement ? `
    <div style="padding: 32px 0; border-bottom: 1px solid var(--border-light)">
      <div class="section-label">Point of View</div>
      <div class="pov-box">${esc(data.result.povStatement)}</div>
    </div>` : ''}
    ${data.result.keyIssues?.length ? `
    <div style="padding: 32px 0; border-bottom: 1px solid var(--border-light)">
      <div class="section-label">Key Issues</div>
      ${numList(data.result.keyIssues, false)}
    </div>` : ''}
    ${data.result.necessaryMoves?.length ? `
    <div style="padding: 32px 0; border-bottom: 1px solid var(--border-light)">
      <div class="section-label">Recommended Moves</div>
      ${numList(data.result.necessaryMoves, true)}
    </div>` : ''}
    ${data.result.suggestedNextHouse ? `
    <div style="padding: 32px 0;">
      <div class="section-label">Run This Next</div>
      <div class="next-box">
        <div>
          <div class="next-name">${esc(data.result.suggestedNextHouse.charAt(0).toUpperCase() + data.result.suggestedNextHouse.slice(1))}</div>
          ${data.result.suggestedNextHouseReason ? `<div class="next-reason">${esc(data.result.suggestedNextHouseReason)}</div>` : ''}
        </div>
      </div>
    </div>` : ''}
  </div>

  <!-- ── INPUTS ─────────────────────────────────────────────────────── -->
  ${inputsHTML}

  <!-- ── BEAT 1: WHAT'S ACTUALLY HAPPENING ─────────────────────────── -->
  ${povHTML}
  ${coreAssumptionHTML}
  ${icebergHTML}
  ${leverageHTML}
  ${predictedOutcomeHTML}

  <!-- ── BEAT 2: WHY IT PERSISTS ───────────────────────────────────── -->
  ${simHTML}
  ${archetypeHTML}
  ${botgHTML}
  ${causalHTML}
  ${stockFlowHTML}
  ${interventionForecastHTML}
  ${influenceMapHTML}
  ${systemProjectionHTML}

  <!-- ── BEAT 3: WHERE THE LEVERAGE IS ─────────────────────────────── -->
  ${ipoHTML}
  ${sensitivityHTML}
  ${scenarioHTML}

  <!-- ── AGENT ANALYSIS ─────────────────────────────────────────────── -->
  ${agentHTML}

  <!-- ── FOOTER ─────────────────────────────────────────────────────── -->
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

  // ── Beat 1 additions ────────────────────────────────────
  // Core Assumption (Investigate)
  const beliefMapper = data.agentEvents?.find(e => e.displayName === 'Belief Mapper');
  if (beliefMapper?.structured_artifact) {
    slides.push({ dark: false, content: `
      <div class="s-label">Core Assumption</div>
      <div class="s-pov">${beliefMapper.structured_artifact}</div>
      <p class="s-rationale" style="margin-top:24px">This is the belief being treated as fact. Challenge it before committing to a direction.</p>
    `});
  }

  // Predicted Outcome (Validate)
  if (so?.funnelSimulation && (so.funnelSimulation.expected || so.funnelSimulation.bestCase || so.funnelSimulation.worstCase)) {
    slides.push({ dark: false, content: `
      <div class="s-label">Predicted Outcome</div>
      <div class="s-three-col">
        ${so.funnelSimulation.expected  ? `<div><div class="s-col-label">Expected</div><p class="s-col-text">${so.funnelSimulation.expected}</p></div>` : ''}
        ${so.funnelSimulation.bestCase  ? `<div><div class="s-col-label">Best case</div><p class="s-col-text">${so.funnelSimulation.bestCase}</p></div>` : ''}
        ${so.funnelSimulation.worstCase ? `<div><div class="s-col-label">Worst case</div><p class="s-col-text">${so.funnelSimulation.worstCase}</p></div>` : ''}
      </div>
    `});
  }

  // ── Beat 2 additions ────────────────────────────────────
  // If Nothing Changes
  if (so?.currentStateSimulation) {
    slides.push({ dark: false, content: `
      <div class="s-label">If Nothing Changes</div>
      <div class="s-pov" style="font-style:italic">${so.currentStateSimulation}</div>
    `});
  }

  // Behaviour Over Time — only if at least one valid series
  if (so?.behaviorOverTime?.length && so.behaviorOverTime.some((s: any) => s?.dataPoints?.length >= 2)) {
    const valid = so.behaviorOverTime.filter((s: any) => s?.dataPoints?.length >= 2);
    slides.push({ dark: false, content: `
      <div class="s-label">Behaviour Over Time</div>
      ${valid.map((s: any) => `
        <div class="s-bot-row">
          <div class="s-bot-head">
            <span class="s-bot-var">${s.variable || 'Variable'}</span>
            ${s.unit ? `<span class="s-bot-unit">${s.unit}</span>` : ''}
            ${s.trend ? `<span class="s-bot-trend">${s.trend}</span>` : ''}
          </div>
          <div class="s-bot-points">${s.dataPoints.map((p: any) => `<span class="s-bot-point">${p.label}: <strong>${p.value}</strong></span>`).join('')}</div>
        </div>
      `).join('')}
    `});
  }

  // Causal Loop summary — text-only since we can't render the SVG diagram in slides
  if (so?.causalLoop?.nodes?.length >= 2 && so?.causalLoop?.edges?.length) {
    slides.push({ dark: false, content: `
      <div class="s-label">Causal Loop</div>
      <p class="s-rationale" style="margin-bottom:16px">How variables feed back on each other. Reinforcing loops compound; balancing loops push back.</p>
      ${so.causalLoop.dominantLoop ? `<div class="s-pov" style="font-size:18px">${so.causalLoop.dominantLoop}</div>` : ''}
    `});
  }

  // Stock & Flow
  if (so?.stockFlow?.stocks?.length) {
    slides.push({ dark: false, content: `
      <div class="s-label">Stock &amp; Flow</div>
      <div class="s-three-col">
        <div><div class="s-col-label">Stocks</div>${(so.stockFlow.stocks || []).map((s: any) => `<p class="s-col-text">${s.name || ''}</p>`).join('')}</div>
        <div><div class="s-col-label">Inflows</div>${(so.stockFlow.inflows || []).map((s: any) => `<p class="s-col-text">${s.name || ''}</p>`).join('')}</div>
        <div><div class="s-col-label">Outflows</div>${(so.stockFlow.outflows || []).map((s: any) => `<p class="s-col-text">${s.name || ''}</p>`).join('')}</div>
      </div>
      ${so.stockFlow.keyConstraint ? `<p class="s-rationale" style="margin-top:24px"><strong>Key constraint:</strong> ${so.stockFlow.keyConstraint}</p>` : ''}
    `});
  }

  // Intervention Forecast (Innovate)
  if (so?.interventionForecast && (so.interventionForecast.immediate || so.interventionForecast.delayed || so.interventionForecast.risk)) {
    slides.push({ dark: false, content: `
      <div class="s-label">Intervention Forecast</div>
      <div class="s-three-col">
        ${so.interventionForecast.immediate ? `<div><div class="s-col-label">Immediate effect</div><p class="s-col-text">${so.interventionForecast.immediate}</p></div>` : ''}
        ${so.interventionForecast.delayed   ? `<div><div class="s-col-label">Over time</div><p class="s-col-text">${so.interventionForecast.delayed}</p></div>` : ''}
        ${so.interventionForecast.risk      ? `<div><div class="s-col-label">Watch for</div><p class="s-col-text">${so.interventionForecast.risk}</p></div>` : ''}
      </div>
    `});
  }

  // Influence Map (Validate)
  if (so?.influenceMap && (so.influenceMap.barrier || so.influenceMap.lever || so.influenceMap.proofRequired)) {
    slides.push({ dark: false, content: `
      <div class="s-label">Influence Map</div>
      <div class="s-three-col">
        ${so.influenceMap.barrier       ? `<div><div class="s-col-label">Real barrier</div><p class="s-col-text">${so.influenceMap.barrier}</p></div>` : ''}
        ${so.influenceMap.lever         ? `<div><div class="s-col-label">What overcomes it</div><p class="s-col-text">${so.influenceMap.lever}</p></div>` : ''}
        ${so.influenceMap.proofRequired ? `<div><div class="s-col-label">Proof required</div><p class="s-col-text">${so.influenceMap.proofRequired}</p></div>` : ''}
      </div>
    `});
  }

  // System Projection (Evaluate)
  if (so?.evolutionProjection || so?.doublLoopLearning || so?.kpiSystemMap) {
    slides.push({ dark: false, content: `
      <div class="s-label">System Projection</div>
      ${so.evolutionProjection ? `<div class="s-row"><div class="s-row-label">Evolution projection</div><p>${so.evolutionProjection}</p></div>` : ''}
      ${so.doublLoopLearning   ? `<div class="s-row"><div class="s-row-label">Double-loop learning</div><p>${so.doublLoopLearning}</p></div>` : ''}
      ${so.kpiSystemMap        ? `<div class="s-row"><div class="s-row-label">KPI system map</div><p>${so.kpiSystemMap}</p></div>` : ''}
    `});
  }

  // ── Beat 3 additions ────────────────────────────────────
  // IPO Map
  if (so?.ipoMap && (so.ipoMap.inputs?.length || so.ipoMap.processes?.length || so.ipoMap.outputs?.length)) {
    slides.push({ dark: false, content: `
      <div class="s-label">Input → Process → Output</div>
      <div class="s-three-col">
        <div><div class="s-col-label">Inputs</div>${(so.ipoMap.inputs || []).map((i: any) => `<p class="s-col-text">${i.label || ''}</p>`).join('')}</div>
        <div><div class="s-col-label">Processes</div>${(so.ipoMap.processes || []).map((i: any) => `<p class="s-col-text">${i.label || ''}</p>`).join('')}</div>
        <div><div class="s-col-label">Outputs</div>${(so.ipoMap.outputs || []).map((i: any) => `<p class="s-col-text">${i.label || ''}</p>`).join('')}</div>
      </div>
      ${so.ipoMap.bottleneck ? `<p class="s-rationale" style="margin-top:24px"><strong>Bottleneck:</strong> ${so.ipoMap.bottleneck}</p>` : ''}
    `});
  }

  // Sensitivity Analysis
  if (so?.sensitivityAnalysis?.variables?.length) {
    slides.push({ dark: false, content: `
      <div class="s-label">Sensitivity Analysis</div>
      <p class="s-rationale" style="margin-bottom:16px">If you could only change one thing, what would move the needle most? <strong>Outcome:</strong> ${so.sensitivityAnalysis.outcomeVariable || 'outcome'}</p>
      ${so.sensitivityAnalysis.variables.map((v: any) => `
        <div class="s-list-row">
          <span class="s-num">${v.impact ?? '–'}</span>
          <p><strong>${v.name || ''}</strong>${v.direction === 'helps' ? ' ↑' : v.direction === 'hurts' ? ' ↓' : ''}${v.note ? ' — ' + v.note : ''}</p>
        </div>`).join('')}
    `});
  }

  // Scenario Simulation
  if (so?.scenarioModel?.variables?.length) {
    slides.push({ dark: false, content: `
      <div class="s-label">Scenario Simulation</div>
      <p class="s-rationale" style="margin-bottom:16px"><strong>Outcome:</strong> ${so.scenarioModel.outcomeVariable || 'outcome'}${so.scenarioModel.outcomeUnit ? ' (' + so.scenarioModel.outcomeUnit + ')' : ''}${so.scenarioModel.baselineValue !== undefined ? ' · <strong>Baseline:</strong> ' + so.scenarioModel.baselineValue : ''}</p>
      ${so.scenarioModel.variables.map((v: any) => `
        <div class="s-list-row">
          <p><strong>${v.name || ''}</strong>${v.note ? ' — ' + v.note : ''}</p>
        </div>`).join('')}
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

  /* Full-parity slides */
  .s-three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 32px; }
  .s-col-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 12px; }
  .s-col-text { font-size: 15px; line-height: 1.55; color: var(--text); margin-bottom: 8px; }
  .s-bot-row { padding: 16px 0; border-bottom: 1px solid var(--border); }
  .s-bot-row:last-child { border-bottom: none; }
  .s-bot-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
  .s-bot-var { font-size: 16px; font-weight: 500; color: var(--text); }
  .s-bot-unit { font-size: 12px; color: var(--muted); }
  .s-bot-trend { font-size: 11px; color: var(--muted); margin-left: auto; text-transform: lowercase; }
  .s-bot-points { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--muted); }
  .s-bot-point strong { color: var(--text); font-weight: 500; }
  .s-row { padding: 12px 0; border-bottom: 1px solid var(--border); }
  .s-row:last-child { border-bottom: none; }
  .s-row-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 4px; }
  .s-row p { font-size: 15px; line-height: 1.55; color: var(--text); }
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
