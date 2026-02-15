'use client';

// FRESCO Sentence of Truth - frescolab.io style

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Copy, Check, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SentenceOfTruthProps {
  content?: string;
  value?: string; // Alias for content
  isLocked?: boolean;
  isEditable?: boolean;
  onChange?: (content: string) => void;
  onToggleLock?: () => void;
  className?: string;
  placeholder?: string;
}

export function SentenceOfTruth({
  content,
  value,
  isLocked = false,
  isEditable = true,
  onChange,
  onToggleLock,
  className,
  placeholder = 'Your sentence of truth will emerge here...',
}: SentenceOfTruthProps) {
  // Support both content and value props
  const actualContent = content || value || '';
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(actualContent);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => { setEditContent(actualContent); }, [actualContent]);
  
  const handleCopy = async () => {
    if (!actualContent) return;
    try { await navigator.clipboard.writeText(actualContent); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  
  const handleSave = () => { onChange?.(editContent); setIsEditing(false); };
  const handleCancel = () => { setEditContent(actualContent); setIsEditing(false); };
  
  const isEmpty = !actualContent?.trim();
  
  return (
    <motion.div layout className={cn('relative border rounded-fresco-lg transition-colors', isLocked ? 'border-fresco-black bg-fresco-light-gray dark:bg-gray-800' : 'border-fresco-border dark:border-gray-700', className)}>
      {isLocked && (
        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-fresco-black text-white text-fresco-xs font-medium uppercase tracking-wider rounded">Locked</div>
      )}
      
      <div className="p-5">
        {isEditing && !isLocked ? (
          <div className="space-y-4">
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full min-h-[80px] text-fresco-base leading-relaxed text-fresco-black bg-transparent border-none resize-none focus:outline-none" placeholder={placeholder} autoFocus />
            <div className="flex items-center justify-end gap-2">
              <button onClick={handleCancel} className="px-3 h-8 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors">Cancel</button>
              <button onClick={handleSave} className="fresco-btn fresco-btn-primary fresco-btn-sm">Save</button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-[40px] mb-4">
              {isEmpty ? (
                <p className="text-fresco-base leading-relaxed text-fresco-graphite-light italic">{placeholder}</p>
              ) : (
                <p className="text-fresco-base leading-relaxed text-fresco-black">{actualContent}</p>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-1 pt-3 border-t border-fresco-border-light dark:border-gray-700">
              {isEditable && !isLocked && (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-2 py-1 text-fresco-xs text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white rounded hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /><span>Edit</span>
                </button>
              )}
              {!isEmpty && (
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-2 py-1 text-fresco-xs text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white rounded hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors">
                  {copied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Copied</span></> : <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>}
                </button>
              )}
              {onToggleLock && !isEmpty && (
                <button onClick={onToggleLock} className={cn('flex items-center gap-1.5 px-2 py-1 text-fresco-xs rounded hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors', isLocked ? 'text-fresco-black' : 'text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white')}>
                  {isLocked ? <><Lock className="w-3.5 h-3.5" /><span>Locked</span></> : <><Unlock className="w-3.5 h-3.5" /><span>Lock</span></>}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
