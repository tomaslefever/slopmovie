import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';
import { loadTopVotedCommentsFromDb, loadUserVotedCommentIdsFromDb } from '@/lib/supabase/db';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cookieStore = await cookies();
  const userId = searchParams.get('userId') || cookieStore.get('kinetic_viewer_id')?.value;

  const movieId = cinemaEngine.movie?.id;
  const topVotedFromDb = movieId ? await loadTopVotedCommentsFromDb(movieId, 15) : [];

  // Fallback or merge with in-memory top voted comments
  const topVoted = topVotedFromDb.length > 0
    ? topVotedFromDb
    : cinemaEngine.chatMessages
        .filter(m => !m.isSystem && (m.votesCount || 0) > 0)
        .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0))
        .slice(0, 15);

  let userVotedIds: string[] = [];
  if (userId) {
    userVotedIds = await loadUserVotedCommentIdsFromDb(userId, movieId);
    // Also include in-memory votes
    for (const [cId, voters] of cinemaEngine.commentVotes.entries()) {
      if (voters.has(userId) && !userVotedIds.includes(cId)) {
        userVotedIds.push(cId);
      }
    }
  }

  const messages = cinemaEngine.chatMessages.slice(-50).map(m => ({
    ...m,
    hasUserVoted: userId ? userVotedIds.includes(m.id) : false
  }));

  return NextResponse.json({
    messages,
    topVoted: topVoted.map(m => ({
      ...m,
      hasUserVoted: userId ? userVotedIds.includes(m.id) : false
    })),
    userVotedIds
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, userName, text, commentId } = body;

    // Handle comment upvoting
    if (action === 'vote_comment') {
      if (!commentId || !userId) {
        return NextResponse.json({ error: 'commentId and userId are required' }, { status: 400 });
      }

      const result = await cinemaEngine.voteComment(commentId, userId);
      return NextResponse.json(result);
    }

    // Handle new chat comment
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
    }

    const trimmedUser = typeof userName === 'string' ? userName.trim() : '';
    if (!trimmedUser || trimmedUser.length < 2 || trimmedUser.startsWith('Viewer_') || trimmedUser === 'Espectador') {
      return NextResponse.json({ error: 'Para chatear es necesario usar un nickname' }, { status: 400 });
    }

    const newMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId: userId || `anon_${Date.now()}`,
      userName: trimmedUser.slice(0, 30),
      text: text.trim().slice(0, 300),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now(),
      votesCount: 0
    };

    cinemaEngine.addChatMessage(newMessage);

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
