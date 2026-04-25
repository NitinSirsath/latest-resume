import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'

/**
 * Creates a unified Supabase client for both Web and Extension.
 * @param url Supabase project URL
 * @param key Supabase anon/public key
 * @param storage Optional custom storage (e.g., chrome.storage for extension)
 */
export function createSupabaseClient(
  url: string,
  key: string,
  storage?: any
) {
  const options: SupabaseClientOptions<"public"> = {}

  if (storage) {
    options.auth = {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }

  return createClient(url, key, options)
}
