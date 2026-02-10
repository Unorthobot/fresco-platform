'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFrescoStore } from '@/lib/store';
import { LeftNavRail } from '@/components/layout/LeftNavRail';
import { MobileNav } from '@/components/layout/MobileNav';
import { HomeDashboard } from '@/components/HomeDashboard';
import { WorkspaceOverview } from '@/components/workspace/WorkspaceOverview';
import { ToolkitRouter } from '@/components/toolkit/ToolkitRouter';
import { ArchivePage } from '@/components/ArchivePage';
import { SettingsPage } from '@/components/SettingsPage';
import { AccountPage } from '@/components/AccountPage';
import { ToastProvider } from '@/components/ui/Toast';
import { Onboarding, useOnboarding } from '@/components/ui/Onboarding';
import { type ToolkitType } from '@/types';

type View = 'home' | 'workspace' | 'session' | 'archive' | 'settings' | 'account';

export default function FrescoAppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const { showOnboarding, completeOnboarding } = useOnboarding();
  
  const {
    activeSection,
    activeWorkspaceId,
    activeSessionId,
    setActiveSection,
    setActiveWorkspace,
    setActiveSession,
    createWorkspace,
    createSession,
    sessions,
    workspaces,
  } = useFrescoStore();
  
  // Get current session and workspace
  const currentSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : null;
  const currentWorkspace = activeWorkspaceId ? workspaces.find(w => w.id === activeWorkspaceId) : null;
  
  // Update view based on active state
  useEffect(() => {
    if (activeSection === 'archive') {
      setCurrentView('archive');
    } else if (activeSection === 'settings') {
      setCurrentView('settings');
    } else if (activeSection === 'account') {
      setCurrentView('account');
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
      // Session was deleted, navigate back
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
    if (activeWorkspaceId && !currentWorkspace) {
      // Workspace was deleted, navigate back to home
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
    } else if (section === 'workspaces') {
      // Workspace navigation is handled by Zustand state changes
      // The useEffect will update currentView based on activeWorkspaceId
      setActiveSession(null);
      setActiveSection('workspaces');
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
  
  const handleCreateWorkspace = () => {
    const workspace = createWorkspace('New Workspace', 'A new thinking space for clarity.');
    setActiveWorkspace(workspace.id);
    setActiveSession(null);
    setActiveSection('workspaces');
    setCurrentView('workspace');
  };
  
  const handleStartToolkit = (toolkitType: ToolkitType) => {
    let workspaceId = activeWorkspaceId;
    if (!workspaceId) {
      const workspace = createWorkspace('New Workspace', 'Created for a new thinking session.');
      workspaceId = workspace.id;
    }
    const session = createSession(workspaceId, toolkitType);
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
  };
  
  return (
    <div className="min-h-screen bg-fresco-white">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      
      {/* Desktop Nav */}
      <div className="hidden md:block">
        <LeftNavRail onNavigate={handleNavigate} />
      </div>
      
      {/* Mobile Nav */}
      <MobileNav activeSection={activeSection} onNavigate={handleNavigate} />
      
      <main id="main-content" className="md:ml-[220px] min-h-screen">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <HomeDashboard
                onNavigateToWorkspace={handleNavigateToWorkspace}
                onNavigateToSession={handleNavigateToSession}
                onCreateWorkspace={handleCreateWorkspace}
                onStartToolkit={handleStartToolkit}
              />
            </motion.div>
          )}
          
          {currentView === 'workspace' && activeWorkspaceId && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <WorkspaceOverview
                workspaceId={activeWorkspaceId}
                onBack={handleBackToHome}
                onOpenSession={(sessionId) => handleNavigateToSession(sessionId, activeWorkspaceId)}
                onStartToolkit={handleStartToolkit}
              />
            </motion.div>
          )}
          
          {currentView === 'session' && currentSession && activeWorkspaceId && (
            <motion.div
              key="session"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-screen"
            >
              <ToolkitRouter
                sessionId={currentSession.id}
                workspaceId={activeWorkspaceId}
                onBack={handleBackToWorkspace}
                onStartToolkit={handleStartToolkit}
              />
            </motion.div>
          )}
          
          {currentView === 'archive' && (
            <motion.div
              key="archive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArchivePage
                onOpenSession={(sessionId, workspaceId) => handleNavigateToSession(sessionId, workspaceId)}
              />
            </motion.div>
          )}
          
          {currentView === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsPage />
            </motion.div>
          )}
          
          {currentView === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AccountPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Onboarding for first-time users */}
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
    </div>
  );
}

// Wrapper with ToastProvider
export function FrescoApp() {
  return (
    <ToastProvider>
      <FrescoAppContent />
    </ToastProvider>
  );
}
