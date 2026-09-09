'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/cinema';
import { Send, Users, Sparkles, MessageSquare, ChevronRight, ChevronLeft, AtSign, Check, Edit2, ThumbsUp, Flame, Trophy } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface AudienceChatProps {
  messages: ChatMessage[];
  totalAudience: number;
  onSendMessage: (text: string) => Promise<boolean | void> | void;
  nickname: string | null;
  onSetNickname: (nickname: string) => Promise<boolean | void> | void;
  isOpen: boolean;
  onToggle: () => void;
  onVoteComment?: (commentId: string) => void;
  topVotedMessages?: ChatMessage[];
}

export const AudienceChat: React.FC<AudienceChatProps> = ({
  messages,
  totalAudience,
  onSendMessage,
  nickname,
  onSetNickname,
  isOpen,
  onToggle,
  onVoteComment,
  topVotedMessages = []
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'top'>('live');
  const [inputText, setInputText] = useState('');
  const [nicknameInput, setNicknameInput] = useState(nickname || '');
  const [isEditingNickname, setIsEditingNickname] = useState(!nickname);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nickname) {
      setNicknameInput(nickname);
      setIsEditingNickname(false);
    } else {
      setIsEditingNickname(true);
    }
  }, [nickname]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nicknameInput.trim().replace(/^@+/, '');
    if (!cleanNick || cleanNick.length < 2) {
      setNicknameError('El nickname debe tener al menos 2 caracteres.');
      return;
    }
    if (cleanNick.length > 24) {
      setNicknameError('El nickname no puede superar los 24 caracteres.');
      return;
    }
    if (cleanNick.startsWith('Viewer_') || cleanNick.toLowerCase() === 'espectador') {
      setNicknameError('Elige un apodo personalizado para identificarte.');
      return;
    }

    try {
      setIsSavingNickname(true);
      setNicknameError(null);
      await onSetNickname(cleanNick);
      setIsEditingNickname(false);
      audioCues.playClick();
    } catch {
      setNicknameError('Error guardando nickname. Intenta de nuevo.');
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) {
      setIsEditingNickname(true);
      setNicknameError('Para chatear es necesario usar un nickname.');
      return;
    }
    if (!inputText.trim()) return;

    audioCues.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const sendQuickReaction = (emoji: string) => {
    if (!nickname) {
      setIsEditingNickname(true);
      setNicknameError('Para reaccionar o chatear es necesario usar un nickname.');
      return;
    }
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 bg-black/40 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab('live');
            audioCues.playClick();
          }}
          className={`flex-1 py-2.5 flex items-center justify-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === 'live'
              ? 'border-cyan-400 text-cyan-400 bg-white/[0.02]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>En Vivo</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('top');
            audioCues.playClick();
          }}
          className={`flex-1 py-2.5 flex items-center justify-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === 'top'
              ? 'border-amber-400 text-amber-400 bg-white/[0.02]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>🔥 Más Votados</span>
          {topVotedMessages.length > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {topVotedMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {activeTab === 'top' ? (
          <div className="space-y-3">
            {/* Director Guidance Card */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 font-mono shadow-inner space-y-1">
              <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-amber-400 text-[11px]">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Influencia en el Guion AI</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-300 font-sans">
                El Director AI analiza los comentarios más votados e ideas de los últimos 30s para generar giros inesperados en las siguientes escenas.
              </p>
            </div>

            {topVotedMessages.length === 0 ? (
              <div className="text-center py-10 space-y-2 text-neutral-500">
                <Trophy className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
                <p className="text-xs">No hay comentarios votados aún.</p>
                <p className="text-[10px] text-neutral-600">¡Vota los mejores comentarios en el chat para impulsarlos!</p>
              </div>
            ) : (
              topVotedMessages.map((msg, idx) => {
                const isOwnMessage = Boolean(nickname && msg.userName.toLowerCase() === nickname.toLowerCase());
                const rankColor =
                  idx === 0 ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' :
                  idx === 1 ? 'text-neutral-300 border-neutral-300/40 bg-neutral-300/10' :
                  idx === 2 ? 'text-amber-600 border-amber-600/40 bg-amber-600/10' :
                  'text-neutral-500 border-white/5 bg-neutral-900/40';

                return (
                  <div
                    key={`top_${msg.id}`}
                    className={`p-3 rounded-xl border transition-all ${
                      msg.hasUserVoted 
                        ? 'bg-amber-950/20 border-amber-500/30' 
                        : 'bg-neutral-900/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] border ${rankColor}`}>
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-xs text-white">
                          @{msg.userName}
                          {isOwnMessage && <span className="ml-1 text-[10px] text-cyan-400 font-normal">(Tú)</span>}
                        </span>
                      </div>

                      {/* Vote Button */}
                      <button
                        onClick={() => {
                          audioCues.playClick();
                          onVoteComment?.(msg.id);
                        }}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all active:scale-95 ${
                          msg.hasUserVoted
                            ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                            : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                        }`}
                        title={msg.hasUserVoted ? "Quitar voto" : "Votar este comentario"}
                      >
                        <ThumbsUp className={`w-3 h-3 ${msg.hasUserVoted ? 'fill-black' : ''}`} />
                        <span>{msg.votesCount || 0}</span>
                      </button>
                    </div>

                    <p className="text-xs text-neutral-200 leading-relaxed break-words pl-7">
                      {msg.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          messages.map((msg) => {
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

            const isOwnMessage = Boolean(nickname && msg.userName.toLowerCase() === nickname.toLowerCase());

            return (
              <div key={msg.id} className={`text-xs group ${isOwnMessage ? 'pl-2 border-l-2 border-cyan-400/60' : ''}`}>
                <div className="flex items-baseline justify-between mb-0.5">
                  <div className="flex items-baseline space-x-2">
                    <span className={`font-bold transition-colors ${
                      isOwnMessage ? 'text-cyan-300 font-mono' : 'text-neutral-300 group-hover:text-cyan-300'
                    }`}>
                      {msg.userName}
                      {isOwnMessage && <span className="ml-1 text-[10px] text-cyan-400/70 font-sans font-normal">(Tú)</span>}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Upvote Button on each chat message */}
                  <button
                    onClick={() => {
                      audioCues.playClick();
                      onVoteComment?.(msg.id);
                    }}
                    className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-all active:scale-95 ${
                      msg.hasUserVoted
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60'
                    }`}
                    title={msg.hasUserVoted ? "Quitar voto" : "Votar comentario"}
                  >
                    <ThumbsUp className={`w-2.5 h-2.5 ${msg.hasUserVoted ? 'fill-amber-300' : ''}`} />
                    <span>{msg.votesCount || 0}</span>
                  </button>
                </div>
                <p className={`leading-relaxed break-words p-2 rounded-lg border ${
                  isOwnMessage 
                    ? 'bg-cyan-950/20 text-neutral-100 border-cyan-500/20 shadow-sm' 
                    : 'bg-neutral-900/30 text-neutral-200 border-white/5'
                }`}>
                  {msg.text}
                </p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Nickname Setting Card vs Active Chat Input */}
      {!nickname || isEditingNickname ? (
        <div className="p-3.5 border-t border-white/10 bg-black/60 backdrop-blur-xl">
          <form onSubmit={handleNicknameSubmit} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-neutral-300 font-semibold">
                <AtSign className="w-3.5 h-3.5 text-cyan-400" />
                <span>{nickname ? 'Cambiar Nickname' : 'Elige tu Nickname para chatear'}</span>
              </div>
              {nickname && (
                <button
                  type="button"
                  onClick={() => {
                    setNicknameInput(nickname);
                    setIsEditingNickname(false);
                    setNicknameError(null);
                  }}
                  className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs text-cyan-400/80 font-mono font-bold select-none">@</span>
                <input
                  ref={nicknameInputRef}
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => {
                    setNicknameInput(e.target.value);
                    if (nicknameError) setNicknameError(null);
                  }}
                  placeholder="tu_apodo..."
                  maxLength={24}
                  className="w-full bg-neutral-900/90 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-sans"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isSavingNickname || !nicknameInput.trim()}
                className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-black font-bold text-xs flex items-center space-x-1 transition-all active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingNickname ? 'Guardando...' : 'Unirse'}</span>
              </button>
            </div>

            {nicknameError ? (
              <p className="text-[11px] text-rose-400 font-mono">{nicknameError}</p>
            ) : (
              <p className="text-[10px] text-neutral-500 font-mono">
                Para chatear y enviar reacciones es obligatorio usar un nickname.
              </p>
            )}
          </form>
        </div>
      ) : (
        <>
          {/* Quick Reaction Bar */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-around bg-black/20">
            {['🍿', '🔥', '😱', '🤖', '🎬'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendQuickReaction(emoji)}
                className="text-base hover:scale-125 transition-transform active:scale-95"
                title={`Enviar ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input Field with Active Nickname */}
          <div className="p-3 border-t border-white/10 bg-black/40 space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400 font-mono">
              <div className="flex items-center space-x-1.5 truncate">
                <span className="text-neutral-500">Chateando como:</span>
                <span className="text-cyan-400 font-bold truncate">@{nickname}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNicknameInput(nickname);
                  setIsEditingNickname(true);
                }}
                className="flex items-center space-x-1 text-[10px] text-neutral-500 hover:text-cyan-300 transition-colors ml-2 flex-shrink-0"
                title="Cambiar nickname"
              >
                <Edit2 className="w-3 h-3" />
                <span>cambiar</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Comenta como @${nickname}...`}
                maxLength={280}
                className="flex-1 bg-neutral-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all font-sans"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </aside>
  );
};
