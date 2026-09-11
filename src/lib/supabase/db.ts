import { Movie, MovieStep, ChatMessage, Prop, ImmersiveAd, PlaybackPhase, AdsConfig, BlockbusterCandidate, TOTAL_STEPS, ContactMessage } from '@/types/cinema';
import { getSupabaseServerClient } from './server';

export function isSupabaseConfigured(): boolean {
  return getSupabaseServerClient() !== null;
}

// ── In-Memory Cache Store to drastically reduce Supabase PostgREST egress ──────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = {
  liveCinemaState: null as CacheEntry<LiveCinemaStateRecord | null> | null,
  activeMovie: new Map<string, CacheEntry<Movie | null>>(),
  allMovies: null as CacheEntry<Movie[]> | null,
  completedMovies: null as CacheEntry<Movie[]> | null,
  blockbusterVoteCounts: new Map<string, CacheEntry<Record<'A' | 'B' | 'C' | 'D', number>>>(),
  activeViewersCount: null as CacheEntry<number | null> | null,
  recentChat: new Map<string, CacheEntry<ChatMessage[]>>(),
  recentVisits: new Map<string, number>() // viewerId -> timestamp ms
};

export function invalidateCinemaCache() {
  memoryCache.liveCinemaState = null;
  memoryCache.activeMovie.clear();
  memoryCache.allMovies = null;
  memoryCache.completedMovies = null;
}

let hasShownSchemaHelp = false;
function logSupabaseError(action: string, error: any) {
  if (error?.message?.includes('schema cache') || error?.message?.includes('does not exist')) {
    if (!hasShownSchemaHelp) {
      hasShownSchemaHelp = true;
      console.warn("\n⚠️ [Supabase] Las tablas aún no están creadas en tu proyecto de Supabase.");
      console.warn("👉 Ejecuta el archivo 'supabase/schema.sql' en tu Supabase SQL Editor para habilitar la persistencia de películas, props y chat.\n");
    }
  } else {
    console.error(`[Supabase] Error ${action}:`, error?.message || error);
  }
}

/**
 * Broadcast an event over Supabase Realtime channel
 */
export async function broadcastCinemaEvent(event: string, payload: any): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const channel = supabase.channel('cinema_live_sync');
    await channel.send({
      type: 'broadcast',
      event,
      payload
    });
  } catch (err) {
    // Non-blocking realtime broadcast
  }
}

/**
 * Persist or update an entire movie record
 */
export async function persistMovie(movie: Movie): Promise<void> {
  invalidateCinemaCache();
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    // Invariant: strictly ONE movie can have status 'streaming' at any given time
    if (movie.status === 'streaming') {
      await supabase
        .from('movies')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('status', 'streaming')
        .neq('id', movie.id);
    }

    const { error } = await supabase.from('movies').upsert({
      id: movie.id,
      title: movie.title,
      genre: movie.genre,
      tagline: movie.tagline || '',
      initial_plot: movie.initialPlot || '',
      master_arc_thread: movie.masterArcThread || '',
      status: movie.status,
      current_step: movie.currentStep,
      total_steps: movie.totalSteps || TOTAL_STEPS,
      bible: movie.bible,
      total_votes_cast: movie.totalVotesCast || 0,
      final_summary: movie.finalSummary || null,
      final_synopsis: movie.finalSynopsis || null,
      created_at: movie.createdAt,
      completed_at: movie.completedAt || null,
    }, { onConflict: 'id' });

    if (error) {
      logSupabaseError('persistMovie', error);
    } else {
      // Also persist all initial props into the props table
      if (movie.bible?.props) {
        for (const prop of movie.bible.props) {
          await persistProp(movie.id, prop);
        }
      }
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistMovie:', err);
  }
}

/**
 * Persist an individual prop (including those generated on the fly)
 */
export async function persistProp(movieId: string, prop: Prop): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('props').upsert({
      id: prop.id,
      movie_id: movieId,
      name: prop.name,
      description: prop.description || '',
      visual_appearance: prop.visualAppearance || prop.description || prop.name || 'Prop item',
      narrative_significance: prop.narrativeSignificance || '',
      image_url: prop.imageUrl || null,
      step_introduced: prop.stepIntroduced || 1,
      owner_character_id: prop.ownerCharacterId || null,
      owner_character_name: prop.ownerCharacterName || null,
      icon: prop.icon || 'box',
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      logSupabaseError('persistProp', error);
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistProp:', err);
  }
}

/**
 * Persist a movie step (video, prompt, options, etc.)
 */
export async function persistMovieStep(movieId: string, step: MovieStep): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('movie_steps').upsert({
      movie_id: movieId,
      step_number: step.stepNumber,
      title: step.title,
      synopsis: step.synopsis,
      dialogue_snippet: step.dialogueSnippet || null,
      voice_direction: step.voiceDirection || null,
      visual_prompt: step.visualPrompt,
      camera_motion_prompt: step.cameraMotionPrompt || null,
      video_url: step.videoUrl,
      thumbnail_url: step.thumbnailUrl || null,
      duration: step.duration || 15,
      voting_window_seconds: step.votingWindowSeconds || 10,
      options: step.options,
      selected_option: step.selectedOption || null,
      was_random_pick: step.wasRandomPick || false,
      active_characters: step.activeCharacters || [],
      active_props: step.activeProps || [],
      new_character: step.newCharacter || null,
      new_prop: step.newProp || null,
      reference_video_url: step.referenceVideoUrl || null,
      prop_reference_images: step.propReferenceImages || [],
      subtitles: step.subtitles || [],
      environment: step.environment || '',
      created_at: step.createdAt || new Date().toISOString(),
    }, { onConflict: 'movie_id,step_number' });

    if (error) {
      logSupabaseError('persistMovieStep', error);
    }

    // Persist new prop into props table if one was introduced in this step
    if (step.newProp) {
      await persistProp(movieId, step.newProp);
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistMovieStep:', err);
  }
}

/**
 * Persist an audience chat message
 */
export async function persistChatMessage(movieId: string, msg: ChatMessage): Promise<void> {
  memoryCache.recentChat.delete(movieId);
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('chat_messages').upsert({
      id: msg.id,
      movie_id: movieId,
      user_id: msg.userId,
      user_name: msg.userName,
      user_avatar: msg.userAvatar || null,
      text: msg.text,
      is_system: msg.isSystem || false,
      voted_option: msg.votedOption || null,
      used_for_influence: msg.usedForInfluence || false,
      created_at: new Date().toISOString(),
      votes_count: msg.votesCount || 0
    }, { onConflict: 'id' });

    if (error) {
      logSupabaseError('persistChatMessage', error);
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistChatMessage:', err);
  }
}

/**
 * Vote or unvote on an audience comment.
 * Returns the updated votes count and whether the user is currently voting for it.
 */
