'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Quote, Lightbulb, Target, ArrowRight, RefreshCw, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOOLKITS, type Session } from '@/types';

interface WorkspaceSynthesisProps {
  sessions: Session[];
  workspaceTitle?: string;
  className?: string;
}

interface SynthesisData {
  projectSummary: string;
  keyThemes: string[];
  coreDirection: string;
  openQuestions: string[];
  recommendedNextSteps: string[];
}

export function WorkspaceSynthesis({ sessions, workspaceTitle, className }: WorkspaceSynthesisProps) {
  const [synthesis, setSynthesis] = useState<SynthesisData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gather all insights and truths from sessions
  const workspaceData = useMemo(() => {
    const insights: { toolkit: string; content: string }[] = [];
    const truths: { toolkit: string; content: string }[] = [];
    const moves: { toolkit: string; content: string }[] = [];

    sessions.forEach(session => {
      const toolkitName = TOOLKITS[session.toolkitType]?.name || session.toolkitType;
      
      // Gather insights
      if (session.aiOutputs?.insights) {
        session.aiOutputs.insights.forEach(insight => {
          insights.push({ toolkit: toolkitName, content: insight });
        });
      }
      if (session.insights) {
        session.insights.forEach(i => {
          if (i.content) insights.push({ toolkit: toolkitName, content: i.content });
        });
      }
      
      // Gather sentences of truth
      if (session.sentenceOfTruth?.content) {
        truths.push({ toolkit: toolkitName, content: session.sentenceOfTruth.content });
      }
      if (session.aiOutputs?.sentenceOfTruth) {
        truths.push({ toolkit: toolkitName, content: session.aiOutputs.sentenceOfTruth });
      }
      
      // Gather necessary moves
      if (session.aiOutputs?.necessaryMoves) {
        session.aiOutputs.necessaryMoves.forEach(move => {
          moves.push({ toolkit: toolkitName, content: move });
        });
      }
      if (session.necessaryMoves) {
        session.necessaryMoves.forEach(m => {
          if (m.content) moves.push({ toolkit: toolkitName, content: m.content });
        });
      }
    });

    return { insights, truths, moves };
  }, [sessions]);

  const hasContent = workspaceData.insights.length > 0 || workspaceData.truths.length > 0;

  const generateSynthesis = async () => {
    if (isGenerating || !hasContent) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'workspace_synthesis',
          toolkitName: 'Workspace Synthesis',
          steps: [
            { 
              label: 'PROJECT', 
              content: workspaceTitle || 'Untitled Workspace'
            },
            { 
              label: 'CORE TRUTHS', 
              content: workspaceData.truths.map(t => `[${t.toolkit}] ${t.content}`).join('\n') 
            },
            { 
              label: 'KEY INSIGHTS', 
              content: workspaceData.insights.map(i => `[${i.toolkit}] ${i.content}`).join('\n') 
            },
            { 
              label: 'IDENTIFIED ACTIONS', 
              content: workspaceData.moves.map(m => `[${m.toolkit}] ${m.content}`).join('\n') 
            },
          ],
          thinkingLens: 'strategic',
          outputLabels: { 
            primary: 'Key Themes', 
            secondary: 'Project Direction', 
            action: 'Strategic Next Steps' 
          },
          workspaceSynthesis: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform the standard output into synthesis format
        setSynthesis({
          projectSummary: generateProjectSummary(workspaceData),
          keyThemes: data.insights || [],
          coreDirection: data.sentenceOfTruth || '',
          openQuestions: extractOpenQuestions(workspaceData),
          recommendedNextSteps: data.necessaryMoves || [],
        });
      }
    } catch (error) {
      console.error('Synthesis generation failed:', error);
    }
    
    setIsGenerating(false);
  };

  const generateProjectSummary = (data: typeof workspaceData) => {
    const toolkitsUsed = [...new Set(sessions.map(s => TOOLKITS[s.toolkitType]?.name))].filter(Boolean);
    return `This workspace explored ${toolkitsUsed.length} thinking dimension${toolkitsUsed.length !== 1 ? 's' : ''} (${toolkitsUsed.join(', ')}), generating ${data.insights.length} insight${data.insights.length !== 1 ? 's' : ''} and ${data.truths.length} core truth${data.truths.length !== 1 ? 's' : ''}.`;
  };

  const extractOpenQuestions = (data: typeof workspaceData) => {
    // Extract questions or uncertainties mentioned in insights
    const questions: string[] = [];
    data.insights.forEach(i => {
      if (i.content.includes('?') || i.content.toLowerCase().includes('unclear') || i.content.toLowerCase().includes('unknown')) {
        questions.push(i.content);
      }
    });
    return questions.slice(0, 3);
  };

  const handleCopy = () => {
    if (!synthesis) return;
    
    const text = `
# Workspace Synthesis: ${workspaceTitle || 'Untitled'}

## Project Summary
${synthesis.projectSummary}

## Core Direction
${synthesis.coreDirection}

## Key Themes
${synthesis.keyThemes.map(t => `- ${t}`).join('\n')}

## Recommended Next Steps
${synthesis.recommendedNextSteps.map(s => `- ${s}`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasContent) {
    return (
      <div className={cn("text-center py-16", className)}>
        <div className="w-16 h-16 rounded-2xl bg-fresco-light-gray flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-fresco-graphite-light" />
        </div>
        <h3 className="text-fresco-lg font-medium text-fresco-black mb-2">No insights to synthesise yet</h3>
        <p className="text-fresco-sm text-fresco-graphite-light max-w-sm mx-auto">
          Complete some toolkit sessions to generate a workspace-level synthesis of your thinking.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-fresco-lg font-medium text-fresco-black">Project Synthesis</h3>
          <p className="text-fresco-sm text-fresco-graphite-light">
            Meta-level view of insights across {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={generateSynthesis}
          disabled={isGenerating}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-fresco-sm font-medium transition-all",
            synthesis
              ? "bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border"
              : "bg-fresco-black text-white hover:bg-fresco-graphite"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Synthesising...
            </>
          ) : synthesis ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Synthesis
            </>
          )}
        </button>
      </div>

      {/* Raw Data Summary (always visible) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-fresco-light-gray rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Quote className="w-4 h-4 text-fresco-graphite-light" />
            <span className="text-fresco-xs font-medium text-fresco-graphite-light uppercase tracking-wider">Core Truths</span>
          </div>
          <p className="text-fresco-2xl font-bold text-fresco-black">{workspaceData.truths.length}</p>
        </div>
        <div className="p-4 bg-fresco-light-gray rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-fresco-graphite-light" />
            <span className="text-fresco-xs font-medium text-fresco-graphite-light uppercase tracking-wider">Insights</span>
          </div>
          <p className="text-fresco-2xl font-bold text-fresco-black">{workspaceData.insights.length}</p>
        </div>
        <div className="p-4 bg-fresco-light-gray rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-4 h-4 text-fresco-graphite-light" />
            <span className="text-fresco-xs font-medium text-fresco-graphite-light uppercase tracking-wider">Actions</span>
          </div>
          <p className="text-fresco-2xl font-bold text-fresco-black">{workspaceData.moves.length}</p>
        </div>
      </div>

      {/* Collected Truths */}
      {workspaceData.truths.length > 0 && (
        <div className="p-5 bg-fresco-black rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Quote className="w-4 h-4 text-white/50" />
            <span className="text-fresco-xs font-medium text-white/50 uppercase tracking-wider">Sentences of Truth</span>
          </div>
          <div className="space-y-3">
            {workspaceData.truths.map((truth, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-fresco-xs text-white/40 bg-white/10 px-2 py-0.5 rounded flex-shrink-0">{truth.toolkit}</span>
                <p className="text-fresco-sm text-white/90 leading-relaxed">{truth.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Synthesis Results */}
      {synthesis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Core Direction */}
          {synthesis.coreDirection && (
            <div className="relative p-6 bg-gradient-to-br from-fresco-graphite to-fresco-black rounded-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 1px)`,
                backgroundSize: '24px 24px'
              }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-white/50" />
                    <span className="text-fresco-xs font-medium text-white/50 uppercase tracking-wider">Project Direction</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-fresco-lg text-white font-light leading-relaxed">{synthesis.coreDirection}</p>
              </div>
            </div>
          )}

          {/* Key Themes */}
          {synthesis.keyThemes.length > 0 && (
            <div>
              <h4 className="text-fresco-sm font-medium text-fresco-black mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-fresco-graphite-light" />
                Key Themes Emerging
              </h4>
              <div className="space-y-2">
                {synthesis.keyThemes.map((theme, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 bg-fresco-light-gray rounded-xl"
                  >
                    <p className="text-fresco-sm text-fresco-graphite-soft">{theme}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Steps */}
          {synthesis.recommendedNextSteps.length > 0 && (
            <div>
              <h4 className="text-fresco-sm font-medium text-fresco-black mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-fresco-graphite-light" />
                Strategic Next Steps
              </h4>
              <div className="space-y-2">
                {synthesis.recommendedNextSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-start gap-3 p-4 bg-fresco-off-white rounded-xl border border-fresco-border"
                  >
                    <span className="w-6 h-6 rounded-full bg-fresco-black text-white flex items-center justify-center text-fresco-xs font-medium flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-fresco-sm text-fresco-graphite-soft">{step}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Pre-synthesis: Show raw insights grouped by toolkit */}
      {!synthesis && workspaceData.insights.length > 0 && (
        <div>
          <h4 className="text-fresco-sm font-medium text-fresco-black mb-3">Insights by Toolkit</h4>
          <div className="space-y-4">
            {Object.entries(
              workspaceData.insights.reduce((acc, insight) => {
                if (!acc[insight.toolkit]) acc[insight.toolkit] = [];
                acc[insight.toolkit].push(insight.content);
                return acc;
              }, {} as Record<string, string[]>)
            ).map(([toolkit, insights]) => (
              <div key={toolkit} className="p-4 bg-fresco-light-gray rounded-xl">
                <h5 className="text-fresco-xs font-medium text-fresco-graphite-light uppercase tracking-wider mb-3">{toolkit}</h5>
                <ul className="space-y-2">
                  {insights.slice(0, 3).map((insight, i) => (
                    <li key={i} className="text-fresco-sm text-fresco-graphite-soft flex items-start gap-2">
                      <span className="text-fresco-graphite-light">•</span>
                      {insight}
                    </li>
                  ))}
                  {insights.length > 3 && (
                    <li className="text-fresco-xs text-fresco-graphite-light">+{insights.length - 3} more</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
