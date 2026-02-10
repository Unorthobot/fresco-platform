'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Bell, Key, Shield, Download, Trash2, Check } from 'lucide-react';
import { useFrescoStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={cn('relative w-11 h-6 rounded-full transition-colors', checked ? 'bg-fresco-black dark:bg-white' : 'bg-fresco-border dark:bg-gray-600')}>
      <motion.div animate={{ x: checked ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 bg-white dark:bg-fresco-black rounded-full shadow-sm" />
    </button>
  );
}

export function SettingsPage() {
  const { sessions, workspaces, settings, updateSettings } = useFrescoStore();
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  
  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="min-h-screen fresco-grid-bg-subtle">
      <div className="px-6 md:px-12 py-16 border-b border-fresco-border-light">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <h1 className="text-fresco-4xl font-medium text-fresco-black tracking-tight mb-4">Settings</h1>
          <p className="text-fresco-lg text-fresco-graphite-mid">Configure your experience.</p>
        </motion.div>
      </div>

      <div className="px-6 md:px-12 py-12">
        <div className="max-w-2xl space-y-8">
          {saved && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-fresco-light-gray dark:bg-gray-800 text-fresco-black dark:text-white text-fresco-sm rounded-fresco flex items-center gap-2"><Check className="w-4 h-4" />Saved</motion.div>}

          {/* Appearance */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              Appearance
            </h2>
            <div className="flex items-center justify-between py-4 border-b border-fresco-border-light">
              <div>
                <p className="text-fresco-base text-fresco-black">Theme</p>
                <p className="text-fresco-sm text-fresco-graphite-light">Switch between light and dark mode</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setTheme('light'); showSaved(); }} 
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-fresco-sm rounded-fresco transition-colors',
                    theme === 'light' ? 'bg-fresco-black text-white' : 'border border-fresco-border text-fresco-graphite-mid hover:bg-fresco-light-gray dark:hover:bg-gray-700'
                  )}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button 
                  onClick={() => { setTheme('dark'); showSaved(); }} 
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-fresco-sm rounded-fresco transition-colors',
                    theme === 'dark' ? 'bg-white text-fresco-black' : 'border border-fresco-border text-fresco-graphite-mid hover:bg-fresco-light-gray dark:hover:bg-gray-700'
                  )}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-fresco-base text-fresco-black">Notifications</p>
                <p className="text-fresco-sm text-fresco-graphite-light">Enable browser notifications</p>
              </div>
              <Toggle checked={settings.notifications} onChange={(v) => { updateSettings({ notifications: v }); showSaved(); }} />
            </div>
          </div>

          {/* AI Configuration */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2"><Key className="w-5 h-5" />AI Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-fresco-sm text-fresco-black mb-2 block">Anthropic API Key</label>
                <p className="text-fresco-sm text-fresco-graphite-light mb-3">
                  Required for AI-powered insights. Get your key at{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-fresco-black dark:hover:text-white">
                    console.anthropic.com
                  </a>
                </p>
                <p className="text-fresco-sm text-fresco-graphite-light mb-3">
                  Create a file called <code className="px-1.5 py-0.5 bg-fresco-light-gray dark:bg-gray-700 rounded text-fresco-black dark:text-white">.env.local</code> in your project folder with:
                </p>
                <pre className="p-3 bg-fresco-light-gray dark:bg-gray-800 rounded-fresco text-fresco-sm text-fresco-black dark:text-white mb-3 overflow-x-auto">
                  ANTHROPIC_API_KEY=sk-ant-your-key-here
                </pre>
                <p className="text-fresco-sm text-fresco-graphite-light">
                  Then restart the dev server with <code className="px-1.5 py-0.5 bg-fresco-light-gray dark:bg-gray-700 rounded text-fresco-black dark:text-white">npm run dev</code>
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-fresco-border-light">
                <div>
                  <p className="text-fresco-base text-fresco-black">Auto-generate insights</p>
                  <p className="text-fresco-sm text-fresco-graphite-light">Generate insights as you type</p>
                </div>
                <Toggle checked={settings.autoGenerate} onChange={(v) => { updateSettings({ autoGenerate: v }); showSaved(); }} />
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2"><Shield className="w-5 h-5" />Data</h2>
            <div className="flex items-center justify-between py-4 border-b border-fresco-border-light">
              <div>
                <p className="text-fresco-base text-fresco-black">Export All Data</p>
                <p className="text-fresco-sm text-fresco-graphite-light">{workspaces.length} workspaces, {sessions.length} sessions</p>
              </div>
              <button className="fresco-btn fresco-btn-sm"><Download className="w-4 h-4" />Export</button>
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-fresco-base text-red-600 dark:text-red-400">Delete All Data</p>
                <p className="text-fresco-sm text-fresco-graphite-light">This cannot be undone</p>
              </div>
              <button className="fresco-btn fresco-btn-sm fresco-btn-danger">
                <Trash2 className="w-4 h-4" />Delete
              </button>
            </div>
          </div>

          <p className="text-center text-fresco-sm text-fresco-graphite-light pt-8 border-t border-fresco-border-light">
            Fresco v1.0 · frescolab.io
          </p>
        </div>
      </div>
    </div>
  );
}
