'use client';

import React, { useState } from 'react';
import { ImmersiveAd } from '@/types/cinema';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ExternalLink, X, Crosshair } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface InSceneProductHotspotProps {
  ad: ImmersiveAd;
}

export const InSceneProductHotspot: React.FC<InSceneProductHotspotProps> = ({ ad }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    audioCues.playClick();
    setIsOpen(!isOpen);
  };

  const handleCtaClick = async () => {
    audioCues.playClick();
    try {
      await fetch('/api/cinema/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_interaction',
          adId: ad.id,
          metric: 'click'
        })
      });
    } catch {}

    if (ad.ctaUrl) {
      window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="absolute bottom-16 left-4 md:left-6 z-40 pointer-events-auto">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleOpen}
          className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/90 border border-amber-400/40 text-amber-300 backdrop-blur-xl shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all hover:scale-105"
          title="Inspect In-Scene Sponsored Item"
        >
          <Crosshair className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-[9px] font-mono font-bold tracking-widest uppercase">
            AR HUD: {ad.brandName}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        </motion.button>
      )}

      {/* Expanded Hologram Card (compact) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-64 sm:w-72 p-3 sm:p-3.5 rounded-2xl bg-neutral-950/90 border border-amber-400/30 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] space-y-2 select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center space-x-1.5 min-w-0">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest truncate">
                  {ad.brandName} • Product Scan
                </span>
              </div>
              <button
                onClick={handleOpen}
                className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Title */}
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
                {ad.title}
              </h4>
            </div>

            {/* Description */}
            {(ad.description || ad.tagline) && (
              <p className="text-[11px] text-neutral-300 leading-relaxed font-sans line-clamp-2">
                {ad.description || ad.tagline}
              </p>
            )}

            {/* Interactive CTA */}
            <button
              onClick={handleCtaClick}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-bold text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <span className="truncate">{ad.ctaText || 'Inspect Product'}</span>
              <ExternalLink className="w-3 h-3 text-black shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
