'use client';

// FRESCO Mental Model Mapper™ - Visual Node & Relationship Builder
// Interactive belief mapping with connections

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Download, 
  Sparkles,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Brain,
  Link2,
  Circle,
  ArrowRight,
  Eye,
  EyeOff,
  Lightbulb
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { ThinkingLensHint } from '@/components/ui/ThinkingLensHint';
import { ExportModal } from '@/components/ui/ExportModal';
import { BeliefMap } from '@/components/ui/VisualOutputs';
import { NextToolkitCTA } from '@/components/ui/NextToolkitCTA';
import { 
  FloatingGenerateButton,
  ProgressIndicator,
  InputQualityIndicator,
  SmartPrompt,
  ContextualExample,
  WizardModeControls,
  CompletionCelebration,
  DynamicPrompt
} from '@/components/ui/ToolkitUX';
import { useToast } from '@/components/ui/Toast';
import { InsightCard } from '@/components/ui/InsightCard';
import { SentenceOfTruthDisplay } from '@/components/ui/SentenceOfTruthDisplay';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GenerationSuccess } from '@/components/ui/GenerationSuccess';
import { TOOLKIT_EXAMPLES } from '@/lib/examples';

interface MentalModelMapperSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

interface Belief {
  id: string;
  content: string;
  type: 'assumption' | 'fact' | 'opinion';
  connections: string[]; // IDs of connected beliefs
}

interface Gap {
  id: string;
  content: string;
}

const BELIEF_COLORS = {
  assumption: { bg: 'bg-fresco-light-gray', border: 'border-fresco-graphite-light', text: 'text-fresco-graphite', label: 'Assumption' },
  fact: { bg: 'bg-fresco-off-white', border: 'border-fresco-black', text: 'text-fresco-black', label: 'Fact' },
  opinion: { bg: 'bg-white dark:bg-gray-800', border: 'border-fresco-border', text: 'text-fresco-graphite-mid', label: 'Opinion' },
};

