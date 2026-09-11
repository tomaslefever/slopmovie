'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSupabaseBrowserClient, initSupabaseBrowserClient } from '@/lib/supabase/client';
import { ImmersiveAd, AdsConfig, Movie, ContactMessage, isOptionVotingPhase, isMovieVotingPhase } from '@/types/cinema';
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
  Shuffle,
  RotateCcw,
  History,
  PlayCircle,
  Pencil,
  X,
  BarChart3,
  ExternalLink,
  CheckSquare,
  Square,
  Search,
  Filter,
  Layers,
  Clapperboard,
  Mail,
  Inbox,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { audioCues } from '@/lib/audio-cues';

const VIDEO_MODEL_CHOICES = [
  { id: 'minimax/h3-max-turbo/text-to-video', label: 'MiniMax H3-Max Turbo — Text-to-Video (económico)' },
  { id: 'minimax/h3-max/text-to-video', label: 'MiniMax H3-Max — Text-to-Video (costoso)' },
  { id: 'minimax/h3-max/reference-to-video', label: 'MiniMax H3-Max — Reference-to-Video (el más caro)' },
  { id: 'minimax/h3-max/image-to-video', label: 'MiniMax H3-Max — Image-to-Video (keyframe Flux)' }
];

const VIDEO_RESOLUTION_CHOICES = [
  { id: '', label: 'Auto (por defecto del modelo)' },
  { id: '480P', label: '480P' },
  { id: '768P', label: '768P' },
  { id: '1080P', label: '1080P' }
];

