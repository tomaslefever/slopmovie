import { 
  resolveVideoModel, 
  VIDEO_MODEL_OPTIONS, 
  isRealGeneratedVideoUrl, 
  DEFAULT_VIDEO_MODEL 
} from '../src/lib/fal-video.ts';
import { 
  generateVideoWithMachgen, 
  generateDualShotVideoWithMachgen, 
  isMachgenConfigured,
  getMachgenApiKey
} from '../src/lib/machgen-video.ts';

console.log('🧪 Iniciando verificación del proveedor MachGen MiniMax H3 Turbo...\n');

// 1. Verificación de resolución de modelos
console.log('1. Verificando resolución de modelos y alias:');
const testModels = [
  'machgen/minimax-h3-turbo/text-to-video',
  'machgen/minimax-h3-turbo/reference-to-video',
  'machgen/minimax-h3-turbo/image-to-video',
  'machgen/minimax-h3-turbo/first-last-frame',
  'machgen/minimax-h3-turbo/f2f',
  'machgen/minimax-h3-turbo/ff-lf',
  'machgen/f2f',
  'machgen/minimax-h3/text-to-video',
  'machgen/minimax-h3/reference-to-video',
  'machgen/minimax-h3-turbo',
  'machgen/minimax-h3',
  'machgen'
];

for (const m of testModels) {
  const resolved = resolveVideoModel(m);
  console.log(`  - Modelo "${m}" -> Resuelto a: "${resolved}"`);
  if (!resolved) {
    throw new Error(`Fallo al resolver modelo "${m}"`);
  }
}
console.log('  ✅ Todos los modelos y alias se resolvieron correctamente.\n');

// 2. Verificación de opciones de modelo
console.log('2. Verificando opciones en VIDEO_MODEL_OPTIONS:');
const machgenOptions = VIDEO_MODEL_OPTIONS.filter(o => o.id.startsWith('machgen/'));
console.log(`  - Opciones de MachGen registradas: ${machgenOptions.length}`);
machgenOptions.forEach(o => {
  console.log(`    • ${o.id}: [${o.kind}] - ${o.label} (Provider: ${o.provider})`);
});
if (machgenOptions.length < 6) {
  throw new Error('Se esperaban al menos 6 opciones de MachGen incluyendo First & Last Frame');
}
console.log('  ✅ Opciones de MachGen registradas correctamente.\n');

// 3. Verificación de reconocimiento de URLs generadas
console.log('3. Verificando isRealGeneratedVideoUrl:');
const testUrls = [
  { url: '/api/cinema/machgen/asset?id=t-12345', expected: true },
  { url: 'https://api.machgen.ai/api/v0/assets/t-abc123.mp4', expected: true },
  { url: 'https://v3.fal.media/files/monkey/abc.mp4', expected: true },
  { url: 'https://example.com/random-image.jpg', expected: false },
  { url: '', expected: false }
];

for (const item of testUrls) {
  const result = isRealGeneratedVideoUrl(item.url);
  console.log(`  - URL: "${item.url}" -> ${result} (Esperado: ${item.expected})`);
  if (result !== item.expected) {
    throw new Error(`Resultado inesperado para URL: ${item.url}`);
  }
}
console.log('  ✅ Reconocimiento de URLs válido.\n');

// 4. Verificación de generación en modo simulador/fallback (sin API key)
console.log('4. Verificando generateVideoWithMachgen en modo seguro/simulación:');
const singleResult = await generateVideoWithMachgen({
  prompt: 'A cyberpunk runner sprinting across rain-slicked rooftops',
  cameraMotion: 'Rapid tracking shot',
  stepNumber: 1,
  duration: 5,
  model: 'machgen/minimax-h3-turbo/text-to-video'
});

console.log('  - Resultado videoUrl:', singleResult.videoUrl);
console.log('  - Modelo utilizado:', singleResult.modelUsed);
console.log('  - Resolución:', singleResult.resolution);
if (!singleResult.videoUrl) {
  throw new Error('generateVideoWithMachgen no devolvió un videoUrl válido');
}
console.log('  ✅ generateVideoWithMachgen ejecutado exitosamente.\n');

// 5. Verificación de generación con First Frame y Last Frame (FF + LF / F2F)
console.log('5. Verificando generación con First Frame (FF) y Last Frame (LF):');
const fflfResult = await generateVideoWithMachgen({
  prompt: 'Transition from dawn into night over futuristic skyline',
  cameraMotion: 'Slow forward dolly',
  stepNumber: 2,
  duration: 5,
  model: 'machgen/minimax-h3-turbo/first-last-frame',
  firstFrameUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
  lastFrameUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200'
});

console.log('  - FF/LF videoUrl:', fflfResult.videoUrl);
console.log('  - FF Reference:', fflfResult.firstFrameReference);
console.log('  - LF Reference:', fflfResult.lastFrameReference);
if (!fflfResult.firstFrameReference || !fflfResult.lastFrameReference) {
  throw new Error('generateVideoWithMachgen no preservó las referencias de FF o LF');
}
console.log('  ✅ Generación FF + LF validada correctamente.\n');

// 6. Verificación de dual shot con MachGen y chaining FF/LF
console.log('6. Verificando generateDualShotVideoWithMachgen con chaining de frames:');
const dualResult = await generateDualShotVideoWithMachgen({
  prompt1: 'Opening drone shot of neon skyline',
  cameraMotion1: 'Slow boom down',
  prompt2: 'Close up on protagonist eyes reflecting city lights',
  cameraMotion2: 'Push in',
  stepNumber: 1,
  model: 'machgen/minimax-h3-turbo/first-last-frame',
  firstFrameUrl1: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
  lastFrameUrl1: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200',
  lastFrameUrl2: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200'
});

console.log('  - Shot 1 videoUrl:', dualResult.videoUrl1);
console.log('  - Shot 2 videoUrl:', dualResult.videoUrl2);
if (!dualResult.videoUrl1 || !dualResult.videoUrl2) {
  throw new Error('generateDualShotVideoWithMachgen no devolvió ambos shots');
}
console.log('  ✅ generateDualShotVideoWithMachgen con chaining ejecutado exitosamente.\n');

console.log('🎉 Todas las pruebas del proveedor MachGen MiniMax H3 Turbo concluyeron exitosamente!');