export async function voteChatMessageInDb(
  commentId: string,
  userId: string,
  movieId: string
): Promise<{ votesCount: number; userVoted: boolean }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { votesCount: 0, userVoted: false };

  try {
    // 1. Check existing vote
    const { data: existing } = await supabase
      .from('comment_votes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    let userVoted = false;
    if (existing) {
      // Remove vote (toggle)
      await supabase.from('comment_votes').delete().eq('comment_id', commentId).eq('user_id', userId);
      userVoted = false;
    } else {
      // Insert vote
      await supabase.from('comment_votes').insert({
        comment_id: commentId,
        user_id: userId,
        movie_id: movieId
      });
      userVoted = true;
    }

    // 2. Count total votes for this comment
    const { count } = await supabase
      .from('comment_votes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    const votesCount = count ?? (userVoted ? 1 : 0);

    // 3. Update votes_count on chat_messages table
    await supabase
      .from('chat_messages')
      .update({ votes_count: votesCount })
      .eq('id', commentId);

    // 4. Update top_voted_comments table
    if (votesCount > 0) {
      const { data: msg } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', commentId)
        .maybeSingle();

      if (msg) {
        await supabase.from('top_voted_comments').upsert({
          id: commentId,
          comment_id: commentId,
          movie_id: movieId,
          user_id: msg.user_id,
          user_name: msg.user_name,
          text: msg.text,
          votes_count: votesCount,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }
    } else {
      await supabase.from('top_voted_comments').delete().eq('id', commentId);
    }

    return { votesCount, userVoted };
  } catch (err) {
    console.error('[Supabase] Exception in voteChatMessageInDb:', err);
    return { votesCount: 0, userVoted: false };
  }
}

/**
 * Load top voted comments for a movie
 */
export async function loadTopVotedCommentsFromDb(movieId: string, limit = 10): Promise<ChatMessage[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('top_voted_comments')
      .select('*')
      .eq('movie_id', movieId)
      .order('votes_count', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(item => ({
      id: item.comment_id,
      userId: item.user_id,
      userName: item.user_name,
      text: item.text,
      votesCount: item.votes_count,
      timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  } catch (err) {
    console.error('[Supabase] Exception in loadTopVotedCommentsFromDb:', err);
    return [];
  }
}

/**
 * Load IDs of comments upvoted by a specific user session UUID
 */
export async function loadUserVotedCommentIdsFromDb(userId: string, movieId?: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    let query = supabase
      .from('comment_votes')
      .select('comment_id')
      .eq('user_id', userId);

    if (movieId) {
      query = query.eq('movie_id', movieId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(d => d.comment_id);
  } catch (err) {
    console.error('[Supabase] Exception in loadUserVotedCommentIdsFromDb:', err);
    return [];
  }
}

/**
 * Load completed movies from database with in-memory caching
 */
export async function loadCompletedMoviesFromDb(): Promise<Movie[]> {
  const now = Date.now();
  if (memoryCache.completedMovies && memoryCache.completedMovies.expiresAt > now) {
    return memoryCache.completedMovies.data;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, genre, tagline, initial_plot, master_arc_thread, status, current_step, total_steps, total_votes_cast, created_at, completed_at, final_summary, final_synopsis, bible')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (error || !movies || movies.length === 0) return [];

    // Single batched query for ALL steps instead of one query per movie
    const stepsByMovie = await loadStepsForMovies(supabase, movies.map(m => m.id));
    const result = movies.map(m => mapMovieRow(m, stepsByMovie.get(m.id) || []));

    memoryCache.completedMovies = {
      data: result,
      expiresAt: now + 30000 // 30s TTL
    };

    return result;
  } catch (err) {
    console.error('[Supabase] Exception in loadCompletedMoviesFromDb:', err);
    return [];
  }
}

/**
 * Load latest active streaming movie from database with in-memory caching
 */
export async function loadActiveMovieFromDb(movieId?: string): Promise<Movie | null> {
  const cacheKey = movieId || 'active_streaming';
  const now = Date.now();
  const cached = memoryCache.activeMovie.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    let query = supabase.from('movies').select('id, title, genre, tagline, initial_plot, master_arc_thread, status, current_step, total_steps, total_votes_cast, final_summary, final_synopsis, created_at, completed_at, bible');
    if (movieId) {
      query = query.eq('id', movieId);
    } else {
      query = query.in('status', ['streaming', 'paused']).order('created_at', { ascending: false });
    }
    const { data: movies, error } = await query.limit(1);

    if (error || !movies || movies.length === 0) return null;

    const m = movies[0];
    const { data: steps } = await supabase
      .from('movie_steps')
      .select('step_number, title, synopsis, dialogue_snippet, voice_direction, visual_prompt, camera_motion_prompt, video_url, video_url2, thumbnail_url, duration, voting_window_seconds, options, selected_option, was_random_pick, active_characters, active_props, new_character, new_prop, reference_video_url, prop_reference_images, subtitles, environment, created_at')
      .eq('movie_id', m.id)
      .order('step_number', { ascending: true });

    const movieObj: Movie = {
      id: m.id,
      title: m.title,
      genre: m.genre,
      tagline: m.tagline,
      initialPlot: m.initial_plot,
      masterArcThread: m.master_arc_thread,
      status: m.status,
      currentStep: m.current_step,
      totalSteps: m.total_steps,
      bible: m.bible,
      steps: (steps || []).map(s => ({
        stepNumber: s.step_number,
        title: s.title,
        synopsis: s.synopsis,
        dialogueSnippet: s.dialogue_snippet,
        voiceDirection: s.voice_direction,
        visualPrompt: s.visual_prompt,
        cameraMotionPrompt: s.camera_motion_prompt,
        videoUrl: s.video_url,
        videoUrl2: (s as any).video_url2,
        thumbnailUrl: s.thumbnail_url,
        duration: s.duration,
        votingWindowSeconds: s.voting_window_seconds,
        options: s.options,
        selectedOption: s.selected_option,
        wasRandomPick: s.was_random_pick,
        activeCharacters: s.active_characters,
        activeProps: s.active_props,
        newCharacter: s.new_character,
        newProp: s.new_prop,
        referenceVideoUrl: s.reference_video_url,
        propReferenceImages: s.prop_reference_images,
        subtitles: s.subtitles || [],
        environment: s.environment,
        createdAt: s.created_at,
      })),
      createdAt: m.created_at,
      completedAt: m.completed_at,
      totalVotesCast: m.total_votes_cast,
      finalSummary: m.final_summary,
      finalSynopsis: m.final_synopsis,
    };

    memoryCache.activeMovie.set(cacheKey, {
      data: movieObj,
      expiresAt: now + 5000 // 5s TTL
    });

    return movieObj;
  } catch (err) {
    console.error('[Supabase] Exception in loadActiveMovieFromDb:', err);
    return null;
  }
}

/**
 * Map a raw movie row + its step rows into a Movie object.
 */
function mapMovieRow(m: any, steps: any[]): Movie {
  return {
    id: m.id,
    title: m.title,
    genre: m.genre,
    tagline: m.tagline,
    initialPlot: m.initial_plot,
    masterArcThread: m.master_arc_thread,
    status: m.status,
    currentStep: m.current_step,
    totalSteps: m.total_steps,
    bible: m.bible,
    steps: (steps || []).map((s: any) => ({
      stepNumber: s.step_number,
      title: s.title,
      synopsis: s.synopsis,
      dialogueSnippet: s.dialogue_snippet,
      voiceDirection: s.voice_direction,
      visualPrompt: s.visual_prompt,
      cameraMotionPrompt: s.camera_motion_prompt,
      videoUrl: s.video_url,
      videoUrl2: s.video_url2,
      thumbnailUrl: s.thumbnail_url,
      duration: s.duration,
      votingWindowSeconds: s.voting_window_seconds,
      options: s.options,
      selectedOption: s.selected_option,
      wasRandomPick: s.was_random_pick,
      activeCharacters: s.active_characters,
      activeProps: s.active_props,
      newCharacter: s.new_character,
      newProp: s.new_prop,
      referenceVideoUrl: s.reference_video_url,
      propReferenceImages: s.prop_reference_images,
      subtitles: s.subtitles || [],
      environment: s.environment,
      createdAt: s.created_at,
    })),
    createdAt: m.created_at,
    completedAt: m.completed_at,
    totalVotesCast: m.total_votes_cast,
    finalSummary: m.final_summary,
    finalSynopsis: m.final_synopsis,
  };
}

/**
 * Batch-load steps for many movies in ONE query with compact column projection.
 */
async function loadStepsForMovies(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  movieIds: string[]
): Promise<Map<string, any[]>> {
  const stepsByMovie = new Map<string, any[]>();
  if (movieIds.length === 0) return stepsByMovie;

  try {
    const { data, error } = await supabase
      .from('movie_steps')
      .select('movie_id, step_number, title, synopsis, duration, video_url, video_url2, thumbnail_url, options, selected_option, was_random_pick, created_at')
      .in('movie_id', movieIds)
      .order('step_number', { ascending: true });

    if (error) return stepsByMovie;

    for (const s of data || []) {
      const list = stepsByMovie.get(s.movie_id) || [];
      list.push(s);
      stepsByMovie.set(s.movie_id, list);
    }
  } catch (err) {
    console.error('[Supabase] Exception in loadStepsForMovies:', err);
  }

  return stepsByMovie;
}

/**
 * Load all movies from database (streaming, paused, completed) with caching and lightweight columns
 */
export async function loadAllMoviesFromDb(limit = 100): Promise<Movie[]> {
  const now = Date.now();
  if (memoryCache.allMovies && memoryCache.allMovies.expiresAt > now) {
    return memoryCache.allMovies.data;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, genre, tagline, initial_plot, master_arc_thread, status, current_step, total_steps, total_votes_cast, created_at, completed_at, final_summary, final_synopsis')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !movies || movies.length === 0) return [];

    // Single batched query for ALL steps instead of one query per movie
    const stepsByMovie = await loadStepsForMovies(supabase, movies.map(m => m.id));
    const result = movies.map(m => mapMovieRow(m, stepsByMovie.get(m.id) || []));

    memoryCache.allMovies = {
      data: result,
      expiresAt: now + 30000 // 30s TTL
    };

    return result;
  } catch (err) {
    console.error('[Supabase] Exception in loadAllMoviesFromDb:', err);
    return [];
  }
}

/**
 * Load a single movie by its ID from database
 */
export async function loadMovieByIdFromDb(movieId: string): Promise<Movie | null> {
  const cached = memoryCache.activeMovie.get(movieId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { data: m, error } = await supabase
      .from('movies')
      .select('id, title, genre, tagline, initial_plot, master_arc_thread, status, current_step, total_steps, total_votes_cast, final_summary, final_synopsis, created_at, completed_at, bible')
      .eq('id', movieId)
      .maybeSingle();

    if (error || !m) return null;

    const { data: steps } = await supabase
      .from('movie_steps')
      .select('step_number, title, synopsis, dialogue_snippet, voice_direction, visual_prompt, camera_motion_prompt, video_url, video_url2, thumbnail_url, duration, voting_window_seconds, options, selected_option, was_random_pick, active_characters, active_props, new_character, new_prop, reference_video_url, prop_reference_images, subtitles, environment, created_at')
      .eq('movie_id', m.id)
      .order('step_number', { ascending: true });

    const movieObj: Movie = {
      id: m.id,
      title: m.title,
      genre: m.genre,
      tagline: m.tagline,
      initialPlot: m.initial_plot,
      masterArcThread: m.master_arc_thread,
      status: m.status,
      currentStep: m.current_step,
      totalSteps: m.total_steps,
      bible: m.bible,
      steps: (steps || []).map(s => ({
        stepNumber: s.step_number,
        title: s.title,
        synopsis: s.synopsis,
        dialogueSnippet: s.dialogue_snippet,
        voiceDirection: s.voice_direction,
        visualPrompt: s.visual_prompt,
        cameraMotionPrompt: s.camera_motion_prompt,
        videoUrl: s.video_url,
        videoUrl2: (s as any).video_url2,
        thumbnailUrl: s.thumbnail_url,
        duration: s.duration,
        votingWindowSeconds: s.voting_window_seconds,
        options: s.options,
        selectedOption: s.selected_option,
        wasRandomPick: s.was_random_pick,
        activeCharacters: s.active_characters,
        activeProps: s.active_props,
        newCharacter: s.new_character,
        newProp: s.new_prop,
        referenceVideoUrl: s.reference_video_url,
        propReferenceImages: s.prop_reference_images,
        subtitles: s.subtitles || [],
        environment: s.environment,
        createdAt: s.created_at,
      })),
      createdAt: m.created_at,
      completedAt: m.completed_at,
      totalVotesCast: m.total_votes_cast,
      finalSummary: m.final_summary,
      finalSynopsis: m.final_synopsis,
    };

    memoryCache.activeMovie.set(movieId, {
      data: movieObj,
      expiresAt: Date.now() + 5000
    });

    return movieObj;
  } catch (err) {
    console.error('[Supabase] Exception in loadMovieByIdFromDb:', err);
    return null;
  }
}

/**
 * Load recent chat messages for a movie with 2s TTL cache
 */
export async function loadRecentChatMessagesFromDb(movieId: string, limit = 50): Promise<ChatMessage[]> {
  const now = Date.now();
  const cached = memoryCache.recentChat.get(movieId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, user_id, user_name, user_avatar, text, is_system, voted_option, used_for_influence, votes_count, created_at')
      .eq('movie_id', movieId)
      .eq('is_system', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !messages) return [];

    const result = messages.map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      userName: msg.user_name,
      userAvatar: msg.user_avatar,
      text: msg.text,
      timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: new Date(msg.created_at).getTime(),
      isSystem: msg.is_system,
      votedOption: msg.voted_option,
      usedForInfluence: msg.used_for_influence || false,
      votesCount: msg.votes_count || 0
    }));

    memoryCache.recentChat.set(movieId, {
      data: result,
      expiresAt: now + 2000 // 2s TTL
    });

    return result;
  } catch (err) {
    console.error('[Supabase] Exception in loadRecentChatMessagesFromDb:', err);
    return [];
  }
}

/**
 * Mark a chat comment as already used for narrative influence so the random
 * comment picker never considers it again in a later round.
 */
export async function markChatMessageUsedForInfluence(commentId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ used_for_influence: true })
      .eq('id', commentId);

    if (error) {
      logSupabaseError('markChatMessageUsedForInfluence', error);
    }
  } catch (err) {
    console.error('[Supabase] Exception in markChatMessageUsedForInfluence:', err);
  }
}

