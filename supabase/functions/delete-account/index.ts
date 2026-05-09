import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "npm:stripe@14.14.0"
import { corsHeaders } from "../_shared/cors.ts"
import * as Sentry from "npm:@sentry/deno"

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  tracesSampleRate: 1.0,
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const user_id = user.id

    // Check for Stripe subscription and cancel it
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
      const { data: usage } = await supabase
        .from('usage_credits')
        .select('stripe_subscription_id, stripe_subscription_status')
        .eq('user_id', user_id)
        .single()
      
      if (usage?.stripe_subscription_id && usage.stripe_subscription_status === 'active') {
        try {
          await stripe.subscriptions.cancel(usage.stripe_subscription_id)
        } catch (err) {
          console.error(`Failed to cancel Stripe subscription for user ${user_id}:`, err)
        }
      }
    }

    // Delete from Storage
    const deleteFolder = async (bucket: string, folder: string) => {
      const { data, error } = await supabase.storage.from(bucket).list(folder)
      if (error) {
        console.error(`Failed to list bucket ${bucket} folder ${folder}:`, error)
        return
      }
      if (data && data.length > 0) {
        const filesToRemove = data.map((x) => `${folder}/${x.name}`)
        const { error: removeError } = await supabase.storage.from(bucket).remove(filesToRemove)
        if (removeError) {
          console.error(`Failed to remove files in ${bucket}/${folder}:`, removeError)
        }
      }
    }
    
    await deleteFolder('resumes', user_id)
    await deleteFolder('outputs', user_id)

    // Delete user from auth.users (cascades to other tables)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user_id)
    if (deleteUserError) {
      throw deleteUserError
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[delete-account] Error:', errorMessage)
    Sentry.captureException(error)
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR", failedAt: "delete_account_execution" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
