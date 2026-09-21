import { CINEMATIC_MOCK_VIDEOS, isVideoGenerationPaused } from './video-common';
import type { VideoGenerationParams, VideoGenerationResult, DualShotVideoParams, DualShotVideoResult, VideoResolution } from './video-common';

const MACHGEN_API_BASE = 'https://api.machgen.ai';

export function getMachgenApiKey(): string | null {
  const key = process.env.MACHGEN_API_KEY;
  if (!key || key.trim().length === 0) return null;
  return key.trim();
}

export function isMachgenConfigured(): boolean {
  return Boolean(getMachgenApiKey());
}

export function isMachgenGenerationPaused(): boolean {
  if (process.env.PAUSE_VIDEO_GENERATION === 'true') return true;
  if (typeof globalThis !== 'undefined' && Boolean((globalThis as any).__isCinemaGenerationPaused)) return true;
  return false;
}

/**
 * Consulta la cuenta de facturación y cuotas de MachGen:
 * GET /api/v0/billing/account
 */
export async function getMachgenAccount(): Promise<{
  accountId?: string;
  balanceUsd?: number;
  balanceMicros?: number;
  pendingTasks?: number;
  runningTasks?: number;
  configured: boolean;
  error?: string;
}> {
  const apiKey = getMachgenApiKey();
  if (!apiKey) {
    return { configured: false, error: 'MACHGEN_API_KEY no configurada' };
  }

  try {
    const res = await fetch(`${MACHGEN_API_BASE}/api/v0/billing/account`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { configured: true, error: `Error ${res.status}: ${errText}` };
    }

    const data = await res.json();
    const balanceMicros = typeof data.balance_micros === 'number' ? data.balance_micros : 0;
    return {
      accountId: data.account_id,
      balanceMicros,
      balanceUsd: balanceMicros / 1000000,
      pendingTasks: data.pending_tasks ?? 0,
      runningTasks: data.running_tasks ?? 0,
      configured: true
    };
  } catch (err: any) {
    return { configured: true, error: err?.message || 'Error de conexión con MachGen' };
  }
}

/**
 * Resuelve la altura en píxeles a partir de la resolución seleccionada.
 */
function resolveHeightFromResolution(res?: VideoResolution): number {
  switch (res) {
    case '480P':
      return 480;
    case '1080P':
      return 1080;
    case '768P':
    default:
      return 768;
  }
}

/**
 * Extrae el nombre canónico del modelo MachGen a partir del id seleccionado en la app.
 */
function resolveMachgenModelName(modelId?: string): string {
  if (!modelId) return 'MiniMax-H3-Turbo';
  const lower = modelId.toLowerCase();
  if (lower.includes('turbo')) {
    return 'MiniMax-H3-Turbo';
  }
  if (lower.includes('minimax-h3') || lower.includes('h3-max')) {
    return 'MiniMax-H3';
  }
  return 'MiniMax-H3-Turbo';
}

/**
 * Sondea la tarea en MachGen periódicamente hasta su conclusión o fallo:
 * GET /api/v0/tasks/{task_id}
 */
async function pollMachgenTask(
  taskId: string,
  apiKey: string,
  maxWaitSeconds: number = 180
): Promise<{ videoUrl: string; thumbnailUrl?: string }> {
  const pollIntervalMs = 2000;
  const maxAttempts = Math.ceil((maxWaitSeconds * 1000) / pollIntervalMs);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const res = await fetch(`${MACHGEN_API_BASE}/api/v0/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Tarea MachGen "${taskId}" no encontrada (404)`);
      }
      const errText = await res.text().catch(() => '');
      console.warn(`[MachGen] Intento ${attempt}: Polling status ${res.status}: ${errText}`);
      continue;
    }

    const data = await res.json();
    const status = data.status;

    if (status === 'COMPLETED') {
      const rawVideo = data.task_output?.video;
      const rawThumb = data.task_output?.image || data.task_output?.thumbnail;

      // MachGen retorna URLs tipo https://api.machgen.ai/api/v0/assets/{task_id} que
      // requieren autenticación Bearer para descargarse. Por ello, redirigimos la URL
      // al proxy interno /api/cinema/machgen/asset?id={task_id} para que el reproductor HTML5
      // y Safari/Chrome puedan hacer streaming con cabeceras Range sin problemas.
      const resolvedVideoUrl = `/api/cinema/machgen/asset?id=${encodeURIComponent(taskId)}`;
      const resolvedThumbUrl = rawThumb || '';

      console.log(`[MachGen] ✅ Tarea ${taskId} completada exitosamente.`);
      return {
        videoUrl: resolvedVideoUrl,
        thumbnailUrl: resolvedThumbUrl
      };
    }

    if (status === 'FAILED') {
      const reason = data.error_msg || data.detail || 'Fallo desconocido en la síntesis';
      throw new Error(`MachGen falló en generar el video: ${reason}`);
    }

    // PENDING o RUNNING -> continuar sondeando
    if (attempt % 5 === 0) {
      console.log(`[MachGen] Generando video para ${taskId}... Estado: ${status} (intento ${attempt}/${maxAttempts})`);
    }
  }

  throw new Error(`Tiempo de espera agotado (${maxWaitSeconds}s) esperando a MachGen para la tarea ${taskId}`);
}

