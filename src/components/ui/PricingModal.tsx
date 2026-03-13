'use client';

import { useState } from 'react';
import { PRICING_PLANS, PlanType } from '@/lib/stripe';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: PlanType;
  userEmail?: string;
}

export function PricingModal({ isOpen, onClose, currentPlan = 'starter', userEmail }: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = async (planKey: PlanType) => {
    setLoading(planKey);
    try {
      const plan = planKey === 'studio' ? 'studio' : 'pro';
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'No checkout URL');
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const planIcons = {
    starter: Sparkles,
    pro: Zap,
    studio: Building2,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-none shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Upgrade Your Plan</h2>
                <p className="text-sm text-gray-500">Choose the plan that fits your needs</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center py-6">
              <div className="bg-gray-100 p-1 rounded-none flex">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={cn(
                    'px-4 py-2 rounded-none text-sm font-medium transition-all',
                    billingPeriod === 'monthly'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={cn(
                    'px-4 py-2 rounded-none text-sm font-medium transition-all',
                    billingPeriod === 'yearly'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  Yearly <span className="text-green-600 text-xs">Save 20%</span>
                </button>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6 px-6 pb-8">
              {(Object.entries(PRICING_PLANS) as [PlanType, typeof PRICING_PLANS.starter][]).map(([key, plan]) => {
                const Icon = planIcons[key];
                const isCurrentPlan = key === currentPlan;
                const price = billingPeriod === 'yearly' ? Math.floor(plan.price * 0.8) : plan.price;

                return (
                  <div
                    key={key}
                    className={cn(
                      'relative rounded-none border-2 p-6 transition-all',
                      key === 'pro'
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {key === 'pro' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        'p-2 rounded-none',
                        key === 'pro' ? 'bg-blue-100' : 'bg-gray-100'
                      )}>
                        <Icon className={cn(
                          'w-5 h-5',
                          key === 'pro' ? 'text-blue-600' : 'text-gray-600'
                        )} />
                      </div>
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">
                        ${price}
                      </span>
                      {price > 0 && (
                        <span className="text-gray-500 text-sm">
                          /{billingPeriod === 'yearly' ? 'mo' : 'month'}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-6">{plan.description}</p>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => !isCurrentPlan && plan.priceId && handleUpgrade(key)}
                      disabled={isCurrentPlan || loading !== null || !plan.priceId}
                      className={cn(
                        'w-full py-2.5 rounded-none font-medium transition-all',
                        isCurrentPlan
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : key === 'pro'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : plan.priceId
                              ? 'bg-gray-900 text-white hover:bg-gray-800'
                              : 'bg-gray-100 text-gray-600',
                        loading === key && 'opacity-50 cursor-wait'
                      )}
                    >
                      {loading === key ? (
                        'Processing...'
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : !plan.priceId ? (
                        'Free'
                      ) : (
                        'Upgrade'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-4 text-center">
              <p className="text-xs text-gray-500">
                All plans include a 14-day free trial. Cancel anytime. 
                <a href="/terms" className="text-blue-600 hover:underline ml-1">Terms apply</a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
