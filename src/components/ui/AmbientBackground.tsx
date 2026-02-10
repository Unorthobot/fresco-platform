'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AmbientBackgroundProps {
  variant?: 'subtle' | 'dynamic' | 'thinking';
  className?: string;
}

export function AmbientBackground({ variant = 'subtle', className }: AmbientBackgroundProps) {
  if (variant === 'subtle') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {/* Subtle gradient orbs */}
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-radial from-fresco-light-gray/50 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-radial from-fresco-warm-gray/40 to-transparent rounded-full blur-3xl"
        />
      </div>
    );
  }

  if (variant === 'thinking') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {/* Pulsing rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0.3 }}
            animate={{ scale: [0.8, 1.2], opacity: [0.3, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: "easeOut"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-fresco-border rounded-full"
          />
        ))}
      </div>
    );
  }

  // Dynamic variant with floating particles
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
          }}
          animate={{
            x: [null, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
            y: [null, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
          }}
          transition={{
            duration: 30 + Math.random() * 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute w-2 h-2 bg-fresco-graphite-light/20 rounded-full"
        />
      ))}
    </div>
  );
}

// Floating shapes for workspace backgrounds
export function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      {/* Large circle */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        className="absolute -top-20 -right-20 w-80 h-80 border-2 border-fresco-black rounded-full"
      />
      
      {/* Square */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-10 -left-10 w-40 h-40 border-2 border-fresco-black"
        style={{ transform: 'rotate(45deg)' }}
      />
      
      {/* Small circles */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 right-1/4 w-8 h-8 bg-fresco-black rounded-full"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 left-1/3 w-6 h-6 bg-fresco-black rounded-full"
      />
    </div>
  );
}
