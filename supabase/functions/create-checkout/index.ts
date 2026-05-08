import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "npm:stripe@14.14.0"
import { corsHeaders } from "../_shared/cors.ts"
import * as Sentry from "npm:@sentry/deno"

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN'), tracesSampleRate: 1.0 })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { price_id, user_id } = await req.json()

    if (!price_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: price_id, user_id", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

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
    if (authError || !user || user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured")
    }

    const dashboardUrl = Deno.env.get('DASHBOARD_URL')
    if (!dashboardUrl) {
      throw new Error("DASHBOARD_URL is not configured")
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    // Retrieve price to determine mode
    const price = await stripe.prices.retrieve(price_id)
    const mode = price.type === 'recurring' ? 'subscription' : 'payment'

    // Get or create customer
    let stripe_customer_id: string

    const { data: usageData, error: usageError } = await supabase
      .from('usage_credits')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      throw usageError
    }

    if (usageData?.stripe_customer_id) {
      stripe_customer_id = usageData.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id }
      })
      stripe_customer_id = customer.id

      const { error: updateError } = await supabase
        .from('usage_credits')
        .update({ stripe_customer_id })
        .eq('user_id', user_id)

      if (updateError) {
        throw updateError
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripe_customer_id,
      mode,
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${dashboardUrl}/billing?success=true`,
      cancel_url: `${dashboardUrl}/billing?cancelled=true`,
      client_reference_id: user_id
    })

    return new Response(
      JSON.stringify({ data: { checkout_url: session.url } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[create-checkout] Error:', errorMessage)
    Sentry.captureException(error)
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR", failedAt: "create_checkout_execution" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
