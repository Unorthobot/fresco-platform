// FRESCO - Shared hooks for toolkit sessions
// Provides AI output persistence and workspace context

import { useState, useEffect } from 'react';
import { useFrescoStore } from '@/lib/store';
import type { ToolkitSession } from '@/types';

interface AIContent {
  insights: string[];
  sentenceOfTruth: string;
  necessaryMoves: string[];
}

interface WorkspaceContext {
  toolkit: string;
  sentenceOfTruth?: string;
  insights?: string[];
}

// Hook to manage AI outputs with persistence
export function useAIOutputs(sessionId: string, workspaceId: string) {
  const { sessions, saveAIOutputs, getWorkspaceSessions } = useFrescoStore();
  const session = sessions.find(s => s.id === sessionId);
  
  const [aiContent, setAiContent] = useState<AIContent>({
    insights: [],
    sentenceOfTruth: '',
    necessaryMoves: []
  });

  // Restore saved AI outputs on mount
  useEffect(() => {
    if (session?.insights && session.insights.length > 0) {
      setAiContent(prev => ({
        ...prev,
        insights: session.insights?.map(i => i.content) || []
      }));
    }
    if (session?.sentenceOfTruth?.content) {
      setAiContent(prev => ({
        ...prev,
        sentenceOfTruth: session.sentenceOfTruth?.content || ''
      }));
    }
    if (session?.necessaryMoves && session.necessaryMoves.length > 0) {
      setAiContent(prev => ({
        ...prev,
        necessaryMoves: session.necessaryMoves?.map(m => m.content) || []
      }));
    }
  }, [session?.id]);

  // Get workspace context from other sessions
  const getWorkspaceContext = (): WorkspaceContext[] | null => {
    const workspaceSessions = getWorkspaceSessions(workspaceId);
    const otherSessions = workspaceSessions.filter(
      s => s.id !== sessionId && s.sentenceOfTruth?.content
    );
    
    if (otherSessions.length === 0) return null;
    
    return otherSessions.map(s => ({
      toolkit: s.toolkitType,
      sentenceOfTruth: s.sentenceOfTruth?.content,
      insights: s.insights?.slice(0, 3).map(i => i.content) || [],
    }));
  };

  // Save AI outputs and update local state
  const updateAIContent = (data: AIContent) => {
    setAiContent(data);
    saveAIOutputs(sessionId, data);
  };

  return {
    aiContent,
    setAiContent: updateAIContent,
    getWorkspaceContext,
  };
}
