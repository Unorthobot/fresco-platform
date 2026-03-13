'use client';

// FRESCO Platform - Export Modal Component
// Reusable export modal for all toolkits

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, FileText, FileDown, Check, FileJson, Mail, Send, Printer, Crown, FileType } from 'lucide-react';
import { 
  generateMarkdown, 
  copyToClipboard, 
  downloadMarkdown, 
  downloadJSON,
  downloadPDF,
  downloadDOCX,
  generateFilename,
  type ExportData 
} from '@/lib/export';
import { useFrescoStore } from '@/lib/store';

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
  const [isExporting, setIsExporting] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  
  const { user } = useFrescoStore();
  const isPro = user?.subscription === 'pro' || user?.subscription === 'studio';

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

  const handleDownloadPDF = async () => {
    if (!isPro) {
      setStatus('Upgrade to Pro for PDF export');
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    setIsExporting(true);
    try {
      const filename = generateFilename(data.toolkitType, 'pdf');
      await downloadPDF(data, filename);
      setStatus('PDF downloaded!');
    } catch (error) {
      console.error('PDF export error:', error);
      setStatus('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!isPro) {
      setStatus('Upgrade to Pro for DOCX export');
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    setIsExporting(true);
    try {
      const filename = generateFilename(data.toolkitType, 'docx');
      await downloadDOCX(data, filename);
      setStatus('DOCX downloaded!');
    } catch (error) {
      console.error('DOCX export error:', error);
      setStatus('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatus(null), 2000);
    }
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
          <div style="margin-bottom: 32px; border-bottom: 2px solid #111827; padding-bottom: 16px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">${data.toolkitName}</h1>
            <p style="font-size: 18px; color: #6b7280; margin: 0;">${data.workspaceTitle}</p>
          </div>
          
          <div style="margin-bottom: 24px; font-size: 12px; color: #6b7280;">
            <p style="margin: 4px 0;"><strong>Thinking Lens:</strong> ${data.thinkingLens || 'Automatic'}</p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${data.date}</p>
          </div>
          
          ${stepsHTML}
          ${insightsHTML}
          ${sentenceHTML}
          ${movesHTML}
          
          <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
            Exported from FRESCO • frescolab.io
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const html = generatePrintHTML();
    
    // Create or reuse iframe
    let iframe = printFrameRef.current;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      printFrameRef.current = iframe;
    }
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        iframe?.contentWindow?.print();
      }, 250);
    }
  };

  const handleSendEmail = () => {
    const content = generateMarkdown(data);
    const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(content)}`;
    window.location.href = mailtoUrl;
    setShowEmailForm(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-none shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-fresco-border-light dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-fresco-light-gray dark:bg-gray-800 rounded-none">
                  <FileText className="w-5 h-5 text-fresco-black dark:text-white" />
                </div>
                <h3 className="text-fresco-lg font-medium text-fresco-black dark:text-white">Export Session</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-fresco-graphite-light hover:text-fresco-black dark:text-gray-500 dark:hover:text-white rounded-none hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {/* Status message */}
              <AnimatePresence>
                {status && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-none flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">{status}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Email form */}
              <AnimatePresence>
                {showEmailForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 space-y-3"
                  >
                    <button 
                      onClick={() => setShowEmailForm(false)}
                      className="text-fresco-sm text-fresco-graphite-light hover:text-fresco-black dark:text-gray-400 dark:hover:text-white"
                    >
                      ← Back to options
                    </button>
                    <div>
                      <label className="block text-fresco-sm font-medium text-fresco-graphite-mid dark:text-gray-300 mb-1">To</label>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 border border-fresco-border dark:border-gray-600 rounded-none text-fresco-base dark:bg-gray-800 dark:text-white focus:outline-none focus:border-fresco-black dark:focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-fresco-sm font-medium text-fresco-graphite-mid dark:text-gray-300 mb-1">Subject</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-fresco-border dark:border-gray-600 rounded-none text-fresco-base dark:bg-gray-800 dark:text-white focus:outline-none focus:border-fresco-black dark:focus:border-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowEmailForm(false)}
                        className="px-4 py-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black dark:text-gray-400 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendEmail}
                        disabled={!emailTo}
                        className="px-4 py-2 bg-fresco-black dark:bg-white text-white dark:text-black rounded-none text-fresco-sm font-medium hover:bg-fresco-graphite-dark dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Export options */}
              {!showEmailForm && (
                <div className="space-y-3">
                  {/* Pro Export Options */}
                  <div className="mb-4">
                    <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Pro Export Formats
                    </p>
                    
                    <button 
                      onClick={handleDownloadPDF}
                      disabled={isExporting}
                      className={`w-full flex items-center gap-4 p-4 border-2 rounded-none transition-all group ${
                        isPro 
                          ? 'border-fresco-border dark:border-gray-600 hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800' 
                          : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-none flex items-center justify-center transition-colors ${
                        isPro 
                          ? 'bg-fresco-light-gray dark:bg-gray-700 group-hover:bg-white dark:group-hover:bg-gray-600' 
                          : 'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        <FileDown className={`w-5 h-5 ${isPro ? 'text-fresco-graphite-mid dark:text-gray-300' : 'text-amber-600 dark:text-amber-400'}`} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-fresco-base font-medium text-fresco-black dark:text-white flex items-center gap-2">
                          Download PDF
                          {!isPro && <span className="text-xs px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded">PRO</span>}
                        </p>
                        <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">
                          {isPro ? 'Professional PDF document' : 'Upgrade to Pro for PDF export'}
                        </p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={handleDownloadDOCX}
                      disabled={isExporting}
                      className={`w-full flex items-center gap-4 p-4 border-2 rounded-none transition-all group mt-2 ${
                        isPro 
                          ? 'border-fresco-border dark:border-gray-600 hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800' 
                          : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-none flex items-center justify-center transition-colors ${
                        isPro 
                          ? 'bg-fresco-light-gray dark:bg-gray-700 group-hover:bg-white dark:group-hover:bg-gray-600' 
                          : 'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        <FileType className={`w-5 h-5 ${isPro ? 'text-fresco-graphite-mid dark:text-gray-300' : 'text-amber-600 dark:text-amber-400'}`} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-fresco-base font-medium text-fresco-black dark:text-white flex items-center gap-2">
                          Download DOCX
                          {!isPro && <span className="text-xs px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded">PRO</span>}
                        </p>
                        <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">
                          {isPro ? 'Editable Word document' : 'Upgrade to Pro for DOCX export'}
                        </p>
                      </div>
                    </button>
                  </div>
                  
                  {/* Free Export Options */}
                  <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wider mb-2">Free Export Options</p>
                  
                  <button 
                    onClick={() => setShowEmailForm(true)} 
                    className="w-full flex items-center gap-4 p-4 border-2 border-fresco-border dark:border-gray-600 rounded-none hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-none bg-fresco-light-gray dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
                      <Mail className="w-5 h-5 text-fresco-graphite-mid dark:text-gray-300" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-fresco-base font-medium text-fresco-black dark:text-white">Send via Email</p>
                      <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">Email session summary</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleCopy} 
                    className="w-full flex items-center gap-4 p-4 border-2 border-fresco-border dark:border-gray-600 rounded-none hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-none bg-fresco-light-gray dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
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
                      className="w-full flex items-center gap-4 p-4 border-2 border-fresco-border dark:border-gray-600 rounded-none hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-none bg-fresco-light-gray dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
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
                    className="w-full flex items-center gap-4 p-4 border-2 border-fresco-border dark:border-gray-600 rounded-none hover:border-fresco-black dark:hover:border-white hover:bg-fresco-light-gray/50 dark:hover:bg-gray-800 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-none bg-fresco-light-gray dark:bg-gray-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-600 transition-colors">
                      <Printer className="w-5 h-5 text-fresco-graphite-mid dark:text-gray-300" />
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
                  <div className="p-3 bg-fresco-light-gray dark:bg-gray-800 rounded-none max-h-32 overflow-y-auto">
                    <p className="text-fresco-xs text-fresco-graphite-mid dark:text-gray-400 font-mono whitespace-pre-wrap">
                      {generateMarkdown(data).slice(0, 300)}...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
