'use client';

// FRESCO Platform - Export Modal Component
// Reusable export modal for all toolkits

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, FileText, FileDown, Check, FileJson, Mail, Send, Printer } from 'lucide-react';
import { 
  generateMarkdown, 
  copyToClipboard, 
  downloadMarkdown, 
  downloadJSON,
  generateFilename,
  type ExportData 
} from '@/lib/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExportData;
  includeJSON?: boolean;
}

export function ExportModal({ isOpen, onClose, data, includeJSON = false }: ExportModalProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState(`FRESCO ${data.toolkitName} - ${data.workspaceTitle}`);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const handleCopy = async () => {
    const content = generateMarkdown(data);
    const success = await copyToClipboard(content);
    if (success) {
      setStatus('Copied to clipboard!');
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const handleDownloadJSON = () => {
    const filename = generateFilename(data.toolkitType, 'json');
    downloadJSON(data, filename);
    setStatus('Downloaded!');
    setTimeout(() => setStatus(null), 2000);
  };

  // Generate HTML for printing/PDF
  const generatePrintHTML = () => {
    const stepsHTML = data.steps.map((step, i) => `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">
          ${i + 1}. ${step.label}
        </h3>
        <p style="font-size: 14px; color: #4b5563; white-space: pre-wrap; line-height: 1.6;">
          ${step.content || '<em style="color: #9ca3af;">Not filled</em>'}
        </p>
      </div>
    `).join('');

    const insightsHTML = data.insights.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          Key Insights
        </h2>
        <ul style="margin: 0; padding-left: 20px;">
          ${data.insights.map(insight => `
            <li style="font-size: 14px; color: #4b5563; margin-bottom: 8px; line-height: 1.5;">
              ${insight}
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';

    const sentenceHTML = data.sentenceOfTruth ? `
      <div style="margin-bottom: 24px; padding: 16px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #111827;">
        <h2 style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          Sentence of Truth
        </h2>
        <p style="font-size: 16px; color: #111827; font-style: italic; line-height: 1.6; margin: 0;">
          "${data.sentenceOfTruth}"
        </p>
      </div>
    ` : '';

    const movesHTML = data.necessaryMoves.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          Necessary Moves
        </h2>
        <ol style="margin: 0; padding-left: 20px;">
          ${data.necessaryMoves.map(move => `
            <li style="font-size: 14px; color: #4b5563; margin-bottom: 8px; line-height: 1.5;">
              ${move}
            </li>
          `).join('')}
        </ol>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.toolkitName} - ${data.workspaceTitle}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #111827;
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #111827;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">
            ${data.toolkitName}
          </h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0;">
            ${data.workspaceTitle} • ${data.date} • Thinking Lens: ${data.thinkingLens}
          </p>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
            Session Content
          </h2>
          ${stepsHTML}
        </div>

        ${insightsHTML}
        ${sentenceHTML}
        ${movesHTML}

        <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          Exported from FRESCO • frescolab.io
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printContent = generatePrintHTML();
    
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();
      
      // Wait for content to load then print
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    }
    
    setStatus('Opening print dialog...');
    setTimeout(() => setStatus(null), 2000);
  };

  const handleEmail = () => {
    if (!emailTo) {
      setStatus('Please enter an email address');
      setTimeout(() => setStatus(null), 2000);
      return;
    }
    
    const content = generateMarkdown(data);
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(content);
    
    // Open mailto link
    window.location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;
    
    setStatus('Opening email client...');
    setTimeout(() => {
      setStatus(null);
      setShowEmailForm(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" 
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }} 
            onClick={(e) => e.stopPropagation()} 
            className="bg-fresco-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-fresco-lg font-medium text-fresco-black dark:text-white">Export Session</h3>
                <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500 mt-1">{data.toolkitName}</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white hover:bg-fresco-light-gray dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Status message */}
            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-fresco-light-gray dark:bg-gray-800 text-fresco-black dark:text-white rounded-lg text-fresco-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {status}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Email Form */}
            <AnimatePresence>
              {showEmailForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-4 bg-fresco-light-gray dark:bg-gray-800 rounded-xl overflow-hidden"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="text-fresco-xs font-medium text-fresco-graphite-mid dark:text-gray-400 block mb-1">To</label>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full p-3 bg-white dark:bg-gray-800 rounded-lg text-fresco-sm text-fresco-black dark:text-white border border-fresco-border dark:border-gray-600 focus:ring-2 focus:ring-fresco-black dark:focus:ring-white focus:border-fresco-black dark:focus:border-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-fresco-xs font-medium text-fresco-graphite-mid dark:text-gray-400 block mb-1">Subject</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full p-3 bg-white dark:bg-gray-800 rounded-lg text-fresco-sm text-fresco-black dark:text-white border border-fresco-border dark:border-gray-600 focus:ring-2 focus:ring-fresco-black dark:focus:ring-white focus:border-fresco-black dark:focus:border-white outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEmailForm(false)}
                        className="flex-1 p-3 text-fresco-sm text-fresco-graphite-mid dark:text-gray-400 hover:bg-fresco-light-gray dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEmail}
                        className="fresco-btn fresco-btn-primary flex-1"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Export options */}
            {!showEmailForm && (
              <div className="space-y-3">
                <button 
                  onClick={() => setShowEmailForm(true)} 
                  className="w-full flex items-center gap-4 p-4 border-2 border-fresco-border dark:border-gray-600 rounded-xl hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-fresco-light-gray dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
                    <Mail className="w-5 h-5 text-fresco-graphite-mid dark:text-gray-300" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-fresco-base font-medium text-fresco-black dark:text-white">Send via Email</p>
                    <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">Email session summary</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleCopy} 
                  className="w-full flex items-center gap-4 p-4 border-2 border-fresco-border dark:border-gray-600 rounded-xl hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-fresco-light-gray dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
                    <Copy className="w-5 h-5 text-fresco-graphite-mid dark:text-gray-300" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-fresco-base font-medium text-fresco-black dark:text-white">Copy to Clipboard</p>
                    <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">Copy as formatted text</p>
                  </div>
                </button>
                
                {includeJSON && (
                  <button 
                    onClick={handleDownloadJSON} 
                    className="w-full flex items-center gap-4 p-4 border-2 border-fresco-border dark:border-gray-600 rounded-xl hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-fresco-light-gray dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
                      <FileJson className="w-5 h-5 text-fresco-graphite-mid dark:text-gray-300" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-fresco-base font-medium text-fresco-black dark:text-white">Download JSON</p>
                      <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">Save raw data</p>
                    </div>
                  </button>
                )}
                
                <button 
                  onClick={handlePrint} 
                  className="w-full flex items-center gap-4 p-4 border-2 border-fresco-border dark:border-gray-600 rounded-xl hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-fresco-light-gray dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
                    <FileDown className="w-5 h-5 text-fresco-graphite-mid dark:text-gray-300" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-fresco-base font-medium text-fresco-black dark:text-white">Print / Save as PDF</p>
                    <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">Open print dialog</p>
                  </div>
                </button>
              </div>
            )}
            
            {/* Preview */}
            {!showEmailForm && (
              <div className="mt-6 pt-4 border-t border-fresco-border-light dark:border-gray-700">
                <p className="text-fresco-xs text-fresco-graphite-light dark:text-gray-500 mb-2">Preview</p>
                <div className="p-3 bg-fresco-light-gray dark:bg-gray-800 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-fresco-xs text-fresco-graphite-mid dark:text-gray-400 font-mono whitespace-pre-wrap">
                    {generateMarkdown(data).slice(0, 300)}...
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
