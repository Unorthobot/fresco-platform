'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap and keyboard handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        firstFocusable?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn("relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full", sizeClasses[size])}
          >
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-fresco-border-light dark:border-gray-700">
                <h2 id="modal-title" className="text-fresco-lg font-medium text-fresco-black dark:text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white rounded-lg hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Confirmation Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default'
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-fresco-sm text-fresco-graphite-mid dark:text-gray-400 mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 h-10 text-fresco-sm text-fresco-graphite-mid dark:text-gray-400 border border-fresco-border dark:border-gray-600 rounded-xl hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={cn(
            "flex-1 h-10 text-fresco-sm font-medium rounded-xl transition-colors",
            variant === 'danger' ? "text-white bg-red-500 hover:bg-red-600 transition-colors" : "text-white bg-fresco-black dark:bg-white dark:text-fresco-black hover:bg-fresco-graphite dark:hover:bg-gray-200"
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
