'use client';

import React, { useEffect, useRef } from 'react';
import { BlockbusterCandidate } from '@/types/cinema';
import { motion } from 'framer-motion';
import { Clapperboard, Timer, Trophy, Radio, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioCues } from '@/lib/audio-cues';

interface BlockbusterVotingProps {
  candidates: BlockbusterCandidate[];
  counts: Record<'A' | 'B' | 'C' | 'D', number>;
  timeRemaining: number;
  userVoted: 'A' | 'B' | 'C' | 'D' | null;
  onVote: (candidateId: 'A' | 'B' | 'C' | 'D') => void;
}

const GENRE_COLORS = ['text-cyan-300 bg-cyan-500/10 border-cyan-400/30', 'text-amber-300 bg-amber-500/10 border-amber-400/30', 'text-purple-300 bg-purple-500/10 border-purple-400/30', 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30'];

export const BlockbusterVoting: React.FC<BlockbusterVotingProps> = ({
  candidates,
  counts,
  timeRemaining,
  userVoted,
  onVote
}) => {
  const currentSeconds = Math.max(0, Math.min(30, timeRemaining));
  const totalVotes = counts.A + counts.B + counts.C + counts.D;

  const handleCastVote = (candidateId: 'A' | 'B' | 'C' | 'D') => {
    if (userVoted === candidateId) return;
    audioCues.playVoteCast();
    confetti({
      particleCount: 30,
      spread: 55,
      origin: { y: 0.7, x: 0.5 },
      colors: ['#00f0ff', '#f5a623', '#a855f7', '#10b981']
    });
    onVote(candidateId);
  };

  // Alert chime once when the blockbuster vote opens
  const hasAlertPlayedRef = useRef(false);
  useEffect(() => {
    if (!hasAlertPlayedRef.current) {
      hasAlertPlayedRef.current = true;
      audioCues.playVotingAlert();
    }
    return () => {
      hasAlertPlayedRef.current = false;
    };
  }, []);

  // Keyboard shortcuts 1-4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, 'A' | 'B' | 'C' | 'D'> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      const target = map[e.key];
      if (target && candidates.some(c => c.id === target) && userVoted !== target) {
        audioCues.playVoteCast();
        onVote(target);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [candidates, userVoted, onVote]);

  return (
    <div className="absolute inset-0 z-40 bg-[#030407]/95 backdrop-blur-md flex flex-col items-center justify-center overflow-hidden select-none px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-radial from-purple-500/10 via-transparent to-black pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center space-y-2 mb-6"
      >
        <div className="flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5">
            <Radio className="w-3 h-3 animate-pulse" /> Next Blockbuster Vote
          </span>
        </div>
        <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight uppercase">
          The Next Film Is In <span className="text-purple-400">Your Hands</span>
        </h2>
        <p className="text-[11px] sm:text-xs text-neutral-400 font-mono uppercase tracking-widest">
          4 candidates · 30 seconds · majority rules
        </p>
      </motion.div>

      {/* Countdown */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 mb-6 flex items-center gap-2 bg-neutral-900/90 border border-white/15 px-4 py-2 rounded-full backdrop-blur-md shadow-xl"
      >
        <Timer className="w-4 h-4 text-purple-400" />
        <span className="font-mono text-sm text-neutral-200">VOTE CLOSES IN</span>
        <span className={`font-mono font-black text-lg ${currentSeconds <= 10 ? 'text-red-400 animate-pulse' : 'text-purple-300'}`}>
          {currentSeconds}s
        </span>
      </motion.div>

      {/* Candidates grid */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {candidates.map((candidate, idx) => {
          const votes = counts[candidate.id] || 0;
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = userVoted === candidate.id;
          const leading = votes > 0 && votes === Math.max(...Object.values(counts));

          return (
            <motion.button
              key={candidate.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 * idx, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => handleCastVote(candidate.id)}
              className={`relative group text-left p-4 rounded-2xl border backdrop-blur-xl transition-all flex flex-col gap-3 min-h-[220px] ${
                isSelected
                  ? 'bg-purple-500/15 border-purple-400/70 shadow-[0_0_30px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/50'
                  : 'bg-neutral-950/70 border-white/10 hover:border-purple-400/50 hover:bg-neutral-900/80 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {/* Option letter + genre badge */}
              <div className="flex items-start justify-between gap-2">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                  isSelected ? 'bg-purple-500 text-black' : 'bg-white/10 text-neutral-300'
                }`}>
                  {candidate.id}
                </span>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${GENRE_COLORS[idx % GENRE_COLORS.length]}`}>
                  {candidate.genre}
                </span>
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-black text-white leading-snug group-hover:text-purple-200 transition-colors">
                  {candidate.title}
                </h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-2 line-clamp-4">
                  {candidate.logline}
                </p>
              </div>

              {/* Vote bar */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="h-1.5 rounded-full bg-black/60 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isSelected ? 'bg-purple-400' : 'bg-gradient-to-r from-purple-500 to-fuchsia-400'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                    <Clapperboard className="w-3 h-3" /> {votes} votes
                    {leading && votes > 0 && (
                      <span className="text-amber-300 font-bold flex items-center gap-0.5">
                        <Trophy className="w-3 h-3" /> LEAD
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold text-purple-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> YOUR PICK
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="relative z-10 mt-5 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
        Press 1 · 2 · 3 · 4 to vote instantly
      </p>
    </div>
  );
};
