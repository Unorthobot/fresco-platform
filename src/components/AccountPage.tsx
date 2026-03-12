'use client';

import { useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, CreditCard, Calendar, LogOut, Check, Crown, Zap, Camera, Users, Loader2, LogIn } from 'lucide-react';
import { useFrescoStore } from '@/lib/store';

export function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { user, sessions, workspaces, setUser } = useFrescoStore();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(session?.user?.name || user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || user?.email || '');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  
  const PRICE_IDS = {
    pro: 'price_1T1muDDxdMzzMWBlKFBbR4jK',
    studio: 'price_1T1mvMDxdMzzMWBlnhUl3Sjn',
  };
  
  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  
  const handleSaveChanges = () => {
    setUser({
      id: session?.user?.id || user?.id || 'demo', 
      name, 
      email, 
      profileImage: session?.user?.image || user?.profileImage,
      subscription: user?.subscription || 'free',
      aiGenerationsThisMonth: user?.aiGenerationsThisMonth || 0,
      aiGenerationsResetDate: user?.aiGenerationsResetDate || new Date().toISOString().slice(0, 7),
    });
    showSaved();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setUser({
          id: session?.user?.id || user?.id || 'demo', 
          name: name || user?.name || '', 
          email: email || user?.email || '', 
          profileImage: imageData,
          subscription: user?.subscription || 'free',
          aiGenerationsThisMonth: user?.aiGenerationsThisMonth || 0,
          aiGenerationsResetDate: user?.aiGenerationsResetDate || new Date().toISOString().slice(0, 7),
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpgrade = async (planKey: 'pro' | 'studio') => {
    const priceId = PRICE_IDS[planKey];
    setLoadingPlan(planKey);
    try {
      await redirectToCheckout(priceId, session?.user?.email || undefined);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: '/' });
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  const currentPlan = user?.subscription || 'free';
  const totalSessions = sessions.length;
  const totalWorkspaces = workspaces.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {isAuthenticated ? 'Manage your profile and subscription' : 'Sign in to sync your data across devices'}
        </p>
      </div>

      {/* Auth Status Banner */}
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                <LogIn className="w-5 h-5 text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">You're not signed in</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">Sign in to sync your workspaces and unlock Pro features</p>
              </div>
            </div>
            <button
              onClick={handleSignIn}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              Sign In
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </h2>
            
            {/* Profile Image */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                  {(session?.user?.image || user?.profileImage) ? (
                    <img src={session?.user?.image || user?.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{session?.user?.name || name || 'Your Name'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{session?.user?.email || email || 'your@email.com'}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-black dark:focus:border-white dark:bg-gray-800 dark:text-white"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthenticated}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-black dark:focus:border-white dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="your@email.com"
                />
                {isAuthenticated && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed for authenticated accounts</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
              </button>
              
              {isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {isSigningOut ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing out...</>
                  ) : (
                    <><LogOut className="w-4 h-4" /> Sign Out</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Usage
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalWorkspaces}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Workspaces</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalSessions}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{user?.aiGenerationsThisMonth || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI Generations (this month)</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white capitalize">{currentPlan}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription
            </h2>

            {/* Current Plan */}
            <div className={`p-4 rounded-xl mb-4 ${
              currentPlan === 'free' ? 'bg-gray-100 dark:bg-gray-800' :
              currentPlan === 'pro' ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800' :
              'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {currentPlan !== 'free' && <Crown className="w-4 h-4 text-amber-500" />}
                <p className="font-medium text-gray-900 dark:text-white capitalize">{currentPlan} Plan</p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentPlan === 'free' ? '3 workspaces, 10 AI generations/month' :
                 currentPlan === 'pro' ? 'Unlimited workspaces & AI generations' :
                 'Everything in Pro + Team features'}
              </p>
            </div>

            {/* Upgrade Options */}
            {currentPlan === 'free' && (
              <div className="space-y-3">
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={loadingPlan === 'pro'}
                  className="w-full p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingPlan === 'pro' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                  ) : (
                    <><Crown className="w-4 h-4" /> Upgrade to Pro - $29/mo</>
                  )}
                </button>
                <button
                  onClick={() => handleUpgrade('studio')}
                  disabled={loadingPlan === 'studio'}
                  className="w-full p-4 border-2 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingPlan === 'studio' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                  ) : (
                    <><Users className="w-4 h-4" /> Upgrade to Studio - $79/mo</>
                  )}
                </button>
              </div>
            )}

            {currentPlan === 'pro' && (
              <button
                onClick={() => handleUpgrade('studio')}
                disabled={loadingPlan === 'studio'}
                className="w-full p-4 border-2 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingPlan === 'studio' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                ) : (
                  <><Users className="w-4 h-4" /> Upgrade to Studio - $79/mo</>
                )}
              </button>
            )}
          </div>

          {/* Pro Features */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
            <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Pro Features
            </h3>
            <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> Unlimited workspaces</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> Unlimited AI generations</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> PDF & DOCX export</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> Priority support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
