'use client';

import { useState } from 'react';
import { useFrescoStore } from '@/lib/store';

interface UseAIGenerationResult {
  canGenerate: boolean;
  isLimitReached: boolean;
  currentUsage: number;
  limit: number;
  generate: (requestBody: any) => Promise<Response | null>;
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
  
  const generate = async (requestBody: any): Promise<Response | null> => {
    // Check if user can use AI
    if (!canUseAI()) {
      setShowUpgradeModal(true);
      return null;
    }
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      // Only increment usage on successful generation
      if (response.ok) {
        incrementAIUsage();
      }
      
      return response;
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  };
  
  return {
    canGenerate: canUseAI(),
    isLimitReached,
    currentUsage,
    limit,
    generate,
    showUpgradeModal,
    setShowUpgradeModal,
  };
}
