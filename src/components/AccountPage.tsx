'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, CreditCard, Calendar, LogOut, Check, Crown, Zap, Camera, Upload, Users } from 'lucide-react';
import { useFrescoStore } from '@/lib/store';

export function AccountPage() {
  const { user, sessions, workspaces, setUser } = useFrescoStore();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name || 'Demo User');
  const [email, setEmail] = useState(user?.email || 'demo@fresco.app');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
              {/* Profile Picture */}
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
              <div className="relative p-6 border-2 border-fresco-black dark:border-white rounded-2xl bg-fresco-white dark:bg-fresco-black">
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-1 bg-fresco-black dark:bg-white text-white dark:text-fresco-black text-fresco-xs font-medium rounded-full uppercase tracking-wider">Current Plan</span>
                </div>
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-5 h-5 text-fresco-black dark:text-white" />
                      <span className="text-fresco-lg font-medium text-fresco-black dark:text-white">Free</span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-mid dark:text-gray-400">For individuals exploring structured thinking</p>
                  </div>
                  <div className="text-right">
                    <span className="text-fresco-2xl font-medium text-fresco-black dark:text-white">R0</span>
                    <span className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">/month</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>Access to all 9 toolkits</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>All 16 thinking modes</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>Up to 3 active workspaces</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>Basic AI-assisted prompts</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>Manual artefact creation</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>Export to text / markdown</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-fresco-border-light dark:border-gray-700">
                  <p className="text-fresco-xs text-fresco-graphite-light dark:text-gray-500 italic">
                    "Everything you need to think clearly — with limits designed to help you decide if Fresco deserves a permanent place in your workflow."
                  </p>
                </div>
              </div>
              
              {/* Pro Tier */}
              <div className="relative p-6 border border-fresco-border dark:border-amber-900/50 rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30 hover:border-fresco-graphite-light dark:hover:border-amber-700 transition-colors">
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-fresco-xs font-medium rounded-full uppercase tracking-wider">Recommended</span>
                </div>
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-fresco-lg font-medium text-fresco-black dark:text-white">Pro</span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-mid dark:text-gray-400">For serious thinkers, strategists, and builders</p>
                  </div>
                  <div className="text-right">
                    <span className="text-fresco-2xl font-medium text-fresco-black dark:text-white">R299</span>
                    <span className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">/month</span>
                  </div>
                </div>
                
                <p className="text-fresco-xs text-fresco-graphite-light dark:text-gray-500 mb-3">Everything in Free, plus:</p>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>Unlimited workspaces</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>Workspace history tracking</span>
                  </div>
                  <div className="flex items-start gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>Advanced AI synthesis (cross-toolkit reasoning, pattern detection)</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>Priority model access</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>AI-generated clarity snapshots</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>Early access to new features</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-fresco-xs text-fresco-graphite-light dark:text-gray-500 uppercase tracking-wider">Built for:</span>
                  <div className="flex flex-wrap gap-2">
                    {['Strategists', 'Designers', 'Researchers', 'Founders'].map(role => (
                      <span key={role} className="px-2 py-0.5 bg-white/80 dark:bg-white/10 text-fresco-xs text-fresco-graphite-mid dark:text-gray-300 rounded">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-amber-200/50 dark:border-amber-800/30">
                  <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500 italic flex-1 pr-4">
                    "For people who don't just want answers — they want better questions, faster clarity, and confidence before execution."
                  </p>
                  <button className="fresco-btn fresco-btn-primary fresco-btn-sm flex-shrink-0">
                    Upgrade to Pro
                  </button>
                </div>
              </div>
              
              {/* Studio/Team Tier */}
              <div className="relative p-6 border border-fresco-border dark:border-violet-900/50 rounded-2xl bg-gradient-to-br from-violet-50/30 to-indigo-50/30 dark:from-violet-950/30 dark:to-indigo-950/30 hover:border-fresco-graphite-light dark:hover:border-violet-700 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      <span className="text-fresco-lg font-medium text-fresco-black dark:text-white">Studio / Team</span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-mid dark:text-gray-400">For teams that need shared clarity before shared execution</p>
                  </div>
                  <div className="text-right">
                    <span className="text-fresco-2xl font-medium text-fresco-black dark:text-white">R1,495</span>
                    <span className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500">/month</span>
                    <p className="text-fresco-xs text-fresco-graphite-light dark:text-gray-500">up to 5 users</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3 p-2 bg-violet-100/50 dark:bg-violet-900/30 rounded-lg">
                  <span className="text-fresco-xs text-violet-700 dark:text-violet-300">+R299/user/month for additional seats</span>
                </div>
                
                <p className="text-fresco-xs text-fresco-graphite-light dark:text-gray-500 mb-3">Everything in Pro, plus:</p>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <span>Shared team workspaces</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <span>Collaborative thinking sessions</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <span>Role-based access control</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <span>Team-level clarity artefacts</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <span>Decision logs & rationale tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <span>Alignment snapshots</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <span>Priority support</span>
                  </div>
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft dark:text-gray-300">
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <span>Onboarding guidance</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-fresco-xs text-fresco-graphite-light dark:text-gray-500 uppercase tracking-wider">Built for:</span>
                  <div className="flex flex-wrap gap-2">
                    {['Product teams', 'Strategy teams', 'Agencies', 'Leadership'].map(role => (
                      <span key={role} className="px-2 py-0.5 bg-white/80 dark:bg-white/10 text-fresco-xs text-fresco-graphite-mid dark:text-gray-300 rounded">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-violet-200/50 dark:border-violet-800/30">
                  <p className="text-fresco-sm text-fresco-graphite-light dark:text-gray-500 italic flex-1 pr-4">
                    "Because misalignment is expensive — and clarity is a team sport."
                  </p>
                  <button className="fresco-btn fresco-btn-sm flex-shrink-0 bg-violet-600 border-violet-600 text-white hover:bg-violet-700 hover:border-violet-700 transition-colors">
                    Contact Sales
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
