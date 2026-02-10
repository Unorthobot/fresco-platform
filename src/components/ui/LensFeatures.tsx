'use client';

// FRESCO Lens Features - Enhanced thinking mode functionality
// Includes: Auto-suggest, Deep Dive, Challenge My Thinking, Lens-specific outputs

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Sparkles, 
  Shuffle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  Target,
  GitBranch,
  Scale,
  Layers,
  BookOpen,
  Zap,
  AlertTriangle,
  TrendingUp,
  Users,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ThinkingModeId, THINKING_MODES } from '@/types';

// ============================================
// AUTO-SUGGEST LENS
// ============================================

interface LensSuggestion {
  lens: ThinkingModeId;
  confidence: number;
  reason: string;
}

// Keywords and patterns that suggest certain lenses
const LENS_PATTERNS: Record<ThinkingModeId, { keywords: string[]; patterns: RegExp[] }> = {
  automatic: { keywords: [], patterns: [] },
  critical: { 
    keywords: ['assume', 'assumption', 'prove', 'evidence', 'true', 'false', 'verify', 'question', 'doubt', 'skeptic'],
    patterns: [/is (this|it) (really|actually|true)/i, /how do (we|I) know/i, /what if.*wrong/i]
  },
  systems: {
    keywords: ['system', 'connect', 'loop', 'cycle', 'feedback', 'cascade', 'ripple', 'network', 'ecosystem', 'interdependent'],
    patterns: [/how does.*affect/i, /what happens when/i, /connected to/i, /leads to/i]
  },
  design: {
    keywords: ['user', 'experience', 'feel', 'emotion', 'frustrat', 'delight', 'pain point', 'journey', 'empathy', 'human'],
    patterns: [/how (do|does|will) (they|users|people|customers) feel/i, /user experience/i, /from their perspective/i]
  },
  product: {
    keywords: ['build', 'ship', 'mvp', 'feature', 'roadmap', 'priority', 'resource', 'feasib', 'viable', 'implement'],
    patterns: [/can we (build|ship|make)/i, /how long (will|would)/i, /what resources/i]
  },
  analytical: {
    keywords: ['data', 'metric', 'number', 'percent', 'measure', 'quantif', 'statistic', 'trend', 'pattern', 'segment'],
    patterns: [/how (much|many)/i, /what('s| is) the (number|percentage|rate)/i, /data (shows|suggests)/i]
  },
  first_principles: {
    keywords: ['fundamental', 'basic', 'core', 'essence', 'root', 'underlying', 'first principle', 'from scratch', 'ground up'],
    patterns: [/at (its|the) core/i, /fundamentally/i, /what is.*really/i, /strip away/i]
  },
  strategic: {
    keywords: ['strategy', 'competitive', 'advantage', 'position', 'market', 'long-term', 'vision', 'mission', 'goal'],
    patterns: [/how (do|can) we (win|compete)/i, /strategic/i, /in the long (run|term)/i]
  },
  futures: {
    keywords: ['future', 'scenario', 'predict', 'forecast', 'trend', 'emerging', '2025', '2030', 'next year', 'five years'],
    patterns: [/what (will|might|could) happen/i, /in the future/i, /where.*heading/i, /years from now/i]
  },
  scientific: {
    keywords: ['hypothesis', 'test', 'experiment', 'variable', 'control', 'result', 'evidence', 'method', 'research'],
    patterns: [/how (can|do) we test/i, /what if we (tried|tested)/i, /experiment/i]
  },
  economic: {
    keywords: ['cost', 'revenue', 'profit', 'price', 'value', 'roi', 'investment', 'money', 'budget', 'incentive'],
    patterns: [/how much (does|will|would).*cost/i, /what('s| is) the (roi|return|value)/i, /worth it/i]
  },
  ethical: {
    keywords: ['right', 'wrong', 'fair', 'ethical', 'moral', 'responsible', 'impact', 'harm', 'consequence', 'should'],
    patterns: [/should (we|I)/i, /is (it|this) (right|wrong|fair)/i, /what about/i, /who (gets|is) (hurt|affected)/i]
  },
  narrative: {
    keywords: ['story', 'narrative', 'message', 'communicate', 'pitch', 'explain', 'tell', 'audience', 'compelling'],
    patterns: [/how (do|can) (we|I) (explain|tell|communicate)/i, /the story/i, /make.*compelling/i]
  },
  lateral: {
    keywords: ['creative', 'different', 'unconventional', 'outside the box', 'alternative', 'what if', 'imagine', 'crazy'],
    patterns: [/what if we (tried|did).*different/i, /outside the box/i, /crazy idea/i]
  },
  computational: {
    keywords: ['algorithm', 'logic', 'step', 'process', 'automate', 'scale', 'efficient', 'optimize', 'systematic'],
    patterns: [/step by step/i, /how (does|would) the (process|algorithm)/i, /systematically/i]
  },
  philosophical: {
    keywords: ['meaning', 'purpose', 'why', 'exist', 'nature', 'essence', 'truth', 'reality', 'belief'],
    patterns: [/what (does|is) (the|it) mean/i, /why (does|do).*exist/i, /the nature of/i]
  },
  behavioral: {
    keywords: ['behavior', 'habit', 'motivation', 'bias', 'cognitive', 'nudge', 'incentive', 'psychology', 'decision'],
    patterns: [/why (do|does) (people|they|we)/i, /behavioral/i, /what motivates/i, /bias/i]
  },
};

// Contrasting lenses for "Challenge My Thinking"
const CONTRASTING_LENSES: Record<ThinkingModeId, ThinkingModeId[]> = {
  automatic: ['critical', 'systems'],
  critical: ['design', 'narrative', 'lateral'],
  systems: ['first_principles', 'analytical'],
  design: ['critical', 'economic', 'analytical'],
  product: ['design', 'ethical', 'futures'],
  analytical: ['design', 'narrative', 'lateral'],
  first_principles: ['systems', 'futures', 'narrative'],
  strategic: ['ethical', 'design', 'first_principles'],
  futures: ['first_principles', 'analytical', 'critical'],
  scientific: ['narrative', 'design', 'lateral'],
  economic: ['ethical', 'design', 'philosophical'],
  ethical: ['economic', 'strategic', 'analytical'],
  narrative: ['analytical', 'critical', 'scientific'],
  lateral: ['analytical', 'critical', 'computational'],
  computational: ['design', 'lateral', 'narrative'],
  philosophical: ['analytical', 'economic', 'computational'],
  behavioral: ['analytical', 'systems', 'computational'],
};

export function suggestLens(content: string): LensSuggestion[] {
  const suggestions: LensSuggestion[] = [];
  const contentLower = content.toLowerCase();
  
  for (const [lens, { keywords, patterns }] of Object.entries(LENS_PATTERNS)) {
    if (lens === 'automatic') continue;
    
    let score = 0;
    const matchedReasons: string[] = [];
    
    // Check keywords
    for (const keyword of keywords) {
      if (contentLower.includes(keyword)) {
        score += 1;
        matchedReasons.push(`"${keyword}"`);
      }
    }
    
    // Check patterns
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        score += 2;
      }
    }
    
    if (score > 0) {
      const modeInfo = [...THINKING_MODES.core, ...THINKING_MODES.secondary, ...THINKING_MODES.advanced]
        .find(m => m.id === lens);
      
      suggestions.push({
        lens: lens as ThinkingModeId,
        confidence: Math.min(score / 5, 1), // Normalize to 0-1
        reason: matchedReasons.length > 0 
          ? `Detected: ${matchedReasons.slice(0, 3).join(', ')}`
          : modeInfo?.description || '',
      });
    }
  }
  
  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

export function getContrastingLens(currentLens: ThinkingModeId): ThinkingModeId {
  const contrasts = CONTRASTING_LENSES[currentLens] || CONTRASTING_LENSES.automatic;
  return contrasts[Math.floor(Math.random() * contrasts.length)];
}

// ============================================
// AUTO-SUGGEST LENS COMPONENT
// ============================================

interface LensSuggestBadgeProps {
  content: string;
  currentLens: ThinkingModeId;
  onSelectLens: (lens: ThinkingModeId) => void;
}

export function LensSuggestBadge({ content, currentLens, onSelectLens }: LensSuggestBadgeProps) {
  const [suggestions, setSuggestions] = useState<LensSuggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    if (content && content.length > 50) {
      const newSuggestions = suggestLens(content);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [content]);
  
  if (suggestions.length === 0 || currentLens !== 'automatic') return null;
  
  const topSuggestion = suggestions[0];
  const modeInfo = [...THINKING_MODES.core, ...THINKING_MODES.secondary, ...THINKING_MODES.advanced]
    .find(m => m.id === topSuggestion.lens);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <div className="p-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800 rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                <span className="font-medium">Suggested lens:</span>{' '}
                <button 
                  onClick={() => onSelectLens(topSuggestion.lens)}
                  className="font-semibold text-violet-700 dark:text-violet-400 hover:underline"
                >
                  {modeInfo?.label}
                </button>
              </p>
              <p className="text-fresco-xs text-fresco-graphite-light mt-0.5">{topSuggestion.reason}</p>
            </div>
          </div>
          
          {suggestions.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-fresco-graphite-light hover:text-fresco-graphite transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
        
        <AnimatePresence>
          {isExpanded && suggestions.length > 1 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 pt-2 border-t border-violet-200 dark:border-violet-800"
            >
              <p className="text-fresco-xs text-fresco-graphite-light mb-2">Other suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(1).map(s => {
                  const info = [...THINKING_MODES.core, ...THINKING_MODES.secondary, ...THINKING_MODES.advanced]
                    .find(m => m.id === s.lens);
                  return (
                    <button
                      key={s.lens}
                      onClick={() => onSelectLens(s.lens)}
                      className="px-2 py-1 text-fresco-xs bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-700 rounded hover:border-violet-400 transition-colors"
                    >
                      {info?.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================
// "WHAT IF..." PERSPECTIVE PROMPT
// ============================================

// Get a thoughtful contrasting lens with explanation
function getContrastingPerspective(currentLens: ThinkingModeId): { lens: ThinkingModeId; question: string; benefit: string } {
  const perspectives: Record<ThinkingModeId, Array<{ lens: ThinkingModeId; question: string; benefit: string }>> = {
    automatic: [
      { lens: 'critical', question: "What assumptions haven't been questioned?", benefit: "Uncover blind spots" },
      { lens: 'design', question: "How do the people involved actually feel?", benefit: "Add human context" },
    ],
    critical: [
      { lens: 'design', question: "What emotions are driving this situation?", benefit: "Balance logic with empathy" },
      { lens: 'narrative', question: "What story are we telling ourselves?", benefit: "Find the underlying narrative" },
      { lens: 'lateral', question: "What unconventional option haven't we considered?", benefit: "Break out of logical constraints" },
    ],
    systems: [
      { lens: 'first_principles', question: "What's the simplest core truth here?", benefit: "Cut through complexity" },
      { lens: 'design', question: "Who's most affected by these connections?", benefit: "Add human perspective" },
    ],
    design: [
      { lens: 'critical', question: "Are we assuming too much about what people want?", benefit: "Test your empathy" },
      { lens: 'economic', question: "Does the value justify the investment?", benefit: "Ground feelings in reality" },
    ],
    product: [
      { lens: 'design', question: "Are we building what people actually need?", benefit: "Reconnect with user value" },
      { lens: 'ethical', question: "Who might be harmed by this approach?", benefit: "Consider broader impact" },
    ],
    analytical: [
      { lens: 'narrative', question: "What story does this data tell?", benefit: "Make numbers meaningful" },
      { lens: 'design', question: "What does this feel like for real people?", benefit: "Humanize the analysis" },
    ],
    first_principles: [
      { lens: 'systems', question: "How do these fundamentals interact?", benefit: "See the bigger picture" },
      { lens: 'futures', question: "How might these truths evolve?", benefit: "Add time dimension" },
    ],
    strategic: [
      { lens: 'ethical', question: "Is winning worth it at any cost?", benefit: "Check your values" },
      { lens: 'design', question: "What do the people involved actually want?", benefit: "Ground strategy in reality" },
    ],
    futures: [
      { lens: 'first_principles', question: "What won't change regardless of scenario?", benefit: "Find stable ground" },
      { lens: 'critical', question: "Are these scenarios based on solid evidence?", benefit: "Reality-check predictions" },
    ],
    scientific: [
      { lens: 'narrative', question: "How would you explain this to a child?", benefit: "Simplify complexity" },
      { lens: 'design', question: "How will people react to these findings?", benefit: "Consider human response" },
    ],
    economic: [
      { lens: 'ethical', question: "Is this fair to everyone involved?", benefit: "Beyond pure value" },
      { lens: 'design', question: "What does this cost emotionally?", benefit: "Count non-financial costs" },
    ],
    ethical: [
      { lens: 'economic', question: "Is this sustainable in practice?", benefit: "Ground ideals in reality" },
      { lens: 'strategic', question: "How do we actually make this happen?", benefit: "Move from principles to action" },
    ],
    narrative: [
      { lens: 'critical', question: "Is this story actually true?", benefit: "Fact-check the narrative" },
      { lens: 'analytical', question: "What does the data actually show?", benefit: "Ground story in evidence" },
    ],
    lateral: [
      { lens: 'critical', question: "Which of these ideas actually hold up?", benefit: "Filter creative chaos" },
      { lens: 'product', question: "Which idea can we actually build?", benefit: "Ground creativity in feasibility" },
    ],
    computational: [
      { lens: 'design', question: "How does this process feel for users?", benefit: "Humanize the system" },
      { lens: 'narrative', question: "Can you explain this simply?", benefit: "Test true understanding" },
    ],
    philosophical: [
      { lens: 'product', question: "How do we act on this insight?", benefit: "Move from thinking to doing" },
      { lens: 'economic', question: "What's the practical value?", benefit: "Ground abstract in concrete" },
    ],
    behavioral: [
      { lens: 'systems', question: "How do these behaviors connect?", benefit: "See patterns in behavior" },
      { lens: 'ethical', question: "Should we be influencing behavior this way?", benefit: "Check ethical boundaries" },
    ],
  };
  
  const options = perspectives[currentLens] || perspectives.automatic;
  return options[Math.floor(Math.random() * options.length)];
}

interface WhatIfPromptProps {
  currentLens: ThinkingModeId;
  onTryPerspective: (lens: ThinkingModeId) => void;
  isGenerating?: boolean;
  className?: string;
}

export function WhatIfPrompt({ currentLens, onTryPerspective, isGenerating, className }: WhatIfPromptProps) {
  const [perspective, setPerspective] = useState(() => getContrastingPerspective(currentLens));
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Update perspective when lens changes
  useEffect(() => {
    setPerspective(getContrastingPerspective(currentLens));
    setIsDismissed(false);
  }, [currentLens]);
  
  const modeInfo = [...THINKING_MODES.core, ...THINKING_MODES.secondary, ...THINKING_MODES.advanced]
    .find(m => m.id === perspective.lens);
  
  if (isDismissed) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("relative", className)}
    >
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
        {/* Dismiss button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 p-1 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-fresco-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
              What if you asked...
            </p>
            <p className="text-fresco-base text-amber-800 dark:text-amber-200 italic mb-2">
              "{perspective.question}"
            </p>
            <p className="text-fresco-xs text-amber-700 dark:text-amber-300 mb-3">
              Try <span className="font-medium">{modeInfo?.label}</span> thinking → {perspective.benefit}
            </p>
            
            <button
              onClick={() => onTryPerspective(perspective.lens)}
              disabled={isGenerating}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-fresco-sm font-medium transition-all",
                "bg-amber-600 text-white hover:bg-amber-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Try this perspective</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Keep the old export name for backwards compatibility but use new component
export const ChallengeThinkingButton = WhatIfPrompt;

// ============================================
// LENS-SPECIFIC OUTPUT DISPLAYS
// ============================================

// Systems Diagram Display
interface SystemsDiagramProps {
  data: {
    nodes: string[];
    connections: Array<{ from: string; to: string; label?: string }>;
  };
}

export function SystemsDiagram({ data }: SystemsDiagramProps) {
  if (!data?.nodes?.length) return null;
  
  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h4 className="text-fresco-sm font-medium text-fresco-black dark:text-white">System Map</h4>
      </div>
      
      <div className="space-y-2">
        {/* Nodes */}
        <div className="flex flex-wrap gap-2 mb-3">
          {data.nodes.map((node, i) => (
            <div 
              key={i}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg text-fresco-sm font-medium text-blue-800 dark:text-blue-300"
            >
              {node}
            </div>
          ))}
        </div>
        
        {/* Connections */}
        <div className="space-y-1">
          {data.connections.map((conn, i) => (
            <div key={i} className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-soft">
              <span className="font-medium">{conn.from}</span>
              <ArrowRight className="w-3 h-3" />
              <span className="font-medium">{conn.to}</span>
              {conn.label && <span className="text-fresco-graphite-light">({conn.label})</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Futures Scenarios Display
interface FuturesScenariosProps {
  data: {
    optimistic: string;
    pessimistic: string;
    mostLikely: string;
  };
}

export function FuturesScenarios({ data }: FuturesScenariosProps) {
  if (!data) return null;
  
  const scenarios = [
    { key: 'optimistic', label: 'Best Case', icon: TrendingUp, color: 'emerald' },
    { key: 'mostLikely', label: 'Most Likely', icon: Target, color: 'blue' },
    { key: 'pessimistic', label: 'Worst Case', icon: AlertTriangle, color: 'red' },
  ] as const;
  
  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <h4 className="text-fresco-sm font-medium text-fresco-black dark:text-white">Future Scenarios</h4>
      </div>
      
      <div className="space-y-3">
        {scenarios.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className={cn(
            "p-3 rounded-lg",
            color === 'emerald' && "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800",
            color === 'blue' && "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800",
            color === 'red' && "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn(
                "w-3.5 h-3.5",
                color === 'emerald' && "text-emerald-600 dark:text-emerald-400",
                color === 'blue' && "text-blue-600 dark:text-blue-400",
                color === 'red' && "text-red-600 dark:text-red-400"
              )} />
              <span className="text-fresco-xs font-medium uppercase tracking-wider text-fresco-graphite-mid">{label}</span>
            </div>
            <p className="text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">{data[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Ethical Matrix Display
interface EthicalMatrixProps {
  data: {
    stakeholders: Array<{ name: string; impact: 'positive' | 'negative' | 'neutral'; notes: string }>;
  };
}

export function EthicalMatrix({ data }: EthicalMatrixProps) {
  if (!data?.stakeholders?.length) return null;
  
  const impactColors = {
    positive: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    negative: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
    neutral: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800',
  };
  
  return (
    <div className="p-4 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 border border-rose-200 dark:border-rose-800 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        <h4 className="text-fresco-sm font-medium text-fresco-black dark:text-white">Stakeholder Impact</h4>
      </div>
      
      <div className="space-y-2">
        {data.stakeholders.map((stakeholder, i) => (
          <div key={i} className="flex items-start gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
            <div className={cn("px-2 py-0.5 rounded text-fresco-xs font-medium", impactColors[stakeholder.impact])}>
              {stakeholder.impact}
            </div>
            <div className="flex-1">
              <p className="text-fresco-sm font-medium text-fresco-black dark:text-white">{stakeholder.name}</p>
              <p className="text-fresco-xs text-fresco-graphite-light">{stakeholder.notes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// First Principles Display
interface FirstPrinciplesProps {
  data: string[];
}

export function FirstPrinciplesList({ data }: FirstPrinciplesProps) {
  if (!data?.length) return null;
  
  return (
    <div className="p-4 bg-gradient-to-br from-slate-50 to-zinc-50 dark:from-slate-950/30 dark:to-zinc-950/30 border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        <h4 className="text-fresco-sm font-medium text-fresco-black dark:text-white">First Principles</h4>
      </div>
      
      <div className="space-y-2">
        {data.map((principle, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-fresco-xs font-medium text-slate-600 dark:text-slate-400">{i + 1}</span>
            </div>
            <p className="text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">{principle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Narrative Arc Display
interface NarrativeArcProps {
  data: {
    setup: string;
    conflict: string;
    resolution: string;
  };
}

export function NarrativeArc({ data }: NarrativeArcProps) {
  if (!data) return null;
  
  const stages = [
    { key: 'setup', label: 'Setup', subtitle: 'The current situation' },
    { key: 'conflict', label: 'Conflict', subtitle: 'The core tension' },
    { key: 'resolution', label: 'Resolution', subtitle: 'The path forward' },
  ] as const;
  
  return (
    <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <h4 className="text-fresco-sm font-medium text-fresco-black dark:text-white">Story Arc</h4>
      </div>
      
      <div className="space-y-3">
        {stages.map(({ key, label, subtitle }, i) => (
          <div key={key} className="relative pl-6">
            {i < stages.length - 1 && (
              <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-amber-200 dark:bg-amber-800" />
            )}
            <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
            </div>
            <div>
              <p className="text-fresco-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">{label}</p>
              <p className="text-fresco-xs text-fresco-graphite-light mb-1">{subtitle}</p>
              <p className="text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">{data[key]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// DEEP DIVE MODAL
// ============================================

interface DeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: string;
  currentLens: ThinkingModeId;
  onDeepDive: (lens: ThinkingModeId) => void;
}

export function DeepDiveModal({ isOpen, onClose, insight, currentLens, onDeepDive }: DeepDiveModalProps) {
  const allModes = [
    ...THINKING_MODES.core,
    ...THINKING_MODES.secondary,
    ...THINKING_MODES.advanced,
  ];
  
  const suggestedLenses = suggestLens(insight).slice(0, 2);
  const contrasting = getContrastingLens(currentLens);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-fresco-lg font-medium text-fresco-black dark:text-white">Deep Dive</h3>
                <p className="text-fresco-sm text-fresco-graphite-light mt-1">Explore this insight through a different lens</p>
              </div>
              <button onClick={onClose} className="p-1 text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 bg-fresco-light-gray dark:bg-gray-800 rounded-lg mb-4">
              <p className="text-fresco-sm text-fresco-graphite-soft dark:text-gray-300 italic">"{insight}"</p>
            </div>
            
            <div className="space-y-3">
              {/* Suggested based on content */}
              {suggestedLenses.length > 0 && (
                <div>
                  <p className="text-fresco-xs font-medium text-fresco-graphite-light mb-2">Suggested</p>
                  <div className="space-y-2">
                    {suggestedLenses.map(s => {
                      const info = allModes.find(m => m.id === s.lens);
                      return (
                        <button
                          key={s.lens}
                          onClick={() => { onDeepDive(s.lens); onClose(); }}
                          className="w-full flex items-center justify-between p-3 border border-violet-200 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-fresco-sm font-medium text-fresco-black dark:text-white">{info?.label}</p>
                            <p className="text-fresco-xs text-fresco-graphite-light">{info?.description}</p>
                          </div>
                          <Sparkles className="w-4 h-4 text-violet-500" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Contrasting lens */}
              <div>
                <p className="text-fresco-xs font-medium text-fresco-graphite-light mb-2">Challenge it with</p>
                {(() => {
                  const info = allModes.find(m => m.id === contrasting);
                  return (
                    <button
                      onClick={() => { onDeepDive(contrasting); onClose(); }}
                      className="w-full flex items-center justify-between p-3 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-fresco-sm font-medium text-fresco-black dark:text-white">{info?.label}</p>
                        <p className="text-fresco-xs text-fresco-graphite-light">{info?.description}</p>
                      </div>
                      <Shuffle className="w-4 h-4 text-amber-500" />
                    </button>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// LENS-SPECIFIC OUTPUT RENDERER
// ============================================

interface LensSpecificOutputProps {
  lens: ThinkingModeId;
  data: {
    systemsDiagram?: SystemsDiagramProps['data'];
    futuresScenarios?: FuturesScenariosProps['data'];
    ethicalMatrix?: EthicalMatrixProps['data'];
    firstPrinciplesList?: string[];
    narrativeArc?: NarrativeArcProps['data'];
  };
}

export function LensSpecificOutput({ lens, data }: LensSpecificOutputProps) {
  if (!data) return null;
  
  return (
    <div className="mt-6 space-y-4">
      {lens === 'systems' && data.systemsDiagram && (
        <SystemsDiagram data={data.systemsDiagram} />
      )}
      {lens === 'futures' && data.futuresScenarios && (
        <FuturesScenarios data={data.futuresScenarios} />
      )}
      {lens === 'ethical' && data.ethicalMatrix && (
        <EthicalMatrix data={data.ethicalMatrix} />
      )}
      {lens === 'first_principles' && data.firstPrinciplesList && (
        <FirstPrinciplesList data={data.firstPrinciplesList} />
      )}
      {lens === 'narrative' && data.narrativeArc && (
        <NarrativeArc data={data.narrativeArc} />
      )}
    </div>
  );
}