/**
 * Load active or all immersive ads from database
 */
export async function loadImmersiveAdsFromDb(): Promise<ImmersiveAd[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data: ads, error } = await supabase
      .from('immersive_ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !ads) {
      if (error) logSupabaseError('loadImmersiveAdsFromDb', error);
      return [];
    }

    return ads.map(ad => ({
      id: ad.id,
      brandName: ad.brand_name,
      title: ad.title,
      tagline: ad.tagline || '',
      description: ad.description || '',
      type: ad.type as 'commercial_break' | 'in_scene_overlay',
      videoUrl: ad.video_url || undefined,
      imageUrl: ad.image_url || undefined,
      ctaText: ad.cta_text,
      ctaUrl: ad.cta_url || undefined,
      perkReward: ad.perk_reward || undefined,
      duration: ad.duration || 10,
      isActive: ad.is_active ?? true,
      frequencySteps: ad.frequency_steps || 5,
      stepTrigger: ad.step_trigger || undefined,
      impressions: ad.impressions || 0,
      clicks: ad.clicks || 0,
      createdAt: ad.created_at,
      cinematicPrompt: ad.cinematic_prompt || undefined,
      generatedAdVideoUrl: ad.generated_ad_video_url || undefined,
    }));
  } catch (err) {
    console.error('[Supabase] Exception in loadImmersiveAdsFromDb:', err);
    return [];
  }
}

