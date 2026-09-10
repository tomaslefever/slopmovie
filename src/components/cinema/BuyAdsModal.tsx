'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  Tv, 
  Radio, 
  Cpu, 
  ExternalLink, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  MousePointer, 
  Flame 
} from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface BuyAdsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEMON_SQUEEZY_CHECKOUT_URL = 'https://iagents.lemonsqueezy.com/checkout/buy/3cda5e83-443b-4efe-98e2-6556726aff98';

export const BuyAdsModal: React.FC<BuyAdsModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePayClick = () => {
    audioCues.playVoteConfirm();
    window.open(LEMON_SQUEEZY_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { audioCues.playClick(); onClose(); }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#090b10]/95 border border-amber-400/30 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.15)] overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Ambient Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent blur-2xl pointer-events-none" />

          {/* Modal Header */}
          <div className="p-6 border-b border-white/10 flex items-start justify-between relative z-10 bg-black/40">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-widest">
                <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>IMMERSIVE CINEMA ADVERTISING</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Sponsor the Infinite Movie
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                Your brand doesn’t interrupt the film — it is rendered into the cinematic canon.
              </p>
            </div>

            <button
              onClick={() => { audioCues.playClick(); onClose(); }}
              className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/10 transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body / Scrollable Info */}
          <div className="p-6 overflow-y-auto space-y-6 text-neutral-200 text-xs sm:text-sm scrollbar-thin scrollbar-thumb-neutral-800">
            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Card 1 */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-2 relative overflow-hidden group hover:border-amber-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wider">
                  AI Lore Integration
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                  The AI organically adapts your product into the film's active genre: a Cyberpunk megacorp, an ancient fantasy potion, or a zero-gravity orbital reserve.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-2 relative overflow-hidden group hover:border-cyan-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Tv className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wider">
                  Holo-Broadcasts
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                  Broadcasts as a 15-second cinematic break with CRT scanlines, chromatic aberration, anamorphic lighting, and high-impact sound design.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-2 relative overflow-hidden group hover:border-green-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
                  <MousePointer className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wider">
                  Audience Rewards
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                  Viewers receive Community Vote boosts (+50 Votes) when clicking your interactive CTA, drastically increasing engagement and click-through rate.
                </p>
              </div>
            </div>

            {/* Ad Package Showcase Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-neutral-900/80 to-cyan-950/30 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider">
                    AD SHOWCASE SPOTLIGHT INCLUDES:
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold">
                  LIVE STREAMING SPOT
                </span>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300 font-sans">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>15s Full-Screen Holo-Broadcast</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Interactive External CTA Link</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Diegetic In-Scene AR Product Placement</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Real-time Clicks & Impression Metrics</span>
                </li>
              </ul>
            </div>

            {/* Guarantee Note */}
            <div className="flex items-center space-x-2 text-[11px] text-neutral-400 font-mono bg-black/40 p-3 rounded-xl border border-white/5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>
                Processed securely via Lemon Squeezy. Your ad slot goes live automatically in the active cinema cycle.
              </span>
            </div>
          </div>

          {/* Modal Footer / Checkout Action */}
          <div className="p-6 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider block">
                Instant Activation
              </span>
              <span className="text-xs text-amber-300/90 font-medium">
                Sponsor slot opens immediately upon checkout
              </span>
            </div>

            <button
              onClick={handlePayClick}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2.5 transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>Pay Ad Showcase</span>
              <ExternalLink className="w-4 h-4 text-black ml-0.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
