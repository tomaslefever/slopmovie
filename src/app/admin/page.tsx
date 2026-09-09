'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ImmersiveAd, AdsConfig, Movie } from '@/types/cinema';
import { 
  Film, 
  Tv, 
  Sparkles, 
  LogOut, 
  Play, 
  Pause,
  Plus, 
  Trash2, 
  Eye, 
  MousePointer, 
  Sliders, 
  ArrowLeft, 
  Shield, 
  Check, 
  AlertCircle,
  Radio,
  Shuffle
} from 'lucide-react';
import Link from 'next/link';
import { audioCues } from '@/lib/audio-cues';

export default function AdminDashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Cinema & Ads states
  const [cinemaState, setCinemaState] = useState<any>(null);
  const [ads, setAds] = useState<ImmersiveAd[]>([]);
  const [adsConfig, setAdsConfig] = useState<AdsConfig>({
    autoAdsEnabled: true,
    adIntervalSteps: 5,
    lastAdStep: 0
  });
  const [activeTab, setActiveTab] = useState<'ads' | 'movie'>('ads');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [customPremise, setCustomPremise] = useState('');
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  // New Ad Form State
  const [newBrandName, setNewBrandName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'commercial_break' | 'in_scene_overlay'>('commercial_break');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newCtaText, setNewCtaText] = useState('Explore');
  const [newCtaUrl, setNewCtaUrl] = useState('');
  const [newPerkReward, setNewPerkReward] = useState('+50 Audience Community Votes');
  const [newDuration, setNewDuration] = useState(10);
  const [isCreatingAd, setIsCreatingAd] = useState(false);

  // Check Supabase Auth
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // If Supabase not configured in .env, enable local admin demo session
      setSession({ user: { email: 'director@kinetic-cinema.local' } });
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch ads and cinema data
  const fetchData = async () => {
    try {
      const [adsRes, stateRes] = await Promise.all([
        fetch('/api/cinema/ads'),
        fetch('/api/cinema/state')
      ]);

      if (adsRes.ok) {
        const adsData = await adsRes.json();
        setAds(adsData.ads || []);
        if (adsData.adsConfig) setAdsConfig(adsData.adsConfig);
      }

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        setCinemaState(stateData);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    audioCues.playClick();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // Local fallback without Supabase configured
      setSession({ user: { email: email || 'admin@kinetic-cinema.com' } });
      setIsLoggingIn(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setLoginError(error.message || 'Invalid administrator credentials');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    audioCues.playClick();
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Trigger Ad Break Immediately
  const handleTriggerAd = async (adId?: string) => {
    audioCues.playClick();
    try {
      const res = await fetch('/api/cinema/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_ad', adId })
      });
      if (res.ok) {
        showFeedback('⚡ Commercial Break initiated on live cinema stream!');
        fetchData();
      }
    } catch {
      showFeedback('Error triggering commercial break');
    }
  };

  // Toggle Auto-Ads
  const handleToggleAutoAds = async () => {
    audioCues.playClick();
    const updated = !adsConfig.autoAdsEnabled;
    try {
      await fetch('/api/cinema/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          config: { autoAdsEnabled: updated }
        })
      });
      setAdsConfig(prev => ({ ...prev, autoAdsEnabled: updated }));
      showFeedback(`Auto-Ads ${updated ? 'Enabled' : 'Disabled'}`);
    } catch {
      showFeedback('Error updating ads config');
    }
  };

  // Change Interval
  const handleChangeInterval = async (interval: number) => {
    audioCues.playClick();
    try {
      await fetch('/api/cinema/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          config: { adIntervalSteps: interval }
        })
      });
      setAdsConfig(prev => ({ ...prev, adIntervalSteps: interval }));
      showFeedback(`Commercial break interval set to every ${interval} steps`);
    } catch {
      showFeedback('Error updating interval');
    }
  };

  // Delete Ad
  const handleDeleteAd = async (adId: string) => {
    audioCues.playClick();
    if (!confirm('Are you sure you want to remove this immersive ad?')) return;
    try {
      await fetch('/api/cinema/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_ad', adId })
      });
      setAds(prev => prev.filter(a => a.id !== adId));
      showFeedback('Ad removed successfully');
    } catch {
      showFeedback('Error deleting ad');
    }
  };

  // Toggle Ad Active state
  const handleToggleAdActive = async (ad: ImmersiveAd) => {
    audioCues.playClick();
    const updated = { ...ad, isActive: !ad.isActive };
    try {
      await fetch('/api/cinema/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_ad', ad: updated })
      });
      setAds(prev => prev.map(a => a.id === ad.id ? updated : a));
      showFeedback(`Ad "${ad.brandName}" ${updated.isActive ? 'Activated' : 'Deactivated'}`);
    } catch {
      showFeedback('Error saving ad');
    }
  };

  // Create New Ad
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName || !newTitle) return;

    setIsCreatingAd(true);
    audioCues.playClick();

    const createdAd: ImmersiveAd = {
      id: `ad_${Date.now()}`,
      brandName: newBrandName.trim(),
      title: newTitle.trim(),
      tagline: newTagline.trim() || undefined,
      description: newDescription.trim() || undefined,
      type: newType,
      videoUrl: newVideoUrl.trim() || undefined,
      imageUrl: newImageUrl.trim() || undefined,
      ctaText: newCtaText.trim() || 'Explore',
      ctaUrl: newCtaUrl.trim() || undefined,
      perkReward: newPerkReward.trim() || undefined,
      duration: Number(newDuration) || 10,
      isActive: true,
      impressions: 0,
      clicks: 0
    };

    try {
      await fetch('/api/cinema/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_ad', ad: createdAd })
      });

      setAds(prev => [createdAd, ...prev]);
      showFeedback(`✓ New Immersive Ad "${createdAd.brandName}" created!`);

      // Reset form
      setNewBrandName('');
      setNewTitle('');
      setNewTagline('');
      setNewDescription('');
      setNewVideoUrl('');
      setNewImageUrl('');
      setNewCtaUrl('');
    } catch {
      showFeedback('Error creating ad');
    } finally {
      setIsCreatingAd(false);
    }
  };

  // Force Premiere of Next Blockbuster Movie with Rotation
  const handleNextBlockbuster = async () => {
    audioCues.playClick();
    if (!confirm('Start premiere of the next blockbuster film? This will rotate to the next genre.')) return;

    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'next_movie',
          prompt: customPremise.trim() || undefined
        })
      });

      if (res.ok) {
        showFeedback('🎬 New Blockbuster Film Premiered! Genre rotated.');
        setCustomPremise('');
        fetchData();
      }
    } catch {
      showFeedback('Error starting next blockbuster');
    }
  };

  // Toggle Pause / Resume for live movie stream & AI generation
  const handleTogglePause = async () => {
    audioCues.playClick();
    setIsTogglingPause(true);
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pause' })
      });

      if (res.ok) {
        const data = await res.json();
        setCinemaState((prev: any) => prev ? { ...prev, isPaused: data.isPaused } : prev);
        showFeedback(data.isPaused ? '⏸️ Film & AI Generation PAUSED' : '▶️ Film & AI Generation RESUMED');
        fetchData();
      } else {
        showFeedback('Failed to toggle pause');
      }
    } catch {
      showFeedback('Network error toggling pause');
    } finally {
      setIsTogglingPause(false);
    }
  };

  // Toggle Pause / Resume specifically for AI scene generation (Random Archive Replay Mode)
  const [isTogglingGenPause, setIsTogglingGenPause] = useState(false);

  const handleTogglePauseGeneration = async () => {
    audioCues.playClick();
    setIsTogglingGenPause(true);
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pause_generation' })
      });

      if (res.ok) {
        const data = await res.json();
        setCinemaState((prev: any) => prev ? { ...prev, isGenerationPaused: data.isGenerationPaused } : prev);
        showFeedback(data.isGenerationPaused 
          ? '🎲 AI Generation PAUSED: Random Archive Replay Mode Active' 
          : '✨ AI Generation RESUMED: Synthesizing New Scenes with DeepSeek & fal.ai');
        fetchData();
      } else {
        showFeedback('Failed to toggle generation pause');
      }
    } catch {
      showFeedback('Network error toggling generation pause');
    } finally {
      setIsTogglingGenPause(false);
    }
  };

  if (authLoading) {
    return (
      <div className="w-screen h-screen bg-[#050608] flex items-center justify-center text-white">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
      </div>
    );
  }

  // LOGIN SCREEN (NO SIGNUP ALLOWED)
  if (!session) {
    return (
      <div className="w-screen h-screen bg-[#050608] flex items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-black pointer-events-none" />

        <div className="w-full max-w-md p-8 rounded-3xl bg-neutral-950/90 border border-white/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400 mb-1">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-black tracking-widest text-white uppercase font-mono">
              DIRECTOR CONSOLE
            </h1>
            <p className="text-xs text-neutral-400">
              Supabase Authenticated Administration. Public registration is closed.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">
                Director Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@kinetic-cinema.com"
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">
                Master Key / Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400 text-sm font-mono"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In as Director'}
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="text-xs font-mono text-neutral-500 hover:text-neutral-300 transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Live Stream
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN CONSOLE
  return (
    <div className="min-h-screen bg-[#06070a] text-neutral-100 flex flex-col font-sans select-none">
      {/* Top Admin Header */}
      <header className="h-14 bg-black/80 border-b border-white/10 px-6 flex items-center justify-between backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white transition-colors"
            title="Back to Live Stream"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <h1 className="text-xs font-black tracking-widest text-white uppercase font-mono">
              DIRECTOR CONSOLE // ADS & BLOCKBUSTERS
            </h1>
          </div>
        </div>

        {/* Right side: Pause Toggle, Session user & Logout */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          {/* Global Pause / Resume Movie Stream Button */}
          <button
            onClick={handleTogglePause}
            disabled={isTogglingPause}
            className={`px-3 py-1.5 rounded-lg border font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md ${
              cinemaState?.isPaused
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            }`}
            title={cinemaState?.isPaused ? "Resume Live Stream" : "Pause Live Stream"}
          >
            {cinemaState?.isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>RESUME FILM</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-amber-300" />
                <span>PAUSE FILM</span>
              </>
            )}
          </button>

          {/* Pause / Resume AI Scene Generation specifically (Random Archive Replay Mode) */}
          <button
            onClick={handleTogglePauseGeneration}
            disabled={isTogglingGenPause}
            className={`px-3 py-1.5 rounded-lg border font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md ${
              cinemaState?.isGenerationPaused
                ? 'bg-purple-500 hover:bg-purple-400 text-black border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse'
                : 'bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border-purple-500/30'
            }`}
            title={cinemaState?.isGenerationPaused ? "Resume AI scene generation" : "Pause AI generation & replay archive clips at random"}
          >
            {cinemaState?.isGenerationPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>RESUME AI GEN</span>
              </>
            ) : (
              <>
                <Shuffle className="w-3.5 h-3.5 text-purple-300" />
                <span>PAUSE AI (REPLAY)</span>
              </>
            )}
          </button>

          <span className="text-neutral-400 hidden sm:inline-block">
            {session.user?.email || 'admin@kinetic-cinema.com'}
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-red-400 border border-red-500/20 flex items-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl bg-amber-500/90 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-2xl flex items-center space-x-2 backdrop-blur-md">
          <Sparkles className="w-4 h-4" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
          <button
            onClick={() => { audioCues.playClick(); setActiveTab('ads'); }}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all ${
              activeTab === 'ads'
                ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Immersive Ads Manager ({ads.length})</span>
          </button>

          <button
            onClick={() => { audioCues.playClick(); setActiveTab('movie'); }}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all ${
              activeTab === 'movie'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Movie & Blockbuster Rotation</span>
          </button>
        </div>

        {/* TAB 1: IMMERSIVE ADS MANAGER */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            {/* Quick Controls Bar */}
            <div className="p-6 rounded-2xl bg-neutral-950/80 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Live Ad Injection System
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Configure automatic commercial breaks or trigger an ad break right now.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Auto Ads Toggle */}
                <button
                  onClick={handleToggleAutoAds}
                  className={`px-3.5 py-2 rounded-xl border font-mono text-xs font-bold flex items-center space-x-2 transition-all ${
                    adsConfig.autoAdsEnabled
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                      : 'bg-neutral-900 border-white/10 text-neutral-500'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${adsConfig.autoAdsEnabled ? 'bg-amber-400 animate-ping' : 'bg-neutral-600'}`} />
                  <span>Auto-Ads: {adsConfig.autoAdsEnabled ? 'ACTIVE' : 'OFF'}</span>
                </button>

                {/* Interval Selector */}
                <div className="flex items-center space-x-1 bg-neutral-900 border border-white/10 px-2 py-1 rounded-xl text-xs font-mono">
                  <span className="text-neutral-400 px-1">Every:</span>
                  {[3, 5, 8, 10].map(int => (
                    <button
                      key={int}
                      onClick={() => handleChangeInterval(int)}
                      className={`px-2 py-1 rounded-lg transition-colors ${
                        adsConfig.adIntervalSteps === int
                          ? 'bg-amber-400 text-black font-bold'
                          : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {int} steps
                    </button>
                  ))}
                </div>

                {/* Instant Trigger Button */}
                <button
                  onClick={() => handleTriggerAd()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-mono font-bold text-xs uppercase tracking-widest flex items-center space-x-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-all"
                >
                  <Radio className="w-4 h-4 text-black" />
                  <span>⚡ Trigger Ad Break Now</span>
                </button>
              </div>
            </div>

            {/* Ads List Table */}
            <div className="p-6 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-300">
                Active Catalog of Immersive Ads
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ads.map(ad => (
                  <div 
                    key={ad.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      ad.isActive
                        ? 'bg-neutral-900/60 border-white/15'
                        : 'bg-neutral-950/50 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                          {ad.brandName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-neutral-400">
                          {ad.type === 'commercial_break' ? 'Commercial Break' : 'In-Scene AR'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white leading-snug">
                        {ad.title}
                      </h4>
                      {ad.tagline && (
                        <p className="text-xs text-neutral-400 italic">
                          "{ad.tagline}"
                        </p>
                      )}

                      {/* Metrics */}
                      <div className="flex items-center space-x-3 text-[11px] font-mono text-neutral-400 pt-2 border-t border-white/5">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-cyan-400" /> {ad.impressions || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3 text-amber-400" /> {ad.clicks || 0} clicks
                        </span>
                        <span>• {ad.duration}s</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-4 flex items-center justify-between gap-2 border-t border-white/10 mt-3">
                      <button
                        onClick={() => handleTriggerAd(ad.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono font-semibold flex items-center gap-1"
                        title="Broadcast this specific ad now"
                      >
                        <Play className="w-3 h-3" /> Test
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleAdActive(ad)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                            ad.isActive 
                              ? 'bg-neutral-800 text-green-400 hover:bg-neutral-700' 
                              : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                          }`}
                        >
                          {ad.isActive ? 'Active' : 'Disabled'}
                        </button>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="p-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors"
                          title="Delete Ad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create New Immersive Ad Form */}
            <div className="p-6 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create New Immersive Sponsor Ad
              </h3>

              <form onSubmit={handleCreateAd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={newBrandName}
                    onChange={e => setNewBrandName(e.target.value)}
                    placeholder="e.g. Weyland-Yutani Corp"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">Ad Title / Campaign *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Building Better Worlds"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">Tagline</label>
                  <input
                    type="text"
                    value={newTagline}
                    onChange={e => setNewTagline(e.target.value)}
                    placeholder="e.g. Synthetic androids for deep void exploration"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">Ad Type</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  >
                    <option value="commercial_break">Full Commercial Break (Holo-Broadcast)</option>
                    <option value="in_scene_overlay">In-Scene AR Product Placement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">Video URL (MP4)</label>
                  <input
                    type="url"
                    value={newVideoUrl}
                    onChange={e => setNewVideoUrl(e.target.value)}
                    placeholder="https://... (direct video mp4 url)"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">Image / Poster URL</label>
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={newCtaText}
                    onChange={e => setNewCtaText(e.target.value)}
                    placeholder="Explore Corporation"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">CTA Destination URL</label>
                  <input
                    type="url"
                    value={newCtaUrl}
                    onChange={e => setNewCtaUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">Audience Sponsor Perk</label>
                  <input
                    type="text"
                    value={newPerkReward}
                    onChange={e => setNewPerkReward(e.target.value)}
                    placeholder="+50 Community Audience Votes"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={newDuration}
                    onChange={e => setNewDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={isCreatingAd}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
                  >
                    {isCreatingAd ? 'Saving Ad...' : 'Publish Immersive Ad to Live Stream'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: MOVIE CONTROL & BLOCKBUSTER ROTATION */}
        {activeTab === 'movie' && (
          <div className="space-y-6">
            {/* Live Playback & AI Generation Controller Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              cinemaState?.isPaused 
                ? 'bg-amber-950/30 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]' 
                : 'bg-neutral-950/80 border-white/10'
            } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    cinemaState?.isPaused 
                      ? 'bg-amber-400 animate-pulse' 
                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  }`} />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                    Live Stream Engine: {cinemaState?.isPaused ? 'PAUSED (DIRECTOR HOLD)' : 'STREAMING LIVE'}
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 max-w-xl">
                  {cinemaState?.isPaused 
                    ? 'The movie timer and live video generations are frozen. Audience voting and scene transitions are held until resumed.'
                    : 'The live interactive movie is progressing automatically (15s playback + 10s voting + fal.ai clip generation).'}
                </p>
              </div>

              <button
                onClick={handleTogglePause}
                disabled={isTogglingPause}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                  cinemaState?.isPaused
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                }`}
              >
                {cinemaState?.isPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>Resume Film & Live Generation</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-black" />
                    <span>Pause Film & Live Generation</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Video Generation vs Archive Replay Mode Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              cinemaState?.isGenerationPaused 
                ? 'bg-purple-950/30 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]' 
                : 'bg-neutral-950/80 border-white/10'
            } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    cinemaState?.isGenerationPaused 
                      ? 'bg-purple-400 animate-pulse' 
                      : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  }`} />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                    AI Scene Generation: {cinemaState?.isGenerationPaused ? 'PAUSED (ARCHIVE RANDOM REPLAY)' : 'ACTIVE (REAL-TIME SYNTHESIS)'}
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 max-w-xl">
                  {cinemaState?.isGenerationPaused 
                    ? 'AI scene generation is paused. The player will continuously replay previously generated clips at random without calling DeepSeek or fal.ai.'
                    : 'DeepSeek and fal.ai (MiniMax H3-Max 15s) synthesize a brand new narrative scene at every voting conclusion.'}
                </p>
              </div>

              <button
                onClick={handleTogglePauseGeneration}
                disabled={isTogglingGenPause}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                  cinemaState?.isGenerationPaused
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-400 text-black shadow-[0_0_25px_rgba(168,85,247,0.4)]'
                    : 'bg-purple-500 hover:bg-purple-400 text-black shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                }`}
              >
                {cinemaState?.isGenerationPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>Resume AI Generation</span>
                  </>
                ) : (
                  <>
                    <Shuffle className="w-4 h-4 text-black" />
                    <span>Pause AI & Replay Archive</span>
                  </>
                )}
              </button>
            </div>

            {/* Current Active Film Meta */}
            {cinemaState?.movie && (
              <div className="p-6 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                      Current Streaming Film
                    </span>
                    <h2 className="text-xl font-black text-white">
                      {cinemaState.movie.title}
                    </h2>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-xs font-mono text-cyan-300 font-bold">
                    STEP {cinemaState.movie.currentStep} / {cinemaState.movie.totalSteps}
                  </span>
                </div>

                <p className="text-xs text-neutral-300">
                  <strong className="text-neutral-400 font-mono">Genre:</strong> {cinemaState.movie.genre}
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  {cinemaState.movie.initialPlot}
                </p>
              </div>
            )}

            {/* Blockbuster Rotation Trigger */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#071320] border border-cyan-500/30 space-y-4 shadow-[0_15px_40px_rgba(0,240,255,0.08)]">
              <div className="flex items-center space-x-2">
                <Shuffle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Automatic Blockbuster Rotation System
                </h3>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                When a film finishes all 100 steps, Kinetic Cinema automatically initiates the next blockbuster film, cycling between <strong>Dark Epic Fantasy, Cyberpunk Neo-Noir, Cosmic Space Opera, Solarpunk Wasteland</strong>, and <strong>Supernatural Steampunk</strong>.
              </p>

              <div>
                <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">
                  Optional Custom Premise / Override (Leave empty to use automatic genre rotation)
                </label>
                <input
                  type="text"
                  value={customPremise}
                  onChange={e => setCustomPremise(e.target.value)}
                  placeholder="e.g. Dark high fantasy with ancient obsidian dragons and fallen kings..."
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <button
                onClick={handleNextBlockbuster}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_20px_rgba(0,240,255,0.3)]"
              >
                <Film className="w-4 h-4 text-black" />
                <span>🎬 Premiere Next Blockbuster Film (Rotate Genre)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
