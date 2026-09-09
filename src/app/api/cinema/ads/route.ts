import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';

export async function GET() {
  const ads = cinemaEngine.getAds();
  return NextResponse.json({
    ads,
    adsConfig: cinemaEngine.adsConfig,
    activeAd: cinemaEngine.activeAd
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, adId, ad, config, metric } = body;

    if (action === 'trigger_ad') {
      const success = await cinemaEngine.triggerManualAdBreak(adId);
      return NextResponse.json({ success, activeAd: cinemaEngine.activeAd });
    }

    if (action === 'update_config' && config) {
      cinemaEngine.updateAdsConfig(config);
      return NextResponse.json({ success: true, adsConfig: cinemaEngine.adsConfig });
    }

    if (action === 'save_ad' && ad) {
      await cinemaEngine.addOrUpdateAd(ad);
      return NextResponse.json({ success: true, ads: cinemaEngine.getAds() });
    }

    if (action === 'delete_ad' && adId) {
      await cinemaEngine.deleteAd(adId);
      return NextResponse.json({ success: true, ads: cinemaEngine.getAds() });
    }

    if (action === 'track_interaction' && adId && metric) {
      cinemaEngine.recordAdInteraction(adId, metric);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción de anuncios no reconocida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en el servidor de anuncios' }, { status: 500 });
  }
}
