'use client';

import { motion } from 'framer-motion';
import { 
  Layers, Lightbulb, Target, Compass, FileText, 
  Plus, ArrowRight, Sparkles, Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  variant: 'workspace' | 'session' | 'insights' | 'archive';
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const CONTENT = {
  workspace: {
    icon: Layers,
    title: "Your thinking journey begins here",
    description: "Create your first workspace to start exploring ideas, building insights, and finding clarity.",
    illustration: "🧭",
    tips: [
      "Each workspace is a container for related thinking",
      "Use different workspaces for different projects or problems",
      "Your insights will connect and build over time"
    ]
  },
  session: {
    icon: Lightbulb,
    title: "Ready to think?",
    description: "Start a session with any toolkit to begin extracting insights from your thoughts.",
    illustration: "💡",
    tips: [
      "Begin with Insight Stack to gather initial thoughts",
      "Each toolkit builds on the previous one",
      "There's no wrong place to start"
    ]
  },
  insights: {
    icon: Sparkles,
    title: "Insights await discovery",
    description: "Complete the steps above and generate to uncover the patterns in your thinking.",
    illustration: "✨",
    tips: [
      "More detail leads to richer insights",
      "Don't overthink - capture what comes to mind",
      "You can always refine later"
    ]
  },
  archive: {
    icon: FileText,
    title: "Your archive is empty",
    description: "Completed sessions will appear here. Start thinking to build your knowledge base.",
    illustration: "📚",
    tips: [
      "Archive important sessions for reference",
      "Search across all your past insights",
      "Build a library of your best thinking"
    ]
  }
};

export function EmptyState({ variant, onAction, actionLabel, className }: EmptyStateProps) {
  const content = CONTENT[variant];
  const Icon = content.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("text-center py-16 px-8 max-w-lg mx-auto", className)}
    >
      {/* Animated illustration */}
      <motion.div
        animate={{ 
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl mb-6"
      >
        {content.illustration}
      </motion.div>
      
      {/* Icon badge */}
      <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-fresco-light-gray dark:bg-gray-800 flex items-center justify-center">
        <Icon className="w-7 h-7 text-fresco-graphite dark:text-gray-300" />
      </div>
      
      {/* Title & description */}
      <h3 className="text-fresco-xl font-medium text-fresco-black mb-3">
        {content.title}
      </h3>
      <p className="text-fresco-base text-fresco-graphite-mid leading-relaxed mb-8">
        {content.description}
      </p>
      
      {/* Tips */}
      <div className="text-left bg-fresco-light-gray/50 dark:bg-gray-800/50 rounded-xl p-5 mb-8">
        <p className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wider mb-3">
          Quick tips
        </p>
        <ul className="space-y-2">
          {content.tips.map((tip, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-start gap-2 text-fresco-sm text-fresco-graphite-soft"
            >
              <span className="text-fresco-graphite-light mt-0.5">→</span>
              {tip}
            </motion.li>
          ))}
        </ul>
      </div>
      
      {/* Action button */}
      {onAction && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          className="fresco-btn fresco-btn-primary"
        >
          <Plus className="w-5 h-5" />
          {actionLabel || 'Get Started'}
        </motion.button>
      )}
    </motion.div>
  );
}

// Smaller inline empty state
export function InlineEmptyState({ 
  message, 
  icon: IconComponent = Brain,
  action,
  actionLabel 
}: { 
  message: string; 
  icon?: any;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 mb-3 rounded-xl bg-fresco-light-gray dark:bg-gray-800 flex items-center justify-center">
        <IconComponent className="w-6 h-6 text-fresco-graphite-light dark:text-gray-400" />
      </div>
      <p className="text-fresco-sm text-fresco-graphite-mid mb-4">{message}</p>
      {action && (
        <button
          onClick={action}
          className="text-fresco-sm text-fresco-black font-medium hover:underline flex items-center gap-1 transition-colors"
        >
          {actionLabel || 'Add'} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
