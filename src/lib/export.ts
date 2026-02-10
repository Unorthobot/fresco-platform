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