/**
 * Persist or update an immersive ad in Supabase
 */
export async function persistImmersiveAd(ad: ImmersiveAd): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('immersive_ads').upsert({
      id: ad.id,
      brand_name: ad.brandName,
      title: ad.title,
      tagline: ad.tagline || '',
      description: ad.description || '',
      type: ad.type,
      video_url: ad.videoUrl || null,
      image_url: ad.imageUrl || null,
      cta_text: ad.ctaText,
      cta_url: ad.ctaUrl || null,
      perk_reward: ad.perkReward || null,
      duration: ad.duration,
      is_active: ad.isActive,
      frequency_steps: ad.frequencySteps || 5,
      step_trigger: ad.stepTrigger || null,
      impressions: ad.impressions || 0,
      clicks: ad.clicks || 0,
      cinematic_prompt: ad.cinematicPrompt || null,
      generated_ad_video_url: ad.generatedAdVideoUrl || null,
    }, { onConflict: 'id' });

    if (error) {
      logSupabaseError('persistImmersiveAd', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Exception in persistImmersiveAd:', err);
    return false;
  }
}

/**
 * Increment impressions or clicks for an immersive ad
 */
export async function recordAdMetric(adId: string, metric: 'impression' | 'click'): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const column = metric === 'impression' ? 'impressions' : 'clicks';
    // Fetch current count and update safely
    const { data } = await supabase
      .from('immersive_ads')
      .select(column)
      .eq('id', adId)
      .single();

    const currentVal = (data as any)?.[column] || 0;
    await supabase
      .from('immersive_ads')
      .update({ [column]: currentVal + 1 })
      .eq('id', adId);
  } catch (err) {
    // Non-blocking metric recording
  }
}

/**
 * Delete an immersive ad from Supabase
 */
export async function deleteImmersiveAdFromDb(adId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('immersive_ads').delete().eq('id', adId);
    return !error;
  } catch {
    return false;
  }
}


/**
 * Mark all currently streaming/paused movies as 'completed' so they are
 * not restored on the next initializeMovie() call. Used when doing
 * a force-reset to switch from mockup mode to real AI generation.
 */
export async function archiveAllStreamingMovies(): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('movies')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('status', ['streaming', 'paused']);

    if (error) {
      logSupabaseError('archiveAllStreamingMovies', error);
    }
  } catch (err) {
    console.error('[Supabase] Exception in archiveAllStreamingMovies:', err);
  }
}

/**
 * Update editable movie details (title, genre, tagline, initial plot).
 */
