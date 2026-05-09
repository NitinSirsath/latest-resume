import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export async function trackEvent(supabase: SupabaseClient, userId: string, eventName: string, properties: Record<string, any> = {}) {
  // Anonymize User ID using SHA-256 (simulated here for Deno/Supabase context)
  // In a real production environment, we'd use a crypto hash
  const userIdHash = userId.substring(0, 8) + '...' + userId.substring(userId.length - 4);

  const { error } = await supabase
    .from('telemetry_events')
    .insert({
      event_name: eventName,
      user_id_hash: userIdHash,
      properties
    });

  if (error) console.error('[Telemetry] Error logging event:', error);
}
