'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}

export function TypewriterText({ 
  text, 
  speed = 30, 
  delay = 0, 
  onComplete,
  className 
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    
    const timeout = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);
      
      return () => clearInterval(interval);
    }, delay);
    
    return () => clearTimeout(timeout);
  }, [text, speed, delay, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

// Staggered list animation for multiple items
interface StaggeredListProps {
  items: string[];
  renderItem: (item: string, index: number) => React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggeredList({ items, renderItem, staggerDelay = 150, className }: StaggeredListProps) {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * (staggerDelay / 1000), duration: 0.4 }}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </div>
  );
}
