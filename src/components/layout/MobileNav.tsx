'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Archive, Settings, User, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

export function MobileNav({ activeSection, onNavigate }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (section: string) => {
    onNavigate(section);
    setIsOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'workspaces', label: 'Workspaces', icon: Layers },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-4 left-4 z-[60] w-12 h-12 bg-fresco-black text-white rounded-full flex items-center justify-center shadow-lg"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/40 z-[55]"
              onClick={() => setIsOpen(false)}
            />
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-gray-900 z-[56] shadow-xl"
            >
              <div className="p-4 border-b border-fresco-border-light dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <img src="/fresco-logo.png" alt="Fresco" className="w-6 h-6 icon-theme" />
                  <span className="text-fresco-lg font-bold text-fresco-black">Fresco</span>
                </div>
              </div>
              
              <div className="p-4 space-y-1">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-fresco-base transition-colors",
                      activeSection === item.id
                        ? "bg-fresco-light-gray dark:bg-gray-800 text-fresco-black font-medium"
                        : "text-fresco-graphite-mid hover:bg-fresco-light-gray dark:hover:bg-gray-800 hover:text-fresco-black"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
