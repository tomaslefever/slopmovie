'use client';

import React, { useState } from 'react';
import { Film, LayoutGrid, Menu, Radio, Sparkles, X } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface NavbarProps {
  movieTitle: string;
  isMockMode?: boolean;
  onToggleGallery: () => void;
  isGalleryOpen: boolean;
  currentStep?: number;
  totalSteps?: number;
  onOpenBuyAds?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  movieTitle,
  onToggleGallery,
  isGalleryOpen,
  currentStep = 1,
  totalSteps = 50,
  onOpenBuyAds
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentStep / (totalSteps || 50)) * 100)));

  return (
    <header className="relative h-14 bg-[#07080b]/90 border-b border-white/10 px-4 md:px-6 flex items-center justify-between backdrop-blur-xl z-40 select-none">
      {/* Left: Brand & Movie Title */}
      <div className="flex items-center space-x-2 min-w-0">
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
              <Film className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <span className="text-xs font-black tracking-widest text-white uppercase block leading-none">
              SLOP MOVIE
            </span>
            <span className="text-[9px] font-mono text-cyan-400 tracking-wider leading-none block mt-px">
              Interactive AI movies endless channel
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        <div className="text-xs font-semibold text-neutral-300 max-w-[180px] md:max-w-md truncate hidden sm:block">
          {movieTitle}
        </div>
      </div>

      {/* Center: Movie Progress Bar with Percentage */}
      <div className="hidden md:flex items-center space-x-3 bg-neutral-900/80 border border-white/10 px-4 py-1.5 rounded-full text-xs font-mono shadow-inner">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        <span className="text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">
          Story Progress
        </span>
        <div className="w-32 lg:w-44 h-2 bg-neutral-950 rounded-full overflow-hidden border border-white/10 relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-cyan-400 font-bold text-[11px] font-mono min-w-[36px] text-right">
          {progressPercent}%
        </span>
      </div>

      {/* Right Controls (desktop) */}
      <div className="hidden md:flex items-center space-x-3">
        {/* Buy Ads Modal Trigger */}
        <button
          onClick={() => {
            audioCues.playClick();
            onOpenBuyAds?.();
          }}
          className="px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 text-amber-300 hover:text-amber-200 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all hover:scale-105 active:scale-95 group"
          title="Learn about Immersive Cinema Ads and Buy a Showcase"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Buy Ads</span>
        </button>

        {/* Gallery Toggle */}
        <button
          onClick={() => { audioCues.playClick(); onToggleGallery(); }}
          className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 ${
            isGalleryOpen
              ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)]'
              : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white border-white/10 shadow-lg'
          }`}
          title={isGalleryOpen ? "Return to Live Stream" : "Browse Cinema Gallery"}
        >
          {isGalleryOpen ? (
            <>
              <Radio className="w-3.5 h-3.5 text-black" />
              <span>Watch Live Stream</span>
            </>
          ) : (
            <>
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cinema Gallery</span>
            </>
          )}
        </button>
      </div>

      {/* Mobile Burger Toggle */}
      <button
        onClick={() => {
          audioCues.playClick();
          setIsMenuOpen(!isMenuOpen);
        }}
        className="md:hidden p-2 rounded-lg bg-neutral-900/80 border border-white/10 text-neutral-200 hover:text-white transition-colors"
        title="Menu"
      >
        {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-14 left-0 right-0 z-50 md:hidden bg-[#07080b]/97 border-b border-white/10 backdrop-blur-xl p-3 space-y-2 shadow-2xl">
          <div className="text-xs font-semibold text-neutral-300 truncate px-2 pb-1 border-b border-white/5">
            {movieTitle}
          </div>

          <button
            onClick={() => {
              audioCues.playClick();
              setIsMenuOpen(false);
              onOpenBuyAds?.();
            }}
            className="w-full px-3 py-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Buy Ads</span>
          </button>

          <button
            onClick={() => {
              audioCues.playClick();
              setIsMenuOpen(false);
              onToggleGallery();
            }}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-colors ${
              isGalleryOpen
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                : 'bg-neutral-900 text-neutral-200 border-white/10'
            }`}
          >
            {isGalleryOpen ? (
              <>
                <Radio className="w-3.5 h-3.5 text-black" />
                <span>Watch Live Stream</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cinema Gallery</span>
              </>
            )}
          </button>
        </div>
      )}
    </header>
  );
};
