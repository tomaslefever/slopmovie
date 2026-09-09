'use client';

import React from 'react';
import { Film, Sparkles, BookOpen, GitCommit, LayoutGrid, PlusCircle, ShieldCheck, Zap } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface NavbarProps {
  movieTitle: string;
  isMockMode: boolean;
  onOpenBible: () => void;
  onOpenDecisionTree: () => void;
  onOpenNewMovie: () => void;
  onToggleGallery: () => void;
  isGalleryOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  movieTitle,
  isMockMode,
  onOpenBible,
  onOpenDecisionTree,
  onOpenNewMovie,
  onToggleGallery,
  isGalleryOpen
}) => {
  return (
    <header className="h-14 bg-[#07080b]/90 border-b border-white/10 px-4 md:px-6 flex items-center justify-between backdrop-blur-xl z-40 select-none">
      {/* Left: Brand & Movie Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
              <Film className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-black tracking-widest text-white uppercase block leading-none">
              KINETIC CINEMA
            </span>
            <span className="text-[9px] font-mono text-cyan-400 tracking-wider">
              INTERACTIVO • 100 STEPS
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        <div className="text-xs font-semibold text-neutral-300 max-w-[180px] md:max-w-xs truncate">
          {movieTitle}
        </div>
      </div>

      {/* Center/Right: Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Engine Status Badge */}
        <div 
          className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
            isMockMode 
              ? 'bg-amber-950/40 text-amber-300 border-amber-500/30' 
              : 'bg-green-950/40 text-green-300 border-green-500/30'
          }`}
          title={isMockMode ? "Modo Simulación Activo (Claves DeepSeek / fal.ai opcionales)" : "APIs Oficiales DeepSeek & fal.ai Conectadas"}
        >
          {isMockMode ? <Zap className="w-3 h-3 text-amber-400" /> : <ShieldCheck className="w-3 h-3 text-green-400" />}
          <span>{isMockMode ? "MODO SIMULADOR" : "APIs IA REALES"}</span>
        </div>

        {/* Art & Consistency Bible Modal */}
        <button
          onClick={() => { audioCues.playClick(); onOpenBible(); }}
          className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 text-xs font-mono flex items-center space-x-1.5 transition-colors"
          title="Ver personajes, voces y props consistentes"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Biblia de Arte</span>
        </button>

        {/* Decision Tree Modal */}
        <button
          onClick={() => { audioCues.playClick(); onOpenDecisionTree(); }}
          className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 text-xs font-mono flex items-center space-x-1.5 transition-colors"
          title="Ver árbol de decisiones tomadas por la audiencia"
        >
          <GitCommit className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Árbol de Decisiones</span>
        </button>

        {/* Gallery Toggle */}
        <button
          onClick={() => { audioCues.playClick(); onToggleGallery(); }}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition-colors ${
            isGalleryOpen
              ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-white/10'
          }`}
          title="Ver películas terminadas de 100 pasos"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Galería</span>
        </button>

        {/* New Movie Dialog */}
        <button
          onClick={() => { audioCues.playClick(); onOpenNewMovie(); }}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-black text-xs font-bold font-mono flex items-center space-x-1.5 shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all hover:scale-105 active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Nueva Película</span>
        </button>
      </div>
    </header>
  );
};
