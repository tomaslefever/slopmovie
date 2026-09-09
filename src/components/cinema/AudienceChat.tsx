'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/cinema';
import { Send, Users, Sparkles, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface AudienceChatProps {
  messages: ChatMessage[];
  totalAudience: number;
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const AudienceChat: React.FC<AudienceChatProps> = ({
  messages,
  totalAudience,
  onSendMessage,
  isOpen,
  onToggle
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    audioCues.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const sendQuickReaction = (emoji: string) => {
    audioCues.playClick();
    onSendMessage(emoji);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-neutral-900/90 border border-white/10 text-cyan-400 hover:text-white shadow-2xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95 flex items-center space-x-2"
        title="Open Audience Chat"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-xs font-mono font-bold bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-300">
          {totalAudience}
        </span>
      </button>
    );
  }

  return (
    <aside className="w-80 md:w-96 h-full bg-[#08090d]/95 border-l border-white/10 flex flex-col backdrop-blur-2xl z-30 transition-all duration-300 select-none">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
          <h2 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
            Audience Room
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-neutral-400 font-mono bg-neutral-900/80 px-2.5 py-1 rounded-full border border-white/5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{totalAudience}</span>
          </div>
          <button
            onClick={onToggle}
            className="text-neutral-400 hover:text-white p-1 rounded transition-colors"
            title="Hide Chat"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div 
                key={msg.id}
                className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300 font-mono shadow-inner"
              >
                <div className="flex items-center space-x-1 mb-1 text-[10px] text-cyan-400 font-bold tracking-widest uppercase">
                  <Sparkles className="w-3 h-3" />
                  <span>{msg.userName} • {msg.timestamp}</span>
                </div>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            );
          }

          if (msg.votedOption) {
            return (
              <div 
                key={msg.id}
                className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/50 border border-white/5 text-xs"
              >
                <span className="font-semibold text-neutral-300">{msg.userName}</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                  msg.votedOption === 'A' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  Voted Option {msg.votedOption}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="text-xs group">
              <div className="flex items-baseline space-x-2 mb-0.5">
                <span className="font-bold text-neutral-300 group-hover:text-cyan-300 transition-colors">
                  {msg.userName}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {msg.timestamp}
                </span>
              </div>
              <p className="text-neutral-200 leading-relaxed break-words bg-neutral-900/30 p-2 rounded-lg border border-white/5">
                {msg.text}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-around bg-black/20">
        {['🍿', '🔥', '😱', '🤖', '🎬'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendQuickReaction(emoji)}
            className="text-base hover:scale-125 transition-transform active:scale-95"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-black/40 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Discuss the film, share theories..."
          maxLength={280}
          className="flex-1 bg-neutral-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all font-sans"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-black transition-all hover:scale-105 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
};