export function MentalModelMapperSession({ sessionId, workspaceId, onBack, onStartToolkit }: MentalModelMapperSessionProps) {
  const {
    sessions,
    workspaces,
    updateSessionStep,
    setSessionLens,
    setSentenceOfTruth,
    toggleSentenceLock,
    saveAIOutputs,
    getWorkspaceSessions,
  } = useFrescoStore();
  const { showToast } = useToast();
  
  const session = sessions.find((s) => s.id === sessionId);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const toolkit = TOOLKITS.mental_model_mapper;
  
  const [domain, setDomain] = useState('');
  const [beliefs, setBeliefs] = useState<Belief[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [modelSummary, setModelSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<{ insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }>({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // New UX state
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isOutputPanelExpanded, setIsOutputPanelExpanded] = useState(false);
  
  // Initialize from session
  useEffect(() => {
    if (session?.steps) {
      const step1 = session.steps.find(s => s.stepNumber === 1);
      const step2 = session.steps.find(s => s.stepNumber === 2);
      const step4 = session.steps.find(s => s.stepNumber === 4);
      const step5 = session.steps.find(s => s.stepNumber === 5);
      
      if (step1?.content) setDomain(step1.content);
      if (step2?.content) {
        try {
          const parsed = JSON.parse(step2.content);
          if (Array.isArray(parsed)) setBeliefs(parsed);
        } catch {
          // Convert plain text to beliefs
          const lines = step2.content.split('\n').filter(l => l.trim());
          setBeliefs(lines.map((line, i) => ({
            id: `belief-${i}`,
            content: line,
            type: 'assumption' as const,
            connections: []
          })));
        }
      }
      if (step4?.content) {
        try {
          const parsed = JSON.parse(step4.content);
          if (Array.isArray(parsed)) setGaps(parsed);
        } catch {
          const lines = step4.content.split('\n').filter(l => l.trim());
          setGaps(lines.map((line, i) => ({ id: `gap-${i}`, content: line })));
        }
      }
      if (step5?.content) setModelSummary(step5.content);
    }
    
    // Restore saved AI outputs
    if (session?.insights && session.insights.length > 0) {
      setAiContent(prev => ({ ...prev, insights: session.insights?.map(i => i.content) || [] }));
    }
    if (session?.sentenceOfTruth?.content) {
      setAiContent(prev => ({ ...prev, sentenceOfTruth: session.sentenceOfTruth?.content || '' }));
    }
    if (session?.necessaryMoves && session.necessaryMoves.length > 0) {
      setAiContent(prev => ({ ...prev, necessaryMoves: session.necessaryMoves?.map(m => m.content) || [] }));
    }
  }, [session?.id]);

  const debouncedSave = useCallback(
    debounce((stepNumber: number, value: string) => {
      updateSessionStep(sessionId, stepNumber, value);
    }, 500),
    [sessionId, updateSessionStep]
  );

  const handleDomainChange = (value: string) => {
    setDomain(value);
    debouncedSave(1, value);
  };

  const handleBeliefsChange = (newBeliefs: Belief[]) => {
    setBeliefs(newBeliefs);
    debouncedSave(2, JSON.stringify(newBeliefs));
    // Save relationships as step 3
    const relationships = newBeliefs
      .filter(b => b.connections.length > 0)
      .map(b => {
        const connected = b.connections.map(id => newBeliefs.find(bb => bb.id === id)?.content).filter(Boolean);
        return `"${b.content}" connects to: ${connected.join(', ')}`;
      })
      .join('\n');
    debouncedSave(3, relationships);
  };

  const handleGapsChange = (newGaps: Gap[]) => {
    setGaps(newGaps);
    debouncedSave(4, JSON.stringify(newGaps));
  };

  const handleSummaryChange = (value: string) => {
    setModelSummary(value);
    debouncedSave(5, value);
  };

  const addBelief = () => {
    const newBelief: Belief = {
      id: `belief-${Date.now()}`,
      content: '',
      type: 'assumption',
      connections: []
    };
    handleBeliefsChange([...beliefs, newBelief]);
  };

  const updateBelief = (id: string, updates: Partial<Belief>) => {
    const updated = beliefs.map(b => b.id === id ? { ...b, ...updates } : b);
    handleBeliefsChange(updated);
  };

  const removeBelief = (id: string) => {
    // Remove belief and all connections to it
    const updated = beliefs
      .filter(b => b.id !== id)
      .map(b => ({ ...b, connections: b.connections.filter(c => c !== id) }));
    handleBeliefsChange(updated);
  };

  const toggleConnection = (toId: string) => {
    if (!connectingFrom) return;
    
    const fromBelief = beliefs.find(b => b.id === connectingFrom);
    if (!fromBelief || connectingFrom === toId) {
      setConnectingFrom(null);
      return;
    }
    
    const hasConnection = fromBelief.connections.includes(toId);
    const newConnections = hasConnection
      ? fromBelief.connections.filter(c => c !== toId)
      : [...fromBelief.connections, toId];
    
    updateBelief(connectingFrom, { connections: newConnections });
    setConnectingFrom(null);
  };

  const addGap = () => {
    const newGap: Gap = { id: `gap-${Date.now()}`, content: '' };
    handleGapsChange([...gaps, newGap]);
  };

  const updateGap = (id: string, content: string) => {
    const updated = gaps.map(g => g.id === id ? { ...g, content } : g);
    handleGapsChange(updated);
  };

  const removeGap = (id: string) => {
    handleGapsChange(gaps.filter(g => g.id !== id));
  };

  const handleLensChange = (lens: ThinkingModeId) => {
    setSessionLens(sessionId, lens);
  };

  // Get workspace context from other sessions
  // Get workspace context from other sessions - includes full context for AI continuity
  const getWorkspaceContext = () => {
    const workspaceSessions = getWorkspaceSessions(workspaceId);
    const otherSessions = workspaceSessions.filter(s => 
      s.id !== sessionId && 
      (s.sentenceOfTruth?.content || s.steps?.some(step => step.content?.trim()))
    );
    if (otherSessions.length === 0) return null;
    return otherSessions.map(s => ({
      toolkit: s.toolkitType,
      toolkitName: TOOLKITS[s.toolkitType]?.name || s.toolkitType,
      sentenceOfTruth: s.sentenceOfTruth?.content,
      insights: s.insights?.map(i => i.content) || [],
      necessaryMoves: s.necessaryMoves?.map(m => m.content) || [],
      steps: s.steps?.map(step => ({
        label: TOOLKITS[s.toolkitType]?.steps?.[step.stepNumber - 1]?.label || `Step ${step.stepNumber}`,
        content: step.content || ''
      })).filter(step => step.content.trim()) || []
    }));
  };

  // Generate AI content
  const generateContent = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const beliefsText = beliefs.map(b => `[${b.type}] ${b.content}`).join('\n');
      const gapsText = gaps.map(g => g.content).join('\n');
      const connectionsText = beliefs
        .filter(b => b.connections.length > 0)
        .map(b => {
          const connected = b.connections.map(id => beliefs.find(bb => bb.id === id)?.content).filter(Boolean);
          return `"${b.content}" → ${connected.join(', ')}`;
        })
        .join('\n');
      
      const workspaceContext = getWorkspaceContext();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'mental_model_mapper',
          toolkitName: toolkit.name,
          steps: [
            { label: 'DOMAIN', content: domain },
            { label: 'BELIEFS', content: beliefsText },
            { label: 'RELATIONSHIPS', content: connectionsText },
            { label: 'GAPS', content: gapsText },
            { label: 'MODEL', content: modelSummary },
          ],
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'Model Components', secondary: 'Mental Model Summary', action: 'Model Applications' },
          workspaceContext,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiContent(data);
        saveAIOutputs(sessionId, data);
        setShowCelebration(true);
        setIsOutputPanelExpanded(true);
      }
    } catch (e) { console.error('Failed to generate:', e); showToast('Failed to generate. Please try again.', 'error'); }
    setIsGenerating(false);
  };

  const hasContent = domain.trim().length > 0 || beliefs.some(b => b.content.trim().length > 0);
  const completedSections = [
    domain.trim().length > 10,
    beliefs.filter(b => b.content.trim()).length >= 2,
    gaps.filter(g => g.content.trim()).length >= 1,
    modelSummary.trim().length > 20
  ].filter(Boolean).length;
  
  if (!session) return <div className="flex items-center justify-center h-96"><p className="text-fresco-graphite-light">Session not found</p></div>;

  return (
    <div className="flex h-full bg-fresco-white">
      {/* Completion Celebration */}
      <GenerationSuccess 
        show={showCelebration} 
        onComplete={() => setShowCelebration(false)}
        insightCount={aiContent.insights.length}
        hasTruth={!!aiContent.sentenceOfTruth}
        actionCount={aiContent.necessaryMoves.length}
      />
      
      {/* Floating Generate Button */}
      <FloatingGenerateButton
        isVisible={completedSections >= 2 && !aiContent.sentenceOfTruth && !isGenerating}
        isGenerating={isGenerating}
        onClick={generateContent}
        label="Analyse Model"
      />
      
      {/* Main Column */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <button type="button" onClick={() => onBack?.()} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors">
                <ChevronLeft className="w-4 h-4" /><span>Back to {workspace?.title || 'Workspace'}</span>
              </button>
              <ThinkingLensSelector value={session.thinkingLens} onChange={handleLensChange} recommendedModes={toolkit.primaryModes} />
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-fresco-black flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-fresco-2xl font-medium text-fresco-black tracking-tight">{toolkit.name}</h1>
                <p className="text-fresco-sm text-fresco-graphite-mid">{toolkit.subtitle}</p>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="mt-6">
              <ProgressIndicator 
                variant="bar"
                steps={[
                  { label: 'Domain', isComplete: domain.trim().length > 10, isActive: true },
                  { label: 'Beliefs', isComplete: beliefs.filter(b => b.content.trim()).length >= 2, isActive: false },
                  { label: 'Gaps', isComplete: gaps.filter(g => g.content.trim()).length >= 1, isActive: false },
                  { label: 'Summary', isComplete: modelSummary.trim().length > 20, isActive: false }
                ]}
              />
            </div>
          </div>
          
          {/* Domain */}
          <div className="mb-8">
            <label className="fresco-label block mb-2">Domain Being Mapped</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => handleDomainChange(e.target.value)}
              placeholder="What domain or decision space are we mapping?"
              className="w-full p-4 bg-fresco-light-gray rounded-xl text-fresco-lg border-none focus:ring-2 focus:ring-fresco-black outline-none"
            />
            <InputQualityIndicator value={domain} minLength={10} goodLength={40} />
            {TOOLKIT_EXAMPLES.mental_model_mapper?.domain && (
              <ContextualExample
                stepLabel="Domain"
                example={TOOLKIT_EXAMPLES.mental_model_mapper.domain.example}
                tip={TOOLKIT_EXAMPLES.mental_model_mapper.domain.tip}
              />
            )}
          </div>
          
          {/* Beliefs Map */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-fresco-lg font-medium text-fresco-black">Beliefs & Assumptions</h3>
                <p className="text-fresco-sm text-fresco-graphite-light">Map the beliefs that shape thinking in this domain</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={addBelief}
                  className="flex items-center gap-2 px-4 py-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black border border-fresco-border rounded-lg hover:border-fresco-black transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Belief
                </button>
              </div>
            </div>
            
            {/* Connections explanation banner */}
            {beliefs.length >= 2 && (
              <div className="mb-4 p-3 bg-fresco-light-gray rounded-xl flex items-start gap-3">
                <Link2 className="w-5 h-5 text-fresco-graphite-mid flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-fresco-sm text-fresco-graphite-soft">
                    <strong>Link related beliefs</strong> to reveal patterns. Click the <Link2 className="w-3.5 h-3.5 inline" /> icon on any belief, then click another to connect them. 
                    Connections help identify reinforcing beliefs, contradictions, and hidden dependencies.
                  </p>
                </div>
                <button
                  onClick={() => setShowConnections(!showConnections)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-fresco-xs font-medium transition-colors flex-shrink-0",
                    showConnections ? "bg-fresco-black text-white" : "bg-white dark:bg-gray-800 text-fresco-graphite-mid border border-fresco-border dark:border-gray-700"
                  )}
                >
                  {showConnections ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {showConnections ? 'Links visible' : 'Show links'}
                </button>
              </div>
            )}
            
            {/* Legend */}
            <div className="flex gap-4 mb-4">
              {Object.entries(BELIEF_COLORS).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", colors.bg, colors.border, "border-2")} />
                  <span className="text-fresco-xs text-fresco-graphite-mid">{colors.label}</span>
                </div>
              ))}
            </div>
            
            {/* Belief Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Connecting mode banner */}
              {connectingFrom && (
                <div className="col-span-2 p-3 bg-fresco-black text-white rounded-xl flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    <span className="text-fresco-sm">
                      Click another belief to link it, or click the same belief to cancel
                    </span>
                  </div>
                  <button 
                    onClick={() => setConnectingFrom(null)}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-fresco-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              {beliefs.map((belief, index) => {
                const colors = BELIEF_COLORS[belief.type];
                const isConnecting = connectingFrom === belief.id;
                const isConnected = connectingFrom && beliefs.find(b => b.id === connectingFrom)?.connections.includes(belief.id);
                
                return (
                  <motion.div
                    key={belief.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all",
                      colors.bg, colors.border,
                      isConnecting && "ring-2 ring-fresco-black ring-offset-2",
                      connectingFrom && !isConnecting && "cursor-pointer hover:ring-2 hover:ring-fresco-black hover:ring-offset-2",
                      isConnected && "ring-2 ring-green-500 ring-offset-2"
                    )}
                    onClick={() => connectingFrom && !isConnecting && toggleConnection(belief.id)}
                  >
                    {/* Connection indicator */}
                    {showConnections && belief.connections.length > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-fresco-black text-white rounded-full flex items-center justify-center text-fresco-xs font-medium">
                        {belief.connections.length}
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {/* Type selector */}
                      <select
                        value={belief.type}
                        onChange={(e) => updateBelief(belief.id, { type: e.target.value as Belief['type'] })}
                        className={cn("text-fresco-xs font-medium uppercase tracking-wider bg-transparent border-none focus:outline-none cursor-pointer", colors.text)}
                      >
                        <option value="assumption">Assumption</option>
                        <option value="fact">Fact</option>
                        <option value="opinion">Opinion</option>
                      </select>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConnectingFrom(isConnecting ? null : belief.id); }}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isConnecting ? "bg-fresco-black text-white" : "text-fresco-graphite-light hover:text-fresco-black hover:bg-white/50"
                          )}
                          title={isConnecting ? "Cancel — click elsewhere to link" : "Link to another belief"}
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeBelief(belief.id); }}
                          className="p-1.5 text-fresco-graphite-light hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <textarea
                      value={belief.content}
                      onChange={(e) => updateBelief(belief.id, { content: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="What belief operates in this space?"
                      className="w-full bg-transparent border-none focus:outline-none text-fresco-sm text-fresco-graphite-soft resize-none"
                      rows={2}
                    />
                    
                    {/* Show connections */}
                    {showConnections && belief.connections.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-current/20">
                        <div className="flex items-center gap-1.5 text-fresco-xs text-fresco-graphite-light mb-1.5">
                          <Link2 className="w-3 h-3" />
                          <span>Linked beliefs:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {belief.connections.map(connId => {
                            const connBelief = beliefs.find(b => b.id === connId);
                            if (!connBelief) return null;
                            const connColors = BELIEF_COLORS[connBelief.type];
                            return (
                              <span 
                                key={connId} 
                                className={cn(
                                  "px-2 py-0.5 rounded text-fresco-xs truncate max-w-[150px] border",
                                  connColors.bg, connColors.border, connColors.text
                                )}
                                title={connBelief.content}
                              >
                                {connBelief.content.length > 25 ? connBelief.content.slice(0, 25) + '...' : connBelief.content}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              
              {beliefs.length === 0 && (
                <div className="col-span-2 py-12 text-center border-2 border-dashed border-fresco-border rounded-xl">
                  <Circle className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                  <p className="text-fresco-sm text-fresco-graphite-light mb-4">Add beliefs that operate in this domain</p>
                  <button onClick={addBelief} className="fresco-btn fresco-btn-primary fresco-btn-sm">
                    <Plus className="w-4 h-4 inline mr-2" /> Add First Belief
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Gaps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-fresco-lg font-medium text-fresco-black">Blind Spots & Gaps</h3>
              <button onClick={addGap} className="flex items-center gap-2 px-4 py-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black border border-fresco-border rounded-lg hover:border-fresco-black transition-colors">
                <Plus className="w-4 h-4" /> Add Gap
              </button>
            </div>
            
            <div className="space-y-3">
              {gaps.map((gap, index) => (
                <motion.div
                  key={gap.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-4 bg-fresco-light-gray border border-fresco-border rounded-xl group"
                >
                  <Lightbulb className="w-5 h-5 text-fresco-graphite flex-shrink-0" />
                  <input
                    type="text"
                    value={gap.content}
                    onChange={(e) => updateGap(gap.id, e.target.value)}
                    placeholder="What's missing from this mental model?"
                    className="flex-1 bg-transparent border-none focus:outline-none text-fresco-sm text-fresco-graphite-soft"
                  />
                  <button onClick={() => removeGap(gap.id)} className="opacity-0 group-hover:opacity-100 p-1 text-fresco-graphite-light hover:text-fresco-graphite transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Model Summary */}
          <div className="mb-8">
            <label className="fresco-label block mb-2">Mental Model Summary</label>
            <textarea
              value={modelSummary}
              onChange={(e) => handleSummaryChange(e.target.value)}
              placeholder="Name and describe the mental model that emerges from these beliefs..."
              className="w-full p-4 bg-fresco-light-gray rounded-xl text-fresco-base border-none focus:ring-2 focus:ring-fresco-black outline-none resize-none"
              rows={4}
            />
          </div>
          
          <div className="mt-12 pt-6 border-t border-fresco-border-light">
            <p className="text-fresco-xs text-fresco-graphite-light">Auto-saved {session.updatedAt ? formatRelativeTime(session.updatedAt) : 'just now'}</p>
          </div>
        </div>
      </div>
      
      {/* Output Panel - Collapsible */}
      <AnimatePresence>
        {isOutputPanelExpanded ? (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-l border-fresco-border-light bg-fresco-off-white overflow-hidden"
          >
            <div className="w-[360px] h-full overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-fresco-lg font-medium text-fresco-black">Output</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsOutputPanelExpanded(false)} className="p-1.5 text-fresco-graphite-light hover:text-fresco-black rounded transition-colors">
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
          
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 bg-fresco-light-gray rounded-xl text-center">
                    <div className="text-fresco-2xl font-bold text-fresco-black">{beliefs.length}</div>
                    <div className="text-fresco-xs text-fresco-graphite-light">Beliefs</div>
                  </div>
                  <div className="p-3 bg-fresco-light-gray rounded-xl text-center">
                    <div className="text-fresco-2xl font-bold text-fresco-black">{beliefs.reduce((sum, b) => sum + b.connections.length, 0)}</div>
                    <div className="text-fresco-xs text-fresco-graphite-light">Connections</div>
                  </div>
                  <div className="p-3 bg-fresco-light-gray rounded-xl text-center">
                    <div className="text-fresco-2xl font-bold text-fresco-black">{gaps.length}</div>
                    <div className="text-fresco-xs text-fresco-graphite-light">Gaps</div>
                  </div>
                </div>
          
                {/* Model Components */}
                <div className="mb-8">
                  <span className="fresco-label block mb-4">Model Components</span>
                  {aiContent.insights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <Brain className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Map your beliefs<br/>then analyse</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiContent.insights.map((insight, i) => (
                        <InsightCard key={i} insight={insight} index={i} isNew={true} />
                      ))}
                    </div>
                  )}
                </div>
          
                {/* Mental Model Summary - Enhanced Display */}
                {aiContent.sentenceOfTruth ? (
                  <div className="mb-8">
                    <SentenceOfTruthDisplay
                      sentence={aiContent.sentenceOfTruth}
                      toolkitName="Mental Model Mapper"
                      isLocked={session?.sentenceOfTruth?.isLocked}
                      onLockToggle={() => toggleSentenceLock(sessionId)}
                      onEdit={(val) => setSentenceOfTruth(sessionId, val)}
                    />
                  </div>
                ) : (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Mental Model Summary</span>
                    <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                      <p className="text-fresco-sm text-fresco-graphite-light">Generate to reveal your mental model</p>
                    </div>
                  </div>
                )}
          
                {/* Model Applications */}
                {aiContent.necessaryMoves.length > 0 && (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Model Applications</span>
                    <div className="space-y-2">
                      {aiContent.necessaryMoves.map((move, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-lg">
                          <ArrowRight className="w-4 h-4 text-fresco-graphite-mid flex-shrink-0 mt-0.5" />
                          <p className="text-fresco-sm text-fresco-graphite-soft">{move}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
          
                {/* Export */}
                <div className="pt-6 border-t border-fresco-border-light">
                  <button 
                    onClick={() => setShowExportModal(true)}
                    className="fresco-btn w-full"
                  >
                    <Download className="w-4 h-4" />
                    Export Model
                  </button>
                </div>
          
                {/* Next Toolkit CTA */}
                <NextToolkitCTA 
                  currentToolkit="mental_model_mapper"
                  isReady={aiContent.insights.length > 0 && !!aiContent.sentenceOfTruth && aiContent.necessaryMoves.length > 0}
                  onStartToolkit={onStartToolkit}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsOutputPanelExpanded(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-fresco-black text-white px-3 py-6 rounded-l-xl shadow-lg hover:bg-fresco-graphite transition-colors flex flex-col items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            <span className="text-fresco-xs font-medium" style={{ writingMode: 'vertical-rl' }}>Output</span>
            {aiContent.insights.length > 0 && (
              <span className="w-5 h-5 bg-fresco-black rounded-full text-fresco-xs flex items-center justify-center">
                {aiContent.insights.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={{
          toolkitType: 'mental_model_mapper',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: [
            { label: 'Domain', content: domain },
            { label: 'Beliefs', content: beliefs.map(b => `[${b.type.toUpperCase()}] ${b.content}`).join('\n') },
            { label: 'Gaps', content: gaps.map(g => `- ${g.content}`).join('\n') },
            { label: 'Model Summary', content: modelSummary },
          ],
          insights: aiContent.insights,
          sentenceOfTruth: aiContent.sentenceOfTruth,
          necessaryMoves: aiContent.necessaryMoves,
          customData: {
            'Beliefs': beliefs.map(b => ({ 
              type: b.type, 
              content: b.content, 
              connections: b.connections.length 
            })),
            'Knowledge Gaps': gaps.map(g => g.content),
          }
        }}
      />
    </div>
  );
}
