import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function initSupabaseBrowserClient(url?: string | null, key?: string | null): SupabaseClient | null {
  if (client) return client;

  const targetUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targetKey = key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!targetUrl || !targetKey) {
    return null;
  }

  try {
    client = createClient(targetUrl, targetKey);
    return client;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize browser client:', err);
    return null;
  }
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  return initSupabaseBrowserClient();
}
