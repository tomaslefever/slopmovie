import { getSupabaseServerClient } from './server';
import { Movie, MovieStep, ChatMessage } from '@/types/cinema';

export function isSupabaseConfigured(): boolean {
  return getSupabaseServerClient() !== null;
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
      created_at: movie.createdAt,
      completed_at: movie.completedAt || null,
    }, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase] Error persisting movie:', error.message);
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistMovie:', err);
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
      new_prop: step.newProp || null,
      new_character: step.newCharacter || null,
      reference_video_url: step.referenceVideoUrl || null,
      prop_reference_images: step.propReferenceImages || [],
      environment: step.environment || '',
      created_at: step.createdAt || new Date().toISOString(),
    }, { onConflict: 'movie_id,step_number' });

    if (error) {
      console.error('[Supabase] Error persisting movie step:', error.message);
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
      console.error('[Supabase] Error persisting chat message:', error.message);
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistChatMessage:', err);
  }
}

/**
 * Persist individual audience vote
 */
export async function persistAudienceVote(
  movieId: string,
  stepNumber: number,
  userId: string,
  option: 'A' | 'B',
  userName?: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('audience_votes').upsert({
      movie_id: movieId,
      step_number: stepNumber,
      user_id: userId,
      user_name: userName || null,
      selected_option: option,
      created_at: new Date().toISOString(),
    }, { onConflict: 'movie_id,step_number,user_id' });

    if (error) {
      console.error('[Supabase] Error persisting audience vote:', error.message);
    }
  } catch (err) {
    console.error('[Supabase] Exception in persistAudienceVote:', err);
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
          newProp: s.new_prop,
          newCharacter: s.new_character,
          referenceVideoUrl: s.reference_video_url,
          propReferenceImages: s.prop_reference_images,
          environment: s.environment,
          createdAt: s.created_at,
        })),
        createdAt: m.created_at,
        completedAt: m.completed_at,
        totalVotesCast: m.total_votes_cast,
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
      .eq('status', 'streaming')
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
        newProp: s.new_prop,
        newCharacter: s.new_character,
        referenceVideoUrl: s.reference_video_url,
        propReferenceImages: s.prop_reference_images,
        environment: s.environment,
        createdAt: s.created_at,
      })),
      createdAt: m.created_at,
      completedAt: m.completed_at,
      totalVotesCast: m.total_votes_cast,
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
