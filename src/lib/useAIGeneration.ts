'use client';

import { useState } from 'react';
import { useFrescoStore } from '@/lib/store';

interface UseAIGenerationResult {
  canGenerate: boolean;
  isLimitReached: boolean;
  currentUsage: number;
  limit: number;
  incrementUsage: () => void;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
}

export function useAIGeneration(): UseAIGenerationResult {
  const { canUseAI, incrementAIUsage, getUsageLimits, user } = useFrescoStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const limits = getUsageLimits();
  const currentUsage = user?.aiGenerationsThisMonth || 0;
  const limit = limits.aiGenerationsPerMonth;
  const isLimitReached = limit !== -1 && currentUsage >= limit;
  
  return {
    canGenerate: canUseAI(),
    isLimitReached,
    currentUsage,
    limit,
    incrementUsage: incrementAIUsage,
    showUpgradeModal,
    setShowUpgradeModal,
  };
}
