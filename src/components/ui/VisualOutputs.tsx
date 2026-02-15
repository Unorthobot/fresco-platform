'use client';

// FRESCO Platform - Visual Output Components
// Reusable visualization components for toolkit outputs

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================
// PROGRESS RING
// ============================================

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function ProgressRing({ 
  value, 
  size = 120, 
  strokeWidth = 8, 
  label,
  sublabel,
  color = '#000'
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{Math.round(value)}%</span>
        {label && <span className="text-xs text-gray-500">{label}</span>}
        {sublabel && <span className="text-fresco-xs text-gray-400">{sublabel}</span>}
      </div>
    </div>
  );
}

// ============================================
// RADAR CHART
// ============================================

interface RadarChartProps {
  data: { label: string; value: number }[]; // values 0-10
  size?: number;
  color?: string;
}

export function RadarChart({ data, size = 200, color = '#000' }: RadarChartProps) {
  if (data.length < 3) return null;

  const center = size / 2;
  const maxRadius = (size - 40) / 2;
  const angleStep = (2 * Math.PI) / data.length;
  const levels = 5;

  // Generate level circles
  const levelCircles = Array.from({ length: levels }, (_, i) => {
    const r = (maxRadius / levels) * (i + 1);
    return (
      <circle
        key={i}
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={1}
      />
    );
  });

  // Generate axis lines and labels
  const axes = data.map((item, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const x = center + Math.cos(angle) * maxRadius;
    const y = center + Math.sin(angle) * maxRadius;
    const labelX = center + Math.cos(angle) * (maxRadius + 20);
    const labelY = center + Math.sin(angle) * (maxRadius + 20);

    return (
      <g key={i}>
        <line
          x1={center}
          y1={center}
          x2={x}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-fresco-xs fill-gray-500"
        >
          {item.label.length > 8 ? item.label.slice(0, 8) + '…' : item.label}
        </text>
      </g>
    );
  });

  // Generate data polygon
  const points = data.map((item, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const r = (item.value / 10) * maxRadius;
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={size} height={size} className="mx-auto">
      {levelCircles}
      {axes}
      <motion.polygon
        points={points}
        fill={`${color}20`}
        stroke={color}
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ transformOrigin: 'center' }}
      />
      {/* Data points */}
      {data.map((item, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (item.value / 10) * maxRadius;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        return (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={4}
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          />
        );
      })}
    </svg>
  );
}

// ============================================
// FLOW DIAGRAM
// ============================================

interface FlowStep {
  label: string;
  hasFriction?: boolean;
  frictionNote?: string;
}

interface FlowDiagramProps {
  steps: FlowStep[];
  startLabel?: string;
  endLabel?: string;
}

export function FlowDiagram({ steps, startLabel = 'Start', endLabel = 'End' }: FlowDiagramProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {/* Start node */}
      <div className="w-16 h-8 rounded-full bg-fresco-black text-white text-xs flex items-center justify-center font-medium">
        {startLabel}
      </div>
      
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col items-center">
          {/* Connector */}
          <div className={cn(
            "w-0.5 h-4",
            step.hasFriction ? "bg-red-300" : "bg-gray-300"
          )} />
          
          {/* Step node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "w-full max-w-[140px] px-3 py-2 rounded-lg text-xs text-center border-2",
              step.hasFriction 
                ? "bg-red-50 border-red-300 text-red-700" 
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            )}
          >
            {step.label || `Step ${i + 1}`}
            {step.hasFriction && step.frictionNote && (
              <div className="mt-1 text-fresco-xs text-red-500">⚠ {step.frictionNote}</div>
            )}
          </motion.div>
        </div>
      ))}
      
      {/* End connector and node */}
      <div className="w-0.5 h-4 bg-gray-300" />
      <div className="w-16 h-8 rounded-full bg-fresco-graphite text-white text-xs flex items-center justify-center font-medium">
        {endLabel}
      </div>
    </div>
  );
}

// ============================================
// COMPARISON BARS
// ============================================

interface ComparisonBar {
  label: string;
  value: number; // 0-100
  color?: string;
}

interface ComparisonBarsProps {
  bars: ComparisonBar[];
  showValues?: boolean;
}

