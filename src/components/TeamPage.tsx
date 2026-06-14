'use client';

// Team collaboration retired June 2026. Fresco is a solo decision engine —
// the public ladder is Free + Founder. This page is no longer linked from
// anywhere in the app; the notice is defensive for deep-links or stale
// clients. Existing shared workspaces are untouched and still resolve under
// Workspaces. Props are kept for call-site compatibility.

import { Building2 } from 'lucide-react';

interface TeamPageProps {
  userId?: string;
  userSubscription?: string;
  onUpgrade?: () => void;
}

export function TeamPage(_props: TeamPageProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-fresco-2xl font-medium text-fresco-black">Team</h1>
      </div>
      <div className="border-2 border-dashed border-fresco-border rounded-none p-12 text-center">
        <div className="w-14 h-14 bg-fresco-light-gray rounded-none flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-7 h-7 text-fresco-graphite-mid" />
        </div>
        <h2 className="text-fresco-lg font-medium text-fresco-black mb-3">Team collaboration has been retired</h2>
        <p className="text-fresco-sm text-fresco-graphite-mid max-w-sm mx-auto">
          Fresco is now a solo decision engine. Any workspaces you previously
          shared remain available to you under Workspaces.
        </p>
      </div>
    </div>
  );
}
