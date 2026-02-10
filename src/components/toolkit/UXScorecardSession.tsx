'use client';

// FRESCO UX Scorecard™ - Visual Scoring with Radar Chart
// Slider-based criteria scoring with real-time visualization

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Download, 
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  X,
  Plus,
  Trash2,
  BarChart3,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { ThinkingLensHint } from '@/components/ui/ThinkingLensHint';
import { ExportModal } from '@/components/ui/ExportModal';
import { RadarChart, ProgressRing } from '@/components/ui/VisualOutputs';
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

interface UXScorecardSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

interface Criterion {
  id: string;
  name: string;
  score: number;
  notes: string;
}

const DEFAULT_CRITERIA = [
  { id: '1', name: 'Usability', score: 5, notes: '' },
  { id: '2', name: 'Visual Design', score: 5, notes: '' },
  { id: '3', name: 'Performance', score: 5, notes: '' },
  { id: '4', name: 'Accessibility', score: 5, notes: '' },
  { id: '5', name: 'User Delight', score: 5, notes: '' },
];

export function UXScorecardSession({ sessionId, workspaceId, onBack, onStartToolkit }: UXScorecardSessionProps) {
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
  const toolkit = TOOLKITS.ux_scorecard;
  
  const [experienceName, setExperienceName] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [priorities, setPriorities] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<{ insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }>({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
  const [showExportModal, setShowExportModal] = useState(false);
  
  // New UX state
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isOutputPanelExpanded, setIsOutputPanelExpanded] = useState(false);
  const [newCriterionName, setNewCriterionName] = useState('');
  
  // Initialize from session
  useEffect(() => {
    if (session?.steps) {
      const step1 = session.steps.find(s => s.stepNumber === 1);
      const step2 = session.steps.find(s => s.stepNumber === 2);
      const step3 = session.steps.find(s => s.stepNumber === 3);
      const step4 = session.steps.find(s => s.stepNumber === 4);
      
      if (step1?.content) setExperienceName(step1.content);
      if (step2?.content) {
        try {
          const parsed = JSON.parse(step2.content);
          if (Array.isArray(parsed)) setCriteria(parsed);
        } catch {}
      }
      if (step4?.content) setPriorities(step4.content);
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

  const handleExperienceChange = (value: string) => {
    setExperienceName(value);
    debouncedSave(1, value);
  };

  const handleCriteriaChange = (newCriteria: Criterion[]) => {
    setCriteria(newCriteria);
    debouncedSave(2, JSON.stringify(newCriteria));
    // Also save as evaluation text
    const evalText = newCriteria.map(c => `${c.name}: ${c.score}/10${c.notes ? ` - ${c.notes}` : ''}`).join('\n');
    debouncedSave(3, evalText);
  };

  const handlePrioritiesChange = (value: string) => {
    setPriorities(value);
    debouncedSave(4, value);
  };

  const handleScoreChange = (id: string, score: number) => {
    const updated = criteria.map(c => c.id === id ? { ...c, score } : c);
    handleCriteriaChange(updated);
  };

  const handleNotesChange = (id: string, notes: string) => {
    const updated = criteria.map(c => c.id === id ? { ...c, notes } : c);
    handleCriteriaChange(updated);
  };

  const addCriterion = () => {
    if (!newCriterionName.trim()) return;
    const newCriterion: Criterion = {
      id: Date.now().toString(),
      name: newCriterionName.trim(),
      score: 5,
      notes: ''
    };
    handleCriteriaChange([...criteria, newCriterion]);
    setNewCriterionName('');
  };

  const removeCriterion = (id: string) => {
    handleCriteriaChange(criteria.filter(c => c.id !== id));
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

  // Calculate overall score
  const overallScore = criteria.length > 0 
    ? (criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length).toFixed(1)
    : '0.0';

  // Generate AI content
  const generateContent = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const evalText = criteria.map(c => `${c.name}: ${c.score}/10${c.notes ? ` - ${c.notes}` : ''}`).join('\n');
      const workspaceContext = getWorkspaceContext();
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'ux_scorecard',
          toolkitName: toolkit.name,
          steps: [
            { label: 'EXPERIENCE', content: experienceName },
            { label: 'CRITERIA', content: criteria.map(c => c.name).join(', ') },
            { label: 'EVALUATION', content: evalText },
            { label: 'PRIORITIES', content: priorities },
          ],
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'UX Evaluation', secondary: 'Overall Assessment', action: 'Priority Fixes' },
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

  // Radar chart SVG
  const RadarChart = () => {
    const size = 280;
    const center = size / 2;
    const maxRadius = 100;
    const levels = 5;
    
    const angleStep = (2 * Math.PI) / criteria.length;
    
    // Generate points for the data polygon
    const dataPoints = criteria.map((c, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const radius = (c.score / 10) * maxRadius;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
      };
    });
    
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    
    return (
      <svg width={size} height={size} className="mx-auto">
        {/* Background levels */}
        {Array.from({ length: levels }).map((_, level) => {
          const radius = ((level + 1) / levels) * maxRadius;
          const points = criteria.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="var(--fresco-border)"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Axis lines */}
        {criteria.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + maxRadius * Math.cos(angle)}
              y2={center + maxRadius * Math.sin(angle)}
              stroke="var(--fresco-border)"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Data polygon */}
        <motion.polygon
          points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(0,0,0,0.1)"
          stroke="var(--fresco-black)"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />
        
        {/* Data points */}
        {dataPoints.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="6"
            fill="var(--fresco-black)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
        
        {/* Labels */}
        {criteria.map((c, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = maxRadius + 25;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-fresco-xs fill-fresco-graphite-mid"
            >
              {c.name}
            </text>
          );
        })}
      </svg>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-fresco-black';
    if (score >= 6) return 'text-fresco-graphite';
    if (score >= 4) return 'text-fresco-graphite-mid';
    return 'text-fresco-graphite-light';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-fresco-black';
    if (score >= 6) return 'bg-fresco-graphite';
    if (score >= 4) return 'bg-fresco-graphite-mid';
    return 'bg-fresco-graphite-light';
  };
  
  const hasContent = experienceName.trim().length > 0 || criteria.some(c => c.notes && c.notes.trim().length > 0);
  const completedSections = [
    experienceName.trim().length > 5,
    criteria.filter(c => c.notes && c.notes.trim().length > 5).length >= 2,
    priorities.trim().length > 10
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
        label="Analyse UX"
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
                <BarChart3 className="w-5 h-5 text-white" />
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
                  { label: 'Experience', isComplete: experienceName.trim().length > 5, isActive: true },
                  { label: 'Criteria', isComplete: criteria.filter(c => c.notes && c.notes.trim().length > 5).length >= 2, isActive: false },
                  { label: 'Priorities', isComplete: priorities.trim().length > 10, isActive: false }
                ]}
              />
            </div>
          </div>
          
          {/* Experience Name */}
          <div className="mb-8">
            <label className="fresco-label block mb-2">Experience Being Evaluated</label>
            <input
              type="text"
              value={experienceName}
              onChange={(e) => handleExperienceChange(e.target.value)}
              placeholder="e.g., Mobile checkout flow, Onboarding experience..."
              className="w-full p-4 bg-fresco-light-gray rounded-xl text-fresco-lg border-none focus:ring-2 focus:ring-fresco-black outline-none"
            />
            {TOOLKIT_EXAMPLES.ux_scorecard?.experience && (
              <ContextualExample
                stepLabel="Experience"
                example={TOOLKIT_EXAMPLES.ux_scorecard.experience.example}
                tip={TOOLKIT_EXAMPLES.ux_scorecard.experience.tip}
              />
            )}
          </div>
          
          {/* Score Overview */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            {/* Radar Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-fresco-border dark:border-gray-700 p-6">
              <h3 className="text-fresco-sm font-medium text-fresco-black mb-4 text-center">Score Distribution</h3>
              {criteria.length >= 3 ? (
                <RadarChart />
              ) : (
                <div className="h-[280px] flex items-center justify-center text-fresco-sm text-fresco-graphite-light">
                  Add at least 3 criteria to see the radar chart
                </div>
              )}
            </div>
            
            {/* Overall Score */}
            <div className="bg-gradient-to-br from-fresco-black to-fresco-graphite rounded-2xl p-6 text-white flex flex-col items-center justify-center">
              <span className="text-fresco-sm uppercase tracking-wider text-white/60 mb-4">Overall Score</span>
              <div className={cn("text-[72px] font-bold leading-none", 
                Number(overallScore) >= 8 ? "text-white" :
                Number(overallScore) >= 6 ? "text-white/80" :
                Number(overallScore) >= 4 ? "text-white/60" : "text-white/40"
              )}>
                {overallScore}
              </div>
              <span className="text-fresco-lg text-white/40 mt-2">/ 10</span>
              
              <div className="mt-6 w-full">
                <div className="flex justify-between text-fresco-xs text-white/60 mb-2">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className={cn("h-full rounded-full", getScoreBg(Number(overallScore)))}
                    initial={{ width: 0 }}
                    animate={{ width: `${Number(overallScore) * 10}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Criteria Scoring */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-fresco-lg font-medium text-fresco-black">Evaluation Criteria</h3>
            </div>
            
            <div className="space-y-4">
              {criteria.map((criterion, index) => (
                <motion.div 
                  key={criterion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-900 rounded-xl border-2 border-fresco-border dark:border-gray-700 p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-fresco-base font-medium text-fresco-black">{criterion.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-fresco-2xl font-bold", getScoreColor(criterion.score))}>
                        {criterion.score}
                      </span>
                      <span className="text-fresco-sm text-fresco-graphite-light">/10</span>
                      <button 
                        onClick={() => removeCriterion(criterion.id)}
                        className="p-1 text-fresco-graphite-light hover:text-fresco-graphite transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Score Slider */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={criterion.score}
                      onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value))}
                      className="w-full h-2 bg-fresco-light-gray rounded-full appearance-none cursor-pointer accent-fresco-black"
                    />
                    <div className="flex justify-between text-fresco-xs text-fresco-graphite-light mt-1">
                      <span>0</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <input
                    type="text"
                    value={criterion.notes}
                    onChange={(e) => handleNotesChange(criterion.id, e.target.value)}
                    placeholder="Add notes about this score..."
                    className="w-full p-3 bg-fresco-light-gray rounded-lg text-fresco-sm border-none focus:ring-1 focus:ring-fresco-black outline-none"
                  />
                </motion.div>
              ))}
              
              {/* Add Criterion */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newCriterionName}
                  onChange={(e) => setNewCriterionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCriterion()}
                  placeholder="Add new criterion..."
                  className="flex-1 p-4 bg-fresco-light-gray rounded-xl text-fresco-sm border-none focus:ring-2 focus:ring-fresco-black outline-none"
                />
                <button
                  onClick={addCriterion}
                  disabled={!newCriterionName.trim()}
                  className="fresco-btn fresco-btn-primary fresco-btn-lg disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Priorities */}
          <div className="mb-8">
            <label className="fresco-label block mb-2">Priority Improvements</label>
            <textarea
              value={priorities}
              onChange={(e) => handlePrioritiesChange(e.target.value)}
              placeholder="Based on your evaluation, what should be improved first?"
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
          
                {/* Score Summary */}
                <div className="mb-6 p-4 bg-fresco-light-gray rounded-xl text-center">
                  <div className={cn("text-fresco-4xl font-bold", parseFloat(overallScore) >= 7 ? "text-fresco-black" : parseFloat(overallScore) >= 5 ? "text-fresco-graphite" : "text-fresco-graphite-light")}>{overallScore}</div>
                  <div className="text-fresco-xs text-fresco-graphite-light">Overall Score</div>
                </div>
          
                {/* UX Evaluation */}
                <div className="mb-8">
                  <span className="fresco-label block mb-4">UX Evaluation</span>
                  {aiContent.insights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <BarChart3 className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Score your criteria<br/>then generate analysis</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiContent.insights.map((insight, i) => (
                        <InsightCard key={i} insight={insight} index={i} isNew={true} />
                      ))}
                    </div>
                  )}
                </div>
          
                {/* Overall Assessment - Enhanced Display */}
                {aiContent.sentenceOfTruth ? (
                  <div className="mb-8">
                    <SentenceOfTruthDisplay
                      sentence={aiContent.sentenceOfTruth}
                      toolkitName="UX Scorecard"
                      isLocked={session?.sentenceOfTruth?.isLocked}
                      onLockToggle={() => toggleSentenceLock(sessionId)}
                      onEdit={(val) => setSentenceOfTruth(sessionId, val)}
                    />
                  </div>
                ) : (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Overall Assessment</span>
                    <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                      <p className="text-fresco-sm text-fresco-graphite-light">Generate to reveal your overall assessment</p>
                    </div>
                  </div>
                )}
          
                {/* Priority Fixes */}
                {aiContent.necessaryMoves.length > 0 && (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Priority Fixes</span>
                    <div className="space-y-2">
                      {aiContent.necessaryMoves.map((move, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-lg">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-fresco-xs font-medium text-white",
                            i === 0 ? "bg-fresco-black" : i === 1 ? "bg-fresco-graphite" : "bg-fresco-graphite-mid"
                          )}>
                            {i + 1}
                          </div>
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
                    Export Scorecard
                  </button>
                </div>
          
                {/* Next Toolkit CTA */}
                <NextToolkitCTA 
                  currentToolkit="ux_scorecard"
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
          toolkitType: 'ux_scorecard',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: [
            { label: 'Experience', content: experienceName },
            { label: 'Criteria Scores', content: criteria.map(c => `${c.name}: ${c.score}/10${c.notes ? ` - ${c.notes}` : ''}`).join('\n') },
            { label: 'Overall Score', content: `${Math.round(criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length * 10)}%` },
            { label: 'Priorities', content: priorities },
          ],
          insights: aiContent.insights,
          sentenceOfTruth: aiContent.sentenceOfTruth,
          necessaryMoves: aiContent.necessaryMoves,
          customData: {
            'Scores': criteria.map(c => ({ name: c.name, score: `${c.score}/10`, notes: c.notes || 'N/A' }))
          }
        }}
      />
    </div>
  );
}
