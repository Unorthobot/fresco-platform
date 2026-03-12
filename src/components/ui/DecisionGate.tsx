'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, RotateCcw, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DecisionType = 'GO' | 'PIVOT' | 'KILL' | 'DEFERRED';

interface DecisionGateProps {
  currentDecision?: DecisionType | null;
  onDecision: (decision: DecisionType, rationale?: string, confidence?: number) => void;
  isVisible: boolean;
}

const DECISIONS = [
  {
    type: 'GO' as DecisionType,
    label: 'Go',
    sublabel: 'Evidence sufficient',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    activeBg: 'bg-emerald-600 border-emerald-600 text-white',
    dot: 'bg-emerald-500',
  },
  {
    type: 'PIVOT' as DecisionType,
    label: 'Pivot',
    sublabel: 'Signals misaligned',
    icon: RotateCcw,
    color: 'text-amber-600',
    bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    activeBg: 'bg-amber-500 border-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  {
    type: 'KILL' as DecisionType,
    label: 'Kill',
    sublabel: 'Stop investment',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 hover:bg-red-100 border-red-200',
    activeBg: 'bg-red-500 border-red-500 text-white',
    dot: 'bg-red-500',
  },
  {
    type: 'DEFERRED' as DecisionType,
    label: 'Decide later',
    sublabel: 'Log as pending',
    icon: Clock,
    color: 'text-fresco-graphite-light',
    bg: 'bg-fresco-light-gray hover:bg-gray-100 border-fresco-border-light',
    activeBg: 'bg-fresco-graphite border-fresco-graphite text-white',
    dot: 'bg-fresco-graphite-light',
  },
];

export default function DecisionGate({ currentDecision, onDecision, isVisible }: DecisionGateProps) {
  const [selected, setSelected] = useState<DecisionType | null>(currentDecision || null);
  const [rationale, setRationale] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [showDetails, setShowDetails] = useState(false);
  const [committed, setCommitted] = useState(!!currentDecision);

  if (!isVisible) return null;

  const handleSelect = (type: DecisionType) => {
    setSelected(type);
    setCommitted(false);
  };

  const handleCommit = () => {
    if (!selected) return;
    setCommitted(true);
    onDecision(selected, rationale || undefined, confidence);
  };

  const activeDecision = DECISIONS.find(d => d.type === selected);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-8 pt-8 border-t border-fresco-border-light"
    >
      {/* Header */}
      <div className="mb-4">
        <span className="fresco-label">Decision Gate</span>
        <p className="text-fresco-xs text-fresco-graphite-light mt-1">
          Based on current evidence, what's your call?
        </p>
      </div>

      {/* Decision buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {DECISIONS.map((d) => {
          const Icon = d.icon;
          const isActive = selected === d.type;
          return (
            <button
              key={d.type}
              onClick={() => handleSelect(d.type)}
              className={cn(
                'flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left',
                isActive ? d.activeBg : cn(d.bg, d.color)
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className={cn('text-fresco-sm font-medium leading-tight', isActive ? 'text-white' : '')}>
                  {d.label}
                </p>
                <p className={cn('text-fresco-xs leading-tight mt-0.5', isActive ? 'text-white/70' : 'text-fresco-graphite-light')}>
                  {d.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Optional details */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-fresco-xs text-fresco-graphite-light hover:text-fresco-black mb-2 transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? 'Hide details' : 'Add rationale & confidence'}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3 mb-3"
                >
                  <textarea
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Why this decision? (optional)"
                    rows={2}
                    className="w-full px-3 py-2 text-fresco-sm bg-fresco-light-gray border border-fresco-border-light rounded-lg resize-none focus:outline-none focus:border-fresco-black transition-colors"
                  />
                  <div>
                    <p className="text-fresco-xs text-fresco-graphite-light mb-2">
                      Confidence: <span className="font-medium text-fresco-black">{confidence}/5</span>
                    </p>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setConfidence(n)}
                          className={cn(
                            'flex-1 h-2 rounded-full transition-colors',
                            n <= confidence
                              ? activeDecision?.dot || 'bg-fresco-black'
                              : 'bg-fresco-border-light'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Commit button */}
            {!committed ? (
              <button
                onClick={handleCommit}
                className="w-full py-2.5 bg-fresco-black text-white text-fresco-sm font-medium rounded-lg hover:bg-fresco-graphite transition-colors"
              >
                Record Decision
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 rounded-lg text-fresco-sm font-medium',
                  activeDecision?.activeBg
                )}
              >
                <CheckCircle className="w-4 h-4" />
                Decision recorded: {activeDecision?.label}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
