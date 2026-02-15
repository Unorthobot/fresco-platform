// FRESCO Platform - Global State Management
// Using Zustand for lightweight, performant state

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Workspace,
  ToolkitSession,
  ThinkingModeId,
  ToolkitType,
  ToolkitCategory,
  SessionStep,
  Insight,
  SentenceOfTruth,
  NecessaryMove,
} from '@/types';
import { generateId } from '@/lib/utils';

// ============================================
// STORE TYPES
// ============================================

interface FrescoState {
  // User
  user: {
    id: string;
    email: string;
    name: string;
    profileImage?: string;
  } | null;
  
  // Settings
  settings: {
    autoGenerate: boolean;
    notifications: boolean;
  };
  
  // Workspaces
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  
  // Sessions
  sessions: ToolkitSession[];
  activeSessionId: string | null;
  
  // Navigation
  activeSection: 'home' | 'workspaces' | 'archive' | 'toolkit' | 'settings' | 'account';
  
  // Actions - User
  setUser: (user: FrescoState['user']) => void;
  
  // Actions - Settings
  updateSettings: (settings: Partial<FrescoState['settings']>) => void;
  
  // Actions - Workspaces
  createWorkspace: (title: string, description?: string) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string | null) => void;
  
  // Actions - Sessions
  createSession: (workspaceId: string, toolkitType: ToolkitType) => ToolkitSession;
  updateSession: (id: string, updates: Partial<ToolkitSession>) => void;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  
  // Actions - Session Steps
  updateSessionStep: (sessionId: string, stepNumber: number, response: string) => void;
  
  // Actions - Thinking Lens
  setSessionLens: (sessionId: string, lens: ThinkingModeId) => void;
  
  // Actions - Insights
  addInsight: (sessionId: string, content: string, sourceStep?: number) => void;
  
  // Actions - Sentence of Truth
  setSentenceOfTruth: (sessionId: string, content: string) => void;
  toggleSentenceLock: (sessionId: string) => void;
  
  // Actions - Necessary Moves
  addNecessaryMove: (sessionId: string, content: string) => void;
  toggleMoveComplete: (sessionId: string, moveId: string) => void;
  
  // Actions - Save All AI Outputs
  saveAIOutputs: (sessionId: string, outputs: { insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }) => void;
  
  // Actions - Navigation
  setActiveSection: (section: FrescoState['activeSection']) => void;
  
  // Getters
  getWorkspace: (id: string) => Workspace | undefined;
  getSession: (id: string) => ToolkitSession | undefined;
  getWorkspaceSessions: (workspaceId: string) => ToolkitSession[];
  getRecentSessions: (limit?: number) => ToolkitSession[];
}

// ============================================
// TOOLKIT CATEGORY MAPPING
// ============================================

