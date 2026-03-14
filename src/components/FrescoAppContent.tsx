'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
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
import { type ToolkitType } from '@/types';

type View = 'home' | 'workspace' | 'session' | 'archive' | 'settings' | 'account' | 'team';

export default function FrescoAppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
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

  // Compute effective view - ensures we never show a blank screen
  const effectiveView = (() => {
    if (currentView === 'workspace' && !activeWorkspaceId) return 'home';
    if (currentView === 'session' && (!activeWorkspaceId || !currentSession)) return 'home';
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
      if (activeWorkspaceId) {
        setActiveSession(null);
        setCurrentView('workspace');
      } else {
        setActiveSession(null);
        setActiveWorkspace(null);
        setCurrentView('home');
      }
    }
  }, [activeSessionId, currentSession, activeWorkspaceId, setActiveSession, setActiveWorkspace]);

  // Handle deleted workspace - navigate back to home
  useEffect(() => {
    if (!isSyncComplete) return; // Wait for DB sync before redirecting
    if ((currentView === 'workspace' || currentView === 'session') && (!activeWorkspaceId || !currentWorkspace)) {
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
    if (!canCreateWorkspace()) {
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
    let workspaceId = activeWorkspaceId;
    if (!workspaceId) {
      if (!canCreateWorkspace()) {
        setShowUpgradeModal(true);
        return;
      }
      const workspace = await db.createWorkspace('New Workspace', 'Created for a new thinking session.');
      workspaceId = workspace.id;
    }
    const session = await db.createSession(workspaceId, toolkitType as ToolkitType);
    handleNavigateToSession(session.id, workspaceId);
  };

  const handleBackToHome = () => {
    setActiveWorkspace(null);
    setActiveSession(null);
    setActiveSection('home');
    setCurrentView('home');
  };

  const handleBackToWorkspace = () => {
    setActiveSession(null);
    setActiveSection('workspaces');
    setCurrentView('workspace');
    // If no active workspace, go home instead
    if (!activeWorkspaceId) {
      setActiveSection('home');
      setCurrentView('home');
    }
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
        fetch('/api/lemonsqueezy/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: action.plan }),
        })
          .then(r => r.json())
          .then(data => { if (data.url) window.location.href = data.url; });
      }
    } catch (e) {
      console.error('post_login_action error', e);
    }
  }, [isSyncComplete, user]);

  return (
    <div className="min-h-screen bg-fresco-white">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="hidden md:block">
        <LeftNavRail onNavigate={handleNavigate} />
      </div>

      <MobileNav activeSection={activeSection} onNavigate={handleNavigate} userSubscription={user?.subscription} />

      <main id="main-content" className="md:ml-[220px] min-h-screen">
        <AnimatePresence mode="sync">
          {effectiveView === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <HomeDashboard
                onNavigateToWorkspace={handleNavigateToWorkspace}
                onNavigateToSession={handleNavigateToSession}
                onCreateWorkspace={handleCreateWorkspace}
                onStartToolkit={handleStartToolkit}
              />
            </motion.div>
          )}

          {effectiveView === 'workspace' && activeWorkspaceId && (
            <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <WorkspaceOverview
                workspaceId={activeWorkspaceId}
                onBack={handleBackToHome}
                onOpenSession={(sessionId) => handleNavigateToSession(sessionId, activeWorkspaceId)}
                onStartToolkit={handleStartToolkit}
              />
            </motion.div>
          )}

          {effectiveView === 'session' && activeWorkspaceId && currentSession && (
            <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-screen">
              <ToolkitRouter
                sessionId={currentSession.id}
                workspaceId={activeWorkspaceId}
                onBack={handleBackToWorkspace}
                onStartToolkit={handleStartToolkit}
              />
            </motion.div>
          )}

          {effectiveView === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ArchivePage onOpenSession={(sessionId, workspaceId) => handleNavigateToSession(sessionId, workspaceId)} />
            </motion.div>
          )}

          {effectiveView === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <SettingsPage />
            </motion.div>
          )}

          {effectiveView === 'account' && (
            <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AccountPage />
            </motion.div>
          )}

          {effectiveView === 'team' && (
            <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TeamPage
                userId={user?.id || ''}
                userSubscription={user?.subscription || 'free'}
                onUpgrade={() => setShowUpgradeModal(true)}
              />
            </motion.div>
          )}

          {effectiveView !== 'home' && effectiveView !== 'archive' && effectiveView !== 'settings' && effectiveView !== 'account' && effectiveView !== 'team' && !activeWorkspaceId && (
            <motion.div key="fallback-home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <HomeDashboard
                onNavigateToWorkspace={handleNavigateToWorkspace}
                onNavigateToSession={handleNavigateToSession}
                onCreateWorkspace={handleCreateWorkspace}
                onStartToolkit={handleStartToolkit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="workspaces"
        currentUsage={workspaces.length}
        limit={getUsageLimits().workspaces}
      />

      <NewWorkspaceModal
        isOpen={showNewWorkspaceModal}
        onClose={() => setShowNewWorkspaceModal(false)}
        onConfirm={handleConfirmNewWorkspace}
        userSubscription={user?.subscription}
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
