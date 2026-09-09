import { createClient } from '@supabase/supabase-js';
import { fal } from '@fal-ai/client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET_NAME = 'cinema-assets';

function getStorageClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * Ensure the cinema-assets bucket exists in Supabase Storage with public read access
 */
export async function ensureCinemaStorageBucket(): Promise<boolean> {
  const supabase = getStorageClient();
  if (!supabase) return false;

  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn('[Storage] Error listing buckets:', listError.message);
      return false;
    }

    const exists = buckets?.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      console.log(`[Storage] Bucket "${BUCKET_NAME}" not found. Creating public bucket...`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
      });

      if (createError) {
        console.error('[Storage] Failed to create bucket:', createError.message);
        return false;
      }
      console.log(`[Storage] Bucket "${BUCKET_NAME}" created successfully.`);
    }

    return true;
  } catch (err) {
    console.error('[Storage] Exception in ensureCinemaStorageBucket:', err);
    return false;
  }
}

/**
 * Upload an image buffer or binary to Supabase Storage and return its public URL
 */
export async function uploadImageToSupabaseStorage(
  filePath: string,
  imageBuffer: Buffer | Uint8Array,
  contentType = 'image/jpeg'
): Promise<string | null> {
  const supabase = getStorageClient();
  if (!supabase) return null;

  try {
    await ensureCinemaStorageBucket();

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, imageBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`[Storage] Upload error for ${filePath}:`, error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log(`[Storage] Asset successfully stored in Supabase: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error(`[Storage] Exception uploading ${filePath}:`, err);
    return null;
  }
}

/**
 * Generate a high-fidelity reference image for a prop and upload it directly to Supabase Storage.
 * Returns the permanent Supabase Storage public URL.
 */
export async function generateAndStorePropReferenceImage(prop: {
  id: string;
  name: string;
  visualAppearance: string;
}): Promise<string> {
  const falKey = process.env.FAL_KEY;
  const storagePath = `props/${prop.id}.jpg`;

  const isPaused = 
    process.env.PAUSE_VIDEO_GENERATION === 'true' || 
    (typeof globalThis !== 'undefined' && Boolean((globalThis as any).__isCinemaGenerationPaused));

  // If FAL_KEY is available and generation is NOT paused, synthesize a specialized reference image with Flux Schnell
  if (falKey && !isPaused) {
    try {
      fal.config({ credentials: falKey });

      const prompt = `Cinema prop reference asset: ${prop.name}. ${prop.visualAppearance}. Isolated hero object, studio product photography, dramatic rim lighting, 35mm cinematic film still, ultra-detailed textures, 8k photorealistic.`;

      console.log(`[Storage] Generating reference asset image for prop "${prop.name}" via fal Flux...`);
      const response: any = await fal.subscribe('fal-ai/flux/schnell', {
        input: {
          prompt,
          image_size: 'square_hd',
          num_inference_steps: 4,
          enable_safety_checker: true
        }
      });

      const falImageUrl = response.data?.images?.[0]?.url;
      if (falImageUrl) {
        console.log(`[Storage] Prop image generated from fal (${falImageUrl}). Downloading to store in Supabase Storage...`);
        const imgFetch = await fetch(falImageUrl);
        if (imgFetch.ok) {
          const arrayBuffer = await imgFetch.arrayBuffer();
          const supabaseUrl = await uploadImageToSupabaseStorage(
            storagePath,
            Buffer.from(arrayBuffer),
            'image/jpeg'
          );

          if (supabaseUrl) {
            return supabaseUrl;
          }
        }
      }
    } catch (err) {
      console.warn(`[Storage] Failed to generate/upload prop image via fal, falling back:`, err);
    }
  }

  // Fallback: download a curated cinematic prop image and persist it to Supabase Storage
  try {
    const fallbackSource = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
    const fallbackFetch = await fetch(fallbackSource);
    if (fallbackFetch.ok) {
      const buffer = await fallbackFetch.arrayBuffer();
      const supabaseUrl = await uploadImageToSupabaseStorage(
        storagePath,
        Buffer.from(buffer),
        'image/jpeg'
      );
      if (supabaseUrl) return supabaseUrl;
    }
  } catch (err) {
    console.warn('[Storage] Fallback storage upload failed:', err);
  }

  // Final fallback to Supabase Storage URL format if already uploaded previously
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
}
