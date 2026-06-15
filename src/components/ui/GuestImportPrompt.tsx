'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Import } from 'lucide-react';
import { describeGuestImport, type PendingGuestImport } from '@/lib/guestImport';

interface GuestImportPromptProps {
  pending: PendingGuestImport | null;
  accountEmail?: string | null;
  onImport: () => Promise<void> | void;
  onDiscard: () => void;
}

// Consent gate for guest → account import. Shown once after sign-in when work
// was created before signing in. Importing writes it to this account; declining
// discards it. This is what stops one person's pre-sign-in decision from
// silently landing in whoever logs in first on a shared browser.
export function GuestImportPrompt({ pending, accountEmail, onImport, onDiscard }: GuestImportPromptProps) {
  const [busy, setBusy] = useState(false);
  const open = !!pending;
  const label = pending ? describeGuestImport(pending) : '';

  const handleImport = async () => {
    setBusy(true);
    try {
      await onImport();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="bg-fresco-white border border-fresco-border rounded-none shadow-xl max-w-sm w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-fresco-black px-6 py-5 flex items-center gap-3">
              <Import className="w-5 h-5 text-white/70" />
              <h2 className="text-fresco-base font-medium text-white">Add your earlier work?</h2>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <p className="text-fresco-sm text-fresco-graphite-mid mb-2">
                You ran {label} before signing in.
              </p>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">
                Add it to{' '}
                <span className="text-fresco-black font-medium">{accountEmail || 'this account'}</span>?
                If this isn’t yours, discard it.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleImport}
                  disabled={busy}
                  className="w-full py-2.5 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors disabled:opacity-50"
                >
                  {busy ? 'Adding…' : 'Add to my account'}
                </button>
                <button
                  onClick={onDiscard}
                  disabled={busy}
                  className="w-full py-2 text-fresco-xs text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
