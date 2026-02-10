'use client';

import { TOOLKITS, type Session } from '@/types';

interface ExportOptions {
  session: Session;
  workspaceTitle?: string;
  includeSteps?: boolean;
  includeInsights?: boolean;
  includeTruth?: boolean;
  includeActions?: boolean;
}

export async function generatePDFReport(options: ExportOptions): Promise<Blob> {
  const { session, workspaceTitle, includeSteps = true, includeInsights = true, includeTruth = true, includeActions = true } = options;
  const toolkit = TOOLKITS[session.toolkitType];
  
  // Generate HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
          padding: 60px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .header {
          margin-bottom: 48px;
          padding-bottom: 24px;
          border-bottom: 2px solid #e5e5e5;
        }
        
        .logo {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #8a8a8a;
          margin-bottom: 24px;
        }
        
        .title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .subtitle {
          font-size: 16px;
          color: #6b6b6b;
        }
        
        .meta {
          font-size: 12px;
          color: #8a8a8a;
          margin-top: 16px;
        }
        
        .section {
          margin-bottom: 40px;
        }
        
        .section-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #8a8a8a;
          margin-bottom: 16px;
        }
        
        .truth-box {
          background: #1a1a1a;
          color: white;
          padding: 32px;
          border-radius: 12px;
          margin-bottom: 40px;
        }
        
        .truth-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          opacity: 0.6;
          margin-bottom: 12px;
        }
        
        .truth-text {
          font-size: 24px;
          font-weight: 300;
          line-height: 1.4;
        }
        
        .insight-list {
          list-style: none;
        }
        
        .insight-item {
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
          margin-bottom: 12px;
          display: flex;
          gap: 12px;
        }
        
        .insight-number {
          width: 24px;
          height: 24px;
          background: #1a1a1a;
          color: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }
        
        .insight-text {
          font-size: 14px;
          color: #4a4a4a;
        }
        
        .step-item {
          margin-bottom: 24px;
          padding-left: 16px;
          border-left: 3px solid #e5e5e5;
        }
        
        .step-label {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .step-content {
          font-size: 14px;
          color: #4a4a4a;
        }
        
        .action-item {
          padding: 12px 16px;
          background: #fafafa;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .footer {
          margin-top: 60px;
          padding-top: 24px;
          border-top: 1px solid #e5e5e5;
          font-size: 11px;
          color: #8a8a8a;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Fresco</div>
        <h1 class="title">${toolkit.name}</h1>
        <p class="subtitle">${toolkit.subtitle}</p>
        <div class="meta">
          ${workspaceTitle ? `Workspace: ${workspaceTitle} · ` : ''}
          Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
      
      ${includeTruth && session.sentenceOfTruth?.content ? `
        <div class="truth-box">
          <div class="truth-label">Sentence of Truth</div>
          <p class="truth-text">${session.sentenceOfTruth.content}</p>
        </div>
      ` : ''}
      
      ${includeInsights && session.aiOutputs?.insights?.length ? `
        <div class="section">
          <h2 class="section-title">Key Insights</h2>
          <ul class="insight-list">
            ${session.aiOutputs.insights.map((insight, i) => `
              <li class="insight-item">
                <span class="insight-number">${i + 1}</span>
                <span class="insight-text">${insight}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${includeActions && session.aiOutputs?.necessaryMoves?.length ? `
        <div class="section">
          <h2 class="section-title">Necessary Moves</h2>
          ${session.aiOutputs.necessaryMoves.map(move => `
            <div class="action-item">→ ${move}</div>
          `).join('')}
        </div>
      ` : ''}
      
      ${includeSteps && session.steps?.length ? `
        <div class="section">
          <h2 class="section-title">Input Summary</h2>
          ${session.steps.filter(s => s.content).map(step => `
            <div class="step-item">
              <div class="step-label">${step.label}</div>
              <div class="step-content">${step.content}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="footer">
        Created with Fresco · frescolab.io
      </div>
    </body>
    </html>
  `;

  // Return HTML as blob (for print-to-PDF or html2pdf conversion)
  return new Blob([htmlContent], { type: 'text/html' });
}

// Helper to trigger print dialog
export function printReport(html: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