export async function updateMovieInDb(
  movieId: string,
  fields: { title?: string; genre?: string; tagline?: string; initialPlot?: string }
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  try {
    const update: Record<string, string> = {};
    if (fields.title !== undefined) update.title = fields.title;
    if (fields.genre !== undefined) update.genre = fields.genre;
    if (fields.tagline !== undefined) update.tagline = fields.tagline;
    if (fields.initialPlot !== undefined) update.initial_plot = fields.initialPlot;

    const { error } = await supabase.from('movies').update(update).eq('id', movieId);
    if (error) {
      logSupabaseError('updateMovieInDb', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Exception in updateMovieInDb:', err);
    return false;
  }
}

/**
 * Bulk delete multiple movies from DB.
 * Safely unlinks cinema_state if the active movie is deleted,
 * cleans up dependent child tables, and verifies actual deleted rows.
 */
export async function deleteMoviesFromDb(movieIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !movieIds || movieIds.length === 0) {
    return { success: false, deletedCount: 0 };
  }

  try {
    // 1. If cinema_state currently points to any of these movies, detach it first so active_session is not cascade-deleted
    const { data: stateRow } = await supabase
      .from('cinema_state')
      .select('id, movie_id')
      .eq('id', 'active_session')
      .maybeSingle();

    if (stateRow?.movie_id && movieIds.includes(stateRow.movie_id)) {
      console.log(`[Supabase] Detaching active movie ${stateRow.movie_id} from cinema_state before deletion`);
      await supabase
        .from('cinema_state')
        .update({ movie_id: null })
        .eq('id', 'active_session');
    }

    // 2. Explicitly clean up all dependent/foreign key tables to prevent constraint violations
    await Promise.allSettled([
      supabase.from('movie_steps').delete().in('movie_id', movieIds),
      supabase.from('props').delete().in('movie_id', movieIds),
      supabase.from('step_votes').delete().in('movie_id', movieIds),
      supabase.from('blockbuster_votes').delete().in('movie_id', movieIds),
      supabase.from('comment_votes').delete().in('movie_id', movieIds),
      supabase.from('top_voted_comments').delete().in('movie_id', movieIds),
      supabase.from('chat_messages').delete().in('movie_id', movieIds),
      supabase.from('viewer_preferences').delete().in('movie_id', movieIds),
      supabase.from('immersive_ads').update({ movie_id: null }).in('movie_id', movieIds)
    ]);

    // 3. Delete the movies and select back the deleted IDs to confirm deletion
    const { data, error } = await supabase
      .from('movies')
      .delete()
      .in('id', movieIds)
      .select('id');

    if (error) {
      logSupabaseError('deleteMoviesFromDb', error);
      return { success: false, deletedCount: 0 };
    }

    const deletedCount = data?.length ?? 0;
    console.log(`[Supabase] deleteMoviesFromDb: requested ${movieIds.length}, deleted ${deletedCount}`);

    return { success: true, deletedCount };
  } catch (err) {
    console.error('[Supabase] Exception in deleteMoviesFromDb:', err);
    return { success: false, deletedCount: 0 };
  }
}

/**
 * Delete a single movie and all its dependent rows from DB.
 */
export async function deleteMovieFromDb(movieId: string): Promise<boolean> {
  const result = await deleteMoviesFromDb([movieId]);
  return result.success && result.deletedCount > 0;
}

/**
 * Bulk update multiple movies in DB (e.g. genre or status).
 */
export async function updateMoviesInDb(
  movieIds: string[],
  fields: { genre?: string; status?: string; tagline?: string }
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !movieIds || movieIds.length === 0) return false;

  try {
    const update: Record<string, string> = {};
    if (fields.genre !== undefined && fields.genre.trim()) update.genre = fields.genre.trim();
    if (fields.status !== undefined && fields.status.trim()) update.status = fields.status.trim();
    if (fields.tagline !== undefined) update.tagline = fields.tagline.trim();

    if (Object.keys(update).length === 0) return false;

    const { error } = await supabase.from('movies').update(update).in('id', movieIds);
    if (error) {
      logSupabaseError('updateMoviesInDb', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Exception in updateMoviesInDb:', err);
    return false;
  }
}

/**
 * Persist (upsert) a viewer's next-blockbuster vote. One vote per user per movie.
 */
export async function persistBlockbusterVote(
  movieId: string,
  userId: string,
  candidateId: 'A' | 'B' | 'C' | 'D'
): Promise<void> {
  memoryCache.blockbusterVoteCounts.delete(movieId);
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('blockbuster_votes')
      .upsert(
        { movie_id: movieId, user_id: userId, candidate_id: candidateId },
        { onConflict: 'movie_id,user_id' }
      );

    if (error) {
      logSupabaseError('persistBlockbusterVote', error);
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistBlockbusterVote:', err);
  }
}

/**
 * Load the aggregate blockbuster vote counts for a movie with 3s TTL cache.
 */
export async function loadBlockbusterVoteCountsFromDb(
  movieId: string
): Promise<Record<'A' | 'B' | 'C' | 'D', number>> {
  const now = Date.now();
  const cached = memoryCache.blockbusterVoteCounts.get(movieId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const supabase = getSupabaseServerClient();
  const counts: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 0, C: 0, D: 0 };
  if (!supabase) return counts;

  try {
    const { data, error } = await supabase
      .from('blockbuster_votes')
      .select('candidate_id')
      .eq('movie_id', movieId);

    if (error) {
      logSupabaseError('loadBlockbusterVoteCountsFromDb', error);
      return counts;
    }

    for (const row of data || []) {
      const id = row.candidate_id as string;
      if (id === 'A' || id === 'B' || id === 'C' || id === 'D') {
        counts[id]++;
      }
    }

    memoryCache.blockbusterVoteCounts.set(movieId, {
      data: counts,
      expiresAt: now + 3000 // 3s TTL
    });
  } catch (err) {
    console.error('[Supabase] Exception in loadBlockbusterVoteCountsFromDb:', err);
  }

  return counts;
}

/**
 * Load an individual user's blockbuster vote for a movie.
 */
export async function loadUserBlockbusterVote(
  movieId: string,
  userId: string
): Promise<'A' | 'B' | 'C' | 'D' | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !movieId || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('blockbuster_votes')
      .select('candidate_id')
      .eq('movie_id', movieId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data?.candidate_id) {
      const id = data.candidate_id as string;
      if (id === 'A' || id === 'B' || id === 'C' || id === 'D') {
        return id;
      }
    }
  } catch (err) {
    console.error('[Supabase] Exception in loadUserBlockbusterVote:', err);
  }

  return null;
}

/**
 * Record a real viewer visit (unique per viewer per day). Throttled in-memory so
 * rapid polling does not spam PostgREST with duplicate upserts.
 */
export async function recordVisit(viewerId: string): Promise<void> {
  const now = Date.now();
  const lastRecorded = memoryCache.recentVisits.get(viewerId);
  // Throttle to at most once every 5 minutes (300,000 ms) per viewer
  if (lastRecorded && (now - lastRecorded) < 300000) {
    return;
  }
  memoryCache.recentVisits.set(viewerId, now);

  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('visits')
      .upsert(
        { viewer_id: viewerId, visit_date: new Date().toISOString().slice(0, 10), last_seen: new Date().toISOString() },
        { onConflict: 'viewer_id,visit_date' }
      );

    if (error) {
      logSupabaseError('recordVisit', error);
    }
  } catch (err) {
    console.error('[Supabase] Exception in recordVisit:', err);
  }
}

/**
 * Count real ACTIVE viewers: unique viewers seen in the last N minutes with 10s TTL cache.
 */
export async function countActiveViewersFromDb(windowMinutes = 5): Promise<number | null> {
  const now = Date.now();
  if (memoryCache.activeViewersCount && memoryCache.activeViewersCount.expiresAt > now) {
    return memoryCache.activeViewersCount.data;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { count, error } = await supabase
      .from('visits')
      .select('viewer_id', { count: 'exact', head: true })
      .gte('last_seen', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString());

    if (error) {
      logSupabaseError('countActiveViewersFromDb', error);
      return null;
    }

    const result = count ?? 0;
    memoryCache.activeViewersCount = {
      data: result,
      expiresAt: now + 10000 // 10s TTL
    };

    return result;
  } catch (err) {
    console.error('[Supabase] Exception in countActiveViewersFromDb:', err);
    return null;
  }
}

/**
 * Daily visit counts (unique viewers per day) for the stats table.
 */
