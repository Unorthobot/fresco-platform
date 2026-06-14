'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Shield, Download, Trash2, Check, Crown, Puzzle, ArrowRight, Bell } from 'lucide-react';
import { useFrescoStore } from '@/lib/store';
import { useDBWrite } from '@/lib/useDBSync';
import { useTheme } from '@/lib/theme';
import { downloadJSON } from '@/lib/export';
import { getRevisitCadence, setRevisitCadence, CADENCE_OPTIONS, type RevisitCadence } from '@/lib/reminders';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const { sessions, workspaces, user, getUsageLimits } = useFrescoStore();
  const db = useDBWrite();
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cadence, setCadence] = useState<RevisitCadence>(() => getRevisitCadence());

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  // ── Plan & usage ──────────────────────────────────────────────────────────
  const tier = user?.subscription || 'free';
  // 'studio' is the grandfathered internal tier — surface it as Founder, the
  // only public paid name (functionally equivalent: unlimited verdicts + lenses).
  const planLabel = tier === 'free' ? 'Free' : 'Founder';
  const monthlyLimit = getUsageLimits().aiGenerationsPerMonth; // -1 = unlimited
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usedThisMonth = user?.aiGenerationsResetDate === currentMonth ? (user?.aiGenerationsThisMonth || 0) : 0;

  const handleExport = () => {
    downloadJSON(
      { exportedAt: new Date().toISOString(), workspaces, sessions },
      `fresco-export-${new Date().toISOString().slice(0, 10)}.json`
    );
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    // Deleting each workspace cascades its sessions in the store and fires the
    // DB delete for authenticated users.
    for (const w of [...workspaces]) {
      await db.deleteWorkspace(w.id);
    }
    setDeleting(false);
    setConfirmDelete(false);
  };

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

          {/* Plan & usage */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2"><Crown className="w-5 h-5" />Plan</h2>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-fresco-base text-fresco-black">{planLabel}</p>
                <p className="text-fresco-sm text-fresco-graphite-light">
                  {monthlyLimit === -1
                    ? 'Unlimited verdicts'
                    : `${Math.max(0, monthlyLimit - usedThisMonth)} of ${monthlyLimit} verdicts left this month`}
                </p>
              </div>
              {tier === 'free' && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('fresco:upgrade'))}
                  className="fresco-btn fresco-btn-sm"
                >
                  Upgrade <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Appearance */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              Appearance
            </h2>
            <div className="flex items-center justify-between py-4">
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
          </div>

          {/* Reminders */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2"><Bell className="w-5 h-5" />Reminders</h2>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-fresco-base text-fresco-black">Revisit decisions</p>
                <p className="text-fresco-sm text-fresco-graphite-light">Flag past decisions on your home as due for a fresh look</p>
              </div>
              <div className="flex gap-2">
                {CADENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setCadence(opt.value); setRevisitCadence(opt.value); showSaved(); }}
                    className={cn(
                      'px-3 py-2 text-fresco-sm rounded-fresco transition-colors',
                      cadence === opt.value ? 'bg-fresco-black text-white' : 'border border-fresco-border text-fresco-graphite-mid hover:bg-fresco-light-gray dark:hover:bg-gray-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Browser extension */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2"><Puzzle className="w-5 h-5" />Browser extension</h2>
            <div className="flex items-center justify-between py-4 border-b border-fresco-border-light">
              <div>
                <p className="text-fresco-base text-fresco-black">Fresco Evaluate</p>
                <p className="text-fresco-sm text-fresco-graphite-light">Evaluate any page, compare versions, and trace journeys in your browser</p>
              </div>
              <a href="/connect-extension" className="fresco-btn fresco-btn-sm">Set up <ArrowRight className="w-4 h-4" /></a>
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-fresco-base text-fresco-black">Extension keys</p>
                <p className="text-fresco-sm text-fresco-graphite-light">View and revoke the keys connected to your account</p>
              </div>
              <a href="/account/extensions" className="text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black underline underline-offset-4 transition-colors">Manage</a>
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
              <button onClick={handleExport} className="fresco-btn fresco-btn-sm"><Download className="w-4 h-4" />Export</button>
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-fresco-base text-red-600 dark:text-red-400">Delete All Data</p>
                <p className="text-fresco-sm text-fresco-graphite-light">
                  {confirmDelete ? 'This permanently deletes every workspace and session.' : 'This cannot be undone'}
                </p>
              </div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleting}
                    className="fresco-btn fresco-btn-sm fresco-btn-danger disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />{deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={workspaces.length === 0 && sessions.length === 0}
                  className="fresco-btn fresco-btn-sm fresco-btn-danger disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />Delete
                </button>
              )}
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
