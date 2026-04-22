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
  const { sessions, workspaces, setActiveSession, setActiveWorkspace, setActiveSection } = useFrescoStore();
  const session = sessions.find((s) => s.id === sessionId);
  const workspace = workspaces.find((w) => w.id === workspaceId);

  useEffect(() => {
    if (!session || !workspace) {
      setActiveSession(null);
      setActiveWorkspace(null);
      setActiveSection('home');
      // Navigate immediately — don't wait for the useEffect chain in FrescoAppContent
      onBack?.();
    }
  }, [session, workspace, setActiveSession, setActiveWorkspace, setActiveSection, onBack]);

  // Still mounting but session/workspace not yet resolved — render nothing visible
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
