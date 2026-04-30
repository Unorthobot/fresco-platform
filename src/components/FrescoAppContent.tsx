'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from './ErrorBoundary';
import { useSession } from 'next-auth/react';
import { canGuestRun, getGuestRunCount, GUEST_RUN_LIMIT, resetGuestRunCount, backfillGuestRunCount } from '@/lib/guestRuns';
import { useDBSync, useDBWrite, useDBSyncComplete } from '@/lib/useDBSync';
import { useFrescoStore } from '@/lib/store';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import { LeftNavRail } from '@/components/layout/LeftNavRail';
import { MobileNav } from '@/components/layout/MobileNav';
import { HomeDashboard } from '@/components/HomeDashboard';
import { WorkspaceOverview } from '@/components/workspace/WorkspaceOverview';
import { ToolkitRouter } from '@/components/toolkit/ToolkitRouter';
import { ArchivePage } from '@/components/ArchivePage';
import { SettingsPage } from '@/components/SettingsPage';
import { AccountPage } from '@/components/AccountPage';
import { TeamPage } from '@/components/TeamPage';
import { ToastProvider } from '@/components/ui/Toast';
import { Onboarding, useOnboarding } from '@/components/ui/Onboarding';
import { NewWorkspaceModal } from '@/components/ui/NewWorkspaceModal';
import { PricingModal } from '@/components/ui/PricingModal';
import { type ToolkitType } from '@/types';
import type { HouseId } from '@/lib/agents';

type View = 'home' | 'workspace' | 'session' | 'archive' | 'settings' | 'account' | 'team';

