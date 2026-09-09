import { Movie, MovieStep, ChatMessage, Prop, ImmersiveAd } from '@/types/cinema';
import { getSupabaseServerClient } from './server';

export function isSupabaseConfigured(): boolean {
  return getSupabaseServerClient() !== null;
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
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('movies').upsert({
      id: movie.id,
      title: movie.title,
      genre: movie.genre,
      tagline: movie.tagline || '',
      initial_plot: movie.initialPlot || '',
      master_arc_thread: movie.masterArcThread || '',
      status: movie.status,
      current_step: movie.currentStep,
      total_steps: movie.totalSteps || 100,
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
      visual_appearance: prop.visualAppearance,
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
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      logSupabaseError('persistChatMessage', error);
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistChatMessage:', err);
  }
}

/**
 * Load completed movies from database
 */
export async function loadCompletedMoviesFromDb(): Promise<Movie[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data: movies, error } = await supabase
      .from('movies')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (error || !movies) return [];

    const result: Movie[] = [];
    for (const m of movies) {
      const { data: steps } = await supabase
        .from('movie_steps')
        .select('*')
        .eq('movie_id', m.id)
        .order('step_number', { ascending: true });

      result.push({
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
      });
    }

    return result;
  } catch (err) {
    console.error('[Supabase] Exception in loadCompletedMoviesFromDb:', err);
    return [];
  }
}

/**
 * Load latest active streaming movie from database
 */
export async function loadActiveMovieFromDb(): Promise<Movie | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { data: movies, error } = await supabase
      .from('movies')
      .select('*')
      .in('status', ['streaming', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !movies || movies.length === 0) return null;

    const m = movies[0];
    const { data: steps } = await supabase
      .from('movie_steps')
      .select('*')
      .eq('movie_id', m.id)
      .order('step_number', { ascending: true });

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
      steps: (steps || []).map(s => ({
        stepNumber: s.step_number,
        title: s.title,
        synopsis: s.synopsis,
        dialogueSnippet: s.dialogue_snippet,
        voiceDirection: s.voice_direction,
        visualPrompt: s.visual_prompt,
        cameraMotionPrompt: s.camera_motion_prompt,
        videoUrl: s.video_url,
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
  } catch (err) {
    console.error('[Supabase] Exception in loadActiveMovieFromDb:', err);
    return null;
  }
}

/**
 * Load recent chat messages for a movie
 */
export async function loadRecentChatMessagesFromDb(movieId: string, limit = 50): Promise<ChatMessage[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !messages) return [];

    return messages.map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      userName: msg.user_name,
      userAvatar: msg.user_avatar,
      text: msg.text,
      timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: msg.is_system,
      votedOption: msg.voted_option,
    }));
  } catch (err) {
    console.error('[Supabase] Exception in loadRecentChatMessagesFromDb:', err);
    return [];
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
 * Mark all currently streaming movies as 'completed' so they are
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
      .eq('status', 'streaming');

    if (error) {
      logSupabaseError('archiveAllStreamingMovies', error);
    }
  } catch (err) {
    console.error('[Supabase] Exception in archiveAllStreamingMovies:', err);
  }
}