export function ComparisonBars({ bars, showValues = true }: ComparisonBarsProps) {
  const maxValue = Math.max(...bars.map(b => b.value), 1);

  return (
    <div className="space-y-3">
      {bars.map((bar, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 truncate">{bar.label}</span>
            {showValues && <span className="text-gray-500 font-medium">{bar.value}</span>}
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: bar.color || '#000' }}
              initial={{ width: 0 }}
              animate={{ width: `${(bar.value / maxValue) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// BELIEF MAP (Node visualization)
// ============================================

interface BeliefNode {
  id: string;
  content: string;
  type: 'assumption' | 'fact' | 'opinion';
  connections: string[];
}

interface BeliefMapProps {
  beliefs: BeliefNode[];
  compact?: boolean;
}

const BELIEF_COLORS = {
  assumption: '#f59e0b',
  fact: '#22c55e',
  opinion: '#a855f7',
};

export function BeliefMap({ beliefs, compact = false }: BeliefMapProps) {
  if (beliefs.length === 0) return null;

  const size = compact ? 160 : 240;
  const center = size / 2;
  const radius = (size - 60) / 2;

  // Position nodes in a circle
  const nodePositions = beliefs.map((_, i) => {
    const angle = (2 * Math.PI * i) / beliefs.length - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Draw connections */}
      {beliefs.map((belief, i) => {
        const from = nodePositions[i];
        return belief.connections.map((connId) => {
          const connIndex = beliefs.findIndex(b => b.id === connId);
          if (connIndex === -1) return null;
          const to = nodePositions[connIndex];
          return (
            <motion.line
              key={`${belief.id}-${connId}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#d1d5db"
              strokeWidth={1.5}
              strokeDasharray="4,2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
          );
        });
      })}
      
      {/* Draw nodes */}
      {beliefs.map((belief, i) => {
        const pos = nodePositions[i];
        const color = BELIEF_COLORS[belief.type];
        return (
          <g key={belief.id}>
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={compact ? 12 : 18}
              fill={`${color}20`}
              stroke={color}
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
            />
            {!compact && (
              <text
                x={pos.x}
                y={pos.y + 30}
                textAnchor="middle"
                className="text-[9px] fill-gray-500"
              >
                {belief.content.slice(0, 12)}...
              </text>
            )}
          </g>
        );
      })}
      
      {/* Legend */}
      {!compact && (
        <g transform={`translate(10, ${size - 40})`}>
          {Object.entries(BELIEF_COLORS).map(([type, color], i) => (
            <g key={type} transform={`translate(${i * 55}, 0)`}>
              <circle cx={6} cy={6} r={5} fill={color} />
              <text x={14} y={9} className="text-[8px] fill-gray-500 capitalize">{type}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

// ============================================
// PROS/CONS BALANCE
// ============================================

interface ProsConsBalanceProps {
  pros: number;
  cons: number;
}

export function ProsConsBalance({ pros, cons }: ProsConsBalanceProps) {
  const total = pros + cons || 1;
  const prosPercent = (pros / total) * 100;
  const consPercent = (cons / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-fresco-black font-medium">Pros ({pros})</span>
        <span className="text-red-600 font-medium">Cons ({cons})</span>
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
        <motion.div
          className="h-full bg-fresco-black"
          initial={{ width: 0 }}
          animate={{ width: `${prosPercent}%` }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="h-full bg-red-500"
          initial={{ width: 0 }}
          animate={{ width: `${consPercent}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>
      <div className="text-center text-xs text-gray-500">
        {prosPercent > consPercent ? 'Leaning positive' : prosPercent < consPercent ? 'Leaning negative' : 'Balanced'}
      </div>
    </div>
  );
}

// ============================================
// INSIGHT STACK VISUALIZATION
// ============================================

interface InsightStackVizProps {
  completedSteps: number;
  totalSteps: number;
  insights: number;
}

export function InsightStackViz({ completedSteps, totalSteps, insights }: InsightStackVizProps) {
  return (
    <div className="flex items-end justify-center gap-2 h-24">
      {Array.from({ length: totalSteps }, (_, i) => {
        const isComplete = i < completedSteps;
        const height = 20 + (i * 15);
        return (
          <motion.div
            key={i}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "w-8 rounded-t-lg",
              isComplete ? "bg-fresco-black" : "bg-gray-200"
            )}
            style={{ height }}
          />
        );
      })}
    </div>
  );
}

// ============================================
// JOURNEY PROGRESS
// ============================================

interface JourneyProgressProps {
  currentPhase: 'investigate' | 'innovate' | 'validate';
  investigateProgress: number; // 0-100
  innovateProgress: number;
  validateProgress: number;
}

export function JourneyProgress({ 
  currentPhase, 
  investigateProgress, 
  innovateProgress, 
  validateProgress 
}: JourneyProgressProps) {
  const phases = [
    { id: 'investigate', label: 'Investigate', progress: investigateProgress, color: '#000' },
    { id: 'innovate', label: 'Innovate', progress: innovateProgress, color: '#3b82f6' },
    { id: 'validate', label: 'Validate', progress: validateProgress, color: '#22c55e' },
  ];

  return (
    <div className="flex items-center gap-2">
      {phases.map((phase, i) => (
        <div key={phase.id} className="flex items-center">
          <div className="relative">
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2",
                currentPhase === phase.id 
                  ? "bg-black text-white border-black" 
                  : phase.progress === 100 
                    ? "bg-fresco-black text-white border-fresco-black"
                    : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600"
              )}
            >
              {phase.progress === 100 ? '✓' : i + 1}
            </div>
            {phase.progress > 0 && phase.progress < 100 && (
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke={phase.color}
                  strokeWidth="3"
                  strokeDasharray={`${phase.progress * 0.88} 100`}
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
          {i < phases.length - 1 && (
            <div className={cn(
              "w-8 h-0.5 mx-1",
              phases[i].progress === 100 ? "bg-fresco-black" : "bg-gray-200"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
