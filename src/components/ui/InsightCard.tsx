'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Trash2, Edit3, Check, X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  insight: string;
  index: number;
  onEdit?: (value: string) => void;
  onDelete?: () => void;
  isDraggable?: boolean;
  isNew?: boolean;
  className?: string;
}

export function InsightCard({
  insight,
  index,
  onEdit,
  onDelete,
  isDraggable = false,
  isNew = false,
  className
}: InsightCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(insight);
  const [isHovered, setIsHovered] = useState(false);

  const handleSave = () => {
    onEdit?.(editValue);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative bg-fresco-white dark:bg-gray-900 rounded-xl border border-fresco-border dark:border-gray-700",
        "shadow-sm hover:shadow-md transition-all duration-200",
        className
      )}
    >
      {/* Card content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          {isDraggable && (
            <div className="mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-fresco-graphite-light" />
            </div>
          )}
          
          {/* Index badge */}
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-fresco-light-gray dark:bg-gray-800 flex items-center justify-center">
            <span className="text-fresco-xs font-medium text-fresco-graphite">{index + 1}</span>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-2 text-fresco-sm border border-fresco-border dark:border-gray-600 rounded-lg focus:border-fresco-black dark:focus:border-white outline-none resize-none bg-transparent dark:text-white"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1.5 text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    className="p-1.5 text-fresco-black hover:bg-fresco-light-gray dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p 
                className="text-fresco-sm text-fresco-graphite-soft leading-relaxed"
                onDoubleClick={() => onEdit && setIsEditing(true)}
              >
                {insight}
              </p>
            )}
          </div>
          
          {/* Actions */}
          {!isEditing && (onEdit || onDelete) && (
            <div className={cn(
              "flex items-center gap-1 transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}>
              {onEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white hover:bg-fresco-light-gray dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-1.5 text-fresco-graphite-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Subtle left accent */}
      <div className="absolute left-0 top-4 bottom-4 w-1 bg-fresco-light-gray dark:bg-gray-700 rounded-full group-hover:bg-fresco-graphite-light transition-colors" />
    </motion.div>
  );
}

// Empty state for insights
export function InsightsEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-12 px-6"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-fresco-light-gray dark:bg-gray-800 flex items-center justify-center">
        <Lightbulb className="w-8 h-8 text-fresco-graphite-light dark:text-gray-400" />
      </div>
      <h3 className="text-fresco-lg font-medium text-fresco-graphite mb-2">
        No insights yet
      </h3>
      <p className="text-fresco-sm text-fresco-graphite-light max-w-xs mx-auto">
        Complete the steps and generate to discover insights from your thinking.
      </p>
    </motion.div>
  );
}