const getToolkitCategory = (type: ToolkitType): ToolkitCategory => {
  const investigateToolkits: ToolkitType[] = ['insight_stack', 'pov_generator', 'mental_model_mapper'];
  const innovateToolkits: ToolkitType[] = ['flow_board', 'experiment_brief', 'strategy_sketchbook'];
  const validateToolkits: ToolkitType[] = ['ux_scorecard', 'persuasion_canvas', 'performance_grid'];
  
  if (investigateToolkits.includes(type)) return 'investigate';
  if (innovateToolkits.includes(type)) return 'innovate';
  if (validateToolkits.includes(type)) return 'validate';
  return 'investigate';
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useFrescoStore = create<FrescoState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: {
        id: 'demo-user',
        email: 'demo@fresco.app',
        name: 'Demo User',
      },
      settings: {
        autoGenerate: true,
        notifications: false,
      },
      workspaces: [],
      activeWorkspaceId: null,
      sessions: [],
      activeSessionId: null,
      activeSection: 'home',
      
      // User Actions
      setUser: (user) => set({ user }),
      
      // Settings Actions
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      // Workspace Actions
      createWorkspace: (title, description) => {
        const workspace: Workspace = {
          id: generateId(),
          title,
          description,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: get().user?.id || 'demo-user',
        };
        
        set((state) => ({
          workspaces: [workspace, ...state.workspaces],
          activeWorkspaceId: workspace.id,
        }));
        
        return workspace;
      },
      
      updateWorkspace: (id, updates) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
          ),
        }));
      },
      
      deleteWorkspace: (id) => {
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          sessions: state.sessions.filter((s) => s.workspaceId !== id),
          activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
        }));
      },
      
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      
      // Session Actions
      createSession: (workspaceId, toolkitType) => {
        const session: ToolkitSession = {
          id: generateId(),
          toolkitType,
          category: getToolkitCategory(toolkitType),
          thinkingLens: 'automatic',
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: get().user?.id || 'demo-user',
          workspaceId,
          steps: [],
          insights: [],
          necessaryMoves: [],
        };
        
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
        }));
        
        // Update workspace updatedAt
        get().updateWorkspace(workspaceId, {});
        
        return session;
      },
      
      updateSession: (id, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
          ),
        }));
      },
      
      deleteSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        }));
      },
      
      setActiveSession: (id) => set({ activeSessionId: id }),
      
      // Session Step Actions
      updateSessionStep: (sessionId, stepNumber, response) => {
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== sessionId) return session;
            
            const existingStep = session.steps?.find((s) => s.stepNumber === stepNumber);
            
            if (existingStep) {
              return {
                ...session,
                updatedAt: new Date(),
                steps: session.steps?.map((s) =>
                  s.stepNumber === stepNumber ? { ...s, response, content: response } : s
                ),
              };
            } else {
              const newStep: SessionStep = {
                id: generateId(),
                stepNumber,
                label: '',
                prompt: '',
                response,
                content: response,
                sessionId,
              };
              return {
                ...session,
                updatedAt: new Date(),
                steps: [...(session.steps || []), newStep],
              };
            }
          }),
        }));
      },
      
      // Thinking Lens Actions
      setSessionLens: (sessionId, lens) => {
        get().updateSession(sessionId, { thinkingLens: lens });
      },
      
      // Insight Actions
      addInsight: (sessionId, content, sourceStep) => {
        const insight: Insight = {
          id: generateId(),
          content,
          sourceStep,
          isAiGenerated: false,
          createdAt: new Date(),
          sessionId,
        };
        
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, insights: [...(s.insights || []), insight], updatedAt: new Date() }
              : s
          ),
        }));
      },
      
      // Sentence of Truth Actions
      setSentenceOfTruth: (sessionId, content) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            
            const sentenceOfTruth: SentenceOfTruth = {
              id: s.sentenceOfTruth?.id || generateId(),
              content,
              isLocked: s.sentenceOfTruth?.isLocked || false,
              isAiGenerated: false,
              createdAt: s.sentenceOfTruth?.createdAt || new Date(),
              updatedAt: new Date(),
              sessionId,
            };
            
            return { ...s, sentenceOfTruth, updatedAt: new Date() };
          }),
        }));
      },
      
      toggleSentenceLock: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.sentenceOfTruth) return s;
            return {
              ...s,
              sentenceOfTruth: {
                ...s.sentenceOfTruth,
                isLocked: !s.sentenceOfTruth.isLocked,
              },
            };
          }),
        }));
      },
      
      // Necessary Moves Actions
      addNecessaryMove: (sessionId, content) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            
            const move: NecessaryMove = {
              id: generateId(),
              orderNum: (s.necessaryMoves?.length || 0) + 1,
              content,
              isCompleted: false,
              createdAt: new Date(),
              sessionId,
            };
            
            return {
              ...s,
              necessaryMoves: [...(s.necessaryMoves || []), move],
              updatedAt: new Date(),
            };
          }),
        }));
      },
      
      toggleMoveComplete: (sessionId, moveId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              necessaryMoves: s.necessaryMoves?.map((m) =>
                m.id === moveId ? { ...m, isCompleted: !m.isCompleted } : m
              ),
            };
          }),
        }));
      },
      
      // Save All AI Outputs at once
      saveAIOutputs: (sessionId, outputs) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            
            // Create insight objects from strings
            const insights: Insight[] = outputs.insights.map((content, i) => ({
              id: `${sessionId}-insight-${i}`,
              content,
              isAiGenerated: true,
              createdAt: new Date(),
              sessionId,
            }));
            
            // Create sentence of truth
            const sentenceOfTruth: SentenceOfTruth = {
              id: s.sentenceOfTruth?.id || `${sessionId}-sot`,
              content: outputs.sentenceOfTruth,
              isLocked: s.sentenceOfTruth?.isLocked || false,
              isAiGenerated: true,
              createdAt: s.sentenceOfTruth?.createdAt || new Date(),
              updatedAt: new Date(),
              sessionId,
            };
            
            // Create necessary move objects from strings
            const necessaryMoves: NecessaryMove[] = outputs.necessaryMoves.map((content, i) => ({
              id: `${sessionId}-move-${i}`,
              orderNum: i + 1,
              content,
              isCompleted: false,
              createdAt: new Date(),
              sessionId,
            }));
            
            return {
              ...s,
              insights,
              sentenceOfTruth,
              necessaryMoves,
              updatedAt: new Date(),
            };
          }),
        }));
      },
      
      // Navigation Actions
      setActiveSection: (section) => set({ activeSection: section }),
      
      // Getters
      getWorkspace: (id) => get().workspaces.find((w) => w.id === id),
      
      getSession: (id) => get().sessions.find((s) => s.id === id),
      
      getWorkspaceSessions: (workspaceId) =>
        get().sessions.filter((s) => s.workspaceId === workspaceId),
      
      getRecentSessions: (limit = 5) =>
        [...get().sessions]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, limit),
    }),
    {
      name: 'fresco-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        workspaces: state.workspaces,
        sessions: state.sessions,
      }),
    }
  )
);

// ============================================
// SELECTOR HOOKS (for performance)
// ============================================

export const useUser = () => useFrescoStore((state) => state.user);
export const useWorkspaces = () => useFrescoStore((state) => state.workspaces);
export const useActiveWorkspace = () => {
  const workspaces = useFrescoStore((state) => state.workspaces);
  const activeId = useFrescoStore((state) => state.activeWorkspaceId);
  return workspaces.find((w) => w.id === activeId);
};
export const useSessions = () => useFrescoStore((state) => state.sessions);
export const useActiveSession = () => {
  const sessions = useFrescoStore((state) => state.sessions);
  const activeId = useFrescoStore((state) => state.activeSessionId);
  return sessions.find((s) => s.id === activeId);
};