/**
 * Selecciona un video generado archivado del orquestador si la generación está pausada.
 */
async function pickRandomArchivedGeneratedVideo(): Promise<{ videoUrl: string; thumbnailUrl?: string } | null> {
  try {
    const orchestrator = (globalThis as any)?.__cinemaOrchestratorInstance;
    if (orchestrator && typeof orchestrator.pickRandomArchivedVideo === 'function') {
      const pick = await orchestrator.pickRandomArchivedVideo();
      if (pick && pick.videoUrl) return pick;
    }
  } catch (err) {
    console.warn('[MachGen] No se pudo seleccionar un video generado archivado:', err);
  }
  return null;
}

/**
 * Sintetiza un clip de video individual utilizando la API de MachGen (MiniMax H3 Turbo).
 */
export async function generateVideoWithMachgen({
  prompt,
  cameraMotion,
  stepNumber,
  duration = 5,
  previousVideoUrl,
  propReferenceImages = [],
  voiceDirection = "",
  dialogueSnippet = "",
  model = 'machgen/minimax-h3-turbo/text-to-video',
  resolution,
  firstFrameUrl,
  lastFrameUrl,
  startFrameUrl,
  endFrameUrl
}: VideoGenerationParams): Promise<VideoGenerationResult> {
  const apiKey = getMachgenApiKey();
  const height = resolveHeightFromResolution(resolution);
  const machgenModel = resolveMachgenModelName(model);

  const initialFirstFrame = firstFrameUrl || startFrameUrl;
  const initialLastFrame = lastFrameUrl || endFrameUrl;

  // Verificación de pausa de créditos
  if (isMachgenGenerationPaused() || isVideoGenerationPaused()) {
    const archived = await pickRandomArchivedGeneratedVideo();
    if (archived) {
      console.log(`[MachGen] 🛡️ Generación PAUSADA: Reproduciendo video generado archivado para el paso ${stepNumber}.`);
      return {
        videoUrl: archived.videoUrl,
        thumbnailUrl: archived.thumbnailUrl || "",
        isRealAiGenerated: false,
        modelUsed: `${model} (Archivo - Modo Pausa)`,
        resolution: `${height}P`,
        aspectRatio: '16:9',
        previousVideoReference: previousVideoUrl,
        propImagesReferences: propReferenceImages,
        firstFrameReference: initialFirstFrame,
        lastFrameReference: initialLastFrame
      };
    }

    console.log(`[MachGen] 🛡️ Generación PAUSADA: Retornando clip simulado para el paso ${stepNumber}.`);
    const mockIndex = Math.abs((stepNumber || 1) - 1) % CINEMATIC_MOCK_VIDEOS.length;
    const mock = CINEMATIC_MOCK_VIDEOS[mockIndex];
    return {
      videoUrl: mock.url,
      thumbnailUrl: mock.poster,
      isRealAiGenerated: false,
      modelUsed: `${model} (Simulador - Modo Pausa)`,
      resolution: `${height}P`,
      aspectRatio: '16:9',
      previousVideoReference: previousVideoUrl,
      propImagesReferences: propReferenceImages,
      firstFrameReference: initialFirstFrame,
      lastFrameReference: initialLastFrame
    };
  }

  // Si no hay API key de MachGen configurada, responder en modo simulador
  if (!apiKey) {
    console.log(`[MachGen] ℹ️ Clave MACHGEN_API_KEY no configurada. Retornando clip cinematográfico simulado para el paso ${stepNumber}.`);
    const mockIndex = Math.abs((stepNumber || 1) - 1) % CINEMATIC_MOCK_VIDEOS.length;
    const mock = CINEMATIC_MOCK_VIDEOS[mockIndex];
    return {
      videoUrl: mock.url,
      thumbnailUrl: mock.poster,
      isRealAiGenerated: false,
      modelUsed: `${model} (Simulador)`,
      resolution: `${height}P`,
      aspectRatio: '16:9',
      previousVideoReference: previousVideoUrl,
      propImagesReferences: propReferenceImages,
      firstFrameReference: initialFirstFrame,
      lastFrameReference: initialLastFrame
    };
  }

  // Construcción contextual del prompt cinematográfico
  let dialogueContext = "";
  if (dialogueSnippet && dialogueSnippet.trim().length > 0) {
    dialogueContext = ` Characters actively speak and engage: "${dialogueSnippet.trim()}". Rapid natural conversational cadence with synced lip movements.`;
  }

  let voiceContext = "";
  if (voiceDirection) {
    voiceContext = ` Sound design: ${voiceDirection}.`;
  }

  const cameraContext = cameraMotion ? ` Camera motion: ${cameraMotion}.` : '';
  const aestheticContext = ' 35mm anamorphic cinematography, organic film grain, photorealistic cinema render, 24fps motion blur.';

  // Determinar tipo de tarea MachGen: T2V vs R2V vs I2V (con First Frame y Last Frame / FF LF)
  const isRefModel = model.includes('reference-to-video');
  const isImageModel = model.includes('image-to-video');
  const isFfLfModel = model.includes('first-last-frame') || model.includes('f2f') || model.includes('ff-lf');

  const resolvedFirstFrame = firstFrameUrl || startFrameUrl;
  const resolvedLastFrame = lastFrameUrl || endFrameUrl;

  let taskType: 'T2V' | 'I2V' | 'R2V' = 'T2V';
  const srcImageUrls: string[] = [];
  const srcVideoUrls: string[] = [];
  const subjectToImageIds: Record<string, number[]> = {};
  const subjectToVideoIds: Record<string, number[]> = {};
  const promptReferences: string[] = [];
  let keyframeIndices: number[] = [];

  // 1. Soporte explícito para First Frame (FF) y Last Frame (LF) o modelos I2V / FF+LF
  if (resolvedFirstFrame && resolvedLastFrame) {
    taskType = 'I2V';
    srcImageUrls.push(resolvedFirstFrame, resolvedLastFrame);
    keyframeIndices = [0, -1];
  } else if (resolvedFirstFrame && !resolvedLastFrame) {
    taskType = 'I2V';
    srcImageUrls.push(resolvedFirstFrame);
    keyframeIndices = [0];
  } else if (!resolvedFirstFrame && resolvedLastFrame) {
    taskType = 'I2V';
    srcImageUrls.push(resolvedLastFrame);
    keyframeIndices = [-1];
  } else if (isFfLfModel) {
    // Modelo FF+LF seleccionado: si hay referencias en propReferenceImages, usarlas como frames
    if (propReferenceImages && propReferenceImages.length >= 2) {
      taskType = 'I2V';
      srcImageUrls.push(propReferenceImages[0], propReferenceImages[1]);
      keyframeIndices = [0, -1];
    } else if (propReferenceImages && propReferenceImages.length === 1) {
      taskType = 'I2V';
      srcImageUrls.push(propReferenceImages[0]);
      keyframeIndices = [0];
    } else {
      taskType = 'T2V';
    }
  } else if (isImageModel) {
    // Modelo I2V convencional (First Frame)
    if (propReferenceImages && propReferenceImages.length > 0 && /^https?:\/\//i.test(propReferenceImages[0])) {
      taskType = 'I2V';
      srcImageUrls.push(propReferenceImages[0]);
      keyframeIndices = [0];
    } else {
      taskType = 'T2V';
    }
  } else if (isRefModel) {
    // Mapear referencias para R2V cuando estén disponibles y el modelo lo soporte
    // 1. Video previo como referencia de continuidad (R2V en MachGen acepta URLs públicas)
    if (previousVideoUrl && /^https?:\/\//i.test(previousVideoUrl) && !previousVideoUrl.startsWith('/api/')) {
      srcVideoUrls.push(previousVideoUrl);
      subjectToVideoIds['prev_clip'] = [0];
      promptReferences.push('visual continuation matching @prev_clip');
    }

    // 2. Imágenes de utilería (props) como referencias de consistencia
    if (propReferenceImages && propReferenceImages.length > 0) {
      propReferenceImages.forEach((img) => {
        if (img && /^https?:\/\//i.test(img) && srcImageUrls.length < 5) {
          const index = srcImageUrls.length;
          const handle = `prop_${index + 1}`;
          srcImageUrls.push(img);
          subjectToImageIds[handle] = [index];
          promptReferences.push(`scene elements identical to @${handle}`);
        }
      });
    }

    // En MachGen, R2V exige al menos 1 imagen o 1 video en las fuentes.
    if (srcVideoUrls.length > 0 || srcImageUrls.length > 0) {
      taskType = 'R2V';
    } else {
      taskType = 'T2V';
    }
  } else {
    taskType = 'T2V';
  }

  // Si usamos R2V, MachGen exige que todos los @handles del prompt coincidan con los mapeados
  let refPrefix = '';
  if (taskType === 'R2V' && promptReferences.length > 0) {
    refPrefix = `Using ${promptReferences.join(' and ')}, `;
  }

  const completePrompt = `${refPrefix}${prompt}.${dialogueContext}${voiceContext}${cameraContext}${aestheticContext}`.trim();

  // Duración segura: MiniMax H3 soporta 5s (y 10s en algunas variantes). Usamos 5 por defecto.
  const effectiveDuration = Math.min(Math.max(duration || 5, 5), 10);

  const payload: Record<string, any> = {
    prompt: completePrompt,
    model: machgenModel,
    task_type: taskType,
    video_config: {
      duration_secs: effectiveDuration,
      height,
      aspect_ratio: '16:9'
    }
  };

  if (taskType === 'R2V') {
    if (srcImageUrls.length > 0) {
      payload.src_image_urls = srcImageUrls;
      payload.subject_to_image_ids = subjectToImageIds;
    }
    if (srcVideoUrls.length > 0) {
      payload.src_video_urls = srcVideoUrls;
      payload.subject_to_video_ids = subjectToVideoIds;
    }
  } else if (taskType === 'I2V' && srcImageUrls.length > 0) {
    payload.src_image_urls = srcImageUrls;
    if (keyframeIndices.length > 0) {
      payload.keyframe_indices = keyframeIndices;
    }
  }

  console.log(`[MachGen] Enviando tarea ${taskType} para el paso ${stepNumber} con modelo ${machgenModel}...`);

  try {
    const submitRes = await fetch(`${MACHGEN_API_BASE}/api/v0/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => '');
      console.error(`[MachGen] Error HTTP ${submitRes.status} al crear tarea: ${errText}`);

      // Pausa de protección si se agotan los fondos
      if (
        submitRes.status === 402 ||
        errText.toLowerCase().includes('payment') ||
        errText.toLowerCase().includes('credit') ||
        errText.toLowerCase().includes('balance') ||
        errText.toLowerCase().includes('insufficient')
      ) {
        console.warn('[MachGen] ⚠️ Fondos insuficientes en MachGen. Activando pausa automática de protección.');
        if (typeof globalThis !== 'undefined') {
          (globalThis as any).__isCinemaGenerationPaused = true;
          if ((globalThis as any).__cinemaOrchestratorInstance) {
            (globalThis as any).__cinemaOrchestratorInstance.pauseGeneration();
          }
        }
      }

      throw new Error(`MachGen API error (${submitRes.status}): ${errText}`);
    }

    const submitData = await submitRes.json();
    const taskId = submitData.task_id;

    if (!taskId) {
      throw new Error('MachGen no devolvió un task_id válido');
    }

    console.log(`[MachGen] Tarea aceptada con task_id: ${taskId}. Iniciando sondeo...`);
    const completed = await pollMachgenTask(taskId, apiKey);

    return {
      videoUrl: completed.videoUrl,
      thumbnailUrl: completed.thumbnailUrl || '',
      isRealAiGenerated: true,
      modelUsed: `${model} (${machgenModel})`,
      resolution: `${height}P`,
      aspectRatio: '16:9',
      previousVideoReference: previousVideoUrl,
      propImagesReferences: propReferenceImages,
      firstFrameReference: resolvedFirstFrame || (srcImageUrls.length > 0 ? srcImageUrls[0] : undefined),
      lastFrameReference: resolvedLastFrame || (keyframeIndices.includes(-1) ? srcImageUrls[srcImageUrls.length - 1] : undefined)
    };
  } catch (error: any) {
    console.error(`[MachGen] Error en generación para paso ${stepNumber}:`, error?.message || error);

    // Si falló R2V o I2V por error en URL de video previa o frames, reintentamos una vez con T2V
    if ((taskType === 'R2V' || taskType === 'I2V') && !payload.__retried) {
      console.log(`[MachGen] 🔄 Reintentando como Text-to-Video (T2V) puro tras fallo en ${taskType}...`);
      return generateVideoWithMachgen({
        prompt,
        cameraMotion,
        stepNumber,
        duration,
        voiceDirection,
        dialogueSnippet,
        model: 'machgen/minimax-h3-turbo/text-to-video',
        resolution
      });
    }

    // Fallback a clip simulado/archivado para garantizar que la experiencia interactiva nunca se corte
    const archived = await pickRandomArchivedGeneratedVideo();
    if (archived) {
      return {
        videoUrl: archived.videoUrl,
        thumbnailUrl: archived.thumbnailUrl || "",
        isRealAiGenerated: false,
        modelUsed: `${model} (Fallback Archivo)`,
        resolution: `${height}P`,
        aspectRatio: '16:9',
        previousVideoReference: previousVideoUrl,
        propImagesReferences: propReferenceImages,
        firstFrameReference: resolvedFirstFrame,
        lastFrameReference: resolvedLastFrame
      };
    }

    const mockIndex = Math.abs((stepNumber || 1) - 1) % CINEMATIC_MOCK_VIDEOS.length;
    const mock = CINEMATIC_MOCK_VIDEOS[mockIndex];
    return {
      videoUrl: mock.url,
      thumbnailUrl: mock.poster,
      isRealAiGenerated: false,
      modelUsed: `${model} (Fallback Simulador)`,
      resolution: `${height}P`,
      aspectRatio: '16:9',
      previousVideoReference: previousVideoUrl,
      propImagesReferences: propReferenceImages,
      firstFrameReference: resolvedFirstFrame,
      lastFrameReference: resolvedLastFrame
    };
  }
}

/**
 * Genera dos planos continuos de video en paralelo con MachGen.
 * Shot 1: Inicio / Acción principal (con First Frame y Last Frame opcionales)
 * Shot 2: Continuación / Clímax dramático (conectado opcionalmente con el Last Frame de Shot 1)
 */
export async function generateDualShotVideoWithMachgen({
  prompt1,
  cameraMotion1,
  prompt2,
  cameraMotion2,
  stepNumber,
  previousVideoUrl,
  propReferenceImages = [],
  voiceDirection = "",
  dialogue1 = "",
  dialogue2 = "",
  model = 'machgen/minimax-h3-turbo/text-to-video',
  resolution,
  firstFrameUrl1,
  lastFrameUrl1,
  firstFrameUrl2,
  lastFrameUrl2
}: DualShotVideoParams): Promise<DualShotVideoResult> {
  const p2 = prompt2 || `Direct continuous second-half follow-through: ${prompt1}. Unbroken cinematic continuity.`;
  const cm2 = cameraMotion2 || "Fast-paced cinematic camera tracking continuing the motion trajectory, 24fps kinetic motion blur";

  // Continuidad fluida FF/LF: Si el plano 1 tiene lastFrame (LF), el plano 2 puede iniciarse con ese frame (FF)
  const effectiveFirstFrame2 = firstFrameUrl2 || lastFrameUrl1;

  console.log(`[MachGen] 🚀 Despachando 2 planos en paralelo a MachGen para el paso ${stepNumber}...`);

  const [shot1Res, shot2Res] = await Promise.all([
    generateVideoWithMachgen({
      prompt: prompt1,
      cameraMotion: cameraMotion1,
      stepNumber,
      previousVideoUrl,
      propReferenceImages,
      voiceDirection,
      dialogueSnippet: dialogue1,
      model,
      resolution,
      firstFrameUrl: firstFrameUrl1,
      lastFrameUrl: lastFrameUrl1
    }),
    generateVideoWithMachgen({
      prompt: p2,
      cameraMotion: cm2,
      stepNumber: stepNumber + 1,
      previousVideoUrl,
      propReferenceImages,
      voiceDirection,
      dialogueSnippet: dialogue2 || dialogue1,
      model,
      resolution,
      firstFrameUrl: effectiveFirstFrame2,
      lastFrameUrl: lastFrameUrl2
    })
  ]);

  return {
    videoUrl1: shot1Res.videoUrl,
    thumbnailUrl1: shot1Res.thumbnailUrl,
    videoUrl2: shot2Res.videoUrl,
    thumbnailUrl2: shot2Res.thumbnailUrl,
    shot1: { videoUrl: shot1Res.videoUrl, thumbnailUrl: shot1Res.thumbnailUrl },
    shot2: { videoUrl: shot2Res.videoUrl, thumbnailUrl: shot2Res.thumbnailUrl },
    isRealAiGenerated: Boolean(shot1Res.isRealAiGenerated || shot2Res.isRealAiGenerated),
    modelUsed: shot1Res.modelUsed,
    resolution: shot1Res.resolution
  };
}