export async function countVisitsByDayFromDb(days = 14): Promise<{ date: string; count: number }[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('visits')
      .select('visit_date')
      .gte('visit_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

    if (error) {
      logSupabaseError('countVisitsByDayFromDb', error);
      return [];
    }

    const byDay = new Map<string, number>();
    for (const row of data || []) {
      const d = String(row.visit_date).slice(0, 10);
      byDay.set(d, (byDay.get(d) || 0) + 1);
    }

    return Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (err) {
    console.error('[Supabase] Exception in countVisitsByDayFromDb:', err);
    return [];
  }
}

export interface LiveCinemaStateRecord {
  phase: PlaybackPhase;
  timeRemaining: number;
  currentStep: number;
  totalAudience: number;
  votesA: number;
  votesB: number;
  isLive: boolean;
  isPaused: boolean;
  isGenerationPaused: boolean;
  videoModel?: string | null;
  videoResolution?: string | null;
  blockbusterCandidates?: BlockbusterCandidate[];
  blockbusterVoteCounts?: Record<'A' | 'B' | 'C' | 'D', number> | null;
  blockbusterWinner?: { id?: 'A' | 'B' | 'C' | 'D'; title: string; logline?: string; genre?: string; premise?: string } | null;
  activeAd?: ImmersiveAd | null;
  adsConfig?: AdsConfig;
  selectedOption?: 'A' | 'B';
  wasRandomPick?: boolean;
  phaseStartedAt?: string | number;
  phaseEndsAt?: string | number;
  phaseDuration?: number;
  workerId?: string | null;
  workerHeartbeat?: string | null;
  movieId?: string;
  updatedAt?: string;
}

export interface LiveCinemaStatePayload extends LiveCinemaStateRecord {
  movieId: string;
}

/**
 * Persist live cinema state to Supabase.
 * Dual-writes to public.cinema_state AND public.movies.bible.liveState
 * ensuring complete real-time persistence even if migration tables are pending.
 */
export async function persistLiveCinemaState(payload: LiveCinemaStatePayload): Promise<void> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const phaseStartedAtIso = payload.phaseStartedAt 
    ? (typeof payload.phaseStartedAt === 'number' ? new Date(payload.phaseStartedAt).toISOString() : payload.phaseStartedAt) 
    : nowIso;
  const phaseEndsAtIso = payload.phaseEndsAt 
    ? (typeof payload.phaseEndsAt === 'number' ? new Date(payload.phaseEndsAt).toISOString() : payload.phaseEndsAt) 
    : new Date(now + (payload.timeRemaining || 15) * 1000).toISOString();
  const phaseDuration = payload.phaseDuration || payload.timeRemaining || 15;

  // Immediately update in-memory cache
  memoryCache.liveCinemaState = {
    data: {
      ...payload,
      phaseStartedAt: phaseStartedAtIso,
      phaseEndsAt: phaseEndsAtIso,
      phaseDuration,
      updatedAt: nowIso
    },
    expiresAt: now + 3000
  };

  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  // 1. Try public.cinema_state table
  try {
    const upsertData: Record<string, any> = {
      id: 'active_session',
      movie_id: payload.movieId,
      phase: payload.phase,
      time_remaining: payload.timeRemaining,
      current_step: payload.currentStep,
      total_audience: payload.totalAudience,
      votes_a: payload.votesA,
      votes_b: payload.votesB,
      is_live: payload.isLive,
      is_paused: payload.isPaused,
      is_generation_paused: payload.isGenerationPaused,
      video_model: payload.videoModel || null,
      video_resolution: payload.videoResolution || null,
      blockbuster_candidates: payload.blockbusterCandidates || [],
      blockbuster_vote_counts: payload.blockbusterVoteCounts || { A: 0, B: 0, C: 0, D: 0 },
      blockbuster_winner: payload.blockbusterWinner || null,
      active_ad_id: payload.activeAd?.id || null,
      ads_config: payload.adsConfig || { autoAdsEnabled: true, adIntervalSteps: 5, lastAdStep: 0 },
      selected_option: payload.selectedOption || null,
      was_random_pick: payload.wasRandomPick || false,
      phase_started_at: phaseStartedAtIso,
      phase_ends_at: phaseEndsAtIso,
      phase_duration: phaseDuration,
      updated_at: nowIso
    };

    if (payload.workerId !== undefined) {
      upsertData.worker_id = payload.workerId;
      upsertData.worker_heartbeat = payload.workerHeartbeat || nowIso;
    }

    await supabase.from('cinema_state').upsert(upsertData, { onConflict: 'id' });
  } catch {
    // Non-blocking fallback
  }

  // 2. Dual-write to public.movies (existing table with RLS and realtime publication)
  try {
    const { data: movieData } = await supabase
      .from('movies')
      .select('bible')
      .eq('id', payload.movieId)
      .maybeSingle();

    const currentBible = (movieData as any)?.bible || {};
    const updatedBible = {
      ...currentBible,
      isGenerationPaused: payload.isGenerationPaused,
      liveState: {
        phase: payload.phase,
        timeRemaining: payload.timeRemaining,
        currentStep: payload.currentStep,
        totalAudience: payload.totalAudience,
        votesA: payload.votesA,
        votesB: payload.votesB,
        isLive: payload.isLive,
        isPaused: payload.isPaused,
        isGenerationPaused: payload.isGenerationPaused,
        videoModel: payload.videoModel ?? null,
        videoResolution: payload.videoResolution ?? null,
        blockbusterCandidates: payload.blockbusterCandidates ?? [],
        blockbusterVoteCounts: payload.blockbusterVoteCounts ?? { A: 0, B: 0, C: 0, D: 0 },
        blockbusterWinner: payload.blockbusterWinner ?? null,
        activeAd: payload.activeAd || null,
        adsConfig: payload.adsConfig || null,
        selectedOption: payload.selectedOption || null,
        wasRandomPick: payload.wasRandomPick || false,
        phaseStartedAt: phaseStartedAtIso,
        phaseEndsAt: phaseEndsAtIso,
        phaseDuration: phaseDuration,
        workerId: payload.workerId !== undefined ? payload.workerId : (currentBible.liveState?.workerId || null),
        workerHeartbeat: payload.workerHeartbeat !== undefined ? payload.workerHeartbeat : (currentBible.liveState?.workerHeartbeat || nowIso),
        updatedAt: nowIso
      }
    };

    await supabase
      .from('movies')
      .update({
        current_step: payload.currentStep,
        status: payload.isPaused ? 'paused' : 'streaming',
        bible: updatedBible
      })
      .eq('id', payload.movieId);
  } catch {
    // Non-blocking
  }
}

/**
 * Load live cinema state from Supabase with in-memory caching (2.5s TTL)
 * Checks public.cinema_state first, falling back to public.movies.bible.liveState.
 */