export default function FrescoAppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [startingHouse, setStartingHouse] = useState<HouseId | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'workspaces' | 'guest_limit'>('workspaces');
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { data: session, status } = useSession();
  const { isSyncComplete } = useDBSync();
  const db = useDBWrite();

  const {
    activeSection,
    activeWorkspaceId,
    activeSessionId,
    setActiveSection,
    setActiveWorkspace,
    setActiveSession,
    createWorkspace,
    canCreateWorkspace,
    getUsageLimits,
    createSession,
    sessions,
    workspaces,
    setUser,
    user,
  } = useFrescoStore();

  // Sync NextAuth session → Zustand store
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user) {
      // User just signed in — clear the anonymous quota so the account quota
      // takes over. (Has no effect if no guest runs were recorded.)
      resetGuestRunCount();
      const s = session.user as any;
      setUser({
        id: s.id || 'authenticated-user',
        email: s.email || '',
        name: s.name || s.email?.split('@')[0] || 'User',
        profileImage: s.image || undefined,
        subscription: s.subscription || 'free',
        aiGenerationsThisMonth: s.aiGenerationsThisMonth || 0,
        aiGenerationsResetDate: s.aiGenerationsResetDate || new Date().toISOString().slice(0, 7),
      });
    } else if (status === 'unauthenticated') {
      // Clear user — show as guest
      setUser({
        id: 'guest',
        email: '',
        name: 'Guest',
        subscription: 'free',
        aiGenerationsThisMonth: 0,
        aiGenerationsResetDate: new Date().toISOString().slice(0, 7),
      });
    }
  }, [status, session]);

  // Get current session and workspace
  const currentSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : null;
  const currentWorkspace = activeWorkspaceId ? workspaces.find(w => w.id === activeWorkspaceId) : null;

  // Compute effective view — NEVER returns a state that could blank the screen.
  // Every branch must terminate in a view that has a matching render case below.
  const effectiveView = (() => {
    // Workspace view needs an active workspace
    if (currentView === 'workspace' && !activeWorkspaceId) return 'home';
    // Session view needs: session in store + its workspace in store
    if (currentView === 'session') {
      if (!currentSession) return activeWorkspaceId && currentWorkspace ? 'workspace' : 'home';
      if (!currentWorkspace) return 'home';
    }
    return currentView;
  })();

  // Update view based on active state
  useEffect(() => {
    if (activeSection === 'archive') {
      setCurrentView('archive');
    } else if (activeSection === 'settings') {
      setCurrentView('settings');
    } else if (activeSection === 'account') {
      setCurrentView('account');
    } else if (activeSection === 'team') {
      setCurrentView('team');
    } else if (activeSection === 'home') {
      // Explicit home — always go home regardless of session/workspace state
      setCurrentView('home');
    } else if (activeSessionId) {
      setCurrentView('session');
    } else if (activeWorkspaceId) {
      setCurrentView('workspace');
    } else {
      setCurrentView('home');
    }
  }, [activeSessionId, activeWorkspaceId, activeSection]);

  // Handle deleted session - navigate back to workspace or home
  useEffect(() => {
    if (activeSessionId && !currentSession) {
      if (activeWorkspaceId && currentWorkspace) {
        setActiveSession(null);
        setActiveSection('workspaces');
        setCurrentView('workspace');
      } else {
        setActiveSession(null);
        setActiveWorkspace(null);
        setActiveSection('home');
        setCurrentView('home');
      }
    }
  }, [activeSessionId, currentSession, activeWorkspaceId, currentWorkspace, setActiveSession, setActiveWorkspace, setActiveSection]);

  // — Blank-screen detector —
  // After navigation, if no view branch matches what we expect to render, log
  // it to localStorage so we can audit any blank-screen reports across tab
  // closes. Also auto-recovers by forcing currentView to home.
  useEffect(() => {
    if (startingHouse) return;
    const branchHome = effectiveView === 'home';
    const branchWorkspace = effectiveView === 'workspace' && activeWorkspaceId;
    const branchSession = effectiveView === 'session' && activeWorkspaceId && currentSession;
    const branchSimple = ['archive', 'settings', 'account', 'team'].includes(effectiveView);
    const anythingMatches = branchHome || branchWorkspace || branchSession || branchSimple;
    if (!anythingMatches) {
      const snapshot = {
        when: new Date().toISOString(),
        effectiveView,
        currentView,
        activeWorkspaceId,
        activeSessionId,
        activeSection,
        hasCurrentSession: !!currentSession,
        hasCurrentWorkspace: !!currentWorkspace,
      };
      // eslint-disable-next-line no-console
      console.warn('[Fresco] Blank-screen state detected — recovering to home:', snapshot);
      try {
        const breadcrumbs = JSON.parse(localStorage.getItem('fresco-blank-breadcrumbs') || '[]');
        breadcrumbs.push(snapshot);
        localStorage.setItem('fresco-blank-breadcrumbs', JSON.stringify(breadcrumbs.slice(-20)));
      } catch { /* ignore */ }
      // Recovery: clear stale IDs and go home
      setActiveSession(null);
      setActiveWorkspace(null);
      setActiveSection('home');
      setCurrentView('home');
    }
  }, [effectiveView, currentView, activeWorkspaceId, activeSessionId, activeSection, currentSession, currentWorkspace, startingHouse, setActiveSession, setActiveWorkspace, setActiveSection]);

  // Handle deleted workspace — if an active workspace id points nowhere,
  // reset everything. Fires regardless of currentView so we can't get stuck.
  // Also clears any active session id, since the session may have belonged
  // to that workspace and not yet been cleaned up.
  useEffect(() => {
    if (activeWorkspaceId && !currentWorkspace) {
      // eslint-disable-next-line no-console
      console.warn('[Fresco] activeWorkspaceId points to nothing — recovering to home', { activeWorkspaceId });
      setActiveSession(null);
      setActiveWorkspace(null);
      setActiveSection('home');
      setCurrentView('home');
    }
  }, [activeWorkspaceId, currentWorkspace, setActiveSession, setActiveWorkspace, setActiveSection]);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  // Listen for upgrade events from nested components (e.g. NextToolkitCTA)
  useEffect(() => {
    const handler = () => setShowPricingModal(true);
    window.addEventListener('fresco:upgrade', handler);
    return () => window.removeEventListener('fresco:upgrade', handler);
  }, []);



  // Backfill the guest run counter for anonymous users with existing
  // sessions (e.g., users who ran sessions before the counter was wired).
  // Runs once per browser thanks to a sentinel key in localStorage.
  useEffect(() => {
    if (status === 'authenticated') return;  // not anonymous — skip
    if (status === 'loading') return;        // wait for auth to resolve
    backfillGuestRunCount(sessions.length);
    // Intentionally narrow deps — we only want this to run when auth status
    // resolves the first time. The function itself is idempotent via the
    // sentinel key, so re-running on session changes is safe but redundant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleNavigate = (section: string) => {
    if (section === 'home') {
      setActiveWorkspace(null);
      setActiveSession(null);
      setActiveSection('home');
      setCurrentView('home');
    } else if (section === 'archive') {
      setActiveSession(null);
      setActiveSection('archive');
      setCurrentView('archive');
    } else if (section === 'settings') {
      setActiveSession(null);
      setActiveSection('settings');
      setCurrentView('settings');
    } else if (section === 'account') {
      setActiveSession(null);
      setActiveSection('account');
      setCurrentView('account');
    } else if (section === 'team') {
      setActiveSession(null);
      setActiveSection('team');
      setCurrentView('team');
    } else if (section === 'workspaces') {
      setActiveSession(null);
      setActiveSection('workspaces');
      setCurrentView('workspace');
    }
  };

  const handleNavigateToWorkspace = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    setActiveSession(null);
    setActiveSection('workspaces');
    setCurrentView('workspace');
  };

  const handleNavigateToSession = (sessionId: string, workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    setActiveSession(sessionId);
    setActiveSection('toolkit');
    setCurrentView('session');
  };

  const handleCreateWorkspace = async () => {
    const isAnonymous = status !== 'authenticated';
    if (isAnonymous && !canGuestRun()) {
      setUpgradeReason('guest_limit');
      setShowUpgradeModal(true);
      return;
    }
    if (!canCreateWorkspace()) {
      setUpgradeReason('workspaces');
      setShowUpgradeModal(true);
      return;
    }
    setShowNewWorkspaceModal(true);
  };

  const handleConfirmNewWorkspace = async (title: string, teamId?: string) => {
    const workspace = await db.createWorkspace(title, 'A new thinking space for clarity.', teamId);
    setActiveWorkspace(workspace.id);
    setActiveSession(null);
    setActiveSection('workspaces');
    setCurrentView('workspace');
  };

  const handleStartToolkit = async (toolkitType: string) => {
    // Same anonymous gate as house starts — 3 lifetime runs then sign-up.
    const isAnonymous = status !== 'authenticated';
    if (isAnonymous && !canGuestRun()) {
      setUpgradeReason('guest_limit');
      setShowUpgradeModal(true);
      return;
    }
    let workspaceId = activeWorkspaceId;
    if (!workspaceId) {
      if (!canCreateWorkspace()) {
        setUpgradeReason('workspaces');
        setShowUpgradeModal(true);
        return;
      }
      const workspace = await db.createWorkspace('New Workspace', 'Created for a new thinking session.');
      workspaceId = workspace.id;
    }
    const session = await db.createSession(workspaceId, toolkitType as ToolkitType);
    handleNavigateToSession(session.id, workspaceId);
  };

  const handleStartHouse = async (houseId: HouseId, fromSessionId?: string, initialInput?: string) => {
    // Anonymous users get 3 lifetime house runs. Counter is incremented when
    // a verdict lands (HouseSession), and persisted in localStorage. After
    // 3 runs, they must sign up — the upgrade modal's 'guest_limit' branch
    // pivots to a sign-up CTA rather than a Pro upgrade.
    const isAnonymous = status !== 'authenticated';
    if (isAnonymous && !canGuestRun()) {
      setUpgradeReason('guest_limit');
      setShowUpgradeModal(true);
      return;
    }
    let workspaceId = activeWorkspaceId;
    if (!workspaceId && !canCreateWorkspace()) {
      setUpgradeReason('workspaces');
      setShowUpgradeModal(true);
      return;
    }
    setStartingHouse(houseId);
    try {
      if (!workspaceId) {
        const houseNames: Record<string, string> = {
          investigate: 'Investigate', innovate: 'Innovate',
          validate: 'Validate', evaluate: 'Evaluate',
        };
        const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        const title = `${houseNames[houseId] || 'New'} · ${month}`;
        const workspace = await db.createWorkspace(title, '');
        workspaceId = workspace.id;
      }
      const session = await db.createHouseSession(workspaceId, houseId);
      // Record a handoff if this session was started from another — we stash the
      // source session id in sessionStorage keyed on the new session id so
      // HouseSession can pick it up on mount. sessionStorage (not state) so it
      // survives the navigation state transitions.
      if (fromSessionId) {
        try {
          sessionStorage.setItem(`fresco-handoff-${session.id}`, fromSessionId);
        } catch { /* storage unavailable — continue anyway */ }
      }
      // If the user typed a diagnostic sentence on the home screen, carry it
      // into the new session as a pre-fill for the first question.
      if (initialInput && initialInput.trim()) {
        try {
          sessionStorage.setItem(`fresco-seed-${session.id}`, initialInput.trim());
        } catch { /* ignore */ }
      }
      handleNavigateToSession(session.id, workspaceId);
    } catch (err) {
      console.error('Failed to start house:', err);
    } finally {
      setStartingHouse(null);
    }
  };

  const handleBackToHome = () => {
    setActiveWorkspace(null);
    setActiveSession(null);
    setActiveSection('home');
    setCurrentView('home');
  };

  const handleBackToWorkspace = () => {
    if (!activeWorkspaceId) {
      setActiveSession(null);
      setActiveWorkspace(null);
      setActiveSection('home');
      setCurrentView('home');
      return;
    }
    // Set view BEFORE clearing session to avoid effectiveView momentarily
    // resolving to 'home' during the state transition
    setCurrentView('workspace');
    setActiveSection('workspaces');
    setActiveSession(null);
  };


  // Handle post-login checkout intent
  useEffect(() => {
    if (!isSyncComplete || !user) return;
    const raw = sessionStorage.getItem('post_login_action');
    if (!raw) return;
    try {
      const action = JSON.parse(raw);
      sessionStorage.removeItem('post_login_action');
      if (action.type === 'checkout') {
        const checkoutUrls: Record<string, string> = {
          pro:    'https://frescolab.lemonsqueezy.com/checkout/buy/7621eccf-cb2f-4f75-94f0-c092b201f03b',
          studio: 'https://frescolab.lemonsqueezy.com/checkout/buy/76f524c3-3cf8-49cf-98c3-2cd56465d460',
        };
        const url = checkoutUrls[action.plan];
        if (url) window.open(url, '_blank', 'noopener');
      }
    } catch (e) {
      console.error('post_login_action error', e);
    }
  }, [isSyncComplete, user]);

  return (
    <div className="min-h-screen bg-fresco-white">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="hidden md:block">
        <LeftNavRail onNavigate={handleNavigate} onStartHouse={handleStartHouse} />
      </div>

      <MobileNav activeSection={activeSection} onNavigate={handleNavigate} userSubscription={user?.subscription} onStartHouse={handleStartHouse} />

      <main id="main-content" className="md:ml-[220px] min-h-screen relative">
        <ErrorBoundary
          onReset={() => {
            // Force-navigate home and clear any stale IDs
            setActiveSession(null);
            setActiveWorkspace(null);
            setActiveSection('home');
            setCurrentView('home');
          }}
        >
        <AnimatePresence mode="wait">
          {startingHouse && (
            <motion.div key="starting-house" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-screen flex items-center justify-center fresco-grid-bg-subtle">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-fresco-border border-t-fresco-black rounded-full animate-spin" />
                <p className="fresco-label">Starting {startingHouse}…</p>
              </div>
            </motion.div>
          )}
          {!startingHouse && effectiveView === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <HomeDashboard
                onNavigateToWorkspace={handleNavigateToWorkspace}
                onNavigateToSession={handleNavigateToSession}
onStartToolkit={handleStartToolkit}
                onStartHouse={handleStartHouse}
              />
            </motion.div>
          )}

          {!startingHouse && effectiveView === 'workspace' && activeWorkspaceId && (
            <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <WorkspaceOverview
                workspaceId={activeWorkspaceId}
                onBack={handleBackToHome}
                onOpenSession={(sessionId) => handleNavigateToSession(sessionId, activeWorkspaceId)}
                onStartToolkit={handleStartToolkit}
                onStartHouse={handleStartHouse}
              />
            </motion.div>
          )}

          {!startingHouse && effectiveView === 'session' && activeWorkspaceId && currentSession && (
            <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="h-screen">
              <ToolkitRouter
                sessionId={currentSession.id}
                workspaceId={activeWorkspaceId}
                onBack={handleBackToWorkspace}
                onStartToolkit={handleStartToolkit}
                onNavigateToHouse={(houseId, fromSessionId) => handleStartHouse(houseId, fromSessionId)}
              />
            </motion.div>
          )}

          {!startingHouse && effectiveView === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <ArchivePage onOpenSession={(sessionId, workspaceId) => handleNavigateToSession(sessionId, workspaceId)} />
            </motion.div>
          )}

          {!startingHouse && effectiveView === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <SettingsPage />
            </motion.div>
          )}

          {!startingHouse && effectiveView === 'account' && (
            <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <AccountPage />
            </motion.div>
          )}

          {!startingHouse && effectiveView === 'team' && (
            <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <TeamPage
                userId={user?.id || ''}
                userSubscription={user?.subscription || 'free'}
                onUpgrade={() => setShowUpgradeModal(true)}
              />
            </motion.div>
          )}
          {/* Safety net — if no branch above matched (e.g. a race during delete
              where state is briefly inconsistent), render home rather than
              show a blank screen. */}
          {!startingHouse && ![
            'home', 'workspace', 'session', 'archive', 'settings', 'account', 'team'
          ].includes(effectiveView) && (
            <motion.div key="fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <HomeDashboard
                onNavigateToWorkspace={handleNavigateToWorkspace}
                onNavigateToSession={handleNavigateToSession}
                onStartToolkit={handleStartToolkit}
                onStartHouse={handleStartHouse}
              />
            </motion.div>
          )}
          {/* Additional guard: the 'session' branch requires both currentSession
              AND activeWorkspaceId. If effectiveView got stuck on 'session' but
              those are missing, render home. */}
          {!startingHouse && effectiveView === 'session' && (!activeWorkspaceId || !currentSession) && (
            <motion.div key="session-fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <HomeDashboard
                onNavigateToWorkspace={handleNavigateToWorkspace}
                onNavigateToSession={handleNavigateToSession}
                onStartToolkit={handleStartToolkit}
                onStartHouse={handleStartHouse}
              />
            </motion.div>
          )}
          {/* Same guard for workspace. */}
          {!startingHouse && effectiveView === 'workspace' && !activeWorkspaceId && (
            <motion.div key="workspace-fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <HomeDashboard
                onNavigateToWorkspace={handleNavigateToWorkspace}
                onNavigateToSession={handleNavigateToSession}
                onStartToolkit={handleStartToolkit}
                onStartHouse={handleStartHouse}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </ErrorBoundary>
      </main>

      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
        currentUsage={upgradeReason === 'guest_limit' ? getGuestRunCount() : workspaces.length}
        limit={upgradeReason === 'guest_limit' ? GUEST_RUN_LIMIT : getUsageLimits().workspaces}
      />

      <NewWorkspaceModal
        isOpen={showNewWorkspaceModal}
        onClose={() => setShowNewWorkspaceModal(false)}
        onConfirm={handleConfirmNewWorkspace}
        userSubscription={user?.subscription}
      />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />
    </div>
  );
}

export function FrescoApp() {
  return (
    <ToastProvider>
      <FrescoAppContent />
    </ToastProvider>
  );
}
