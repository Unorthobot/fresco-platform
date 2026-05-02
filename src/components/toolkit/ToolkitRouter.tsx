'use client';

// FRESCO Toolkit Router
// Routes to the appropriate toolkit session component based on toolkit type.
// House-mode sessions (session.houseType set) are routed to HouseSession.

import { useEffect } from 'react';
import { useFrescoStore } from '@/lib/store';
import type { HouseId } from '@/lib/agents';
import { InsightStackSession } from './InsightStackSession';
import { POVGeneratorSession } from './POVGeneratorSession';
import { MentalModelMapperSession } from './MentalModelMapperSession';
import { FlowBoardSession } from './FlowBoardSession';
import { ExperimentBriefSession } from './ExperimentBriefSession';
import { StrategySketchbookSession } from './StrategySketchbookSession';
import { UXScorecardSession } from './UXScorecardSession';
import { PersuasionCanvasSession } from './PersuasionCanvasSession';
import { PerformanceGridSession } from './PerformanceGridSession';
import { ToolkitSession } from './ToolkitSession';
import { HouseSession } from '@/components/houses/HouseSession';

interface ToolkitRouterProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void | Promise<void>;
  onNavigateToHouse?: (houseId: HouseId, fromSessionId?: string) => void;
}

export function ToolkitRouter({ sessionId, workspaceId, onBack, onStartToolkit, onNavigateToHouse }: ToolkitRouterProps) {
  const { sessions, workspaces, activeWorkspaceId, activeSessionId, activeSection, setActiveSession, setActiveWorkspace, setActiveSection } = useFrescoStore();
  const session = sessions.find((s) => s.id === sessionId);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const isOrphan = !session || !workspace;

  useEffect(() => {
    if (isOrphan) {
      // Log a breadcrumb so we can audit any blank-screen reports tied to
      // workspace/session deletion races. localStorage (not sessionStorage)
      // so it survives tab close. Includes a store snapshot at mount so we
      // can see the parent's nav state — i.e. why it rendered ToolkitRouter
      // with these IDs in the first place.
      try {
        const breadcrumbs = JSON.parse(localStorage.getItem('fresco-orphan-session-breadcrumbs') || '[]');
        breadcrumbs.push({
          when: new Date().toISOString(),
          // Props passed in (the IDs we were told to render):
          propsSessionId: sessionId,
          propsWorkspaceId: workspaceId,
          // Store state at mount time (the source of truth for nav):
          storeActiveSessionId: activeSessionId,
          storeActiveWorkspaceId: activeWorkspaceId,
          storeActiveSection: activeSection,
          storeWorkspaceCount: workspaces.length,
          storeSessionCount: sessions.length,
          // Whether the IDs we were given exist in the current store:
          hasSession: !!session,
          hasWorkspace: !!workspace,
          // Cross-check: do the store's active IDs at least exist?
          storeActiveSessionExists: activeSessionId ? sessions.some(s => s.id === activeSessionId) : null,
          storeActiveWorkspaceExists: activeWorkspaceId ? workspaces.some(w => w.id === activeWorkspaceId) : null,
        });
        localStorage.setItem('fresco-orphan-session-breadcrumbs', JSON.stringify(breadcrumbs.slice(-20)));
      } catch { /* ignore */ }
      // eslint-disable-next-line no-console
      console.warn('[Fresco] ToolkitRouter: session or workspace missing — recovering to home', { sessionId, workspaceId, activeSessionId, activeWorkspaceId, activeSection });
      // Schedule the store reset for the next tick so we don't fire setState
      // during a render commit. Belt-and-braces — the parent's effectiveView
      // logic should have already prevented us mounting, but in case of any
      // render-cycle race, this self-corrects.
      const tReset = setTimeout(() => {
        setActiveSession(null);
        setActiveWorkspace(null);
        setActiveSection('home');
      }, 0);
      // Watchdog: if the parent hasn't unmounted us within 1.5s, the React
      // tree is stuck. Hard-reload to /. This is the brutal version of the
      // recovery path — but a hard reload is strictly better than the user
      // staring at a permanent spinner with no escape.
      const tWatchdog = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.warn('[Fresco] ToolkitRouter: stuck in orphan state for 1.5s — hard reload');
        try {
          const raw = localStorage.getItem('fresco-storage');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.state) {
              parsed.state.activeWorkspaceId = null;
              parsed.state.activeSessionId = null;
              parsed.state.activeSection = 'home';
              localStorage.setItem('fresco-storage', JSON.stringify(parsed));
            }
          }
        } catch { /* ignore */ }
        window.location.href = '/';
      }, 1500);
      return () => {
        clearTimeout(tReset);
        clearTimeout(tWatchdog);
      };
    }
  }, [isOrphan, session, workspace, sessionId, workspaceId, sessions, workspaces, activeSessionId, activeWorkspaceId, activeSection, setActiveSession, setActiveWorkspace, setActiveSection]);

  // Render-time orphan guard: don't render the children at all if the
  // session/workspace have been deleted out from under us. Show a brief
  // "redirecting…" surface so the user doesn't see a blank frame while
  // the store reset propagates.
  if (isOrphan) {
    return (
      <div className="h-screen flex items-center justify-center fresco-grid-bg-subtle">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-fresco-border border-t-fresco-black rounded-full animate-spin" />
          <p className="fresco-label">Returning to home…</p>
        </div>
      </div>
    );
  }

  // Still mounting but session/workspace not yet resolved — render nothing visible
  // (no longer reachable: isOrphan check above covers it, but keep TS happy
  // by narrowing session/workspace types for the rest of the function)
  if (!session || !workspace) return null;

  // ── House-mode session → HouseSession ─────────────────────────────────
  if (session.houseType) {
    return (
      <HouseSession
        key={sessionId}
        houseId={session.houseType as HouseId}
        workspaceId={workspaceId}
        sessionId={sessionId}
        onBack={onBack}
        onNavigateToHouse={onNavigateToHouse}
      />
    );
  }

  // ── Legacy toolkit-mode sessions ───────────────────────────────────────
  switch (session.toolkitType) {
    case 'insight_stack':
      return <InsightStackSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'pov_generator':
      return <POVGeneratorSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'mental_model_mapper':
      return <MentalModelMapperSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'flow_board':
      return <FlowBoardSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'experiment_brief':
      return <ExperimentBriefSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'strategy_sketchbook':
      return <StrategySketchbookSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'ux_scorecard':
      return <UXScorecardSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'persuasion_canvas':
      return <PersuasionCanvasSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'performance_grid':
      return <PerformanceGridSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} onStartToolkit={onStartToolkit} />;
    case 'decision_matrix':
    case 'risk_radar':
    case 'signal_checker':
      return <ToolkitSession sessionId={sessionId} workspaceId={workspaceId} onBack={onBack} />;
    default:
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-fresco-graphite-light">Unknown session type: {session.toolkitType}</p>
        </div>
      );
  }
}