export async function loadLiveCinemaStateFromDb(movieId?: string): Promise<LiveCinemaStateRecord | null> {
  const now = Date.now();
  if (memoryCache.liveCinemaState && memoryCache.liveCinemaState.expiresAt > now) {
    return memoryCache.liveCinemaState.data;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  // 1. Try public.cinema_state
  try {
    let query = supabase.from('cinema_state').select('*').eq('id', 'active_session');
    if (movieId) {
      query = query.eq('movie_id', movieId);
    }
    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      const record: LiveCinemaStateRecord = {
        movieId: data.movie_id,
        phase: data.phase as PlaybackPhase,
        timeRemaining: data.time_remaining,
        currentStep: data.current_step,
        totalAudience: data.total_audience,
        votesA: data.votes_a,
        votesB: data.votes_b,
        isLive: data.is_live,
        isPaused: data.is_paused,
        isGenerationPaused: data.is_generation_paused,
        videoModel: data.video_model ?? null,
        videoResolution: data.video_resolution ?? null,
        blockbusterCandidates: data.blockbuster_candidates || [],
        blockbusterVoteCounts: data.blockbuster_vote_counts || null,
        blockbusterWinner: data.blockbuster_winner || null,
        adsConfig: data.ads_config,
        selectedOption: data.selected_option,
        wasRandomPick: data.was_random_pick,
        phaseStartedAt: data.phase_started_at,
        phaseEndsAt: data.phase_ends_at,
        phaseDuration: data.phase_duration,
        workerId: data.worker_id,
        workerHeartbeat: data.worker_heartbeat,
        updatedAt: data.updated_at
      };

      memoryCache.liveCinemaState = {
        data: record,
        expiresAt: now + 2500 // 2.5s TTL
      };

      return record;
    }
  } catch {
    // Non-blocking fallback
  }

  // 2. Fallback to movies.bible.liveState
  const fallbackRecord = await loadBibleLiveState(supabase, movieId);
  if (fallbackRecord) {
    memoryCache.liveCinemaState = {
      data: fallbackRecord,
      expiresAt: now + 2500
    };
  }
  return fallbackRecord;
}

/**
 * Fallback live-state reader: public.movies.bible.liveState.
 */
