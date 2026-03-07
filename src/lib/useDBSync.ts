'use client';

// FRESCO - Database Sync Hook
// Syncs Zustand store with database for authenticated users
// Falls back to localStorage for guests

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFrescoStore } from '@/lib/store';

export function useDBSync() {
  const { data: session, status } = useSession();
  const { setUser, workspaces, sessions } = useFrescoStore();
  const hasSynced = useRef(false);

  const [isSyncComplete, setIsSyncComplete] = useState(false);
  const isAuthenticated = status === 'authenticated' && !!session?.user?.id;

  // On login: load workspaces + sessions from DB into store
  useEffect(() => {
    if (!isAuthenticated || hasSynced.current) return;

    const loadFromDB = async () => {
      try {
        const res = await fetch('/api/workspaces');
        if (!res.ok) return;
        const dbWorkspaces = await res.json();

        // Load sessions for each workspace
        const allSessions: any[] = [];
        for (const ws of dbWorkspaces) {
          const sRes = await fetch(`/api/workspaces/${ws.id}/sessions`);
          if (sRes.ok) {
            const wsSessions = await sRes.json();
            allSessions.push(...wsSessions);
          }
        }

        // Replace local store with DB data
        useFrescoStore.setState({
          workspaces: dbWorkspaces.map((ws: any) => ({
            id: ws.id,
            title: ws.title,
            description: ws.description || '',
            tags: [],
            createdAt: new Date(ws.createdAt),
            updatedAt: new Date(ws.updatedAt),
            userId: ws.userId,
          })),
          sessions: allSessions.map((s: any) => ({
            id: s.id,
            workspaceId: s.workspaceId,
            toolkitType: s.toolkitType,
            category: s.category || 'investigate',
            thinkingLens: s.thinkingLens || 'automatic',
            status: 'draft',
            steps: s.stepResponses ? Object.entries(s.stepResponses).map(([k, v]: any) => ({
              id: `${s.id}-step-${k}`,
              stepNumber: parseInt(k),
              label: '',
              prompt: '',
              response: v as string,
              content: v as string,
              sessionId: s.id,
            })) : [],
            insights: s.aiOutputs?.insights?.map((content: string, i: number) => ({
              id: `${s.id}-insight-${i}`,
              content,
              isAiGenerated: true,
              createdAt: new Date(s.createdAt),
              sessionId: s.id,
            })) || [],
            sentenceOfTruth: s.sentenceOfTruth ? {
              id: `${s.id}-sot`,
              content: s.sentenceOfTruth,
              isLocked: s.isLocked || false,
              isAiGenerated: true,
              createdAt: new Date(s.createdAt),
              updatedAt: new Date(s.updatedAt),
              sessionId: s.id,
            } : undefined,
            necessaryMoves: s.aiOutputs?.necessaryMoves?.map((content: string, i: number) => ({
              id: `${s.id}-move-${i}`,
              orderNum: i + 1,
              content,
              isCompleted: false,
              createdAt: new Date(s.createdAt),
              sessionId: s.id,
            })) || [],
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            userId: session!.user!.id!,
          })),
        });

        hasSynced.current = true;
        sessionStorage.setItem("fresco_was_authed", "1");
        setIsSyncComplete(true);
      } catch (err) {
        console.error('DB sync failed:', err);
      }
    };

    loadFromDB();
  }, [isAuthenticated]);

  // On logout: clear store
  useEffect(() => {
    if (status === 'unauthenticated' && sessionStorage.getItem("fresco_was_authed")) {
      hasSynced.current = false;
      sessionStorage.removeItem("fresco_was_authed");
      setIsSyncComplete(false);
      useFrescoStore.setState({
        workspaces: [],
        sessions: [],
        activeWorkspaceId: null,
        activeSessionId: null,
      });
    }
  }, [status]);

  return { isAuthenticated, isSyncComplete };
}


// Patch store actions to sync to DB when authenticated
export function useDBSyncComplete() {
  const { isSyncComplete } = useDBSync();
  return isSyncComplete;
}

