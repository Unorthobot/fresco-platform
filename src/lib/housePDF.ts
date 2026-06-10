'use client';

// Direct PDF download for a house verdict via jsPDF — no print dialog.
// Beta feedback: "Save as PDF" opening the browser print dialog read as
// broken. This generates and downloads an actual .pdf file. The richer
// HTML report (reportGenerator.ts) remains available as a print view.

import { jsPDF } from 'jspdf';

interface HousePDFInput {
  question: string;
  answer: string;
}

interface HousePDFData {
  houseName: string;
  formalLabel: string;
  result: {
    verdict: string;
    sentenceOfTruth?: string;
    verdictRationale?: string;
    keyIssues?: string[];
    necessaryMoves?: string[];
    suggestedNextHouse?: string;
    suggestedNextHouseReason?: string;
  };
  inputs: HousePDFInput[];
  date: string;
}

const VERDICT_HEADLINES: Record<string, string> = {
  'GO': 'Proceed with confidence',
  'PIVOT': 'Change direction first',
  'STOP': "Don't proceed",
  'INVESTIGATE FURTHER': 'Needs more signal',
};

const MARGIN = 56;
const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = PAGE_HEIGHT - MARGIN;

export function downloadHousePDF(data: HousePDFData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const writeWrapped = (
    text: string,
    size: number,
    style: 'normal' | 'bold' | 'italic',
    color: [number, number, number],
    lineGap = 1.45
  ) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines: string[] = doc.splitTextToSize(text, CONTENT_WIDTH);
    const lineHeight = size * lineGap;
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, MARGIN, y);
      y += lineHeight;
    }
  };

  const sectionLabel = (label: string) => {
    ensureSpace(40);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(138, 138, 138);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 14;
  };

  const numberedList = (items: string[]) => {
    items.forEach((item, i) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const lines: string[] = doc.splitTextToSize(item, CONTENT_WIDTH - 18);
      const blockHeight = lines.length * 14.5 + 4;
      ensureSpace(blockHeight);
      doc.setTextColor(150, 150, 150);
      doc.text(`${i + 1}.`, MARGIN, y);
      doc.setTextColor(60, 60, 60);
      lines.forEach(line => {
        doc.text(line, MARGIN + 18, y);
        y += 14.5;
      });
      y += 4;
    });
  };

  // ── Header ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(138, 138, 138);
  doc.text(`FRESCO  ·  ${data.houseName.toUpperCase()}  ·  ${data.formalLabel.toUpperCase()}`, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  y += 12;
  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 36;

  // ── Verdict ───────────────────────────────────────────────────────────
  const verdict = data.result.verdict || 'INVESTIGATE FURTHER';
  const headline = VERDICT_HEADLINES[verdict] || VERDICT_HEADLINES['INVESTIGATE FURTHER'];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(138, 138, 138);
  doc.text(verdict === 'INVESTIGATE FURTHER' ? 'VERDICT: MORE SIGNAL' : `VERDICT: ${verdict}`, MARGIN, y);
  y += 18;
  writeWrapped(headline, 24, 'bold', [26, 26, 26], 1.2);
  y += 8;

  if (data.result.sentenceOfTruth) {
    writeWrapped(`"${data.result.sentenceOfTruth}"`, 13, 'italic', [26, 26, 26]);
    y += 6;
  }
  if (data.result.verdictRationale) {
    writeWrapped(data.result.verdictRationale, 10, 'normal', [90, 90, 90]);
  }

  // ── Key issues ────────────────────────────────────────────────────────
  if (data.result.keyIssues?.length) {
    sectionLabel('Key issues');
    numberedList(data.result.keyIssues);
  }

  // ── Recommended moves ─────────────────────────────────────────────────
  if (data.result.necessaryMoves?.length) {
    sectionLabel('Recommended moves');
    numberedList(data.result.necessaryMoves);
  }

  // ── Run this next ─────────────────────────────────────────────────────
  if (data.result.suggestedNextHouse) {
    sectionLabel('Run this next');
    const next = data.result.suggestedNextHouse;
    const reason = data.result.suggestedNextHouseReason || '';
    writeWrapped(
      `${next.charAt(0).toUpperCase() + next.slice(1)}${reason ? ` — ${reason}` : ''}`,
      10, 'normal', [60, 60, 60]
    );
  }

  // ── Inputs ────────────────────────────────────────────────────────────
  if (data.inputs.length) {
    sectionLabel('Your input');
    for (const input of data.inputs) {
      ensureSpace(34);
      writeWrapped(input.question, 9, 'bold', [138, 138, 138]);
      writeWrapped(input.answer, 10, 'normal', [60, 60, 60]);
      y += 8;
    }
  }

  // ── Footer on every page ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(170, 170, 170);
    doc.text('Generated with Fresco — frescolab.io', MARGIN, PAGE_HEIGHT - 28);
    doc.text(`${i} / ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 28, { align: 'right' });
  }

  const slug = data.houseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`fresco-${slug}-verdict.pdf`);
}
