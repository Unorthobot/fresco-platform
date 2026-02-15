'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock, ArrowRight, X } from 'lucide-react';
import { useFrescoStore } from '@/lib/store';
import { formatRelativeTime, truncate } from '@/lib/utils';
import { TOOLKITS } from '@/types';

interface ArchivePageProps { onOpenSession?: (sessionId: string, workspaceId: string) => void; }

export function ArchivePage({ onOpenSession }: ArchivePageProps) {
  const { sessions, workspaces } = useFrescoStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const allSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    if (!searchQuery.trim()) return sorted;
    
    const query = searchQuery.toLowerCase();
    return sorted.filter(session => {
      const toolkit = TOOLKITS[session.toolkitType];
      const workspace = workspaces.find(w => w.id === session.workspaceId);
      
      // Search in toolkit name
      if (toolkit?.name.toLowerCase().includes(query)) return true;
      
      // Search in workspace title
      if (workspace?.title.toLowerCase().includes(query)) return true;
      
      // Search in sentence of truth
      if (session.sentenceOfTruth?.content?.toLowerCase().includes(query)) return true;
      
      // Search in step responses
      if (session.steps?.some(step => step.response?.toLowerCase().includes(query))) return true;
      
      // Search in insights
      if (session.insights?.some(insight => insight.content?.toLowerCase().includes(query))) return true;
      
      return false;
    });
  }, [sessions, workspaces, searchQuery]);
  
  const sentencesOfTruth = sessions.filter((s) => s.sentenceOfTruth?.content);

  return (
    <div className="min-h-screen fresco-grid-bg-subtle">
      <div className="px-6 md:px-12 py-16 border-b border-fresco-border-light">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
          <span className="fresco-label block mb-3">Memory System</span>
          <h1 className="text-fresco-4xl font-medium text-fresco-black tracking-tight mb-4">Archive</h1>
          <p className="text-fresco-lg text-fresco-graphite-mid">Your thinking history. Every insight preserved.</p>
        </motion.div>
      </div>

      <div className="px-6 md:px-12 py-6">
        <div className="max-w-4xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fresco-graphite-light" />
          <input 
            type="text" 
            placeholder="Search sessions, toolkits, insights..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 h-12 bg-transparent border border-fresco-border rounded-fresco text-fresco-base focus:outline-none focus:border-fresco-black dark:text-white dark:border-gray-700 dark:focus:border-white" 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-6 md:px-12 py-12">
        <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-fresco-xl font-medium text-fresco-black">
                {searchQuery ? `Results for "${searchQuery}"` : 'All Sessions'}
              </h2>
              {searchQuery && (
                <span className="text-fresco-sm text-fresco-graphite-light">
                  {allSessions.length} {allSessions.length === 1 ? 'result' : 'results'}
                </span>
              )}
            </div>
            {allSessions.length === 0 ? (
              <div className="fresco-card p-8 text-center">
                <p className="text-fresco-graphite-mid">
                  {searchQuery ? `No sessions matching "${searchQuery}"` : 'No sessions yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allSessions.map((session) => {
                  const ws = workspaces.find((w) => w.id === session.workspaceId);
                  return (
                    <button key={session.id} onClick={() => onOpenSession?.(session.id, session.workspaceId)} className="w-full fresco-card-hover p-4 text-left group">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-fresco-base font-medium text-fresco-black">{TOOLKITS[session.toolkitType]?.name}</h3>
                          <p className="text-fresco-sm text-fresco-graphite-light mt-1">{ws?.title} · {formatRelativeTime(session.updatedAt)}</p>
                          {session.sentenceOfTruth?.content && <p className="text-fresco-sm text-fresco-graphite-soft mt-2 italic">"{truncate(session.sentenceOfTruth.content, 80)}"</p>}
                        </div>
                        <ArrowRight className="w-4 h-4 text-fresco-graphite-light opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <h3 className="fresco-label mb-4">Statistics</h3>
            <div className="fresco-card p-5 space-y-4">
              <div className="flex justify-between"><span className="text-fresco-sm text-fresco-graphite-mid">Sessions</span><span className="text-fresco-base font-medium text-fresco-black">{sessions.length}</span></div>
              <div className="flex justify-between"><span className="text-fresco-sm text-fresco-graphite-mid">Workspaces</span><span className="text-fresco-base font-medium text-fresco-black">{workspaces.length}</span></div>
              <div className="flex justify-between"><span className="text-fresco-sm text-fresco-graphite-mid">Sentences of Truth</span><span className="text-fresco-base font-medium text-fresco-black">{sentencesOfTruth.length}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
