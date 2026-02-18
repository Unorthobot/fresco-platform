'use client';

import { useFrescoStore } from '@/lib/store';
import { Folder, Zap } from 'lucide-react';

export function UsageIndicator() {
  const { workspaces, user, getUsageLimits } = useFrescoStore();
  const limits = getUsageLimits();
  
  const workspaceCount = workspaces.length;
  const workspaceLimit = limits.workspaces;
  const aiCount = user?.aiGenerationsThisMonth || 0;
  const aiLimit = limits.aiGenerationsPerMonth;
  
  // Don't show for Pro/Studio users (unlimited = -1)
  if (workspaceLimit === -1) return null;
  
  const workspacePercentage = (workspaceCount / workspaceLimit) * 100;
  const aiPercentage = (aiCount / aiLimit) * 100;
  
  return (
    <div className="px-4 py-3 border-t border-fresco-border-light">
      <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wider mb-3">Free Plan Usage</p>
      
      {/* Workspaces */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-fresco-xs mb-1">
          <span className="flex items-center gap-1.5 text-fresco-graphite-mid">
            <Folder className="w-3 h-3" />
            Workspaces
          </span>
          <span className={`font-medium ${workspacePercentage >= 100 ? 'text-red-600' : 'text-fresco-graphite-mid'}`}>
            {workspaceCount}/{workspaceLimit}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              workspacePercentage >= 100 ? 'bg-red-500' : 
              workspacePercentage >= 66 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(workspacePercentage, 100)}%` }}
          />
        </div>
      </div>
      
      {/* AI Generations */}
      <div>
        <div className="flex items-center justify-between text-fresco-xs mb-1">
          <span className="flex items-center gap-1.5 text-fresco-graphite-mid">
            <Zap className="w-3 h-3" />
            AI Generations
          </span>
          <span className={`font-medium ${aiPercentage >= 100 ? 'text-red-600' : 'text-fresco-graphite-mid'}`}>
            {aiCount}/{aiLimit}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              aiPercentage >= 100 ? 'bg-red-500' : 
              aiPercentage >= 66 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(aiPercentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