export default function AdminDashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Cinema & Ads states
  const [cinemaState, setCinemaState] = useState<any>(null);
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  const [isSwitchingMovie, setIsSwitchingMovie] = useState(false);
  const [ads, setAds] = useState<ImmersiveAd[]>([]);
  const [adsConfig, setAdsConfig] = useState<AdsConfig>({
    autoAdsEnabled: true,
    adIntervalSteps: 5,
    lastAdStep: 0
  });
  const [activeTab, setActiveTab] = useState<'ads' | 'movie' | 'movies' | 'stats' | 'messages'>('ads');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [customPremise, setCustomPremise] = useState('');
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [selectedStepNumber, setSelectedStepNumber] = useState<number | ''>('');
  const [isJumpingStep, setIsJumpingStep] = useState(false);
  const [videoModel, setVideoModel] = useState<string>('minimax/h3-max-turbo/text-to-video');
  const [videoResolution, setVideoResolution] = useState<string>('');
  const [draftVideoModel, setDraftVideoModel] = useState<string>('minimax/h3-max-turbo/text-to-video');
  const [draftVideoResolution, setDraftVideoResolution] = useState<string>('');
  const [isModelDirty, setIsModelDirty] = useState(false);
  const [isSavingModelConfig, setIsSavingModelConfig] = useState(false);
  const modelDirtyRef = useRef(false);

  // Movie edit & creation state
  const [isEditingMovie, setIsEditingMovie] = useState(false);
  const [editingTargetMovie, setEditingTargetMovie] = useState<any | null>(null);
  const [editMovieTitle, setEditMovieTitle] = useState('');
  const [editMovieGenre, setEditMovieGenre] = useState('');
  const [editMovieTagline, setEditMovieTagline] = useState('');
  const [editMoviePlot, setEditMoviePlot] = useState('');
  const [isSavingMovie, setIsSavingMovie] = useState(false);
  const [isCreatingMovie, setIsCreatingMovie] = useState(false);
  const [isDeletingMovie, setIsDeletingMovie] = useState(false);
  const [isPreparingBlockbusterVote, setIsPreparingBlockbusterVote] = useState(false);

  // Bulk movie management state
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [movieGenreFilter, setMovieGenreFilter] = useState('all');
  const [movieStatusFilter, setMovieStatusFilter] = useState('all');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEditGenre, setBulkEditGenre] = useState('');
  const [bulkEditStatus, setBulkEditStatus] = useState('');
  const [bulkEditTagline, setBulkEditTagline] = useState('');

  // Stats state
  const [stats, setStats] = useState<{ visitsByDay: { date: string; count: number }[]; totalVisits: number; todayVisits: number; activeViewers: number } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Fetch simple visit statistics
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/cinema/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Contact Messages state & operations
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);

  // Fetch contact messages
  const fetchContactMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch('/api/contact');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setContactMessages(data.messages);
          setSelectedMessage(prev => {
            if (!prev) return data.messages[0] || null;
            const stillExists = data.messages.find((m: ContactMessage) => m.id === prev.id);
            return stillExists || data.messages[0] || null;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching contact messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleToggleMessageStatus = async (msg: ContactMessage) => {
    audioCues.playClick();
    const newStatus = msg.status === 'unread' ? 'read' : 'unread';
    setIsUpdatingMessage(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, status: newStatus })
      });
      if (res.ok) {
        setContactMessages(prev =>
          prev.map(m => (m.id === msg.id ? { ...m, status: newStatus } : m))
        );
        setSelectedMessage(prev => (prev?.id === msg.id ? { ...prev, status: newStatus } : prev));
        showFeedback(newStatus === 'read' ? '✉️ Marcado como leído' : '📬 Marcado como no leído');
      } else {
        showFeedback('Error al actualizar estado del mensaje');
      }
    } catch {
      showFeedback('Error de red al actualizar mensaje');
    } finally {
      setIsUpdatingMessage(false);
    }
  };

  const handleDeleteContactMessage = async (id: string, name?: string) => {
    audioCues.playClick();
    if (!confirm(`🗑️ ¿Eliminar definitivamente el mensaje de "${name || 'este remitente'}"?`)) return;

    setIsUpdatingMessage(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setContactMessages(prev => {
          const next = prev.filter(m => m.id !== id);
          if (selectedMessage?.id === id) {
            setSelectedMessage(next[0] || null);
          }
          return next;
        });
        showFeedback('🗑️ Mensaje eliminado correctamente');
      } else {
        showFeedback('Error al eliminar mensaje');
      }
    } catch {
      showFeedback('Error de red al eliminar mensaje');
    } finally {
      setIsUpdatingMessage(false);
    }
  };

  // Filtered contact messages
  const filteredMessages = contactMessages.filter(msg => {
    if (messageFilter === 'unread' && msg.status !== 'unread') return false;
    if (messageFilter === 'read' && msg.status === 'unread') return false;
    if (messageSearchQuery.trim()) {
      const q = messageSearchQuery.toLowerCase();
      const matchName = msg.name?.toLowerCase().includes(q);
      const matchEmail = msg.email?.toLowerCase().includes(q);
      const matchSubject = msg.subject?.toLowerCase().includes(q);
      const matchMessage = msg.message?.toLowerCase().includes(q);
      return matchName || matchEmail || matchSubject || matchMessage;
    }
    return true;
  });

  const unreadMessagesCount = contactMessages.filter(m => m.status === 'unread').length;

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
        fetch('/api/cinema/state?includeAllMovies=true')
      ]);

      if (adsRes.ok) {
        const adsData = await adsRes.json();
        setAds(adsData.ads || []);
        if (adsData.adsConfig) setAdsConfig(adsData.adsConfig);
      }

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        setCinemaState(stateData);
        if (stateData.allMovies && Array.isArray(stateData.allMovies)) {
          setAllMovies(stateData.allMovies);
        }
        if (stateData.videoModel) {
          setVideoModel(stateData.videoModel);
          if (!modelDirtyRef.current) setDraftVideoModel(stateData.videoModel);
        }
        setVideoResolution(stateData.videoResolution || '');
        if (!modelDirtyRef.current) setDraftVideoResolution(stateData.videoResolution || '');
        setSelectedMovieId(prev => prev || stateData.movie?.id || (stateData.allMovies?.[0]?.id ?? ''));
        if (stateData.supabaseConfig?.url && stateData.supabaseConfig?.anonKey) {
          initSupabaseBrowserClient(stateData.supabaseConfig.url, stateData.supabaseConfig.anonKey);
        }
      }
      fetchContactMessages();
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
      // Lightweight fallback poll — primary refresh comes from Supabase Realtime below
      const interval = setInterval(fetchData, 45000);

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const channel = supabase.channel('cinema_admin_sync', {
          config: { broadcast: { self: true } }
        });

        channel
          .on('broadcast', { event: 'generation_paused' }, () => {
            setCinemaState((prev: any) => prev ? { ...prev, isGenerationPaused: true } : prev);
          })
          .on('broadcast', { event: 'generation_resumed' }, () => {
            setCinemaState((prev: any) => prev ? { ...prev, isGenerationPaused: false } : prev);
          })
          .on('broadcast', { event: 'cinema_paused' }, () => {
            setCinemaState((prev: any) => prev ? { ...prev, isPaused: true } : prev);
          })
          .on('broadcast', { event: 'cinema_resumed' }, () => {
            setCinemaState((prev: any) => prev ? { ...prev, isPaused: false } : prev);
          })
          .on('broadcast', { event: 'state_snapshot' }, (payload: any) => {
            if (payload.payload) {
              setCinemaState((prev: any) => ({
                ...prev,
                ...payload.payload,
                isPaused: payload.payload.isPaused !== undefined ? payload.payload.isPaused : prev?.isPaused,
                isGenerationPaused: payload.payload.isGenerationPaused !== undefined ? payload.payload.isGenerationPaused : prev?.isGenerationPaused
              }));
              if (payload.payload.videoModel) {
                setVideoModel(payload.payload.videoModel);
                if (!modelDirtyRef.current) setDraftVideoModel(payload.payload.videoModel);
              }
              if (payload.payload.videoResolution !== undefined) {
                setVideoResolution(payload.payload.videoResolution || '');
                if (!modelDirtyRef.current) setDraftVideoResolution(payload.payload.videoResolution || '');
              }
            }
          })
          .on('broadcast', { event: 'blockbuster_vote_update' }, (payload: any) => {
            if (payload.payload?.counts) {
              setCinemaState((prev: any) => prev ? { ...prev, blockbusterVoteCounts: payload.payload.counts } : prev);
            }
          })
          .on('broadcast', { event: 'blockbuster_vote_started' }, (payload: any) => {
            if (payload.payload?.candidates) {
              setCinemaState((prev: any) => prev ? {
                ...prev,
                phase: 'BLOCKBUSTER_VOTING',
                timeRemaining: 60,
                blockbusterCandidates: payload.payload.candidates,
                blockbusterVoteCounts: { A: 0, B: 0, C: 0, D: 0 }
              } : prev);
            }
          })
          .subscribe();

        // ── Supabase Realtime (postgres_changes): refresh admin state the instant
        // anything changes in the database — no heavy polling needed. ──────────
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedFetch = () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchData();
          }, 400);
        };

        const dbChannel = supabase.channel('cinema_admin_db_sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cinema_state' }, debouncedFetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, debouncedFetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'movie_steps' }, debouncedFetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'immersive_ads' }, debouncedFetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'blockbuster_votes' }, debouncedFetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
            fetchContactMessages();
          })
          .subscribe();

        return () => {
          clearInterval(interval);
          if (debounceTimer) clearTimeout(debounceTimer);
          supabase.removeChannel(channel);
          supabase.removeChannel(dbChannel);
        };
      }

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

  // Switch to Select Movie state (BLOCKBUSTER_VOTING):
  // Starts generating candidate films, then enters BLOCKBUSTER_VOTING (60s)
  const handleStartBlockbusterVoting = async () => {
    audioCues.playClick();
    setIsPreparingBlockbusterVote(true);
    try {
      showFeedback('✨ Generando posibles películas con IA...');
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare_blockbuster_voting' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setCinemaState((prev: any) => ({ ...prev, ...data.state }));
        }
        showFeedback('🎟️ ¡Películas generadas! Estado cambiado a Selección de Película (60s)');
        fetchData();
      } else {
        showFeedback('Error al iniciar la selección de película');
      }
    } catch {
      showFeedback('Error de red al iniciar la selección de película');
    } finally {
      setIsPreparingBlockbusterVote(false);
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

  // Mark the draft model/resolution config as dirty (unsaved)
  const markModelDirty = () => {
    modelDirtyRef.current = true;
    setIsModelDirty(true);
  };

  // Save the model + resolution configuration explicitly (single Save button)
  const handleSaveModelConfig = async () => {
    audioCues.playClick();
    // Credit guards for the expensive models
    if (draftVideoModel === 'minimax/h3-max/reference-to-video') {
      if (!confirm('💸 Reference-to-Video es el modelo MÁS CARO (usa el clip previo + props como referencias). ¿Continuar?')) return;
    }
    if (draftVideoModel === 'minimax/h3-max/text-to-video') {
      if (!confirm('⚠️ H3-Max estándar es notablemente más costoso que Turbo. ¿Continuar?')) return;
    }

    setIsSavingModelConfig(true);
    try {
      const [modelRes, resRes] = await Promise.all([
        fetch('/api/cinema/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_video_model', model: draftVideoModel })
        }),
        fetch('/api/cinema/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_video_resolution', resolution: draftVideoResolution || null })
        })
      ]);

      if (modelRes.ok && resRes.ok) {
        const modelData = await modelRes.json();
        const resData = await resRes.json();
        if (modelData.success && resData.success) {
          setVideoModel(draftVideoModel);
          setVideoResolution(draftVideoResolution);
          modelDirtyRef.current = false;
          setIsModelDirty(false);
          showFeedback(`💾 Configuración guardada y persistida: ${draftVideoModel}${draftVideoResolution ? ` · ${draftVideoResolution}` : ''}`);
          fetchData();
        } else {
          showFeedback('Configuración de modelo no válida');
        }
      } else {
        showFeedback('Error al guardar la configuración de modelo');
      }
    } catch {
      showFeedback('Error de red al guardar la configuración');
    } finally {
      setIsSavingModelConfig(false);
    }
  };

  // Prepare the NEXT BLOCKBUSTER audience vote: generates the 4 candidate films
  // server-side and switches the frontend to the 60s movie-selection phase.
  const handlePrepareBlockbusterVote = async () => {
    audioCues.playClick();
    if (!confirm('🎟️ ¿Abrir la votación de la PRÓXIMA película? La audiencia tendrá 60 segundos para elegir entre 4 candidatas. Al terminar, la ganadora se generará y transmitirá.')) return;

    setIsPreparingBlockbusterVote(true);
    showFeedback('🎟️ Generando las 4 candidatas de blockbuster...');
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare_blockbuster_voting' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCinemaState((prev: any) => prev ? { ...prev, ...data.state } : prev);
          showFeedback(`🎟️ Votación de próxima película ABIERTA: ${data.candidates?.length || 0} candidatas · 60 segundos.`);
          fetchData();
        } else {
          showFeedback('No se pudo abrir la votación');
        }
      } else {
        showFeedback('Error al abrir la votación de blockbuster');
      }
    } catch {
      showFeedback('Error de red al abrir la votación');
    } finally {
      setIsPreparingBlockbusterVote(false);
    }
  };

  // Create a brand new movie and stream it immediately
  const handleCreateMovie = async (premise?: string) => {
    audioCues.playClick();
    if (!confirm('🎬 ¿Generar una película nueva ahora y transmitirla en vivo? La película actual se archivará.')) return;
    setIsCreatingMovie(true);
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_movie', prompt: premise?.trim() || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        setCinemaState((prev: any) => prev ? { ...prev, movie: data.movie, ...data.state } : prev);
        setSelectedMovieId(data.movie?.id || '');
        setIsEditingMovie(false);
        showFeedback('🎬 Nueva película generada y transmitiendo en vivo.');
        fetchData();
      } else {
        showFeedback('Error al crear la nueva película');
      }
    } catch {
      showFeedback('Error de red al crear la película');
    } finally {
      setIsCreatingMovie(false);
    }
  };

  // Open the edit form pre-filled with a specific movie or the one currently in emission
  const openEditMovie = (target?: any) => {
    audioCues.playClick();
    const movie = target || cinemaState?.movie;
    if (!movie) return;
    setEditingTargetMovie(movie);
    setEditMovieTitle(movie.title || '');
    setEditMovieGenre(movie.genre || '');
    setEditMovieTagline(movie.tagline || '');
    setEditMoviePlot(movie.initialPlot || '');
    setIsEditingMovie(true);
  };

  // Save edited movie details (supports any target movie)
  const handleSaveMovieEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = editingTargetMovie || cinemaState?.movie;
    if (!target) return;
    if (!editMovieTitle.trim()) return;

    setIsSavingMovie(true);
    audioCues.playClick();
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_movie',
          movieId: target.id,
          fields: {
            title: editMovieTitle.trim(),
            genre: editMovieGenre.trim(),
            tagline: editMovieTagline.trim(),
            initialPlot: editMoviePlot.trim()
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsEditingMovie(false);
          setEditingTargetMovie(null);
          showFeedback('✏️ Película actualizada correctamente.');
          fetchData();
        } else {
          showFeedback('No se pudo actualizar la película');
        }
      } else {
        showFeedback('Error al actualizar la película');
      }
    } catch {
      showFeedback('Error de red al actualizar la película');
    } finally {
      setIsSavingMovie(false);
    }
  };

  // Delete the movie currently in emission
  const handleDeleteMovie = async () => {
    audioCues.playClick();
    if (!cinemaState?.movie) return;
    const targetMovieId = cinemaState.movie.id;
    if (!confirm(`🗑️ ¿Eliminar definitivamente "${cinemaState.movie.title}"? Sus escenas, votos y chat se borrarán.`)) return;

    setIsDeletingMovie(true);
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_movie', movieId: targetMovieId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAllMovies(prev => prev.filter(m => m.id !== targetMovieId));
          setCinemaState((prev: any) => prev ? { ...prev, movie: data.movie || prev.movie, ...data.state } : prev);
          if (data.movie?.id) setSelectedMovieId(data.movie.id);
          setIsEditingMovie(false);
          showFeedback(data.movie ? '🗑️ Película eliminada. Nueva película generada.' : '🗑️ Película eliminada de la biblioteca.');
          await fetchData();
        } else {
          showFeedback('No se pudo eliminar la película');
        }
      } else {
        showFeedback('Error al eliminar la película');
      }
    } catch {
      showFeedback('Error de red al eliminar la película');
    } finally {
      setIsDeletingMovie(false);
    }
  };

  // Delete a specific movie by ID
  const handleDeleteSpecificMovie = async (movieId: string, title?: string) => {
    audioCues.playClick();
    if (!confirm(`🗑️ ¿Eliminar definitivamente "${title || movieId}"? Sus escenas, votos y chat se borrarán.`)) return;

    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_movie', movieId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAllMovies(prev => prev.filter(m => m.id !== movieId));
          setSelectedMovieIds(prev => prev.filter(id => id !== movieId));
          showFeedback('🗑️ Película eliminada correctamente.');
          await fetchData();
        } else {
          showFeedback('No se pudo eliminar la película');
        }
      } else {
        showFeedback('Error al eliminar la película');
      }
    } catch {
      showFeedback('Error de red al eliminar la película');
    }
  };

  // Bulk movie selection handlers
  const toggleSelectMovie = (id: string) => {
    audioCues.playClick();
    setSelectedMovieIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = (visibleIds: string[]) => {
    audioCues.playClick();
    const allSelected = visibleIds.every(id => selectedMovieIds.includes(id));
    if (allSelected) {
      setSelectedMovieIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedMovieIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const clearMovieSelection = () => {
    audioCues.playClick();
    setSelectedMovieIds([]);
  };

  // Execute bulk delete
  const handleExecuteBulkDelete = async () => {
    if (selectedMovieIds.length === 0) return;
    audioCues.playClick();
    setIsBulkDeleting(true);

    const idsToDelete = [...selectedMovieIds];

    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_delete_movies',
          movieIds: idsToDelete
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Optimistically update list immediately
          setAllMovies(prev => prev.filter(m => !idsToDelete.includes(m.id)));
          setSelectedMovieIds([]);
          setShowBulkDeleteModal(false);
          showFeedback(`🗑️ ${data.deletedCount || idsToDelete.length} película(s) eliminada(s) en masa.`);
          await fetchData();
        } else {
          showFeedback('No se pudieron eliminar las películas en masa.');
        }
      } else {
        showFeedback('Error en el servidor al eliminar en masa.');
      }
    } catch {
      showFeedback('Error de red al ejecutar eliminación en masa.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Execute bulk edit
  const handleExecuteBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMovieIds.length === 0) return;

    const fields: any = {};
    if (bulkEditGenre.trim()) fields.genre = bulkEditGenre.trim();
    if (bulkEditStatus.trim()) fields.status = bulkEditStatus.trim();
    if (bulkEditTagline.trim()) fields.tagline = bulkEditTagline.trim();

    if (Object.keys(fields).length === 0) {
      showFeedback('Debes especificar al menos un campo para editar en masa.');
      return;
    }

    audioCues.playClick();
    setIsBulkEditing(true);

    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update_movies',
          movieIds: selectedMovieIds,
          fields
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showFeedback(`✏️ ${data.updatedCount || selectedMovieIds.length} película(s) actualizadas en masa.`);
          setSelectedMovieIds([]);
          setShowBulkEditModal(false);
          setBulkEditGenre('');
          setBulkEditStatus('');
          setBulkEditTagline('');
          fetchData();
        } else {
          showFeedback('No se pudieron actualizar las películas en masa.');
        }
      } else {
        showFeedback('Error en el servidor al actualizar en masa.');
      }
    } catch {
      showFeedback('Error de red al ejecutar edición en masa.');
    } finally {
      setIsBulkEditing(false);
    }
  };

  // Jump to specific step for manual replay
  const handleJumpToStep = async (stepNum: number) => {
    audioCues.playClick();
    setIsJumpingStep(true);
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'jump_to_step',
          stepNumber: stepNum
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCinemaState((prev: any) => prev ? {
          ...prev,
          movie: prev.movie ? { ...prev.movie, currentStep: data.currentStep } : prev.movie,
          ...data.state
        } : prev);
        showFeedback(`⏮️ Saltando al Step ${stepNum} para replay instantáneo.`);
        fetchData();
      } else {
        showFeedback('Error al saltar de step');
      }
    } catch {
      showFeedback('Error de red al cambiar de step');
    } finally {
      setIsJumpingStep(false);
    }
  };

  // Switch to another movie & step for manual broadcast
  const handleSwitchMovie = async (movieId: string, stepNum: number = 1) => {
    if (!movieId) return;
    audioCues.playClick();
    setIsSwitchingMovie(true);
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'switch_movie',
          movieId,
          stepNumber: stepNum
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCinemaState((prev: any) => prev ? {
          ...prev,
          movie: data.movie || prev.movie,
          ...data.state
        } : prev);
        setSelectedMovieId(movieId);
        setSelectedStepNumber(stepNum);
        showFeedback(`🎬 Transmitiendo película "${data.movie?.title || movieId}" (Step ${stepNum}) en vivo.`);
        fetchData();
      } else {
        showFeedback('Error al cambiar de película');
      }
    } catch {
      showFeedback('Error de red al cambiar de película');
    } finally {
      setIsSwitchingMovie(false);
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
    <div className="h-screen bg-[#06070a] text-neutral-100 flex flex-col font-sans select-none overflow-y-auto overflow-x-hidden">
      {/* Top Admin Header */}
      <header className="h-14 bg-black/80 border-b border-white/10 px-6 flex items-center justify-between backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
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

          {/* Switch to Select Movie (Blockbuster Voting) Button */}
          <button
            onClick={handleStartBlockbusterVoting}
            disabled={isPreparingBlockbusterVote || cinemaState?.phase === 'BLOCKBUSTER_VOTING'}
            className={`px-3 py-1.5 rounded-lg border font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md ${
              cinemaState?.phase === 'BLOCKBUSTER_VOTING'
                ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse'
                : 'bg-gradient-to-r from-purple-600/30 to-fuchsia-600/20 hover:from-purple-600/50 hover:to-fuchsia-600/40 text-purple-200 border-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
            } disabled:opacity-60`}
            title="Generar candidatas y cambiar estado a Selección de Película (60s)"
          >
            {isPreparingBlockbusterVote ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-spin" />
                <span>GENERANDO PELÍCULAS...</span>
              </>
            ) : cinemaState?.phase === 'BLOCKBUSTER_VOTING' ? (
              <>
                <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
                <span>VOTANDO PELÍCULA ({cinemaState?.timeRemaining || 0}s)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>SELECCIONAR PELÍCULA</span>
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

          <button
            onClick={() => { audioCues.playClick(); setActiveTab('movies'); }}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all ${
              activeTab === 'movies'
                ? 'bg-rose-500 text-black shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            <Clapperboard className="w-4 h-4" />
            <span>Listado de Películas ({allMovies.length})</span>
          </button>

          <button
            onClick={() => { audioCues.playClick(); setActiveTab('stats'); fetchStats(); }}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all ${
              activeTab === 'stats'
                ? 'bg-purple-500 text-black shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Estadísticas</span>
          </button>

          <button
            onClick={() => { audioCues.playClick(); setActiveTab('messages'); fetchContactMessages(); }}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold tracking-wider uppercase flex items-center space-x-2 transition-all relative ${
              activeTab === 'messages'
                ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Buzón / Mensajes</span>
            {unreadMessagesCount > 0 ? (
              <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none ${
                activeTab === 'messages' ? 'bg-black text-cyan-400' : 'bg-cyan-400 text-black shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse'
              }`}>
                {unreadMessagesCount}
              </span>
            ) : (
              <span className="text-[10px] opacity-60">({contactMessages.length})</span>
            )}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-amber-400/20 text-amber-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-amber-300 uppercase">
                      Lemon Squeezy Public Ad Checkout
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Sponsors can pay directly for an Ad Showcase slot via Lemon Squeezy.
                    </p>
                  </div>
                </div>

                <a
                  href="https://iagents.lemonsqueezy.com/checkout/buy/3cda5e83-443b-4efe-98e2-6556726aff98"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-transform hover:scale-105 shadow-md flex-shrink-0"
                >
                  <span>Open Pay Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

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
          <div className="space-y-6 pb-24">
            {/* Card: Select Movie State / Blockbuster Voting Controller */}
            <div className={`p-6 rounded-2xl border transition-all ${
              isMovieVotingPhase(cinemaState?.phase)
                ? 'bg-purple-950/40 border-purple-400/60 shadow-[0_0_30px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/40' 
                : isOptionVotingPhase(cinemaState?.phase)
                  ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_30px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/40'
                  : 'bg-neutral-950/80 border-white/10'
            } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    isMovieVotingPhase(cinemaState?.phase)
                      ? 'bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.9)]' 
                      : isOptionVotingPhase(cinemaState?.phase)
                        ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.9)]'
                        : 'bg-emerald-500/60'
                  }`} />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    Estado de Emisión: {
                      isMovieVotingPhase(cinemaState?.phase)
                        ? `VOTACIÓN DE PRÓXIMA PELÍCULA (${cinemaState?.timeRemaining || 0}s)`
                        : isOptionVotingPhase(cinemaState?.phase)
                          ? `VOTACIÓN DE OPCIÓN DE ESCENA (${cinemaState?.timeRemaining || 0}s)`
                          : cinemaState?.phase === 'GENERATING'
                            ? 'SINTETIZANDO CON IA (GENERATING)'
                            : 'TRANSMISIÓN NARRATIVA NORMAL'
                    }
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 max-w-xl">
                  {isMovieVotingPhase(cinemaState?.phase)
                    ? `La audiencia está votando la próxima película (${cinemaState?.timeRemaining || 0}s restantes de 1 minuto). Al finalizar, la ganadora comenzará su producción inmediatamente.`
                    : isOptionVotingPhase(cinemaState?.phase)
                      ? `La audiencia está votando la siguiente rama narrativa de la escena actual (Opciones A/B, ${cinemaState?.timeRemaining || 0}s restantes).`
                      : 'Presiona el botón para comenzar a generar las 4 posibles películas con IA. Al completarse el proceso, el frontend pasará a la votación de película con 1 minuto.'}
                </p>
              </div>

              <button
                onClick={handleStartBlockbusterVoting}
                disabled={isPreparingBlockbusterVote || isMovieVotingPhase(cinemaState?.phase)}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                  isMovieVotingPhase(cinemaState?.phase)
                    ? 'bg-purple-500 text-black shadow-[0_0_25px_rgba(168,85,247,0.5)] cursor-default'
                    : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                } disabled:opacity-60`}
              >
                {isPreparingBlockbusterVote ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    <span>Generando películas con IA...</span>
                  </>
                ) : isMovieVotingPhase(cinemaState?.phase) ? (
                  <>
                    <Radio className="w-4 h-4 animate-pulse text-black" />
                    <span>Votando Película ({cinemaState?.timeRemaining || 0}s)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Iniciar Votación de Película</span>
                  </>
                )}
              </button>
            </div>

            {/* Scene Option Voting Live Monitor (Admin) */}
            {isOptionVotingPhase(cinemaState?.phase) && cinemaState?.activeStep?.options && (
              <div className="p-6 rounded-2xl border border-cyan-400/40 bg-cyan-950/20 backdrop-blur-md space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
                      Conteo en Vivo · Votación de Opción de Escena (Paso {cinemaState.activeStep.stepNumber}, {cinemaState.timeRemaining || 0}s restantes)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-neutral-300 bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-400/30">
                    Total: {(cinemaState.votesA || 0) + (cinemaState.votesB || 0)} votos
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A */}
                  <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/40 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="font-bold text-cyan-300">OPCIÓN A: {cinemaState.activeStep.options[0]?.title}</span>
                      <span className="font-bold text-white">{cinemaState.votesA || 0} votos</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/60 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300" style={{ width: `${((cinemaState.votesA || 0) + (cinemaState.votesB || 0)) > 0 ? Math.round(((cinemaState.votesA || 0) / ((cinemaState.votesA || 0) + (cinemaState.votesB || 0))) * 100) : 50}%` }} />
                    </div>
                  </div>
                  {/* Option B */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/40 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="font-bold text-amber-300">OPCIÓN B: {cinemaState.activeStep.options[1]?.title}</span>
                      <span className="font-bold text-white">{cinemaState.votesB || 0} votos</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/60 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300" style={{ width: `${((cinemaState.votesA || 0) + (cinemaState.votesB || 0)) > 0 ? Math.round(((cinemaState.votesB || 0) / ((cinemaState.votesA || 0) + (cinemaState.votesB || 0))) * 100) : 50}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Blockbuster Candidates Live Vote Monitor (Admin) */}
            {cinemaState?.phase === 'BLOCKBUSTER_VOTING' && Array.isArray(cinemaState?.blockbusterCandidates) && cinemaState.blockbusterCandidates.length > 0 && (
              <div className="p-6 rounded-2xl border border-purple-400/40 bg-purple-950/20 backdrop-blur-md space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-200">
                      Conteo de Votos en Vivo · 4 Películas Candidatas ({cinemaState.timeRemaining || 0}s restantes)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-neutral-300 bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-400/30">
                    Total: {(Number(cinemaState.blockbusterVoteCounts?.A) || 0) + (Number(cinemaState.blockbusterVoteCounts?.B) || 0) + (Number(cinemaState.blockbusterVoteCounts?.C) || 0) + (Number(cinemaState.blockbusterVoteCounts?.D) || 0)} votos
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {cinemaState.blockbusterCandidates.map((cand: any) => {
                    const votes = Number(cinemaState.blockbusterVoteCounts?.[cand.id as 'A' | 'B' | 'C' | 'D']) || 0;
                    const totalVotes = ((Number(cinemaState.blockbusterVoteCounts?.A) || 0) + (Number(cinemaState.blockbusterVoteCounts?.B) || 0) + (Number(cinemaState.blockbusterVoteCounts?.C) || 0) + (Number(cinemaState.blockbusterVoteCounts?.D) || 0));
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isLead = votes > 0 && votes === Math.max(
                      Number(cinemaState.blockbusterVoteCounts?.A) || 0,
                      Number(cinemaState.blockbusterVoteCounts?.B) || 0,
                      Number(cinemaState.blockbusterVoteCounts?.C) || 0,
                      Number(cinemaState.blockbusterVoteCounts?.D) || 0
                    );

                    return (
                      <div key={cand.id} className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                        isLead 
                          ? 'bg-purple-900/40 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.25)]' 
                          : 'bg-neutral-900/60 border-white/10'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="w-7 h-7 rounded-lg bg-purple-500 text-black font-mono font-black text-xs flex items-center justify-center shadow-md">
                              {cand.id}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isLead && (
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300">
                                  👑 LIDER
                                </span>
                              )}
                              <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                                {cand.genre}
                              </span>
                            </div>
                          </div>
                          <h5 className="text-xs font-bold text-white line-clamp-1">{cand.title}</h5>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">{cand.logline}</p>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                          <div className="flex justify-between text-[11px] font-mono text-neutral-300">
                            <span className="font-bold">{votes} {votes === 1 ? 'voto' : 'votos'}</span>
                            <span className="font-bold text-purple-300">{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/60 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

            {/* Generative Video Model Selector (Director Only) */}
            <div className={`p-6 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${isModelDirty ? 'bg-amber-950/20 border-amber-500/50' : 'bg-neutral-950/80 border-white/10'}`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                    Generative Video Model
                  </h3>
                  {isModelDirty && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[9px] font-mono font-bold uppercase animate-pulse">
                      Cambios sin guardar
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 max-w-xl">
                  Selecciona el modelo de fal.ai y la resolución, y presiona <strong className="text-white">Guardar Configuración</strong> para persistirlos. Turbo es el modelo económico; Reference-to-Video es el más caro.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-shrink-0">
                <div className="flex flex-col gap-1 w-full sm:w-72">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Modelo (borrador):
                  </label>
                  <select
                    value={draftVideoModel}
                    onChange={e => { setDraftVideoModel(e.target.value); markModelDirty(); }}
                    className="w-full px-3 py-2 rounded-xl bg-black/90 border border-amber-500/30 text-white text-xs font-mono focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    {VIDEO_MODEL_CHOICES.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {draftVideoModel === 'minimax/h3-max-turbo/text-to-video'
                      ? 'Turbo: text-to-video rápido y económico. Sin referencias. 480P 16:9 por defecto.'
                      : draftVideoModel === 'minimax/h3-max/text-to-video'
                        ? 'Estándar: text-to-video de mayor costo. Sin referencias. 768P por defecto.'
                        : draftVideoModel === 'minimax/h3-max/image-to-video'
                          ? 'Image-to-Video: Flux genera un keyframe de la escena y el video lo anima.'
                          : 'Reference-to-Video (el más caro): usa el clip previo y las imágenes de props como referencias.'}
                  </span>
                </div>

                <div className="flex flex-col gap-1 w-full sm:w-56">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                    <Sliders className="w-3 h-3" />
                    Resolución (borrador):
                  </label>
                  <select
                    value={draftVideoResolution}
                    onChange={e => { setDraftVideoResolution(e.target.value); markModelDirty(); }}
                    className="w-full px-3 py-2 rounded-xl bg-black/90 border border-cyan-500/30 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {VIDEO_RESOLUTION_CHOICES.map(r => (
                      <option key={r.id || 'auto'} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {draftVideoResolution
                      ? `Forzada a ${draftVideoResolution} para el modelo activo.`
                      : 'Usa la resolución por defecto del modelo (Turbo: 480P · resto: 768P).'}
                  </span>
                </div>

                <div className="flex flex-col gap-1 justify-end">
                  <button
                    onClick={handleSaveModelConfig}
                    disabled={isSavingModelConfig || !isModelDirty}
                    className={`px-5 py-2 rounded-xl font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all h-[38px] ${
                      isModelDirty
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-95'
                        : 'bg-neutral-900 text-neutral-500 border border-white/10 cursor-not-allowed'
                    }`}
                    title="Guardar modelo y resolución en la base de datos"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSavingModelConfig ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                  {!isModelDirty && (
                    <span className="text-[9px] font-mono text-emerald-400/80 text-center">
                      ✓ Persistido: {videoModel}{videoResolution ? ` · ${videoResolution}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Movie & Scene Selection Broadcast Control (ADMIN ONLY) */}
            {cinemaState?.movie && (
              <div className="p-6 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <Film className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono truncate">
                        Control de Emisión: Selector de Película & Escena (Solo Director)
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                      Selecciona la película que se transmitirá en vivo a toda la audiencia y la escena exacta para poner al aire de inmediato.
                    </p>
                  </div>

                  {/* Movie & Step Selectors (Direct Broadcast) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                    {/* Movie in Emission Selector */}
                    <div className="flex flex-col gap-1 w-full sm:w-64 md:w-80">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Película en Emisión:
                      </label>
                      <select
                        value={cinemaState.movie.id}
                        onChange={e => {
                          const targetId = e.target.value;
                          if (targetId && targetId !== cinemaState.movie.id) {
                            handleSwitchMovie(targetId, 1);
                          }
                        }}
                        disabled={isSwitchingMovie}
                        className="w-full px-3 py-2 rounded-xl bg-black/90 border border-amber-500/30 text-white text-xs font-mono focus:border-amber-400 focus:outline-none truncate cursor-pointer disabled:opacity-50"
                      >
                        {(() => {
                          const list = allMovies.length > 0 
                            ? allMovies 
                            : [cinemaState.movie];
                          const hasCurrent = list.some((m: any) => m.id === cinemaState.movie.id);
                          const completeList = hasCurrent ? list : [cinemaState.movie, ...list];

                          return completeList.map((m: any) => {
                            const isLive = cinemaState.movie.id === m.id;
                            const count = m.steps?.length || m.totalSteps || 0;
                            return (
                              <option key={m.id} value={m.id}>
                                {isLive ? '🔴 [EN EMISIÓN] ' : ''}{m.title} ({m.genre}) - {count} sc.
                              </option>
                            );
                          });
                        })()}
                      </select>
                    </div>

                    {/* Step in Emission Selector */}
                    <div className="flex flex-col gap-1 w-full sm:w-44 md:w-52">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Escena (Step) al Aire:
                      </label>
                      <select
                        value={cinemaState.movie.currentStep || 1}
                        onChange={e => {
                          const stepNum = Number(e.target.value);
                          if (stepNum && stepNum !== cinemaState.movie.currentStep) {
                            handleJumpToStep(stepNum);
                          }
                        }}
                        disabled={isJumpingStep || isSwitchingMovie}
                        className="w-full px-3 py-2 rounded-xl bg-black/90 border border-cyan-500/30 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none truncate cursor-pointer disabled:opacity-50"
                      >
                        {(cinemaState.movie.steps || []).map((s: any) => {
                          const shortTitle = s.title ? (s.title.length > 18 ? `${s.title.slice(0, 18)}...` : s.title) : '';
                          return (
                            <option key={s.stepNumber} value={s.stepNumber}>
                              Step {s.stepNumber}{shortTitle ? ` - ${shortTitle}` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Replay Current Step CTA */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-transparent select-none hidden sm:block">
                        Acción
                      </label>
                      <button
                        onClick={() => handleJumpToStep(cinemaState.movie.currentStep || 1)}
                        disabled={isJumpingStep || isSwitchingMovie}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] flex-shrink-0 active:scale-95 h-[38px]"
                        title="Reiniciar reproducción de la escena actual en vivo"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-black" />
                        <span>Replay</span>
                      </button>
                    </div>

                    {/* Movie Management Actions */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-transparent select-none hidden sm:block">
                        Película
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handlePrepareBlockbusterVote}
                          disabled={isPreparingBlockbusterVote}
                          className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 text-purple-300 border border-purple-500/30 font-mono font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all flex-shrink-0 active:scale-95 h-[38px]"
                          title="Abrir la votación de la próxima película (4 candidatas · 60s)"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isPreparingBlockbusterVote ? 'Generando...' : 'Votación'}</span>
                        </button>
                        <button
                          onClick={() => handleCreateMovie()}
                          disabled={isCreatingMovie}
                          className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-mono font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] flex-shrink-0 active:scale-95 h-[38px]"
                          title="Generar una película nueva y transmitirla en vivo"
                        >
                          <Plus className="w-3.5 h-3.5 text-black" />
                          <span>{isCreatingMovie ? 'Creando...' : 'Nueva'}</span>
                        </button>
                        <button
                          onClick={openEditMovie}
                          className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all flex-shrink-0 active:scale-95 h-[38px]"
                          title="Editar título, género, tagline y sinopsis de la película en emisión"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={handleDeleteMovie}
                          disabled={isDeletingMovie}
                          className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 disabled:opacity-40 text-red-400 border border-red-500/20 font-mono font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all flex-shrink-0 active:scale-95 h-[38px]"
                          title="Eliminar definitivamente la película en emisión"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeletingMovie ? '...' : 'Eliminar'}</span>
                        </button>
                        <button
                          onClick={() => { audioCues.playClick(); setActiveTab('movies'); }}
                          className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-mono font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all flex-shrink-0 active:scale-95 h-[38px]"
                          title="Abrir el catálogo completo de películas y acciones en masa"
                        >
                          <Clapperboard className="w-3.5 h-3.5" />
                          <span>Catálogo ({allMovies.length})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Movie Edit Form */}
                {isEditingMovie && cinemaState?.movie && (
                  <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-300 flex items-center gap-2">
                        <Pencil className="w-3.5 h-3.5" /> Editar Película en Emisión
                      </h4>
                      <button
                        onClick={() => setIsEditingMovie(false)}
                        className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 transition-colors"
                        title="Cerrar edición"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <form onSubmit={handleSaveMovieEdit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">Título *</label>
                        <input
                          type="text"
                          required
                          value={editMovieTitle}
                          onChange={e => setEditMovieTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">Género</label>
                        <input
                          type="text"
                          value={editMovieGenre}
                          onChange={e => setEditMovieGenre(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">Tagline</label>
                        <input
                          type="text"
                          value={editMovieTagline}
                          onChange={e => setEditMovieTagline(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">Sinopsis / Trama inicial</label>
                        <input
                          type="text"
                          value={editMoviePlot}
                          onChange={e => setEditMoviePlot(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={isSavingMovie}
                          className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-mono font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5 text-black" />
                          <span>{isSavingMovie ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingMovie(false)}
                          className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono font-bold text-[11px] uppercase tracking-widest transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Currently Broadcasting Movie Overview Banner */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white font-mono">
                        {cinemaState.movie.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-cyan-300">
                        {cinemaState.movie.genre}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-400 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        TRANSMITIENDO EN VIVO A LA AUDIENCIA
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-1">
                      {cinemaState.movie.initialPlot || cinemaState.movie.tagline || 'Sinopsis de la obra cinematográfica interactiva en emisión.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 text-xs font-mono text-neutral-400">
                    <span>Total Escenas: <strong className="text-white">{cinemaState.movie.steps?.length || cinemaState.movie.totalSteps || 0}</strong></span>
                    <span>• Al aire: <strong className="text-amber-400">Step #{cinemaState.movie.currentStep}</strong></span>
                  </div>
                </div>

                {/* Interactive Grid of Movie Steps */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                    <span className="uppercase tracking-wider">
                      Escenas de la Película en Emisión ({cinemaState.movie.steps?.length || 0} Steps)
                    </span>
                    <span className="text-neutral-500 text-[11px]">
                      Haz clic en &quot;Transmitir este Step&quot; para saltar a cualquier escena en vivo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar bg-black/20 p-2 rounded-xl border border-white/5">
                    {(cinemaState.movie.steps || []).map((step: any) => {
                      const isCurrentActive = cinemaState.movie.currentStep === step.stepNumber;
                      return (
                        <div
                          key={step.stepNumber}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                            isCurrentActive
                              ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/40'
                              : 'bg-black/50 border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  isCurrentActive ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-300'
                                }`}>
                                  STEP #{step.stepNumber}
                                </span>
                                {isCurrentActive && (
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    EN TRANSMISIÓN EN VIVO
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-neutral-500">
                                {step.duration || 15}s
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-white line-clamp-1">
                              {step.title}
                            </h4>
                            <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                              {step.synopsis}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                            <div className="text-[10px] font-mono text-neutral-400 truncate max-w-[170px]">
                              {step.selectedOption ? (
                                <span>Rama: Opción {step.selectedOption}</span>
                              ) : (
                                <span className="text-neutral-500">Escena inicial</span>
                              )}
                            </div>

                            <button
                              onClick={() => handleJumpToStep(step.stepNumber)}
                              disabled={isSwitchingMovie || isJumpingStep || isCurrentActive}
                              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                                isCurrentActive
                                  ? 'bg-amber-500/20 text-amber-400 cursor-default border border-amber-500/30'
                                  : 'bg-white/10 hover:bg-amber-500 hover:text-black text-white'
                              }`}
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>{isCurrentActive ? 'Al Aire Ahora' : 'Transmitir este Step'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                When a film finishes all 50 steps, Kinetic Cinema automatically initiates the next blockbuster film, cycling between <strong>Dark Epic Fantasy, Cyberpunk Neo-Noir, Cosmic Space Opera, Solarpunk Wasteland</strong>, and <strong>Supernatural Steampunk</strong>.
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

        {/* TAB 3: MOVIE CATALOG & BULK ACTIONS */}
        {activeTab === 'movies' && (() => {
          const availableGenres = Array.from(new Set(allMovies.map((m: any) => m.genre).filter(Boolean)));
          const filteredMovies = allMovies.filter((m: any) => {
            if (movieSearchQuery.trim()) {
              const q = movieSearchQuery.toLowerCase();
              const matchTitle = (m.title || '').toLowerCase().includes(q);
              const matchGenre = (m.genre || '').toLowerCase().includes(q);
              const matchPlot = (m.initialPlot || m.tagline || '').toLowerCase().includes(q);
              if (!matchTitle && !matchGenre && !matchPlot) return false;
            }
            if (movieGenreFilter !== 'all') {
              if ((m.genre || '').toLowerCase() !== movieGenreFilter.toLowerCase()) return false;
            }
            if (movieStatusFilter !== 'all') {
              const isLive = cinemaState?.movie?.id === m.id;
              if (movieStatusFilter === 'live' && !isLive) return false;
              if (movieStatusFilter === 'completed' && m.status !== 'completed') return false;
              if (movieStatusFilter === 'streaming' && m.status !== 'streaming' && !isLive) return false;
              if (movieStatusFilter === 'paused' && m.status !== 'paused') return false;
            }
            return true;
          });
          const visibleMovieIds = filteredMovies.map((m: any) => m.id);
          const isAllVisibleSelected = visibleMovieIds.length > 0 && visibleMovieIds.every((id: string) => selectedMovieIds.includes(id));
          const selectedMoviesList = allMovies.filter((m: any) => selectedMovieIds.includes(m.id));
          const hasActiveMovieSelected = Boolean(cinemaState?.movie && selectedMovieIds.includes(cinemaState.movie.id));

          return (
            <div className="space-y-6 pb-24">
              {/* Header & Stats Banner */}
              <div className="p-6 rounded-2xl bg-neutral-950/80 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                      <Clapperboard className="w-4 h-4 text-rose-400" />
                      Listado de Películas & Acciones en Masa
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-400 max-w-2xl">
                    Explora todo el catálogo de películas interactivas generadas y archivadas. Selecciona múltiples obras para ejecutar acciones en lote como eliminación definitiva o actualización de género y estado.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => handleCreateMovie()}
                    disabled={isCreatingMovie}
                    className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-black" />
                    <span>{isCreatingMovie ? 'Creando...' : 'Nueva Película'}</span>
                  </button>
                </div>
              </div>

              {/* Quick KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400">Total Películas</span>
                  <div className="text-2xl font-black text-white">{allMovies.length}</div>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-rose-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    En Emisión
                  </span>
                  <div className="text-sm font-black text-white truncate" title={cinemaState?.movie?.title || 'Ninguna'}>
                    {cinemaState?.movie?.title || 'Ninguna'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-purple-400">Concluidas</span>
                  <div className="text-2xl font-black text-purple-300">
                    {allMovies.filter((m: any) => m.status === 'completed').length}
                  </div>
                </div>
                <div className={`p-4 rounded-xl border space-y-1 transition-all ${
                  selectedMovieIds.length > 0 
                    ? 'bg-rose-950/30 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                    : 'bg-black/50 border-white/5'
                }`}>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400">Seleccionadas</span>
                  <div className={`text-2xl font-black ${selectedMovieIds.length > 0 ? 'text-rose-400' : 'text-neutral-500'}`}>
                    {selectedMovieIds.length}
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 rounded-2xl bg-neutral-950/90 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={movieSearchQuery}
                    onChange={e => setMovieSearchQuery(e.target.value)}
                    placeholder="Buscar por título, género o sinopsis..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-rose-400 focus:outline-none placeholder:text-neutral-600"
                  />
                  {movieSearchQuery && (
                    <button
                      onClick={() => setMovieSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl">
                    <Filter className="w-3.5 h-3.5 text-neutral-400" />
                    <select
                      value={movieGenreFilter}
                      onChange={e => setMovieGenreFilter(e.target.value)}
                      className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-neutral-900">Todos los géneros</option>
                      {availableGenres.map((g: any) => (
                        <option key={g} value={g} className="bg-neutral-900">{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl">
                    <select
                      value={movieStatusFilter}
                      onChange={e => setMovieStatusFilter(e.target.value)}
                      className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-neutral-900">Todos los estados</option>
                      <option value="live" className="bg-neutral-900">🔴 En emisión</option>
                      <option value="streaming" className="bg-neutral-900">🟢 En streaming</option>
                      <option value="completed" className="bg-neutral-900">🟣 Concluidas</option>
                      <option value="paused" className="bg-neutral-900">🟡 Pausadas</option>
                    </select>
                  </div>

                  {(movieSearchQuery || movieGenreFilter !== 'all' || movieStatusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setMovieSearchQuery('');
                        setMovieGenreFilter('all');
                        setMovieStatusFilter('all');
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-mono transition-colors"
                      title="Restablecer filtros"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Floating Bulk Action Bar (when >= 1 movie is selected) */}
              {selectedMovieIds.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/70 via-purple-950/70 to-neutral-950/90 border border-rose-500/50 shadow-[0_10px_35px_rgba(244,63,94,0.25)] flex flex-wrap items-center justify-between gap-3 sticky top-4 z-30 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleSelectAllVisible(visibleMovieIds)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title={isAllVisibleSelected ? "Deseleccionar visibles" : "Seleccionar todas las visibles"}
                    >
                      {isAllVisibleSelected ? <CheckSquare className="w-4 h-4 text-rose-400" /> : <Square className="w-4 h-4 text-neutral-400" />}
                    </button>
                    <div>
                      <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-black text-[11px] font-black">
                          {selectedMovieIds.length}
                        </span>
                        película(s) seleccionada(s)
                      </span>
                      {hasActiveMovieSelected && (
                        <span className="text-[10px] font-mono text-amber-300 block">
                          ⚠️ Incluye la película actualmente en emisión en vivo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => { audioCues.playClick(); setShowBulkEditModal(true); }}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5 text-black" />
                      <span>Editar en Masa</span>
                    </button>

                    <button
                      onClick={() => { audioCues.playClick(); setShowBulkDeleteModal(true); }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                      <span>Eliminar en Masa ({selectedMovieIds.length})</span>
                    </button>

                    <button
                      onClick={clearMovieSelection}
                      className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs transition-colors"
                      title="Deseleccionar todas"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Movie List Table */}
              <div className="p-2 rounded-2xl bg-neutral-950/80 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-white/10 text-xs font-mono text-neutral-400">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleSelectAllVisible(visibleMovieIds)}
                      className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-white transition-colors flex items-center gap-2"
                      title={isAllVisibleSelected ? "Deseleccionar todas" : "Seleccionar todas"}
                    >
                      {isAllVisibleSelected ? <CheckSquare className="w-4 h-4 text-rose-400" /> : <Square className="w-4 h-4 text-neutral-400" />}
                      <span className="text-[11px] uppercase tracking-wider">
                        {isAllVisibleSelected ? "Deseleccionar todas" : `Seleccionar todas (${filteredMovies.length})`}
                      </span>
                    </button>
                  </div>
                  <span className="text-[11px] text-neutral-500 hidden sm:inline-block">
                    Mostrando {filteredMovies.length} de {allMovies.length} películas
                  </span>
                </div>

                {filteredMovies.length === 0 ? (
                  <div className="text-center py-16 space-y-3 font-mono">
                    <Film className="w-10 h-10 text-neutral-600 mx-auto" />
                    <p className="text-neutral-400 text-sm">No se encontraron películas con los filtros actuales.</p>
                    <button
                      onClick={() => {
                        setMovieSearchQuery('');
                        setMovieGenreFilter('all');
                        setMovieStatusFilter('all');
                      }}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredMovies.map((movie: any) => {
                      const isSelected = selectedMovieIds.includes(movie.id);
                      const isLive = cinemaState?.movie?.id === movie.id;
                      const stepsCount = movie.steps?.length || movie.totalSteps || movie.stepsCount || 0;
                      const isCompleted = movie.status === 'completed';
                      const isPaused = movie.status === 'paused';

                      return (
                        <div
                          key={movie.id}
                          className={`p-4 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                            isSelected
                              ? 'bg-rose-950/20 border-l-4 border-l-rose-500'
                              : isLive
                              ? 'bg-neutral-900/40 border-l-4 border-l-amber-500'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleSelectMovie(movie.id)}
                              className="mt-1 p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors flex-shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-rose-400" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-500" />
                              )}
                            </button>

                            {/* Info */}
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-white font-mono truncate" title={movie.title}>
                                  {movie.title}
                                </h4>

                                {isLive && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-400 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    EN EMISIÓN
                                  </span>
                                )}

                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                  isCompleted
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : isPaused
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {isCompleted ? 'Concluida' : isPaused ? 'Pausada' : 'Streaming'}
                                </span>

                                <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 text-[10px] font-mono">
                                  {movie.genre || 'Sci-Fi'}
                                </span>

                                <span className="text-[10px] font-mono text-neutral-500">
                                  {stepsCount} escenas
                                </span>
                              </div>

                              <p className="text-xs text-neutral-400 line-clamp-1">
                                {movie.tagline || movie.initialPlot || 'Película interactiva generada con IA.'}
                              </p>

                              {movie.createdAt && (
                                <span className="text-[10px] font-mono text-neutral-500 block">
                                  Creada: {new Date(movie.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Individual Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0 self-end lg:self-center">
                            {!isLive && (
                              <button
                                onClick={() => handleSwitchMovie(movie.id, 1)}
                                disabled={isSwitchingMovie}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all border border-amber-500/30 active:scale-95"
                                title="Poner esta película al aire en vivo ahora"
                              >
                                <Play className="w-3 h-3" />
                                <span>Poner al aire</span>
                              </button>
                            )}

                            <button
                              onClick={() => openEditMovie(movie)}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all border border-cyan-500/30 active:scale-95"
                              title="Editar detalles de esta película"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Editar</span>
                            </button>

                            <button
                              onClick={() => handleDeleteSpecificMovie(movie.id, movie.title)}
                              className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all border border-red-500/20 active:scale-95"
                              title="Eliminar esta película"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bulk Delete Modal */}
              {showBulkDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
                  <div className="max-w-md w-full bg-neutral-950 border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
                    <div className="flex items-center space-x-3 text-rose-400">
                      <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
                        <Trash2 className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                          Eliminar {selectedMovieIds.length} películas en masa
                        </h4>
                        <span className="text-[10px] text-rose-400/80 font-mono">Acción irreversible</span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Estás a punto de eliminar definitivamente <strong>{selectedMovieIds.length}</strong> películas del catálogo y de la base de datos, incluyendo todas sus escenas, votos y chat.
                    </p>

                    {hasActiveMovieSelected && (
                      <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 font-mono space-y-1">
                        <span className="font-bold flex items-center gap-1.5 text-amber-300">
                          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          Película en emisión actual seleccionada
                        </span>
                        <p className="text-[11px] text-neutral-300">
                          &quot;{cinemaState?.movie?.title}&quot; está al aire ahora. Al eliminarla, el sistema generará automáticamente una nueva película de taquilla de inmediato.
                        </p>
                      </div>
                    )}

                    {/* Preview of titles */}
                    <div className="max-h-36 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-1 font-mono text-[11px]">
                      {selectedMoviesList.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-neutral-300 truncate">
                          <span className="truncate">• {m.title}</span>
                          <span className="text-[10px] text-neutral-500 ml-2">{m.genre}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowBulkDeleteModal(false)}
                        disabled={isBulkDeleting}
                        className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase tracking-wider transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleExecuteBulkDelete}
                        disabled={isBulkDeleting}
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isBulkDeleting ? 'Eliminando...' : `Eliminar ${selectedMovieIds.length} películas`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Edit Modal */}
              {showBulkEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
                  <div className="max-w-md w-full bg-neutral-950 border border-cyan-500/40 rounded-2xl p-6 space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.25)]">
                    <div className="flex items-center space-x-3 text-cyan-400">
                      <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                        <Pencil className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                          Edición en Masa ({selectedMovieIds.length} películas)
                        </h4>
                        <span className="text-[10px] text-cyan-400/80 font-mono">Aplica cambios en lote</span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Completa los campos que deseas actualizar en las <strong>{selectedMovieIds.length}</strong> películas seleccionadas. Los campos vacíos mantendrán su valor actual.
                    </p>

                    <form onSubmit={handleExecuteBulkEdit} className="space-y-3 font-mono">
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase mb-1">Nuevo Género</label>
                        <input
                          type="text"
                          value={bulkEditGenre}
                          onChange={e => setBulkEditGenre(e.target.value)}
                          placeholder="Ej: Cyberpunk / Neo-Noir Thriller"
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none placeholder:text-neutral-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase mb-1">Nuevo Estado</label>
                        <select
                          value={bulkEditStatus}
                          onChange={e => setBulkEditStatus(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                        >
                          <option value="">(No cambiar estado)</option>
                          <option value="streaming">streaming (Activa)</option>
                          <option value="completed">completed (Concluida)</option>
                          <option value="paused">paused (Pausada)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase mb-1">Nuevo Tagline (opcional)</label>
                        <input
                          type="text"
                          value={bulkEditTagline}
                          onChange={e => setBulkEditTagline(e.target.value)}
                          placeholder="Tagline para todas las seleccionadas..."
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none placeholder:text-neutral-600"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowBulkEditModal(false)}
                          disabled={isBulkEditing}
                          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs uppercase tracking-wider transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isBulkEditing || (!bulkEditGenre && !bulkEditStatus && !bulkEditTagline)}
                          className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isBulkEditing ? 'Actualizando...' : `Actualizar ${selectedMovieIds.length} películas`}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Single Movie Edit Modal */}
              {isEditingMovie && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
                  <div className="max-w-lg w-full bg-neutral-950 border border-cyan-500/40 rounded-2xl p-6 space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.25)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-cyan-400">
                        <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                          <Pencil className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                            Editar Película
                          </h4>
                          <span className="text-[10px] text-cyan-400/80 font-mono">
                            {editingTargetMovie ? editingTargetMovie.title : cinemaState?.movie?.title}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setIsEditingMovie(false); setEditingTargetMovie(null); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveMovieEdit} className="space-y-3 font-mono">
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase mb-1">Título *</label>
                        <input
                          type="text"
                          required
                          value={editMovieTitle}
                          onChange={e => setEditMovieTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase mb-1">Género</label>
                        <input
                          type="text"
                          value={editMovieGenre}
                          onChange={e => setEditMovieGenre(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase mb-1">Tagline</label>
                        <input
                          type="text"
                          value={editMovieTagline}
                          onChange={e => setEditMovieTagline(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase mb-1">Sinopsis / Trama Inicial</label>
                        <textarea
                          rows={3}
                          value={editMoviePlot}
                          onChange={e => setEditMoviePlot(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => { setIsEditingMovie(false); setEditingTargetMovie(null); }}
                          disabled={isSavingMovie}
                          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs uppercase tracking-wider transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingMovie || !editMovieTitle.trim()}
                          className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSavingMovie ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 4: VISIT STATISTICS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-neutral-950/80 border border-purple-500/30 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Visitas hoy
                </span>
                <span className="text-3xl font-black text-white font-mono">
                  {stats?.todayVisits ?? '—'}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-neutral-950/80 border border-purple-500/30 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Visitas (14 días)
                </span>
                <span className="text-3xl font-black text-white font-mono">
                  {stats?.totalVisits ?? '—'}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-neutral-950/80 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Espectadores activos
                </span>
                <span className="text-3xl font-black text-white font-mono">
                  {stats?.activeViewers ?? '—'}
                </span>
              </div>
            </div>

            {/* Daily Visits Table */}
            <div className="p-6 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-purple-300 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Visitas por día (últimos 14 días)
                </h3>
                <button
                  onClick={fetchStats}
                  disabled={isLoadingStats}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 text-purple-300 border border-purple-500/30 font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {isLoadingStats ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-black/60 text-neutral-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 border-b border-white/10">Fecha</th>
                      <th className="px-4 py-3 border-b border-white/10 text-right">Visitantes únicos</th>
                      <th className="px-4 py-3 border-b border-white/10 w-2/5 hidden sm:table-cell">Barra</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-200">
                    {!stats || stats.visitsByDay.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">
                          {isLoadingStats ? 'Cargando estadísticas...' : 'Sin visitas registradas todavía.'}
                        </td>
                      </tr>
                    ) : (
                      stats.visitsByDay.map(day => {
                        const max = Math.max(...stats.visitsByDay.map(d => d.count), 1);
                        const pct = Math.round((day.count / max) * 100);
                        return (
                          <tr key={day.date} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-white">{day.date}</td>
                            <td className="px-4 py-2.5 text-right text-purple-300 font-black">{day.count}</td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              <div className="h-2 rounded-full bg-black/60 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] font-mono text-neutral-500">
                Cada visitante único cuenta una vez por día. Los espectadores activos se calculan con actividad de los últimos 5 minutos.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: CONTACT INBOX / MENSAJES */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* Header & Stats Bar */}
            <div className="p-6 rounded-2xl bg-neutral-950/80 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-cyan-400" />
                  Buzón de Mensajes & Contacto
                </h3>
                <p className="text-xs text-neutral-400">
                  Mensajes y solicitudes enviadas por la audiencia y patrocinadores desde el formulario web.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 bg-neutral-900/80 px-3.5 py-2 rounded-xl border border-white/5 text-xs font-mono">
                  <span className="text-neutral-400">Total:</span>
                  <span className="font-bold text-white">{contactMessages.length}</span>
                  <span className="text-neutral-600">|</span>
                  <span className="text-cyan-400">No leídos:</span>
                  <span className="font-bold text-cyan-300">{unreadMessagesCount}</span>
                </div>

                <button
                  onClick={() => { audioCues.playClick(); fetchContactMessages(); }}
                  disabled={isLoadingMessages}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-40 text-cyan-300 border border-cyan-500/30 font-mono text-xs flex items-center gap-2 transition-colors"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                  <span>{isLoadingMessages ? 'Cargando...' : 'Actualizar'}</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Filter Pills */}
              <div className="flex items-center space-x-1.5 p-1 bg-neutral-950/90 rounded-xl border border-white/10">
                {(['all', 'unread', 'read'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { audioCues.playClick(); setMessageFilter(tab); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      messageFilter === tab
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tab === 'all' && `Todos (${contactMessages.length})`}
                    {tab === 'unread' && `No leídos (${unreadMessagesCount})`}
                    {tab === 'read' && `Leídos (${contactMessages.length - unreadMessagesCount})`}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo, asunto o contenido..."
                  value={messageSearchQuery}
                  onChange={e => setMessageSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950/90 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-cyan-500/50"
                />
                {messageSearchQuery && (
                  <button
                    onClick={() => setMessageSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[520px]">
              {/* Left Column: Messages List (5 cols) */}
              <div className="lg:col-span-5 flex flex-col rounded-2xl bg-neutral-950/80 border border-white/10 overflow-hidden">
                <div className="p-3 border-b border-white/10 bg-black/40 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
                  <span>MENSAJES ({filteredMessages.length})</span>
                  <span className="text-[10px] text-neutral-500">Orden: Más recientes primero</span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-white/5">
                  {filteredMessages.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <Inbox className="w-8 h-8 text-neutral-600 mx-auto" />
                      <p className="text-xs font-mono text-neutral-400">
                        {messageSearchQuery
                          ? 'No se encontraron mensajes con ese criterio.'
                          : messageFilter === 'unread'
                          ? 'No hay mensajes sin leer.'
                          : 'Aún no hay mensajes recibidos.'}
                      </p>
                    </div>
                  ) : (
                    filteredMessages.map(msg => {
                      const isSelected = selectedMessage?.id === msg.id;
                      const isUnread = msg.status === 'unread';
                      const formattedDate = new Date(msg.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div
                          key={msg.id}
                          onClick={() => {
                            audioCues.playClick();
                            setSelectedMessage(msg);
                          }}
                          className={`p-4 cursor-pointer transition-all border-l-2 relative group ${
                            isSelected
                              ? 'bg-white/10 border-l-cyan-400 shadow-inner'
                              : isUnread
                              ? 'bg-cyan-950/15 border-l-cyan-500/60 hover:bg-white/5'
                              : 'border-l-transparent hover:bg-white/5 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                              )}
                              <span className={`text-xs font-mono font-bold truncate ${isUnread ? 'text-white' : 'text-neutral-300'}`}>
                                {msg.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                              {formattedDate}
                            </span>
                          </div>

                          <div className="text-xs text-neutral-200 font-medium truncate mb-1">
                            {msg.subject || 'Sin asunto'}
                          </div>

                          <div className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                            {msg.message}
                          </div>

                          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                            <span className="truncate max-w-[180px]">{msg.email}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                              isUnread ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-neutral-400'
                            }`}>
                              {isUnread ? 'No leído' : 'Leído'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Message Detail Pane (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl bg-neutral-950/80 border border-white/10 overflow-hidden flex flex-col">
                {selectedMessage ? (
                  <div className="flex-1 flex flex-col p-6 space-y-6">
                    {/* Top Detail Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-base font-bold text-white tracking-wide">
                            {selectedMessage.subject || 'Sin Asunto'}
                          </h2>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                            selectedMessage.status === 'unread'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            {selectedMessage.status === 'unread' ? 'No leído' : 'Leído'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400">
                          <span className="font-semibold text-neutral-200">{selectedMessage.name}</span>
                          <span>•</span>
                          <a
                            href={`mailto:${selectedMessage.email}`}
                            className="text-cyan-400 hover:underline flex items-center gap-1"
                            title="Enviar email"
                          >
                            {selectedMessage.email}
                            <ExternalLink className="w-3 h-3 inline" />
                          </a>
                          <span>•</span>
                          <span className="text-neutral-500">
                            {new Date(selectedMessage.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleMessageStatus(selectedMessage)}
                          disabled={isUpdatingMessage}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            selectedMessage.status === 'unread'
                              ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border-cyan-500/30'
                              : 'bg-neutral-900 text-neutral-400 hover:text-white border-white/10'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{selectedMessage.status === 'unread' ? 'Marcar Leído' : 'Marcar No Leído'}</span>
                        </button>

                        <a
                          href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs border border-white/10 flex items-center gap-1.5 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Responder</span>
                        </a>

                        <button
                          onClick={() => handleDeleteContactMessage(selectedMessage.id, selectedMessage.name)}
                          disabled={isUpdatingMessage}
                          className="p-2 rounded-xl bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-500/20 transition-colors"
                          title="Eliminar mensaje"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Message Body Content */}
                    <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-5 overflow-y-auto min-h-[160px]">
                      <div className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                        Mensaje
                      </div>
                      <div className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed font-sans select-text">
                        {selectedMessage.message}
                      </div>
                    </div>

                    {/* Metadata Card Footer */}
                    <div className="p-3 bg-neutral-900/40 rounded-xl border border-white/5 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                      <span>ID: {selectedMessage.id}</span>
                      <span>Canal: Formulario Web SlopMovie</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                    <Mail className="w-12 h-12 text-neutral-700" />
                    <h4 className="text-sm font-mono font-bold text-neutral-400">Ningún mensaje seleccionado</h4>
                    <p className="text-xs text-neutral-500 max-w-sm">
                      Haz clic en cualquiera de los mensajes de la lista para leer el contenido completo y responder.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
