import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "npm:stripe@14.14.0"
import * as Sentry from "npm:@sentry/deno"

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN'), tracesSampleRate: 1.0 })

serve(async (req) => {
  try {
    const signature = req.headers.get('Stripe-Signature')
    if (!signature) {
      return new Response('No signature provided', { status: 400 })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe configuration missing")
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const body = await req.text()

    let event: Stripe.Event
    try {
      // Deno Crypto backend for Stripe node package
      const cryptoProvider = Stripe.createSubtleCryptoProvider()
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[stripe-webhook] Signature verification failed:', msg)
      return new Response(`Webhook Error: ${msg}`, { status: 400 })
    }

    console.log(`[stripe-webhook] received: ${event.type}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const user_id = session.client_reference_id

        if (user_id) {
          const subscription_id = session.subscription as string | null
          
          // Fetch current credits to increment properly
          const { data: usageData, error: usageError } = await supabase
            .from('usage_credits')
            .select('credits_remaining')
            .eq('user_id', user_id)
            .single()

          if (!usageError && usageData) {
            const currentCredits = usageData.credits_remaining || 0
            const resetAt = new Date()
            resetAt.setDate(resetAt.getDate() + 30) // 30 days from now

            await supabase
              .from('usage_credits')
              .update({
                plan: 'pro',
                credits_remaining: currentCredits + 50,
                stripe_subscription_id: subscription_id,
                stripe_subscription_status: 'active',
                reset_at: resetAt.toISOString()
              })
              .eq('user_id', user_id)
          }
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await supabase
          .from('usage_credits')
          .update({
            plan: 'free',
            stripe_subscription_status: 'cancelled'
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from('usage_credits')
            .update({
              stripe_subscription_status: 'past_due'
            })
            .eq('stripe_subscription_id', invoice.subscription as string)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[stripe-webhook] Error:', errorMessage)
    Sentry.captureException(error)
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR", failedAt: "stripe_webhook_execution" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
