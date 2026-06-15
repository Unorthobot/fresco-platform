'use client';

// FRESCO - Database Sync Hook
// Syncs Zustand store with database for authenticated users
// Falls back to localStorage for guests

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFrescoStore } from '@/lib/store';
import {
  isGuestOwned,
  stashGuestImport,
  readGuestImport,
  clearGuestImport,
  type PendingGuestImport,
} from '@/lib/guestImport';

export function useDBSync() {
  const { data: session, status } = useSession();
  const { setUser, workspaces, sessions } = useFrescoStore();
  const hasSynced = useRef(false);

  const [isSyncComplete, setIsSyncComplete] = useState(false);
  const [pendingGuestImport, setPendingGuestImport] = useState<PendingGuestImport | null>(null);
  const isAuthenticated = status === 'authenticated' && !!session?.user?.id;

  // Fetch the account's workspaces + sessions and replace the local store with
  // them. This deliberately drops anything not owned by the account (guest work
  // is stashed separately before this runs — see the login effect below).
  const reloadFromDB = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/workspaces');
    if (!res.ok) return false;
    const dbWorkspaces = await res.json();

    const allSessions: any[] = [];
    for (const ws of dbWorkspaces) {
      const sRes = await fetch(`/api/workspaces/${ws.id}/sessions`);
      if (sRes.ok) {
        const wsSessions = await sRes.json();
        allSessions.push(...wsSessions);
      }
    }

    useFrescoStore.setState({
      workspaces: dbWorkspaces.map((ws: any) => ({
        id: ws.id,
        title: ws.title,
        description: ws.description || '',
        tags: [],
        createdAt: new Date(ws.createdAt),
        updatedAt: new Date(ws.updatedAt),
        userId: ws.userId,
        teamId: ws.teamId || undefined,
        team: ws.team || null,
      })),
      sessions: allSessions.map((s: any) => ({
        id: s.id,
        workspaceId: s.workspaceId,
        toolkitType: s.toolkitType,
        houseType: s.houseType || undefined,
        category: s.houseType || s.category || 'investigate',
        thinkingLens: s.thinkingLens || 'automatic',
        status: 'draft',
        // Preserve the full aiOutputs JSON from DB (includes houseResult for house sessions)
        aiOutputs: s.aiOutputs || null,
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
        decision: s.decision || null,
        decisionRationale: s.decisionRationale || null,
        decisionConfidence: s.decisionConfidence || null,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        userId: session?.user?.id ?? '',
      })),
    });
    return true;
  }, [session]);

  // Upload guest rows to the DB as the authenticated user's own. Only ever
  // called on explicit consent (importGuestWork) — never silently — so one
  // person's pre-sign-in decision can't land in another's account.
  const migrateGuestRows = useCallback(async (data: PendingGuestImport) => {
    for (const ws of data.workspaces) {
      try {
        await fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: ws.id, title: ws.title, description: ws.description }),
        });
      } catch { /* duplicate or network error — continue with the rest */ }
    }
    for (const s of data.sessions) {
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: s.id, workspaceId: s.workspaceId,
            toolkitType: s.toolkitType, houseType: (s as any).houseType || null,
          }),
        });
        await fetch(`/api/sessions/${s.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thinkingLens: s.thinkingLens,
            stepResponses: Object.fromEntries(
              (s.steps || []).map((st: any) => [String(st.stepNumber), st.response || st.content || ''])
            ),
            aiOutputs: (s as any).aiOutputs?.houseResult
              ? (s as any).aiOutputs
              : {
                  insights: (s.insights || []).map((i: any) => i.content).filter(Boolean),
                  necessaryMoves: (s.necessaryMoves || []).map((m: any) => m.content).filter(Boolean),
                },
            sentenceOfTruth: s.sentenceOfTruth?.content || null,
            isLocked: s.sentenceOfTruth?.isLocked || false,
          }),
        });
      } catch { /* continue — partial migration beats data loss */ }
    }
  }, []);

  // On login: stash any guest work, load the account's own data clean, then
  // surface a consent prompt if there's guest work waiting to be imported.
  useEffect(() => {
    if (!isAuthenticated || hasSynced.current) return;

    const loadFromDB = async () => {
      try {
        // Move guest rows OUT of the live store into a dedicated stash before
        // loading the account. They are NOT uploaded here — import is gated on
        // explicit consent (see importGuestWork). Stashing keeps them safe
        // across a tab close without writing them into this account silently.
        const local = useFrescoStore.getState();
        const guestWorkspaces = local.workspaces.filter(w => isGuestOwned((w as any).userId));
        const guestSessions = local.sessions.filter(
          s => guestWorkspaces.some(w => w.id === s.workspaceId)
        );
        if (guestWorkspaces.length || guestSessions.length) {
          stashGuestImport({ workspaces: guestWorkspaces, sessions: guestSessions });
        }

        const ok = await reloadFromDB();
        if (!ok) return;

        // Resume the prompt from the stash (covers both a fresh sign-in and a
        // reload where the user closed the tab before deciding last time).
        setPendingGuestImport(readGuestImport());

        hasSynced.current = true;
        sessionStorage.setItem("fresco_was_authed", "1");
        setIsSyncComplete(true);
      } catch (err) {
        console.error('DB sync failed:', err);
      }
    };

    loadFromDB();
  }, [isAuthenticated, reloadFromDB]);

  // Consent: import the stashed guest work into the account, then reload.
  const importGuestWork = useCallback(async () => {
    const data = readGuestImport();
    if (data) {
      await migrateGuestRows(data);
      clearGuestImport();
      await reloadFromDB();
    }
    setPendingGuestImport(null);
  }, [migrateGuestRows, reloadFromDB]);

  // Decline: drop the stashed guest work. Nothing was written to the DB, so
  // this simply discards it — the account view already shows only its own data.
  const discardGuestWork = useCallback(() => {
    clearGuestImport();
    setPendingGuestImport(null);
  }, []);

  // On logout: clear store — but ONLY for a deliberate sign-out. A JWT that
  // expires mid-session (or a webview that drops cookies) also flips status
  // to 'unauthenticated'; wiping there destroyed in-progress work for beta
  // testers. AccountPage sets the explicit-signout flag before calling
  // signOut(); without it we keep local state intact.
  useEffect(() => {
    if (status !== 'unauthenticated') return;
    const wasAuthed = sessionStorage.getItem('fresco_was_authed');
    const explicitSignout = sessionStorage.getItem('fresco_explicit_signout');
    if (wasAuthed && explicitSignout) {
      hasSynced.current = false;
      sessionStorage.removeItem('fresco_was_authed');
      sessionStorage.removeItem('fresco_explicit_signout');
      setIsSyncComplete(false);
      // Clear any undecided guest-import stash too, so it can't carry over to
      // the next person who signs in on this (possibly shared) browser.
      clearGuestImport();
      setPendingGuestImport(null);
      useFrescoStore.setState({
        workspaces: [],
        sessions: [],
        activeWorkspaceId: null,
        activeSessionId: null,
      });
    } else if (wasAuthed) {
      // Auth flicker — keep data, allow a re-sync when auth recovers.
      hasSynced.current = false;
    }
  }, [status]);

  return { isAuthenticated, isSyncComplete, pendingGuestImport, importGuestWork, discardGuestWork };
}


// Patch store actions to sync to DB when authenticated
export function useDBSyncComplete() {
  const { isSyncComplete } = useDBSync();
  return isSyncComplete;
}

export function generateSessionTitle(toolkitName: string, step1Response?: string): string {
  if (!step1Response || step1Response.trim().length < 10) return toolkitName;
  // Take first sentence or first 50 chars of step 1
  const first = step1Response.trim().split(/[.!?]/)[0].trim();
  if (first.length > 6 && first.length <= 60) return first;
  return first.slice(0, 57) + '...';
}

export function useDBWrite() {
  const { data: session } = useSession();
  const store = useFrescoStore();
  const isAuthenticated = !!session?.user?.id;

  const createWorkspace = async (title: string, description?: string, teamId?: string) => {
    const workspace = store.createWorkspace(title, description, teamId);
    if (isAuthenticated) {
      try {
        await fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: workspace.id, title, description, teamId }),
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

  const createHouseSession = async (workspaceId: string, houseType: string) => {
    const session2 = store.createHouseSession(workspaceId, houseType as any);
    if (isAuthenticated) {
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: session2.id, workspaceId, toolkitType: session2.toolkitType, houseType }),
        });
      } catch (err) {
        console.error('Failed to save house session to DB:', err);
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
      // For house sessions, aiOutputs on the session may already contain the full HouseResult
      const existingAiOutputs = (s as any).aiOutputs;
      const isHouseSession = !!(s as any).houseType;
      const aiOutputs = isHouseSession && existingAiOutputs?.houseResult
        ? existingAiOutputs
        : {
            insights: (s.insights || []).map((i: any) => i.content).filter(Boolean),
            necessaryMoves: (s.necessaryMoves || []).map((m: any) => m.content).filter(Boolean),
          };

      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thinkingLens: s.thinkingLens,
          stepResponses: Object.fromEntries(
            (s.steps || []).map((step: any) => [String(step.stepNumber), step.response || step.content || ''])
          ),
          aiOutputs,
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


  const saveDecision = async (sessionId: string, decision: string, rationale?: string, confidence?: number) => {
    // Update Zustand store immediately so HomeDashboard reflects the change
    updateSession(sessionId, { decision, decisionRationale: rationale, decisionConfidence: confidence } as any);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, decisionRationale: rationale, decisionConfidence: confidence, decisionAt: new Date().toISOString() }),
      });
    } catch (err) {
      console.error('Failed to save decision', err);
    }
  };

  return { createWorkspace, updateWorkspace, deleteWorkspace, createSession, createHouseSession, updateSession, updateSessionStep, saveAIOutputs, setSentenceOfTruth, setSessionLens, deleteSession, saveDecision };
}
