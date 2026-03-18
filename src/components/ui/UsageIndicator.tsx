'use client';

import { useState } from 'react';
import { useFrescoStore } from '@/lib/store';
import { Folder, Zap } from 'lucide-react';
import { PricingModal } from '@/components/ui/PricingModal';

export function UsageIndicator() {
  const { workspaces, user, getUsageLimits } = useFrescoStore();
  const limits = getUsageLimits();
  const [showPricing, setShowPricing] = useState(false);

  const workspaceCount = workspaces.length;
  const workspaceLimit = limits.workspaces;
  const aiCount = user?.aiGenerationsThisMonth || 0;
  const aiLimit = limits.aiGenerationsPerMonth;

  if (workspaceLimit === -1) return null;

  const workspacePercentage = (workspaceCount / workspaceLimit) * 100;
  const aiPercentage = (aiCount / aiLimit) * 100;

  return (
    <>
      <div className="px-4 py-3 border-t border-fresco-border-light">
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wider mb-3">Free Plan</p>

        <div className="mb-3">
          <div className="flex items-center justify-between text-fresco-xs mb-1">
            <span className="flex items-center gap-1.5 text-fresco-graphite-mid">
              <Folder className="w-3 h-3" />Workspaces
            </span>
            <span className={`font-medium ${workspacePercentage >= 100 ? 'text-fresco-black' : 'text-fresco-graphite-mid'}`}>
              {workspaceCount}/{workspaceLimit}
            </span>
          </div>
          <div className="h-1.5 bg-fresco-light-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-fresco-black rounded-full transition-all"
              style={{ width: `${Math.min(workspacePercentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-fresco-xs mb-1">
            <span className="flex items-center gap-1.5 text-fresco-graphite-mid">
              <Zap className="w-3 h-3" />AI Generations
            </span>
            <span className={`font-medium ${aiPercentage >= 100 ? 'text-fresco-black' : 'text-fresco-graphite-mid'}`}>
              {aiCount}/{aiLimit}
            </span>
          </div>
          <div className="h-1.5 bg-fresco-light-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-fresco-black rounded-full transition-all"
              style={{ width: `${Math.min(aiPercentage, 100)}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => setShowPricing(true)}
          className="fresco-nav-item font-medium text-fresco-black"
        >
          <span className="w-[18px] h-[18px] flex items-center justify-center text-fresco-xs">↑</span>
          <span>Upgrade</span>
        </button>
      </div>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
}