export function useDBWrite() {
  const { data: session } = useSession();
  const store = useFrescoStore();
  const isAuthenticated = !!session?.user?.id;

  const createWorkspace = async (title: string, description?: string) => {
    const workspace = store.createWorkspace(title, description);
    if (isAuthenticated) {
      try {
        await fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: workspace.id, title, description }),
        });
      } catch (err) {
        console.error('Failed to save workspace to DB:', err);
      }
    }
    return workspace;
  };

  const deleteWorkspace = async (id: string) => {
    store.deleteWorkspace(id);
    if (isAuthenticated) {
      try {
        await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete workspace from DB:', err);
      }
    }
  };

  const createSession = async (workspaceId: string, toolkitType: any) => {
    const session2 = store.createSession(workspaceId, toolkitType);
    if (isAuthenticated) {
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: session2.id, workspaceId, toolkitType }),
        });
      } catch (err) {
        console.error('Failed to save session to DB:', err);
      }
    }
    return session2;
  };

  const updateSession = async (id: string, updates: any) => {
    store.updateSession(id, updates);
    if (isAuthenticated) {
      try {
        const s = store.sessions.find(s => s.id === id);
        if (s) {
          await fetch(`/api/sessions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              thinkingLens: updates.thinkingLens ?? s.thinkingLens,
              stepResponses: Object.fromEntries((updates.steps ?? s.steps ?? []).map((step: any) => [step.stepNumber, step.response])),
              aiOutputs: {
                insights: (updates.insights ?? s.insights ?? []).map((i: any) => i.content),
                necessaryMoves: (updates.necessaryMoves ?? s.necessaryMoves ?? []).map((m: any) => m.content),
              },
              sentenceOfTruth: updates.sentenceOfTruth?.content ?? s.sentenceOfTruth?.content,
              isLocked: updates.sentenceOfTruth?.isLocked ?? s.sentenceOfTruth?.isLocked ?? false,
            }),
          });
        }
      } catch (err) {
        console.error('Failed to update session in DB:', err);
      }
    }
  };

  const deleteSession = async (id: string) => {
    store.deleteSession(id);
    if (isAuthenticated) {
      try {
        await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete session from DB:', err);
      }
    }
  };

  const updateWorkspace = async (id: string, updates: { title?: string; description?: string }) => {
    store.updateWorkspace(id, updates);
    if (isAuthenticated) {
      try {
        await fetch(`/api/workspaces/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.error('Failed to update workspace in DB:', err);
      }
    }
  };

  // Debounced step sync - fires 1.5s after last keystroke
  const stepSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const syncSessionToDB = async (sessionId: string) => {
    if (!isAuthenticated) return;
    const s = useFrescoStore.getState().sessions.find((s: any) => s.id === sessionId);
    if (!s) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thinkingLens: s.thinkingLens,
          stepResponses: Object.fromEntries(
            (s.steps || []).map((step: any) => [String(step.stepNumber), step.response || step.content || ''])
          ),
          aiOutputs: {
            insights: (s.insights || []).map((i: any) => i.content).filter(Boolean),
            necessaryMoves: (s.necessaryMoves || []).map((m: any) => m.content).filter(Boolean),
          },
          sentenceOfTruth: s.sentenceOfTruth?.content || null,
          isLocked: s.sentenceOfTruth?.isLocked || false,
        }),
      });
    } catch (err) {
      console.error('Failed to sync session to DB:', err);
    }
  };

  const updateSessionStep = (sessionId: string, stepNumber: number, response: string) => {
    store.updateSessionStep(sessionId, stepNumber, response);
    if (!isAuthenticated) return;
    // Debounce - wait 1.5s after last keystroke
    const key = `${sessionId}-${stepNumber}`;
    if (stepSyncTimers.has(key)) clearTimeout(stepSyncTimers.get(key)!);
    stepSyncTimers.set(key, setTimeout(() => {
      syncSessionToDB(sessionId);
      stepSyncTimers.delete(key);
    }, 2000));
  };

  const saveAIOutputs = (sessionId: string, outputs: { insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }) => {
    store.saveAIOutputs(sessionId, outputs);
    // Save immediately after AI generation
    if (isAuthenticated) setTimeout(() => syncSessionToDB(sessionId), 500);
  };

  const setSentenceOfTruth = (sessionId: string, content: string) => {
    store.setSentenceOfTruth(sessionId, content);
    if (isAuthenticated) setTimeout(() => syncSessionToDB(sessionId), 1500);
  };

  const setSessionLens = (sessionId: string, lens: any) => {
    store.setSessionLens(sessionId, lens);
    if (isAuthenticated) setTimeout(() => syncSessionToDB(sessionId), 500);
  };

  return { createWorkspace, updateWorkspace, deleteWorkspace, createSession, updateSession, updateSessionStep, saveAIOutputs, setSentenceOfTruth, setSessionLens, deleteSession };
}
