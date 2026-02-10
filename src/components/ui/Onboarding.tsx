'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Lightbulb, Layers, Target, Sparkles } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  { title: 'Welcome to Fresco', description: 'A thinking system that helps you move from confusion to clarity through structured exploration.', icon: Sparkles },
  { title: 'Start with a Workspace', description: 'Create a workspace for each project or problem you\'re exploring. It keeps all your thinking organised.', icon: Layers },
  { title: 'Choose Your Toolkit', description: 'Pick from 9 specialised toolkits across three phases: Investigate, Innovate, and Validate.', icon: Lightbulb },
  { title: 'Find Your Truth', description: 'Each toolkit helps you discover a "Sentence of Truth" - the core insight that guides your next steps.', icon: Target },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('fresco-onboarding-complete', 'true');
    setTimeout(onComplete, 300);
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-fresco-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-fresco-border-light dark:border-gray-700">
              <div className="flex items-center gap-2">
                {STEPS.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentStep ? 'bg-fresco-black' : i < currentStep ? 'bg-fresco-graphite' : 'bg-fresco-border dark:bg-gray-600'}`} />
                ))}
              </div>
              <button onClick={handleComplete} className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors" aria-label="Skip">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 text-center">
              <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="w-16 h-16 mx-auto mb-6 bg-fresco-light-gray dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                  <Icon className="w-8 h-8 text-fresco-black" />
                </div>
                <h2 className="text-fresco-2xl font-bold text-fresco-black mb-3">{step.title}</h2>
                <p className="text-fresco-base text-fresco-graphite-mid leading-relaxed">{step.description}</p>
              </motion.div>
            </div>

            <div className="p-4 border-t border-fresco-border-light flex items-center justify-between">
              <button onClick={handleComplete} className="text-fresco-sm text-fresco-graphite-light hover:text-fresco-black transition-colors">Skip tour</button>
              <button onClick={handleNext} className="fresco-btn fresco-btn-primary fresco-btn-sm">
                {currentStep < STEPS.length - 1 ? <>Next <ArrowRight className="w-4 h-4" /></> : <>Get Started <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Always show onboarding on app load - treating every session as a new user
    // Remove the localStorage check to always show
    setShowOnboarding(true);
    // Clear any previous completion flag
    localStorage.removeItem('fresco-onboarding-complete');
  }, []);

  return {
    showOnboarding,
    completeOnboarding: () => setShowOnboarding(false),
    resetOnboarding: () => { localStorage.removeItem('fresco-onboarding-complete'); setShowOnboarding(true); }
  };
}
