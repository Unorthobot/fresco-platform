'use client';

// FRESCO Toolkit UX Enhancement Components
// Provides intuitive UI elements for all toolkits

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Eye,
  EyeOff,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 1. FLOATING GENERATE BUTTON
// ============================================

interface FloatingGenerateButtonProps {
  isVisible: boolean;
  isGenerating: boolean;
  onClick: () => void;
  label?: string;
}

export function FloatingGenerateButton({ 
  isVisible, 
  isGenerating, 
  onClick, 
  label = 'Generate Insights' 
}: FloatingGenerateButtonProps) {
  return (
    <AnimatePresence>
      {(isVisible || isGenerating) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.button
            onClick={onClick}
            disabled={isGenerating}
            className={cn(
              "relative px-8 py-4 bg-gradient-to-r from-fresco-black to-fresco-graphite text-white rounded-2xl text-fresco-lg font-medium shadow-2xl transition-all flex items-center gap-3 group",
              isGenerating ? "opacity-90 cursor-wait" : "hover:shadow-3xl transition-shadow"
            )}
            animate={!isGenerating ? { 
              boxShadow: [
                '0 10px 40px rgba(0,0,0,0.3)',
                '0 15px 50px rgba(0,0,0,0.4)',
                '0 10px 40px rgba(0,0,0,0.3)'
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {/* Pulse ring - only when not generating */}
            {!isGenerating && (
              <motion.span
                className="absolute inset-0 rounded-2xl bg-fresco-black"
                animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            
            {isGenerating ? (
              <>
                {/* Loading spinner */}
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative z-10">Thinking...</span>
                <motion.div
                  className="flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 bg-white rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform" />
                <span className="relative z-10">{label}</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// 2. PROGRESS INDICATOR
// ============================================

interface ProgressIndicatorProps {
  steps: { label: string; isComplete: boolean; isActive: boolean }[];
  variant?: 'dots' | 'bar' | 'steps';
}

export function ProgressIndicator({ steps, variant = 'dots' }: ProgressIndicatorProps) {
  const completedCount = steps.filter(s => s.isComplete).length;
  const progress = (completedCount / steps.length) * 100;

  if (variant === 'bar') {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-fresco-xs text-fresco-graphite-mid">Progress</span>
          <span className="text-fresco-xs font-medium text-fresco-black">{completedCount}/{steps.length} complete</span>
        </div>
        <div className="h-2 bg-fresco-light-gray rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'steps') {
    return (
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <motion.div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-fresco-xs font-medium transition-all",
                step.isComplete 
                  ? "bg-fresco-black text-white" 
                  : step.isActive 
                    ? "bg-fresco-black text-white"
                    : "bg-fresco-light-gray text-fresco-graphite-mid"
              )}
              animate={step.isComplete ? { scale: [1, 1.1, 1] } : {}}
            >
              {step.isComplete ? <Check className="w-4 h-4" /> : i + 1}
            </motion.div>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 mx-1",
                step.isComplete ? "bg-fresco-black" : "bg-fresco-border-light"
              )} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Default: dots
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-3 h-3 rounded-full transition-all",
            step.isComplete 
              ? "bg-fresco-black" 
              : step.isActive 
                ? "bg-fresco-black"
                : "bg-fresco-border"
          )}
          animate={step.isActive && !step.isComplete ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 1, repeat: step.isActive && !step.isComplete ? Infinity : 0 }}
          title={step.label}
        />
      ))}
      <span className="ml-2 text-fresco-xs text-fresco-graphite-mid">
        {completedCount}/{steps.length}
      </span>
    </div>
  );
}

// ============================================
// 3. SMART PROMPT / INPUT HINT
// ============================================

interface SmartPromptProps {
  value: string;
  minLength?: number;
  goodLength?: number;
  fieldName?: string;
}

export function SmartPrompt({ value, minLength = 20, goodLength = 100, fieldName = 'this field' }: SmartPromptProps) {
  const length = value?.trim().length || 0;
  
  if (length === 0) return null;
  
  if (length < minLength) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mt-2 text-fresco-xs text-fresco-graphite-mid"
      >
        <AlertCircle className="w-3 h-3" />
        <span>Add a bit more detail for better insights</span>
      </motion.div>
    );
  }
  
  if (length >= goodLength) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mt-2 text-fresco-xs text-fresco-graphite"
      >
        <CheckCircle2 className="w-3 h-3" />
        <span>Great depth! This will generate rich insights</span>
      </motion.div>
    );
  }
  
  return null;
}

