'use client';

import React from 'react';
import { Film, LayoutGrid, Radio, Sliders } from 'lucide-react';
import Link from 'next/link';
import { audioCues } from '@/lib/audio-cues';

interface NavbarProps {
  movieTitle: string;
  isMockMode?: boolean;
  onToggleGallery: () => void;
  isGalleryOpen: boolean;
  currentStep?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  movieTitle,
  onToggleGallery,
  isGalleryOpen,
  currentStep = 1
}) => {
  return (
    <header className="h-14 bg-[#07080b]/90 border-b border-white/10 px-4 md:px-6 flex items-center justify-between backdrop-blur-xl z-40 select-none">
      {/* Left: Brand & Movie Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
              <Film className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <span className="text-xs font-black tracking-widest text-white uppercase block leading-none">
              KINETIC CINEMA
            </span>
            <span className="text-[9px] font-mono text-cyan-400 tracking-wider">
              LIVE INTERACTIVE STREAMING
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        <div className="text-xs font-semibold text-neutral-300 max-w-[180px] md:max-w-md truncate">
          {movieTitle}
        </div>
      </div>

      {/* Center: Live indicator badge */}
      <div className="hidden md:flex items-center space-x-2 bg-neutral-900/80 border border-white/10 px-3 py-1 rounded-full text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        <span className="text-neutral-300">Step {currentStep} of 100</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Admin Console Link */}
        <Link
          href="/admin"
          onClick={() => audioCues.playClick()}
          className="px-3 py-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
          title="Director & Immersive Ads Admin Console"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Director / Ads</span>
        </Link>

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
    </header>
  );
};
