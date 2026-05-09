import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export async function checkRateLimit(supabase: SupabaseClient, userId: string, bucket: string, limit: number, windowSeconds: number) {
  // Use a simple DB table to track requests if Redis isn't available
  // For this project, we'll use a `rate_limits` table
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });

  if (error) {
    console.error('[RateLimit] Error checking:', error);
    return { allowed: true }; // Fail open to avoid blocking users on DB issues
  }

  return { allowed: data };
}