async function loadBibleLiveState(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  movieId?: string
): Promise<LiveCinemaStateRecord | null> {
  try {
    let query = supabase.from('movies').select('id, bible').in('status', ['streaming', 'paused']);
    if (movieId) {
      query = supabase.from('movies').select('id, bible').eq('id', movieId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }
    const { data, error } = await query.maybeSingle();
    if (!error && data?.bible?.liveState) {
      return {
        ...(data.bible.liveState as LiveCinemaStateRecord),
        movieId: data.id
      };
    }
  } catch {
    // Non-blocking
  }

  return null;
}

/**
 * Acquire or renew the single worker leader lock in Supabase.
 * Uses atomic heartbeat comparison:
 * A worker holds the lock if its heartbeat is fresher than 6 seconds ago.
 * If stale or empty or matching this worker, lock is granted!
 */
export async function acquireOrRenewWorkerLock(workerId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const staleThreshold = 15000; // 15 seconds threshold (accommodates 5s heartbeat interval)

  // 1. Try public.cinema_state if available in Supabase
  try {
    const { data: state, error } = await supabase
      .from('cinema_state')
      .select('worker_id, worker_heartbeat')
      .eq('id', 'active_session')
      .maybeSingle();

    if (!error) {
      if (!state) {
        // Initialize active_session if missing
        await supabase.from('cinema_state').insert({
          id: 'active_session',
          worker_id: workerId,
          worker_heartbeat: nowIso,
          updated_at: nowIso
        });
        return true;
      }

      const currentWorker = state.worker_id;
      const lastHeartbeat = state.worker_heartbeat ? new Date(state.worker_heartbeat).getTime() : 0;
      const isStale = (now - lastHeartbeat) > staleThreshold;

      if (!currentWorker || currentWorker === workerId || isStale) {
        const { error: updateError } = await supabase
          .from('cinema_state')
          .update({
            worker_id: workerId,
            worker_heartbeat: nowIso
          })
          .eq('id', 'active_session');

        if (!updateError) return true;
      } else {
        // Another worker actively holds cinema_state lock
        return false;
      }
    }
  } catch {
    // Fall through to movies table
  }

  // 2. Resilient fallback to public.movies (guaranteed table with existing realtime publication)
  try {
    const { data: movie, error: movieErr } = await supabase
      .from('movies')
      .select('id, bible')
      .in('status', ['streaming', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (movieErr || !movie) {
      // If no movie created yet, grant lock so worker can initialize it
      return true;
    }

    const bible = (movie.bible as any) || {};
    const liveState = bible.liveState || {};
    const currentWorker = liveState.workerId;
    const lastHeartbeat = liveState.workerHeartbeat ? new Date(liveState.workerHeartbeat).getTime() : 0;
    const isStale = (now - lastHeartbeat) > staleThreshold;

    if (!currentWorker || currentWorker === workerId || isStale) {
      const updatedBible = {
        ...bible,
        liveState: {
          ...liveState,
          workerId: workerId,
          workerHeartbeat: nowIso
        }
      };

      const { error: updateErr } = await supabase
        .from('movies')
        .update({ bible: updatedBible })
        .eq('id', movie.id);

      return !updateErr;
    }

    // Another worker is actively holding the lock in movies.bible
    return false;
  } catch {
    return false;
  }
}

/**
 * Release worker lock on shutdown
 */
export async function releaseWorkerLock(workerId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    await supabase
      .from('cinema_state')
      .update({ worker_id: null, worker_heartbeat: null })
      .eq('id', 'active_session')
      .eq('worker_id', workerId);
  } catch {}

  try {
    const { data: movie } = await supabase
      .from('movies')
      .select('id, bible')
      .in('status', ['streaming', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (movie?.bible?.liveState?.workerId === workerId) {
      const updatedBible = {
        ...movie.bible,
        liveState: {
          ...movie.bible.liveState,
          workerId: null,
          workerHeartbeat: null
        }
      };
      await supabase.from('movies').update({ bible: updatedBible }).eq('id', movie.id);
    }
  } catch {}
}

/**
 * Record a user vote directly in Supabase.
 * Stores in public.step_votes, public.viewer_preferences, and movies.bible.stepVotes.
 */
export async function recordUserVoteInDb(
  movieId: string,
  stepNumber: number,
  userId: string,
  optionId: 'A' | 'B',
  userName?: string
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const nowIso = new Date().toISOString();

  // 1. Try public.step_votes table
  try {
    await supabase.from('step_votes').upsert({
      movie_id: movieId,
      step_number: stepNumber,
      user_id: userId,
      user_name: userName || `Viewer_${userId.slice(-4)}`,
      option_id: optionId,
      created_at: nowIso
    }, { onConflict: 'movie_id,step_number,user_id' });
  } catch {
    // Non-blocking
  }

  // 2. Try public.viewer_preferences table
  try {
    await supabase.from('viewer_preferences').upsert({
      user_id: userId,
      last_voted_step: stepNumber,
      voted_option: optionId,
      updated_at: nowIso
    }, { onConflict: 'user_id' });
  } catch {
    // Non-blocking
  }

  // 3. Dual-write to public.movies.bible.stepVotes & viewerPreferences
  try {
    const { data: movieData } = await supabase
      .from('movies')
      .select('bible')
      .eq('id', movieId)
      .single();

    if (movieData) {
      const bible = (movieData as any)?.bible || {};
      const stepVotes = bible.stepVotes || {};
      const currentStepMap = stepVotes[stepNumber] || {};
      currentStepMap[userId] = optionId;
      stepVotes[stepNumber] = currentStepMap;

      const viewerPrefs = bible.viewerPreferences || {};
      viewerPrefs[userId] = {
        ...(viewerPrefs[userId] || {}),
        lastVotedStep: stepNumber,
        votedOption: optionId,
        updatedAt: nowIso
      };

      await supabase
        .from('movies')
        .update({
          bible: { ...bible, stepVotes, viewerPreferences: viewerPrefs }
        })
        .eq('id', movieId);
    }
  } catch {
    // Non-blocking
  }

  return true;
}

/**
 * Load whether a user has already voted for a specific step from Supabase.
 */
export async function loadUserVoteForStep(
  movieId: string,
  stepNumber: number,
  userId: string
): Promise<'A' | 'B' | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  // 1. Try public.step_votes table
  try {
    const { data } = await supabase
      .from('step_votes')
      .select('option_id')
      .eq('movie_id', movieId)
      .eq('step_number', stepNumber)
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.option_id === 'A' || data?.option_id === 'B') {
      return data.option_id as 'A' | 'B';
    }
  } catch {
    // Non-blocking
  }

  // 2. Try movies.bible.stepVotes
  try {
    const { data } = await supabase
      .from('movies')
      .select('bible')
      .eq('id', movieId)
      .maybeSingle();

    const option = (data as any)?.bible?.stepVotes?.[stepNumber]?.[userId];
    if (option === 'A' || option === 'B') {
      return option;
    }
  } catch {
    // Non-blocking
  }

  // 3. Try public.viewer_preferences table
  try {
    const { data } = await supabase
      .from('viewer_preferences')
      .select('last_voted_step, voted_option')
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.last_voted_step === stepNumber && (data?.voted_option === 'A' || data?.voted_option === 'B')) {
      return data.voted_option as 'A' | 'B';
    }
  } catch {
    // Non-blocking
  }

  return null;
}

/**
 * Persist viewer preferences (subtitles, language, nickname) to Supabase.
 */
export async function persistViewerPreferences(
  userId: string,
  prefs: { subtitlesEnabled?: boolean; subtitleLanguage?: 'en' | 'es'; nickname?: string | null },
  movieId?: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const nowIso = new Date().toISOString();

  // 1. Try public.viewer_preferences table
  try {
    const payload: any = { user_id: userId, updated_at: nowIso };
    if (prefs.subtitlesEnabled !== undefined) payload.subtitles_enabled = prefs.subtitlesEnabled;
    if (prefs.subtitleLanguage !== undefined) payload.subtitle_language = prefs.subtitleLanguage;
    if (prefs.nickname !== undefined) payload.nickname = prefs.nickname?.trim() || null;
    await supabase.from('viewer_preferences').upsert(payload, { onConflict: 'user_id' });
  } catch {
    // Non-blocking
  }

  // 2. Dual-write to public.movies.bible.viewerPreferences
  try {
    let query = supabase.from('movies').select('id, bible').in('status', ['streaming', 'paused']);
    if (movieId) {
      query = supabase.from('movies').select('id, bible').eq('id', movieId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }
    const { data } = await query.maybeSingle();
    if (data) {
      const bible = (data as any)?.bible || {};
      const viewerPrefs = bible.viewerPreferences || {};
      viewerPrefs[userId] = {
        ...(viewerPrefs[userId] || {}),
        ...prefs,
        nickname: prefs.nickname !== undefined ? (prefs.nickname?.trim() || null) : (viewerPrefs[userId]?.nickname || null),
        updatedAt: nowIso
      };
      await supabase
        .from('movies')
        .update({
          bible: { ...bible, viewerPreferences: viewerPrefs }
        })
        .eq('id', data.id);
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Load viewer preferences from Supabase.
 */
export async function loadViewerPreferences(
  userId: string,
  movieId?: string
): Promise<{ subtitlesEnabled: boolean; subtitleLanguage: 'en' | 'es'; nickname: string | null }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { subtitlesEnabled: true, subtitleLanguage: 'en', nickname: null };
  }

  // 1. Try public.viewer_preferences
  try {
    const { data } = await supabase
      .from('viewer_preferences')
      .select('subtitles_enabled, subtitle_language, nickname')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      return {
        subtitlesEnabled: data.subtitles_enabled !== false,
        subtitleLanguage: data.subtitle_language === 'es' ? 'es' : 'en',
        nickname: data.nickname || null
      };
    }
  } catch {
    // Non-blocking
  }

  // 2. Fallback to movies.bible.viewerPreferences
  try {
    let query = supabase.from('movies').select('bible').in('status', ['streaming', 'paused']);
    if (movieId) {
      query = supabase.from('movies').select('bible').eq('id', movieId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }
    const { data } = await query.maybeSingle();
    const pref = (data as any)?.bible?.viewerPreferences?.[userId];
    if (pref) {
      return {
        subtitlesEnabled: pref.subtitlesEnabled !== false,
        subtitleLanguage: pref.subtitleLanguage === 'es' ? 'es' : 'en',
        nickname: pref.nickname || null
      };
    }
  } catch {
    // Non-blocking
  }

  return { subtitlesEnabled: true, subtitleLanguage: 'en', nickname: null };
}

/**
 * Persist a contact form message to Supabase
 */
export async function persistContactMessage(msg: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<{ success: boolean; data?: ContactMessage; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, error: 'Database client unavailable' };
  }

  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name: msg.name.trim(),
        email: msg.email.trim(),
        subject: msg.subject?.trim() || 'General Inquiry',
        message: msg.message.trim(),
        status: 'unread',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logSupabaseError('persistContactMessage', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ContactMessage };
  } catch (err: any) {
    console.error('[Supabase] Exception in persistContactMessage:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Load contact form messages from Supabase
 */
export async function loadContactMessages(options?: {
  status?: string;
  limit?: number;
}): Promise<ContactMessage[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    let query = supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      logSupabaseError('loadContactMessages', error);
      return [];
    }

    return (data || []) as ContactMessage[];
  } catch (err) {
    console.error('[Supabase] Exception in loadContactMessages:', err);
    return [];
  }
}

/**
 * Update a contact message status (e.g. 'read', 'unread', 'archived')
 */
export async function updateContactMessageStatus(
  id: string,
  status: 'unread' | 'read' | 'archived'
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', id);

    if (error) {
      logSupabaseError('updateContactMessageStatus', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception in updateContactMessageStatus:', err);
    return false;
  }
}

/**
 * Delete a contact message from Supabase
 */
export async function deleteContactMessage(id: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      logSupabaseError('deleteContactMessage', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception in deleteContactMessage:', err);
    return false;
  }
}