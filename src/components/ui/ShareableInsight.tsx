'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Copy, Check, Share2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareableInsightProps {
  insight: string;
  source?: string;
  author?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareableInsightModal({ insight, source, author, isOpen, onClose }: ShareableInsightProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<'minimal' | 'bold' | 'elegant'>('minimal');

  const handleCopy = () => {
    const text = `"${insight}"\n\n— ${source || 'Fresco'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    // Use html2canvas if available, otherwise fallback to copy
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
      });
      
      const link = document.createElement('a');
      link.download = 'fresco-insight.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  const styles = {
    minimal: {
      bg: 'bg-white',
      text: 'text-fresco-black',
      accent: 'text-fresco-graphite-light',
    },
    bold: {
      bg: 'bg-fresco-black',
      text: 'text-white',
      accent: 'text-white/60',
    },
    elegant: {
      bg: 'bg-gradient-to-br from-fresco-graphite to-fresco-black',
      text: 'text-white',
      accent: 'text-white/50',
    },
  };

  const currentStyle = styles[style];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-fresco-border-light">
          <h3 className="text-fresco-lg font-medium text-fresco-black">Share Insight</h3>
          <button onClick={onClose} className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style selector */}
        <div className="flex gap-2 p-4 border-b border-fresco-border-light">
          {(['minimal', 'bold', 'elegant'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={cn(
                "px-3 py-1.5 text-fresco-xs font-medium rounded-lg capitalize transition-colors",
                style === s 
                  ? "bg-fresco-black text-white" 
                  : "bg-fresco-light-gray text-fresco-graphite hover:bg-fresco-warm-gray"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Preview card */}
        <div className="p-6">
          <div
            ref={cardRef}
            className={cn(
              "p-8 rounded-xl",
              currentStyle.bg
            )}
          >
            {/* Quote */}
            <p className={cn(
              "text-fresco-lg leading-relaxed font-light mb-6",
              currentStyle.text
            )}>
              "{insight}"
            </p>
            
            {/* Attribution */}
            <div className="flex items-center justify-between">
              <div className={cn("text-fresco-xs", currentStyle.accent)}>
                {source && <span>— {source}</span>}
              </div>
              <div className={cn("text-fresco-xs uppercase tracking-wider", currentStyle.accent)}>
                Fresco
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-fresco-border-light">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-fresco-border rounded-xl text-fresco-sm text-fresco-graphite hover:bg-fresco-light-gray transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            onClick={handleDownload}
            className="fresco-btn fresco-btn-primary flex-1"
          >
            <Download className="w-4 h-4" />
            Download Image
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
