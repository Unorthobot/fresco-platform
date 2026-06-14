'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Folder, Archive, Settings, User, Users, Plus, ChevronDown, Trash2, X, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFrescoStore, useWorkspaces, useActiveWorkspace } from '@/lib/store';
import { useDBWrite } from '@/lib/useDBSync';
import { canUseTeams } from '@/lib/teamAccess';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import { UsageIndicator } from '@/components/ui/UsageIndicator';
import { NewWorkspaceModal } from '@/components/ui/NewWorkspaceModal';
import type { HouseId } from '@/lib/agents';

interface LeftNavRailProps {
  onNavigate?: (section: string) => void;
  onStartHouse?: (houseId: HouseId) => void;
}

export function LeftNavRail({ onNavigate }: LeftNavRailProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === 'authenticated';
  const workspaces = useWorkspaces();
  const activeWorkspace = useActiveWorkspace();
  const { activeSection, setActiveSection, setActiveWorkspace, setActiveSession, createWorkspace,
    canCreateWorkspace, getUsageLimits, deleteWorkspace, user } = useFrescoStore();
  const db = useDBWrite();
  const [showWorkspaces, setShowWorkspaces] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredWorkspace, setHoveredWorkspace] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && deleteConfirm) setDeleteConfirm(null);
  }, [deleteConfirm]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCreateWorkspace = async () => {
    if (!canCreateWorkspace()) { setShowUpgradeModal(true); return; }
    setShowNewWorkspaceModal(true);
  };

  const handleConfirmCreateWorkspace = async (title: string, teamId?: string) => {
    const workspace = await db.createWorkspace(title, '', teamId);
    setActiveWorkspace(workspace.id);
    setActiveSession(null);
    setActiveSection('workspaces');
    onNavigate?.('workspaces');
  };

  const handleRename = (workspaceId: string, currentTitle: string) => {
    setRenamingId(workspaceId);
    setRenameValue(currentTitle);
  };

  const handleConfirmRename = async (workspaceId: string) => {
    if (renameValue.trim()) {
      await db.updateWorkspace(workspaceId, { title: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    setDeleteConfirm(null);
    // store.deleteWorkspace atomically: removes workspace, removes its
    // sessions, nulls activeWorkspaceId/activeSessionId if they matched,
    // sets activeSection to 'home'. Doing it in one synchronous call avoids
    // the brittle 'null state, wait 50ms, delete' dance that kept regressing.
    db.deleteWorkspace(workspaceId);
    onNavigate?.('home');
  };

  const handleNavClick = (section: string) => {
    if (section === 'home') {
      setActiveWorkspace(null); setActiveSession(null); setActiveSection('home'); onNavigate?.('home');
    } else {
      setActiveSection(section as any); onNavigate?.(section);
    }
  };

  const isActive = (section: string) => activeSection === section;

  return (
    <>
      <nav className="fixed left-0 top-0 w-[220px] h-screen bg-fresco-white border-r border-fresco-border-light flex flex-col z-50">
        {/* Logo */}
        <div className="h-14 px-5 flex items-center border-b border-fresco-border-light">
          <div className="flex items-center gap-2.5">
            <img src="/fresco-logo.png" alt="Fresco" className="w-5 h-5 icon-theme" />
            <span className="text-fresco-base font-semibold text-fresco-black tracking-tight">Fresco</span>
          </div>
        </div>

        {/* Main nav */}
        <div className="flex-1 py-3 overflow-y-auto">
          <div className="px-3 space-y-0.5 mb-3">
            <button onClick={() => handleNavClick('home')} className={cn('fresco-nav-item', isActive('home') && 'active')}>
              <Home className="w-4 h-4" /><span>Home</span>
            </button>
            <button onClick={() => handleNavClick('archive')} className={cn('fresco-nav-item', isActive('archive') && 'active')}>
              <Archive className="w-4 h-4" /><span>Archive</span>
            </button>
          </div>

          {/* Workspaces */}
          <div className="px-3 mt-2">
            <button
              onClick={() => setShowWorkspaces(!showWorkspaces)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-fresco-xs font-medium uppercase tracking-wider text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors mb-1"
            >
              <span>Workspaces</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', !showWorkspaces && '-rotate-90')} />
            </button>

            <AnimatePresence>
              {showWorkspaces && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="space-y-0.5">
                    {workspaces.length === 0 ? (
                      <p className="px-2 py-2 text-fresco-xs text-fresco-graphite-light">No workspaces yet</p>
                    ) : (
                      workspaces.slice(0, 8).map((workspace) => (
                        <div key={workspace.id} className="relative"
                          onMouseEnter={() => setHoveredWorkspace(workspace.id)}
                          onMouseLeave={() => setHoveredWorkspace(null)}>
                          {renamingId === workspace.id ? (
                            <div className="flex items-center gap-1 px-2 py-1">
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleConfirmRename(workspace.id);
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                                onBlur={() => handleConfirmRename(workspace.id)}
                                className="flex-1 min-w-0 text-fresco-sm bg-white border border-fresco-black px-2 py-0.5 focus:outline-none"
                              />
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => { setActiveWorkspace(workspace.id); setActiveSession(null); setActiveSection('workspaces'); onNavigate?.('workspaces'); }}
                                onDoubleClick={() => handleRename(workspace.id, workspace.title)}
                                title="Double-click to rename"
                                className={cn(
                                  'flex items-center gap-2 w-full px-2 py-1.5 text-fresco-sm transition-all text-left rounded-none',
                                  hoveredWorkspace === workspace.id ? 'pr-14' : '',
                                  activeWorkspace?.id === workspace.id
                                    ? 'text-fresco-black bg-fresco-light-gray font-medium'
                                    : 'text-fresco-graphite-mid hover:text-fresco-black hover:bg-fresco-light-gray'
                                )}>
                                <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate flex-1 min-w-0">{workspace.title}</span>
                                {workspace.teamId && hoveredWorkspace !== workspace.id && (
                                  <Users className="w-3 h-3 text-fresco-graphite-light flex-shrink-0" />
                                )}
                              </button>
                              {hoveredWorkspace === workspace.id && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                  <button onClick={(e) => { e.stopPropagation(); handleRename(workspace.id, workspace.title); }}
                                    className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors"
                                    title="Rename">
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(workspace.id); }}
                                    className="p-1 text-fresco-graphite-light hover:text-red-500 transition-colors"
                                    title="Delete">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}
                    {workspaces.length > 8 && (
                      <p className="px-2 py-1 text-fresco-xs text-fresco-graphite-light">+{workspaces.length - 8} more</p>
                    )}
                    <button onClick={handleCreateWorkspace}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-fresco-sm text-fresco-graphite-light hover:text-fresco-black transition-colors">
                      <Plus className="w-3.5 h-3.5" /><span>New workspace</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="py-3 px-3 border-t border-fresco-border-light space-y-0.5">
          {/* Team retired June 2026 — kept for one grandfathered account. */}
          {canUseTeams(user?.email) && (
            <button onClick={() => handleNavClick('team')} className={cn('fresco-nav-item', isActive('team') && 'active')}>
              <Users className="w-4 h-4" /><span>Team</span>
            </button>
          )}
          <button onClick={() => handleNavClick('settings')} className={cn('fresco-nav-item', isActive('settings') && 'active')}>
            <Settings className="w-4 h-4" /><span>Settings</span>
          </button>
          {isAuthenticated ? (
            <button onClick={() => handleNavClick('account')} className={cn('fresco-nav-item', isActive('account') && 'active')}>
              {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="truncate">{session?.user?.name?.split(' ')[0] || 'Account'}</span>
            </button>
          ) : (
            <button onClick={() => router.push('/login')} className="fresco-nav-item text-amber-600 hover:bg-amber-50">
              <User className="w-4 h-4" /><span>Sign in</span>
            </button>
          )}
        </div>

        <UsageIndicator />

        <div className="px-4 pb-3 flex gap-3">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors">Privacy</a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors">Terms</a>
        </div>
      </nav>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }} onClick={e => e.stopPropagation()}
              className="bg-white p-6 max-w-sm w-full mx-4 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-fresco-base font-medium text-fresco-black">Delete workspace?</h3>
                <button onClick={() => setDeleteConfirm(null)} className="p-1 text-fresco-graphite-light hover:text-fresco-black">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">This will permanently delete all sessions inside. Can't be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 h-9 text-fresco-sm text-fresco-graphite-mid border border-fresco-border hover:bg-fresco-light-gray transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleDeleteWorkspace(deleteConfirm!)}
                  className="flex-1 h-9 text-fresco-sm text-white bg-red-600 hover:bg-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)}
        reason="workspaces" currentUsage={workspaces.length} limit={getUsageLimits().workspaces} />
      <NewWorkspaceModal isOpen={showNewWorkspaceModal} onClose={() => setShowNewWorkspaceModal(false)}
        onConfirm={handleConfirmCreateWorkspace} userSubscription={user?.subscription} userEmail={user?.email} />
    </>
  );
}
