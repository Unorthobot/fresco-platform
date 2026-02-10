'use client';

// FRESCO Left Navigation Rail - Matching frescolab.io design

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Folder,
  Archive,
  Settings,
  User,
  Plus,
  ChevronDown,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFrescoStore, useWorkspaces, useActiveWorkspace } from '@/lib/store';
import type { Workspace } from '@/types';

interface LeftNavRailProps {
  onNavigate?: (section: string) => void;
}

export function LeftNavRail({ onNavigate }: LeftNavRailProps) {
  const workspaces = useWorkspaces();
  const activeWorkspace = useActiveWorkspace();
  const {
    activeSection,
    setActiveSection,
    setActiveWorkspace,
    setActiveSession,
    createWorkspace,
    deleteWorkspace,
    user,
  } = useFrescoStore();
  
  const [showWorkspaces, setShowWorkspaces] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredWorkspace, setHoveredWorkspace] = useState<string | null>(null);
  
  // Escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && deleteConfirm) {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const handleCreateWorkspace = () => {
    const workspace = createWorkspace('New Workspace', 'A new thinking space');
    setActiveWorkspace(workspace.id);
    setActiveSession(null);
    setActiveSection('workspaces');
    onNavigate?.('workspaces');
  };
  
  const handleDeleteWorkspace = (workspaceId: string) => {
    // First clear state before deleting
    if (activeWorkspace?.id === workspaceId) {
      setActiveWorkspace(null);
      setActiveSession(null);
      setActiveSection('home');
    }
    // Then delete the workspace
    deleteWorkspace(workspaceId);
    setDeleteConfirm(null);
    // Force navigation to home
    onNavigate?.('home');
  };
  
  const handleNavClick = (section: string) => {
    if (section === 'home') {
      setActiveWorkspace(null);
      setActiveSession(null);
      setActiveSection('home');
      onNavigate?.('home');
    } else {
      setActiveSection(section as 'home' | 'workspaces' | 'archive' | 'toolkit' | 'settings' | 'account');
      onNavigate?.(section);
    }
  };
  
  const isActive = (section: string) => activeSection === section;
  
  return (
    <>
      <nav className="fixed left-0 top-0 w-[220px] h-screen bg-fresco-white border-r border-fresco-border-light flex flex-col z-50">
        {/* Logo */}
        <div className="h-16 px-5 flex items-center border-b border-fresco-border-light">
          <div className="flex items-center gap-2">
            <img src="/fresco-logo.png" alt="Fresco" className="w-6 h-6 icon-theme" />
            <span className="text-fresco-lg font-bold text-fresco-black tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Fresco</span>
          </div>
        </div>
        
        {/* Main Navigation */}
        <div className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 mb-2">
            <button
              onClick={() => handleNavClick('home')}
              className={cn('fresco-nav-item', isActive('home') && 'active')}
            >
              <Home className="w-[18px] h-[18px]" />
              <span>Home</span>
            </button>
            
            <button
              onClick={() => handleNavClick('archive')}
              className={cn('fresco-nav-item', isActive('archive') && 'active')}
            >
              <Archive className="w-[18px] h-[18px]" />
              <span>Archive</span>
            </button>
          </div>
          
          {/* Workspaces */}
          <div className="mt-6 px-3">
            <button
              onClick={() => setShowWorkspaces(!showWorkspaces)}
              className="flex items-center justify-between w-full px-3 py-2 text-fresco-xs font-medium uppercase tracking-wider text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors"
            >
              <span>Workspaces</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  !showWorkspaces && '-rotate-90'
                )}
              />
            </button>
            
            <AnimatePresence>
              {showWorkspaces && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="py-1">
                    {workspaces.length === 0 ? (
                      <p className="px-3 py-2 text-fresco-sm text-fresco-graphite-light">
                        No workspaces
                      </p>
                    ) : (
                      workspaces.slice(0, 8).map((workspace) => (
                        <div
                          key={workspace.id}
                          className="relative"
                          onMouseEnter={() => setHoveredWorkspace(workspace.id)}
                          onMouseLeave={() => setHoveredWorkspace(null)}
                        >
                          <button
                            onClick={() => {
                              setActiveWorkspace(workspace.id);
                              setActiveSession(null);
                              setActiveSection('workspaces');
                              onNavigate?.('workspaces');
                            }}
                            className={cn(
                              'flex items-center gap-2.5 w-full px-3 py-2 text-fresco-sm rounded-md transition-all',
                              activeWorkspace?.id === workspace.id
                                ? 'text-fresco-black bg-fresco-light-gray font-medium'
                                : 'text-fresco-graphite-mid hover:text-fresco-black hover:bg-fresco-light-gray'
                            )}
                          >
                            <Folder className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{workspace.title}</span>
                          </button>
                          
                          {hoveredWorkspace === workspace.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(workspace.id);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-fresco-graphite-light hover:text-red-500 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    
                    {workspaces.length > 8 && (
                      <button className="px-3 py-2 text-fresco-xs text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors">
                        View all ({workspaces.length})
                      </button>
                    )}
                    
                    <button
                      onClick={handleCreateWorkspace}
                      className="flex items-center gap-2.5 w-full px-3 py-2 mt-1 text-fresco-sm text-fresco-graphite-light hover:text-fresco-black rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Workspace</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Bottom Navigation */}
        <div className="py-4 px-3 border-t border-fresco-border-light">
          <button
            onClick={() => handleNavClick('settings')}
            className={cn('fresco-nav-item', isActive('settings') && 'active')}
          >
            <Settings className="w-[18px] h-[18px]" />
            <span>Settings</span>
          </button>
          
          <button
            onClick={() => handleNavClick('account')}
            className={cn('fresco-nav-item', isActive('account') && 'active')}
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" className="w-[18px] h-[18px] rounded-full object-cover" />
            ) : (
              <User className="w-[18px] h-[18px]" />
            )}
            <span>Account</span>
          </button>
        </div>
      </nav>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-fresco-lg p-6 max-w-sm w-full mx-4 shadow-fresco-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-fresco-lg font-medium text-fresco-black">
                  Delete Workspace?
                </h3>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="p-1 text-fresco-graphite-light hover:text-fresco-black rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">
                This will permanently delete the workspace and all its sessions. This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 h-10 text-fresco-sm text-fresco-graphite-mid border border-fresco-border rounded-fresco hover:bg-fresco-light-gray transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteWorkspace(deleteConfirm)}
                  className="flex-1 h-10 text-fresco-sm text-white bg-red-500 rounded-fresco hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
