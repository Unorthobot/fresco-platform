'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the app content with no SSR
const FrescoApp = dynamic(
  () => import('@/components/FrescoAppContent').then(mod => ({ default: mod.FrescoApp })), 
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <img src="/fresco-logo.png" alt="Fresco" className="w-8 h-8" />
          <span className="text-xl font-medium text-gray-900">Fresco</span>
        </div>
      </div>
    ),
  }
);

export default function Page() {
  return <FrescoApp />;
}
