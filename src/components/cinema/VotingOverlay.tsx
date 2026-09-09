'use client';

import React, { useEffect } from 'react';
import { DecisionOption } from '@/types/cinema';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Dices, Flame, Sparkles, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioCues } from '@/lib/audio-cues';

interface VotingOverlayProps {
  isVisible: boolean;
  timeRemaining: number;
  options: [DecisionOption, DecisionOption];
  votesA: number;
  votesB: number;
  userVoted: 'A' | 'B' | null;
  onVote: (optionId: 'A' | 'B') => void;
}

export const VotingOverlay: React.FC<VotingOverlayProps> = ({
  isVisible,
  timeRemaining,
  options,
  votesA,
  votesB,
  userVoted,
  onVote
}) => {
  const totalVotes = votesA + votesB;
  const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;

  // Keyboard shortcut listeners (1 and 2)
  useEffect(() => {
    if (!isVisible) return;

    audioCues.playVotingAlert();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === 'a' || e.key === 'A') {
        handleCastVote('A');
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        handleCastVote('B');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const handleCastVote = (optionId: 'A' | 'B') => {
    if (userVoted === optionId) return;

    audioCues.playVoteCast();
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8, x: optionId === 'A' ? 0.35 : 0.65 },
      colors: optionId === 'A' ? ['#00f0ff', '#0070f3'] : ['#ff0055', '#ffaa00']
    });

    onVote(optionId);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xl flex flex-col items-center justify-center p-6"
      >
        {/* Glowing Top Countdown Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="relative flex items-center justify-center mb-3">
            {/* Pulsing Timer Circle */}
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={timeRemaining <= 3 ? "#ef4444" : "#00f0ff"}
                strokeWidth="5"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 * (1 - timeRemaining / 10)}
                className="transition-all duration-1000 ease-linear drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black font-mono tracking-tighter ${
                timeRemaining <= 3 ? "text-red-500 animate-ping" : "text-white"
              }`}>
                {timeRemaining}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">
                SEG
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Timer className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white">
              Votación de la Audiencia
            </h2>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-md">
            Elige el siguiente giro argumental. Presiona <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-white font-mono">1</kbd> o <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-white font-mono">2</kbd>
          </p>
        </div>

        {/* 2 Options Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* OPTION A */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCastVote('A')}
            className={`relative p-6 rounded-2xl cursor-pointer border transition-all duration-300 overflow-hidden group ${
              userVoted === 'A'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.3)]'
                : 'bg-neutral-900/60 hover:bg-neutral-900/80 border-white/10 hover:border-cyan-500/50'
            }`}
          >
            {/* Top Tag & Hotkey */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 font-black flex items-center justify-center text-sm shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                  A
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  OPCIÓN A
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-white/5">
                Tecla [1]
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
              {options[0].title}
            </h3>

            <p className="text-xs text-neutral-300 mb-4 leading-relaxed line-clamp-3">
              {options[0].text}
            </p>

            {options[0].dramaticHook && (
              <div className="text-[11px] text-cyan-400/90 font-mono bg-cyan-950/50 px-3 py-1.5 rounded-lg border border-cyan-800/40 mb-4">
                ⚡ {options[0].dramaticHook}
              </div>
            )}

            {/* Percentage Bar & Votes */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">{votesA} votos</span>
                <span className="font-bold text-cyan-400">{percentA}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentA}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                />
              </div>
            </div>

            {userVoted === 'A' && (
              <div className="absolute top-4 right-4 flex items-center space-x-1 text-cyan-400 text-xs font-bold bg-cyan-950/90 border border-cyan-400 px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                <span>TU VOTO</span>
              </div>
            )}
          </motion.div>

          {/* OPTION B */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCastVote('B')}
            className={`relative p-6 rounded-2xl cursor-pointer border transition-all duration-300 overflow-hidden group ${
              userVoted === 'B'
                ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
                : 'bg-neutral-900/60 hover:bg-neutral-900/80 border-white/10 hover:border-amber-500/50'
            }`}
          >
            {/* Top Tag & Hotkey */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-400 font-black flex items-center justify-center text-sm shadow-[0_0_10px_rgba(251,191,36,0.4)]">
                  B
                </span>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  OPCIÓN B
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-white/5">
                Tecla [2]
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
              {options[1].title}
            </h3>

            <p className="text-xs text-neutral-300 mb-4 leading-relaxed line-clamp-3">
              {options[1].text}
            </p>

            {options[1].dramaticHook && (
              <div className="text-[11px] text-amber-400/90 font-mono bg-amber-950/50 px-3 py-1.5 rounded-lg border border-amber-800/40 mb-4">
                🔥 {options[1].dramaticHook}
              </div>
            )}

            {/* Percentage Bar & Votes */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">{votesB} votos</span>
                <span className="font-bold text-amber-400">{percentB}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentB}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                />
              </div>
            </div>

            {userVoted === 'B' && (
              <div className="absolute top-4 right-4 flex items-center space-x-1 text-amber-400 text-xs font-bold bg-amber-950/90 border border-amber-400 px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                <span>TU VOTO</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Tie-breaker Rule Footer */}
        <div className="flex items-center space-x-2 mt-6 text-xs text-neutral-400 font-mono bg-neutral-900/60 border border-white/5 px-4 py-2 rounded-full">
          <Dices className="w-3.5 h-3.5 text-amber-400" />
          <span>Si hay empate o 0 votos, el sistema escogerá automáticamente al azar.</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
