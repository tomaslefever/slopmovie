import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'guest';

  // If no movie is initialized yet, try restoring from Supabase or spin up a new movie
  if (!cinemaEngine.movie) {
    const restored = await cinemaEngine.restoreFromDatabase();
    if (!restored) {
      await cinemaEngine.initializeMovie();
    }
  }

  const state = cinemaEngine.getState(userId);
  return NextResponse.json({
    ...state,
    chatMessages: cinemaEngine.chatMessages.slice(-50)
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, userName, optionId, prompt } = body;

    if (action === 'vote') {
      if (!optionId || !['A', 'B'].includes(optionId)) {
        return NextResponse.json({ error: 'Opción de voto inválida' }, { status: 400 });
      }

      const voteResult = cinemaEngine.castVote(userId || 'anonymous', optionId, userName);
      return NextResponse.json({
        success: voteResult.success,
        votesA: voteResult.votesA,
        votesB: voteResult.votesB,
        userVoted: optionId
      });
    }

    if (action === 'init') {
      const newMovie = await cinemaEngine.initializeMovie(prompt);
      return NextResponse.json({
        success: true,
        movie: newMovie
      });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en el servidor' }, { status: 500 });
  }
}
