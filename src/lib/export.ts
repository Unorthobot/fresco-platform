// FRESCO Platform - Export Utilities
// Shared export functionality for all toolkits

import { TOOLKITS, type ToolkitType } from '@/types';

export interface ExportData {
  toolkitType: ToolkitType;
  toolkitName: string;
  workspaceTitle: string;
  thinkingLens: string;
  date: string;
  steps: { label: string; content: string }[];
  insights: string[];
  sentenceOfTruth: string;
  necessaryMoves: string[];
  customData?: Record<string, any>;
}

export function generateMarkdown(data: ExportData): string {
  const lines: string[] = [
    `# ${data.toolkitName}: ${data.workspaceTitle}`,
    '',
    `**Thinking Lens:** ${data.thinkingLens || 'Automatic'}`,
    `**Date:** ${data.date}`,
    `**Toolkit:** ${data.toolkitName}`,
    '',
    '---',
    '',
  ];

  // Steps
  data.steps.forEach((step, index) => {
    lines.push(`## ${index + 1}. ${step.label}`, '');
    lines.push(step.content || '_(Not filled)_', '');
  });

  // Insights
  if (data.insights.length > 0) {
    lines.push('---', '', '## Key Insights', '');
    data.insights.forEach((insight, i) => {
      lines.push(`${i + 1}. ${insight}`);
    });
    lines.push('');
  }

  // Sentence of Truth
  if (data.sentenceOfTruth) {
    lines.push('---', '', '## Sentence of Truth', '');
    lines.push(`> ${data.sentenceOfTruth}`, '');
  }

  // Necessary Moves
  if (data.necessaryMoves.length > 0) {
    lines.push('---', '', '## Necessary Moves', '');
    data.necessaryMoves.forEach((move, i) => {
      lines.push(`${i + 1}. ${move}`);
    });
    lines.push('');
  }

  // Custom data (toolkit-specific)
  if (data.customData) {
    Object.entries(data.customData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        lines.push('---', '', `## ${key}`, '');
        value.forEach((item, i) => {
          if (typeof item === 'string') {
            lines.push(`- ${item}`);
          } else if (typeof item === 'object') {
            lines.push(`### ${item.name || `Item ${i + 1}`}`);
            Object.entries(item).forEach(([k, v]) => {
              if (k !== 'id' && v) {
                lines.push(`- **${k}:** ${v}`);
              }
            });
            lines.push('');
          }
        });
      } else if (typeof value === 'string' && value) {
        lines.push('---', '', `## ${key}`, '', value, '');
      }
    });
  }

  lines.push('---', '', `_Exported from FRESCO ${data.toolkitName}_`);

  return lines.join('\n');
}

export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateFilename(toolkitType: ToolkitType, extension: string = 'md'): string {
  const toolkit = TOOLKITS[toolkitType];
  const date = new Date().toISOString().split('T')[0];
  const name = toolkit.name.toLowerCase().replace(/\s+/g, '-');
  return `fresco-${name}-${date}.${extension}`;
}

// PDF Export using jsPDF
export async function downloadPDF(data: ExportData, filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;
  
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += fontSize * 0.5;
    });
    y += 5;
  };
  
  const addSection = (title: string) => {
    y += 5;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    addText(title, 14, true);
  };

  // Title
  addText(`${data.toolkitName}`, 20, true);
  addText(data.workspaceTitle, 16);
  y += 5;
  
  // Metadata
  addText(`Thinking Lens: ${data.thinkingLens || 'Automatic'}`, 10);
  addText(`Date: ${data.date}`, 10);
  addText(`Toolkit: ${data.toolkitName}`, 10);
  
  // Steps
  data.steps.forEach((step, index) => {
    addSection(`${index + 1}. ${step.label}`);
    if (step.content) {
      addText(step.content, 11);
    } else {
      addText('(Not filled)', 11);
    }
  });
  
  // Insights
  if (data.insights.length > 0) {
    addSection('Key Insights');
    data.insights.forEach((insight, i) => {
      addText(`${i + 1}. ${insight}`, 11);
    });
  }
  
  // Sentence of Truth
  if (data.sentenceOfTruth) {
    addSection('Sentence of Truth');
    doc.setFont('helvetica', 'italic');
    addText(`"${data.sentenceOfTruth}"`, 12);
    doc.setFont('helvetica', 'normal');
  }
  
  // Necessary Moves
  if (data.necessaryMoves.length > 0) {
    addSection('Necessary Moves');
    data.necessaryMoves.forEach((move, i) => {
      addText(`${i + 1}. ${move}`, 11);
    });
  }
  
  // Footer
  y = 280;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Exported from FRESCO • frescolab.io', margin, y);
  
  doc.save(filename);
}

// DOCX Export using docx library
export async function downloadDOCX(data: ExportData, filename: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = await import('docx');
  
  const children: any[] = [];
  
  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: data.toolkitName, bold: true, size: 48 })],
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [new TextRun({ text: data.workspaceTitle, size: 32 })],
    }),
    new Paragraph({ children: [] }), // Spacer
  );
  
  // Metadata
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Thinking Lens: ', bold: true }),
        new TextRun({ text: data.thinkingLens || 'Automatic' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', bold: true }),
        new TextRun({ text: data.date }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Toolkit: ', bold: true }),
        new TextRun({ text: data.toolkitName }),
      ],
    }),
    new Paragraph({ children: [] }), // Spacer
  );
  
  // Steps
  data.steps.forEach((step, index) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${index + 1}. ${step.label}`, bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        children: [new TextRun({ text: step.content || '(Not filled)' })],
      }),
      new Paragraph({ children: [] }), // Spacer
    );
  });
  
  // Insights
  if (data.insights.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Key Insights', bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
      })
    );
    data.insights.forEach((insight, i) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${i + 1}. ${insight}` })],
          bullet: { level: 0 },
        })
      );
    });
    children.push(new Paragraph({ children: [] }));
  }
  
  // Sentence of Truth
  if (data.sentenceOfTruth) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Sentence of Truth', bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        children: [new TextRun({ text: `"${data.sentenceOfTruth}"`, italics: true })],
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: 'CCCCCC' },
        },
        indent: { left: 720 },
      }),
      new Paragraph({ children: [] }),
    );
  }
  
  // Necessary Moves
  if (data.necessaryMoves.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Necessary Moves', bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
      })
    );
    data.necessaryMoves.forEach((move, i) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${i + 1}. ${move}` })],
          bullet: { level: 0 },
        })
      );
    });
    children.push(new Paragraph({ children: [] }));
  }
  
  // Footer
  children.push(
    new Paragraph({ children: [] }),
    new Paragraph({
      children: [
        new TextRun({ 
          text: 'Exported from FRESCO • frescolab.io', 
          size: 18, 
          color: '999999' 
        })
      ],
    })
  );
  
  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
