'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, CreditCard, Calendar, LogOut, Check, Crown, Zap, Camera, Users, Loader2 } from 'lucide-react';
import { useFrescoStore } from '@/lib/store';
import { redirectToCheckout } from '@/lib/stripe';

export function AccountPage() {
  const { user, sessions, workspaces, setUser } = useFrescoStore();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name || 'Demo User');
  const [email, setEmail] = useState(user?.email || 'demo@fresco.app');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const PRICE_IDS = {
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_1T1muDDxdMzzMWBlKFBbR4jK',
    studio: process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID || 'price_1T1mvMDxdMzzMWBlnhUl3Sjn',
  };
  
  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  
  const handleSaveChanges = () => {
    setUser({ id: user?.id || 'demo', name, email, profileImage: user?.profileImage });
    showSaved();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setUser({ 
          id: user?.id || 'demo', 
          name: user?.name || name, 
          email: user?.email || email, 
          profileImage: imageData 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpgrade = async (planKey: 'pro' | 'studio') => {
    const priceId = planKey === 'pro' ? 'price_1T1muDDxdMzzMWBlKFBbR4jK' : 'price_1T1mvMDxdMzzMWBlnhUl3Sjn';
    
    if (!priceId) {
      alert('Payment system not configured');
      return;
    }

    setLoadingPlan(planKey);
    try {
      await redirectToCheckout(priceId, email);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const totalInsights = sessions.reduce((acc, s) => acc + (s.insights?.length || 0), 0);

  return (
    <div className="min-h-screen fresco-grid-bg-subtle">
      <div className="px-6 md:px-12 py-16 border-b border-fresco-border-light">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <h1 className="text-fresco-4xl font-medium text-fresco-black tracking-tight mb-4">Account</h1>
          <p className="text-fresco-lg text-fresco-graphite-mid">Manage your profile and subscription.</p>
        </motion.div>
      </div>

      <div className="px-6 md:px-12 py-12">
        <div className="max-w-2xl space-y-8">
          {saved && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-fresco-light-gray text-fresco-black text-fresco-sm rounded-fresco flex items-center gap-2">
              <Check className="w-4 h-4" />Saved
            </motion.div>
          )}

          {/* Profile */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2">
              <User className="w-5 h-5" />Profile
            </h2>
            <div className="flex items-start gap-6 mb-6">
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="fresco-avatar-upload w-20 h-20 rounded-full overflow-hidden bg-fresco-black flex items-center justify-center"
                >
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-2xl font-medium">{name.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="fresco-avatar-overlay">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <p className="text-fresco-xs text-fresco-graphite-light text-center mt-2">Click to upload</p>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-fresco-sm text-fresco-graphite-light mb-1 block">Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full fresco-input" 
                  />
                </div>
                <div>
                  <label className="text-fresco-sm text-fresco-graphite-light mb-1 block">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full fresco-input" 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSaveChanges} className="fresco-btn">
                Save Changes
              </button>
            </div>
          </div>

          {/* Subscription */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />Subscription
            </h2>
            
            <div className="space-y-6">
              {/* Free Tier - Current */}
              <div className="relative p-6 border-2 border-fresco-black rounded-2xl bg-fresco-white">
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-1 bg-fresco-black text-white text-fresco-xs font-medium rounded-full uppercase tracking-wider">Current Plan</span>
                </div>
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-5 h-5 text-fresco-black" />
                      <span className="text-fresco-lg font-medium text-fresco-black">Free</span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-mid">For individuals exploring structured thinking</p>
                  </div>
                  <div className="text-right">
                    <span className="text-fresco-2xl font-medium text-fresco-black">$0</span>
                    <span className="text-fresco-sm text-fresco-graphite-light">/month</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                  {['Access to all 9 toolkits', 'All 16 thinking modes', 'Up to 3 active workspaces', 'Basic AI-assisted prompts', 'Manual artefact creation', 'Export to text / markdown'].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Pro Tier */}
              <div className="relative p-6 border border-fresco-border rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/50 hover:border-fresco-graphite-light transition-colors">
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-fresco-xs font-medium rounded-full uppercase tracking-wider">Recommended</span>
                </div>
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-5 h-5 text-amber-600" />
                      <span className="text-fresco-lg font-medium text-fresco-black">Pro</span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-mid">For serious thinkers, strategists, and builders</p>
                  </div>
                  <div className="text-right">
                    <span className="text-fresco-2xl font-medium text-fresco-black">$29</span>
                    <span className="text-fresco-sm text-fresco-graphite-light">/month</span>
                  </div>
                </div>
                
                <p className="text-fresco-xs text-fresco-graphite-light mb-3">Everything in Free, plus:</p>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                  {['Unlimited workspaces', 'Workspace history tracking', 'Advanced AI synthesis', 'Priority model access', 'AI-generated clarity snapshots', 'Early access to new features'].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft">
                      <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-amber-200/50">
                  <p className="text-fresco-sm text-fresco-graphite-light italic flex-1 pr-4">
                    "For people who don't just want answers — they want better questions."
                  </p>
                  <button 
                    onClick={() => handleUpgrade('pro')}
                    disabled={loadingPlan !== null}
                    className="fresco-btn fresco-btn-primary fresco-btn-sm flex-shrink-0 flex items-center gap-2"
                  >
                    {loadingPlan === 'pro' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Upgrade to Pro'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Studio/Team Tier */}
              <div className="relative p-6 border border-fresco-border rounded-2xl bg-gradient-to-br from-violet-50/30 to-indigo-50/30 hover:border-fresco-graphite-light transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-violet-600" />
                      <span className="text-fresco-lg font-medium text-fresco-black">Studio / Team</span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-mid">For teams that need shared clarity</p>
                  </div>
                  <div className="text-right">
                    <span className="text-fresco-2xl font-medium text-fresco-black">$79</span>
                    <span className="text-fresco-sm text-fresco-graphite-light">/month</span>
                    <p className="text-fresco-xs text-fresco-graphite-light">up to 5 users</p>
                  </div>
                </div>
                
                <p className="text-fresco-xs text-fresco-graphite-light mb-3">Everything in Pro, plus:</p>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                  {['Shared team workspaces', 'Collaborative thinking sessions', 'Role-based access control', 'Team-level clarity artefacts', 'Decision logs & rationale tracking', 'Priority support'].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft">
                      <Check className="w-4 h-4 text-violet-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-violet-200/50">
                  <p className="text-fresco-sm text-fresco-graphite-light italic flex-1 pr-4">
                    "Because misalignment is expensive — and clarity is a team sport."
                  </p>
                  <button 
                    onClick={() => handleUpgrade('studio')}
                    disabled={loadingPlan !== null}
                    className="fresco-btn fresco-btn-sm flex-shrink-0 bg-violet-600 border-violet-600 text-white hover:bg-violet-700 hover:border-violet-700 transition-colors flex items-center gap-2"
                  >
                    {loadingPlan === 'studio' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Upgrade to Studio'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="fresco-card p-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5" />Usage Statistics
            </h2>
            <div className="grid grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-fresco-3xl font-medium text-fresco-black">{workspaces.length}</div>
                <div className="text-fresco-sm text-fresco-graphite-light">Workspaces</div>
              </div>
              <div>
                <div className="text-fresco-3xl font-medium text-fresco-black">{sessions.length}</div>
                <div className="text-fresco-sm text-fresco-graphite-light">Sessions</div>
              </div>
              <div>
                <div className="text-fresco-3xl font-medium text-fresco-black">{totalInsights}</div>
                <div className="text-fresco-sm text-fresco-graphite-light">Insights</div>
              </div>
              <div>
                <div className="text-fresco-3xl font-medium text-fresco-black">{sessions.filter(s => s.sentenceOfTruth?.content).length}</div>
                <div className="text-fresco-sm text-fresco-graphite-light">Truths</div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-fresco-border-light text-fresco-sm text-fresco-graphite-light">
              Member since January 2026
            </div>
          </div>

          {/* Sign Out */}
          <button className="flex items-center gap-2 text-fresco-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-fresco transition-colors">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
