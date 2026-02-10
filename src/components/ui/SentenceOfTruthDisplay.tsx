'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Copy, Check, Sparkles, Lock, Unlock, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypewriterText } from './TypewriterText';

interface SentenceOfTruthDisplayProps {
  sentence: string;
  isLocked?: boolean;
  onLockToggle?: () => void;
  onEdit?: (value: string) => void;
  showTypewriter?: boolean;
  toolkitName?: string;
  className?: string;
}

export function SentenceOfTruthDisplay({
  sentence,
  isLocked,
  onLockToggle,
  onEdit,
  showTypewriter = false,
  toolkitName,
  className
}: SentenceOfTruthDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(sentence);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sentence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onEdit?.(editValue);
    setIsEditing(false);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!sentence) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        className
      )}
    >
      {/* Elegant background */}
      <div className="absolute inset-0 bg-gradient-to-br from-fresco-black via-fresco-graphite to-fresco-black" />
      
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* Content */}
      <div className="relative p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-fresco-xs font-medium text-white/50 uppercase tracking-wider">
                Sentence of Truth
              </span>
              {toolkitName && (
                <p className="text-fresco-xs text-white/30">{toolkitName}</p>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSpeak}
              className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Listen"
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {onLockToggle && (
              <button
                onClick={onLockToggle}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={isLocked ? "Unlock" : "Lock"}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
        
        {/* Quote marks */}
        <Quote className="w-6 h-6 text-white/20 mb-3" />
        
        {/* The sentence */}
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-white/10 text-white text-fresco-base leading-relaxed font-light p-4 rounded-xl border border-white/20 focus:border-white/40 outline-none resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-white/70 hover:text-white text-fresco-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-white text-fresco-black rounded-lg text-fresco-sm font-medium"
                >
                  Save
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-fresco-base md:text-fresco-lg text-white font-light leading-relaxed"
              onClick={() => !isLocked && onEdit && setIsEditing(true)}
              style={{ cursor: !isLocked && onEdit ? 'text' : 'default' }}
            >
              {showTypewriter ? (
                <TypewriterText text={sentence} speed={40} />
              ) : (
                sentence
              )}
            </motion.p>
          )}
        </AnimatePresence>
        
        {/* Bottom accent */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-fresco-xs text-white/40">
            {isLocked ? '🔒 This truth is locked' : 'Double-click to edit'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
