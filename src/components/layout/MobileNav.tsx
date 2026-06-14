'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Archive, Settings, User, Layers, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  userSubscription?: string;
}

export function MobileNav({ activeSection, onNavigate }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (section: string) => { onNavigate(section); setIsOpen(false); };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'workspaces', label: 'Workspaces', icon: Layers },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <>
      {/* Hamburger — bottom left, mobile only */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-5 left-4 z-[60] w-11 h-11 bg-fresco-black text-white flex items-center justify-center shadow-lg"
        aria-label="Menu"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-[55]" onClick={() => setIsOpen(false)} />

            <motion.nav
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-white z-[56] shadow-xl flex flex-col overflow-y-auto"
            >
              {/* Logo */}
              <div className="h-14 px-5 flex items-center border-b border-fresco-border-light">
                <div className="flex items-center gap-2.5">
                  <img src="/fresco-logo.png" alt="Fresco" className="w-5 h-5 icon-theme" />
                  <span className="text-fresco-base font-semibold text-fresco-black">Fresco</span>
                </div>
              </div>

              {/* Primary action — the single input is the only front door.
                  House selection retired from navigation (June 2026): the
                  router picks the analysis, power users override on the
                  clarify screen. */}
              <div className="p-4 border-b border-fresco-border-light">
                <button onClick={() => handleNavigate('home')}
                  className="w-full flex items-center justify-between px-3 py-3 bg-fresco-black text-white hover:bg-fresco-graphite transition-colors text-left">
                  <div>
                    <p className="text-fresco-sm font-medium">New decision</p>
                    <p className="text-fresco-xs text-white/60">Describe it — Fresco runs the right analysis</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>

              {/* Nav items */}
              <div className="p-4 flex-1">
                <div className="space-y-0.5">
                  {navItems.map(item => (
                    <button key={item.id} onClick={() => handleNavigate(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-fresco-sm transition-colors text-left',
                        activeSection === item.id
                          ? 'bg-fresco-light-gray text-fresco-black font-medium'
                          : 'text-fresco-graphite-mid hover:bg-fresco-light-gray hover:text-fresco-black'
                      )}>
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
