import { NextRequest, NextResponse } from 'next/server';
import { getMachgenApiKey } from '@/lib/machgen-video';

const MACHGEN_API_BASE = 'https://api.machgen.ai';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id || !/^[a-zA-Z0-9_\-]+$/.test(id)) {
    return NextResponse.json(
      { error: 'Parámetro id inválido o faltante' },
      { status: 400 }
    );
  }

  const apiKey = getMachgenApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'MACHGEN_API_KEY no está configurada en el servidor' },
      { status: 401 }
    );
  }

  try {
    const upstreamUrl = `${MACHGEN_API_BASE}/api/v0/assets/${encodeURIComponent(id)}`;
    const upstreamHeaders: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`
    };

    // Reenviar cabecera Range para permitir buffering y rebobinado (seeking) en <video>
    const clientRange = req.headers.get('range');
    if (clientRange) {
      upstreamHeaders['range'] = clientRange;
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: upstreamHeaders
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Error desde MachGen: ${upstreamRes.statusText}`, detail: errText },
        { status: upstreamRes.status }
      );
    }

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'video/mp4');

    if (upstreamRes.headers.has('content-length')) {
      resHeaders.set('Content-Length', upstreamRes.headers.get('content-length')!);
    }
    if (upstreamRes.headers.has('content-range')) {
      resHeaders.set('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    resHeaders.set('Accept-Ranges', upstreamRes.headers.get('accept-ranges') || 'bytes');
    resHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders
    });
  } catch (err: any) {
    console.error(`[MachGen Asset Proxy] Error sirviendo asset ${id}:`, err);
    return NextResponse.json(
      { error: 'Error interno sirviendo el video de MachGen', message: err?.message },
      { status: 502 }
    );
  }
}
