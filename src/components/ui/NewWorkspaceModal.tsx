'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface NewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string, teamId?: string) => void;
  userSubscription?: string;
}

// Team collaboration retired June 2026 — workspaces are personal only.
// The teamId param is kept on onConfirm for signature compatibility but is
// never supplied.
export function NewWorkspaceModal({ isOpen, onClose, onConfirm }: NewWorkspaceModalProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setTitle('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const t = title.trim() || 'New Workspace';
    onConfirm(t);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="bg-fresco-white border border-fresco-border rounded-none shadow-xl w-full max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-fresco-border-light">
              <h2 className="text-fresco-base font-medium text-fresco-black">New workspace</h2>
              <button onClick={onClose} className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div>
                <label className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light block mb-2">
                  Workspace name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
                  placeholder="e.g. Q2 Growth Strategy"
                  className="w-full px-4 py-2.5 border border-fresco-border rounded-none text-fresco-base bg-transparent focus:outline-none focus:ring-2 focus:ring-fresco-black text-fresco-black placeholder:text-fresco-graphite-light"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-fresco-border-light">
              <button
                onClick={onClose}
                className="px-4 py-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="fresco-btn fresco-btn-primary"
              >
                Create workspace
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