// ============================================
// 4. COLLAPSIBLE OUTPUT PANEL
// ============================================

interface CollapsibleOutputPanelProps {
  hasContent: boolean;
  children: React.ReactNode;
  title?: string;
}

export function CollapsibleOutputPanel({ hasContent, children, title = 'Output' }: CollapsibleOutputPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [wasExpanded, setWasExpanded] = useState(false);

  // Auto-expand when content appears for the first time
  useEffect(() => {
    if (hasContent && !wasExpanded) {
      setIsExpanded(true);
      setWasExpanded(true);
    }
  }, [hasContent, wasExpanded]);

  return (
    <div className="relative">
      {/* Toggle button when collapsed */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => setIsExpanded(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-fresco-black text-white px-3 py-6 rounded-l-xl shadow-lg hover:bg-fresco-graphite transition-colors"
          >
            <Eye className="w-5 h-5 mb-2" />
            <span className="text-fresco-xs font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
              {title}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-l border-fresco-border-light bg-fresco-off-white overflow-hidden"
          >
            <div className="w-[360px] h-full overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-fresco-lg font-medium text-fresco-black">{title}</h2>
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 text-fresco-graphite-light hover:text-fresco-black rounded transition-colors"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 5. WIZARD MODE CONTROLS
// ============================================

interface WizardModeProps {
  isWizardMode: boolean;
  onToggle: () => void;
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

export function WizardModeControls({ 
  isWizardMode, 
  onToggle, 
  currentStep, 
  totalSteps, 
  onPrevious, 
  onNext,
  canGoNext 
}: WizardModeProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onToggle}
        className={cn(
          "px-3 py-1.5 rounded-lg text-fresco-xs font-medium transition-all",
          isWizardMode 
            ? "bg-fresco-black text-white" 
            : "bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border transition-colors"
        )}
      >
        {isWizardMode ? 'Exit Focus Mode' : 'Focus Mode'}
      </button>
      
      {isWizardMode && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <button
            onClick={onPrevious}
            disabled={currentStep === 1}
            className="p-2 rounded-lg bg-fresco-light-gray hover:bg-fresco-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-fresco-sm text-fresco-graphite-mid">
            Step {currentStep} of {totalSteps}
          </span>
          <button
            onClick={onNext}
            disabled={currentStep === totalSteps || !canGoNext}
            className="p-2 rounded-lg bg-fresco-light-gray hover:bg-fresco-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// 6. INPUT QUALITY INDICATOR
// ============================================

interface InputQualityIndicatorProps {
  value: string;
  minLength?: number;
  goodLength?: number;
  maxLength?: number;
}

export function InputQualityIndicator({ 
  value, 
  minLength = 20, 
  goodLength = 80, 
  maxLength = 500 
}: InputQualityIndicatorProps) {
  const length = value?.trim().length || 0;
  
  const getQuality = () => {
    if (length === 0) return { level: 'empty', color: 'bg-gray-200', width: 0 };
    if (length < minLength) return { level: 'needs-more', color: 'bg-fresco-graphite-light', width: 25 };
    if (length < goodLength) return { level: 'good', color: 'bg-fresco-graphite-mid', width: 60 };
    if (length <= maxLength) return { level: 'great', color: 'bg-fresco-black', width: 100 };
    return { level: 'too-long', color: 'bg-red-400', width: 100 };
  };

  const quality = getQuality();

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", quality.color)}
          initial={{ width: 0 }}
          animate={{ width: `${quality.width}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {quality.level === 'great' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-fresco-black"
        >
          <CheckCircle2 className="w-4 h-4" />
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// 7. CONTEXTUAL EXAMPLE
// ============================================

interface ContextualExampleProps {
  stepLabel: string;
  example: string;
  tip?: string;
}

export function ContextualExample({ stepLabel, example, tip }: ContextualExampleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-fresco-xs text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors"
      >
        <Lightbulb className="w-3 h-3" />
        <span>{isOpen ? 'Hide example' : 'See an example'}</span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-fresco-light-gray rounded-xl border border-fresco-border">
              <p className="text-fresco-xs font-medium text-fresco-black mb-2">Example for {stepLabel}:</p>
              <p className="text-fresco-sm text-fresco-graphite italic">"{example}"</p>
              {tip && (
                <p className="mt-2 text-fresco-xs text-fresco-graphite-mid">💡 {tip}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 8. COMPLETION CELEBRATION
// ============================================

interface CompletionCelebrationProps {
  isVisible: boolean;
  onClose: () => void;
  message?: string;
}

export function CompletionCelebration({ isVisible, onClose, message = "Insights Generated!" }: CompletionCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    const colors = ['#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999'];

    // Create confetti particles
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();

        // Remove particles that are off screen
        if (p.y > canvas.height + 50) {
          particles.splice(i, 1);
        }
      });

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    // Auto close after animation
    const timeout = setTimeout(() => {
      onClose();
    }, 3000);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timeout);
    };
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Full screen overlay with flexbox centering */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[100] flex items-center justify-center"
            onClick={onClose}
          >
            {/* Celebration card - stop propagation so clicking card doesn't close */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl px-12 py-8 text-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-fresco-black mb-2">{message}</h2>
              <p className="text-fresco-graphite-mid">Check the output panel for your results</p>
            </motion.div>
          </motion.div>
          <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[101]"
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// COMBINED TOOLKIT STEP WRAPPER
// ============================================

interface ToolkitStepProps {
  stepNumber: number;
  label: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  example?: string;
  exampleTip?: string;
  isActive?: boolean;
  isComplete?: boolean;
  isWizardMode?: boolean;
  minLength?: number;
  goodLength?: number;
  rows?: number;
  children?: React.ReactNode;
}

export function ToolkitStep({
  stepNumber,
  label,
  prompt,
  value,
  onChange,
  placeholder,
  example,
  exampleTip,
  isActive = true,
  isComplete = false,
  isWizardMode = false,
  minLength = 20,
  goodLength = 100,
  rows = 4,
  children
}: ToolkitStepProps) {
  // In wizard mode, only show if active
  if (isWizardMode && !isActive) return null;

  return (
    <motion.div
      initial={isWizardMode ? { opacity: 0, x: 50 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={isWizardMode ? { opacity: 0, x: -50 } : { opacity: 0, y: -20 }}
      className={cn(
        "rounded-2xl border-2 p-6 transition-all",
        isComplete 
          ? "border-fresco-black/30 bg-fresco-light-gray" 
          : isActive 
            ? "border-fresco-black bg-white dark:bg-gray-900 shadow-lg"
            : "border-fresco-border bg-white dark:bg-gray-900"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-fresco-sm font-medium",
            isComplete 
              ? "bg-fresco-black text-white" 
              : isActive 
                ? "bg-fresco-black text-white"
                : "bg-fresco-light-gray text-fresco-graphite-mid"
          )}>
            {isComplete ? <Check className="w-4 h-4" /> : stepNumber}
          </div>
          <div>
            <h3 className="text-fresco-lg font-medium text-fresco-black">{label}</h3>
          </div>
        </div>
        {isComplete && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2 py-1 bg-fresco-light-gray text-fresco-black text-fresco-xs font-medium rounded-full"
          >
            Complete
          </motion.span>
        )}
      </div>

      {/* Prompt */}
      <p className="text-fresco-sm text-fresco-graphite-mid mb-4">{prompt}</p>

      {/* Input or custom children */}
      {children || (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "w-full p-4 rounded-xl text-fresco-base border-2 focus:ring-0 outline-none resize-none transition-colors",
            isComplete
              ? "bg-white border-fresco-border focus:border-fresco-black"
              : "bg-fresco-light-gray border-transparent focus:border-fresco-black"
          )}
        />
      )}

      {/* Quality indicator */}
      {!children && <InputQualityIndicator value={value} minLength={minLength} goodLength={goodLength} />}

      {/* Smart prompt hint */}
      {!children && <SmartPrompt value={value} minLength={minLength} goodLength={goodLength} />}

      {/* Example */}
      {example && (
        <ContextualExample 
          stepLabel={label} 
          example={example}
          tip={exampleTip}
        />
      )}
    </motion.div>
  );
}

// ============================================
// 9. CLARITY SCORE
// ============================================

interface ClarityScoreProps {
  inputs: { label: string; value: string; weight?: number }[];
  hasAIOutput: boolean;
  hasSentenceOfTruth: boolean;
}

export function ClarityScore({ inputs, hasAIOutput, hasSentenceOfTruth }: ClarityScoreProps) {
  // Calculate clarity score based on multiple factors
  const calculateScore = () => {
    let score = 0;
    const totalInputs = inputs.length || 1;
    
    // Input completeness (40 points max)
    // Score each input proportionally
    const pointsPerInput = 40 / totalInputs;
    inputs.forEach(input => {
      const weight = input.weight || 1;
      const length = input.value?.trim().length || 0;
      if (length > 100) {
        score += pointsPerInput * weight;
      } else if (length > 50) {
        score += (pointsPerInput * 0.7) * weight;
      } else if (length > 20) {
        score += (pointsPerInput * 0.4) * weight;
      } else if (length > 0) {
        score += (pointsPerInput * 0.1) * weight;
      }
    });
    
    // Cap input score at 40
    score = Math.min(40, score);
    
    // AI analysis completed (30 points)
    if (hasAIOutput) score += 30;
    
    // Sentence of Truth defined (30 points)
    if (hasSentenceOfTruth) score += 30;
    
    return Math.min(100, Math.round(score));
  };
  
  const score = calculateScore();
  
  // Calculate individual component status for display
  const inputsComplete = inputs.filter(i => (i.value?.trim().length || 0) > 50).length;
  const inputsPartial = inputs.filter(i => {
    const len = i.value?.trim().length || 0;
    return len > 0 && len <= 50;
  }).length;
  
  const getScoreLabel = () => {
    if (score >= 80) return 'High Clarity';
    if (score >= 60) return 'Good Progress';
    if (score >= 40) return 'Developing';
    if (score >= 20) return 'Early Stage';
    return 'Just Starting';
  };
  
  const getScoreColor = () => {
    if (score >= 80) return 'text-fresco-black';
    if (score >= 60) return 'text-fresco-graphite';
    if (score >= 40) return 'text-fresco-graphite-mid';
    return 'text-fresco-graphite-light';
  };

  return (
    <div className="p-4 bg-fresco-light-gray rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wider">Clarity Score</span>
        <span className={cn("text-fresco-2xl font-bold", getScoreColor())}>{score}</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-white dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-fresco-black rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-fresco-xs text-fresco-graphite-light">{getScoreLabel()}</span>
        <div className="flex items-center gap-3 text-fresco-xs text-fresco-graphite-light">
          <span className={inputs.some(i => i.value.trim().length > 50) ? 'text-fresco-black' : ''}>
            ● Inputs
          </span>
          <span className={hasAIOutput ? 'text-fresco-black' : ''}>
            ● Analysis
          </span>
          <span className={hasSentenceOfTruth ? 'text-fresco-black' : ''}>
            ● Truth
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 10. DYNAMIC PROMPT (lens-aware)
// ============================================

interface DynamicPromptProps {
  basePrompt: string;
  lensHint?: string;
  lens: string;
}

export function DynamicPrompt({ basePrompt, lensHint, lens }: DynamicPromptProps) {
  if (!lensHint || lens === 'automatic') {
    return <p className="text-fresco-sm text-fresco-graphite-mid mb-3">{basePrompt}</p>;
  }
  
  return (
    <div className="mb-3">
      <p className="text-fresco-sm text-fresco-graphite-mid">{basePrompt}</p>
      <motion.p 
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-fresco-sm text-fresco-black mt-2 p-2 bg-fresco-light-gray rounded-lg flex items-start gap-2"
      >
        <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-fresco-graphite" />
        <span><strong className="capitalize">{lens.replace('_', ' ')} lens:</strong> {lensHint}</span>
      </motion.p>
    </div>
  );
}
