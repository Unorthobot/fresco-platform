'use client';

import { useState } from 'react';
import { useFrescoStore } from '@/lib/store';
import { Folder, Zap } from 'lucide-react';

export function UsageIndicator() {
  const { workspaces, user, getUsageLimits } = useFrescoStore();
  const limits = getUsageLimits();
  const [loading, setLoading] = useState<'pro' | 'studio' | null>(null);

  const workspaceCount = workspaces.length;
  const workspaceLimit = limits.workspaces;
  const aiCount = user?.aiGenerationsThisMonth || 0;
  const aiLimit = limits.aiGenerationsPerMonth;

  // Don't show for Pro/Studio users (unlimited = -1)
  if (workspaceLimit === -1) return null;

  const workspacePercentage = (workspaceCount / workspaceLimit) * 100;
  const aiPercentage = (aiCount / aiLimit) * 100;

  const handleUpgrade = async (plan: 'pro' | 'studio') => {
    setLoading(plan);
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* silent */ }
    setLoading(null);
  };

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
              workspacePercentage >= 100 ? 'bg-fresco-black' :
              workspacePercentage >= 66 ? 'bg-fresco-graphite-mid' : 'bg-fresco-graphite-light'
            }`}
            style={{ width: `${Math.min(workspacePercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* AI Generations */}
      <div className="mb-4">
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
              aiPercentage >= 100 ? 'bg-fresco-black' :
              aiPercentage >= 66 ? 'bg-fresco-graphite-mid' : 'bg-fresco-graphite-light'
            }`}
            style={{ width: `${Math.min(aiPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Upgrade CTAs */}
      <div className="pt-2 space-y-1">
        <button
          onClick={() => handleUpgrade('pro')}
          disabled={loading === 'pro'}
          className="fresco-nav-item text-fresco-black font-medium"
        >
          <span className="w-[18px] h-[18px] flex items-center justify-center text-fresco-xs">↑</span>
          <span>{loading === 'pro' ? 'Loading…' : 'Upgrade to Pro — $29'}</span>
        </button>
        <button
          onClick={() => handleUpgrade('studio')}
          disabled={loading === 'studio'}
          className="fresco-nav-item"
        >
          <span className="w-[18px] h-[18px] flex items-center justify-center text-fresco-xs">↑</span>
          <span>{loading === 'studio' ? 'Loading…' : 'Upgrade to Studio — $79'}</span>
        </button>
      </div>
    </div>
  );
}
