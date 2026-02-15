'use client';

// FRESCO Performance Grid™ - Visual Performance Tracking
// Data table with traffic light indicators and trend visualization

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
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  Target,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { ThinkingLensHint } from '@/components/ui/ThinkingLensHint';
import { ExportModal } from '@/components/ui/ExportModal';
import { ComparisonBars } from '@/components/ui/VisualOutputs';
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

interface PerformanceGridSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

interface Metric {
  id: string;
  name: string;
  target: string;
  actual: string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
}

export function PerformanceGridSession({ sessionId, workspaceId, onBack, onStartToolkit }: PerformanceGridSessionProps) {
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
  const toolkit = TOOLKITS.performance_grid;
  
  const [subject, setSubject] = useState('');
  const [metrics, setMetrics] = useState<Metric[]>([
    { id: '1', name: '', target: '', actual: '', unit: '', trend: 'flat' },
  ]);
  const [actions, setActions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<{ insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }>({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
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
      
      if (step1?.content) setSubject(step1.content);
      if (step2?.content) {
        try {
          const parsed = JSON.parse(step2.content);
          if (Array.isArray(parsed) && parsed.length > 0) setMetrics(parsed);
        } catch {}
      }
      if (step4?.content) setActions(step4.content);
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

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    debouncedSave(1, value);
  };

  const handleMetricsChange = (newMetrics: Metric[]) => {
    setMetrics(newMetrics);
    debouncedSave(2, JSON.stringify(newMetrics));
    // Also save results as step 3
    const resultsText = newMetrics
      .filter(m => m.name && m.actual)
      .map(m => `${m.name}: ${m.actual}${m.unit} (target: ${m.target}${m.unit}) - ${m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}`)
      .join('\n');
    debouncedSave(3, resultsText);
  };

  const handleActionsChange = (value: string) => {
    setActions(value);
    debouncedSave(4, value);
  };

  const addMetric = () => {
    const newMetric: Metric = {
      id: `metric-${Date.now()}`,
      name: '',
      target: '',
      actual: '',
      unit: '',
      trend: 'flat'
    };
    handleMetricsChange([...metrics, newMetric]);
  };

  const updateMetric = (id: string, updates: Partial<Metric>) => {
    const updated = metrics.map(m => m.id === id ? { ...m, ...updates } : m);
    handleMetricsChange(updated);
  };

  const removeMetric = (id: string) => {
    if (metrics.length <= 1) return;
    handleMetricsChange(metrics.filter(m => m.id !== id));
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

  // Calculate performance status
  const getPerformanceStatus = (metric: Metric) => {
    if (!metric.target || !metric.actual) return 'neutral';
    const target = parseFloat(metric.target);
    const actual = parseFloat(metric.actual);
    if (isNaN(target) || isNaN(actual)) return 'neutral';
    
    const ratio = actual / target;
    if (ratio >= 1) return 'good';
    if (ratio >= 0.8) return 'warning';
    return 'bad';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-fresco-black';
      case 'warning': return 'bg-fresco-graphite';
      case 'bad': return 'bg-fresco-graphite-light';
      default: return 'bg-gray-300';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'good': return 'bg-fresco-light-gray';
      case 'warning': return 'bg-fresco-off-white';
      case 'bad': return 'bg-white dark:bg-gray-800';
      default: return 'bg-gray-50';
    }
  };

  // Generate AI content
  const generateContent = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const metricsText = metrics
        .filter(m => m.name)
        .map(m => `${m.name}: Actual ${m.actual}${m.unit} vs Target ${m.target}${m.unit} (${getPerformanceStatus(m)}, trend: ${m.trend})`)
        .join('\n');
      const workspaceContext = getWorkspaceContext();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'performance_grid',
          toolkitName: toolkit.name,
          steps: [
            { label: 'SUBJECT', content: subject },
            { label: 'METRICS', content: metricsText },
            { label: 'RESULTS', content: metricsText },
            { label: 'ACTIONS', content: actions },
          ],
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'Performance Analysis', secondary: 'Key Finding', action: 'Optimisation Actions' },
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

  // Calculate summary stats
  const validMetrics = metrics.filter(m => m.target && m.actual);
  const goodCount = validMetrics.filter(m => getPerformanceStatus(m) === 'good').length;
  const warningCount = validMetrics.filter(m => getPerformanceStatus(m) === 'warning').length;
  const badCount = validMetrics.filter(m => getPerformanceStatus(m) === 'bad').length;
  const overallScore = validMetrics.length > 0 
    ? Math.round((goodCount * 100 + warningCount * 50) / validMetrics.length)
    : 0;

  const hasContent = subject.trim().length > 0 || metrics.some(m => m.name.trim().length > 0);
  const completedSections = [
    subject.trim().length > 5,
    metrics.filter(m => m.name.trim() && m.target && m.actual).length >= 1,
    actions.trim().length > 10
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
        label="Analyse Performance"
      />
      
      {/* Main Column */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto px-8 py-10">
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
                <BarChart2 className="w-5 h-5 text-white" />
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
                  { label: 'Subject', isComplete: subject.trim().length > 5, isActive: true },
                  { label: 'Metrics', isComplete: metrics.filter(m => m.name.trim() && m.target && m.actual).length >= 1, isActive: false },
                  { label: 'Actions', isComplete: actions.trim().length > 10, isActive: false }
                ]}
              />
            </div>
          </div>
          
          {/* Subject */}
          <div className="mb-8">
            <label className="fresco-label block mb-2">What are you measuring?</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              placeholder="e.g., Q4 Marketing Campaign, Product Launch, Sales Performance..."
              className="w-full p-4 bg-fresco-light-gray rounded-xl text-fresco-lg border-none focus:ring-2 focus:ring-fresco-black outline-none"
            />
            {TOOLKIT_EXAMPLES.performance_grid?.subject && (
              <ContextualExample
                stepLabel="Subject"
                example={TOOLKIT_EXAMPLES.performance_grid.subject.example}
                tip={TOOLKIT_EXAMPLES.performance_grid.subject.tip}
              />
            )}
          </div>
          
          {/* Performance Summary */}
          {validMetrics.length > 0 && (
            <div className="mb-8 grid grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-fresco-black to-fresco-graphite rounded-xl text-white text-center">
                <div className="text-fresco-4xl font-bold">{overallScore}%</div>
                <div className="text-fresco-xs text-white/60">Overall Score</div>
              </div>
              <div className="p-4 bg-fresco-light-gray rounded-xl text-center">
                <div className="text-fresco-4xl font-bold text-fresco-black">{goodCount}</div>
                <div className="text-fresco-xs text-fresco-graphite-light">On Target</div>
              </div>
              <div className="p-4 bg-fresco-off-white rounded-xl text-center">
                <div className="text-fresco-4xl font-bold text-fresco-graphite">{warningCount}</div>
                <div className="text-fresco-xs text-fresco-graphite-light">At Risk</div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-xl text-center">
                <div className="text-fresco-4xl font-bold text-fresco-graphite-light">{badCount}</div>
                <div className="text-fresco-xs text-fresco-graphite-light">Below Target</div>
              </div>
            </div>
          )}
          
          {/* Metrics Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-fresco-lg font-medium text-fresco-black">Metrics</h3>
              <button
                onClick={addMetric}
                className="flex items-center gap-2 px-4 py-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black border border-fresco-border rounded-lg hover:border-fresco-black transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Metric
              </button>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-fresco-light-gray rounded-t-xl text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wider">
              <div className="col-span-1">Status</div>
              <div className="col-span-3">Metric</div>
              <div className="col-span-2">Target</div>
              <div className="col-span-2">Actual</div>
              <div className="col-span-1">Unit</div>
              <div className="col-span-2">Trend</div>
              <div className="col-span-1"></div>
            </div>
            
            {/* Table Rows */}
            <div className="border-2 border-t-0 border-fresco-border rounded-b-xl overflow-hidden">
              {metrics.map((metric, index) => {
                const status = getPerformanceStatus(metric);
                
                return (
                  <motion.div
                    key={metric.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "grid grid-cols-12 gap-3 px-4 py-3 items-center border-b border-fresco-border-light last:border-b-0 group",
                      getStatusBg(status)
                    )}
                  >
                    {/* Status Indicator */}
                    <div className="col-span-1">
                      <div className={cn("w-4 h-4 rounded-full", getStatusColor(status))} />
                    </div>
                    
                    {/* Metric Name */}
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={metric.name}
                        onChange={(e) => updateMetric(metric.id, { name: e.target.value })}
                        placeholder="Metric name..."
                        className="w-full bg-transparent border-none focus:outline-none text-fresco-sm text-fresco-black font-medium"
                      />
                    </div>
                    
                    {/* Target */}
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={metric.target}
                        onChange={(e) => updateMetric(metric.id, { target: e.target.value })}
                        placeholder="Target"
                        className="w-full bg-white/50 rounded-lg px-3 py-1.5 text-fresco-sm border border-fresco-border focus:outline-none focus:ring-1 focus:ring-fresco-black"
                      />
                    </div>
                    
                    {/* Actual */}
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={metric.actual}
                        onChange={(e) => updateMetric(metric.id, { actual: e.target.value })}
                        placeholder="Actual"
                        className="w-full bg-white/50 rounded-lg px-3 py-1.5 text-fresco-sm border border-fresco-border focus:outline-none focus:ring-1 focus:ring-fresco-black"
                      />
                    </div>
                    
                    {/* Unit */}
                    <div className="col-span-1">
                      <input
                        type="text"
                        value={metric.unit}
                        onChange={(e) => updateMetric(metric.id, { unit: e.target.value })}
                        placeholder="%"
                        className="w-full bg-transparent border-none focus:outline-none text-fresco-sm text-fresco-graphite-mid text-center"
                      />
                    </div>
                    
                    {/* Trend */}
                    <div className="col-span-2 flex gap-1">
                      {(['up', 'flat', 'down'] as const).map((trend) => {
                        const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
                        const color = trend === 'up' ? 'text-fresco-black bg-fresco-light-gray' : trend === 'down' ? 'text-fresco-graphite-light bg-fresco-off-white' : 'text-gray-600 bg-gray-100';
                        
                        return (
                          <button
                            key={trend}
                            onClick={() => updateMetric(metric.id, { trend })}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              metric.trend === trend ? color : "text-fresco-graphite-light hover:bg-fresco-light-gray"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Delete */}
                    <div className="col-span-1 text-right">
                      {metrics.length > 1 && (
                        <button
                          onClick={() => removeMetric(metric.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-fresco-graphite-light hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* Actions */}
          <div className="mb-8">
            <label className="fresco-label block mb-2">Optimisation Actions</label>
            <textarea
              value={actions}
              onChange={(e) => handleActionsChange(e.target.value)}
              placeholder="Based on results, what actions should be taken to improve performance?"
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
          
                {/* Performance Score */}
                <div className="mb-6 p-4 bg-gradient-to-br from-fresco-black to-fresco-graphite rounded-xl text-white text-center">
                  <div className={cn(
                    "text-fresco-5xl font-bold",
                    overallScore >= 80 ? "text-white" : overallScore >= 60 ? "text-white/80" : "text-white/60"
                  )}>
                    {overallScore}%
                  </div>
                  <div className="text-fresco-xs text-white/60">Performance Score</div>
                </div>
          
                {/* Performance Analysis */}
                <div className="mb-8">
                  <span className="fresco-label block mb-4">Performance Analysis</span>
                  {aiContent.insights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <BarChart2 className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Add your metrics<br/>then analyse</p>
              </div>
            ) : (
              <div className="space-y-3">
                {aiContent.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} index={i} isNew={true} />
                ))}
              </div>
            )}
          </div>
          
          {/* Key Finding - Enhanced Display */}
          {aiContent.sentenceOfTruth ? (
            <div className="mb-8">
              <SentenceOfTruthDisplay
                sentence={aiContent.sentenceOfTruth}
                toolkitName="Performance Grid"
                isLocked={session?.sentenceOfTruth?.isLocked}
                onLockToggle={() => toggleSentenceLock(sessionId)}
                onEdit={(val) => setSentenceOfTruth(sessionId, val)}
              />
            </div>
          ) : (
            <div className="mb-8">
              <span className="fresco-label block mb-4">Key Finding</span>
              <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                <p className="text-fresco-sm text-fresco-graphite-light">Generate to reveal your key finding</p>
              </div>
            </div>
          )}
          
          {/* Optimisation Actions */}
          {aiContent.necessaryMoves.length > 0 && (
            <div className="mb-8">
              <span className="fresco-label block mb-4">Optimisation Actions</span>
              <div className="space-y-2">
                {aiContent.necessaryMoves.map((move, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-fresco-black flex-shrink-0 mt-0.5" />
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
                    Export Report
                  </button>
                </div>
          
                {/* Journey Complete CTA */}
                <NextToolkitCTA 
                  currentToolkit="performance_grid"
                  isReady={aiContent.insights.length > 0 && !!aiContent.sentenceOfTruth && aiContent.necessaryMoves.length > 0}
                  onStartToolkit={onStartToolkit}
                  onViewWorkspace={onBack}
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
              <span className="w-5 h-5 bg-fresco-light-gray0 rounded-full text-fresco-xs flex items-center justify-center">
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
          toolkitType: 'performance_grid',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: [
            { label: 'Subject', content: subject },
            { label: 'Metrics', content: metrics.filter(m => m.name).map(m => `${m.name}: ${m.actual}/${m.target} ${m.unit} (${m.trend})`).join('\n') },
            { label: 'Actions', content: actions },
          ],
          insights: aiContent.insights,
          sentenceOfTruth: aiContent.sentenceOfTruth,
          necessaryMoves: aiContent.necessaryMoves,
          customData: {
            'Performance Metrics': metrics.filter(m => m.name).map(m => ({
              name: m.name,
              target: `${m.target} ${m.unit}`,
              actual: `${m.actual} ${m.unit}`,
              trend: m.trend
            }))
          }
        }}
      />
    </div>
  );
}
