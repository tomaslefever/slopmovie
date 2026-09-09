import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';

export async function GET() {
  return NextResponse.json({
    messages: cinemaEngine.chatMessages.slice(-50)
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userName, text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
    }

    const newMessage = {
      id: `chat_${Date.now()}_${Math.random()}`,
      userId: userId || 'user_anon',
      userName: userName || 'Espectador',
      text: text.trim().slice(0, 300),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    cinemaEngine.addChatMessage(newMessage);

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
