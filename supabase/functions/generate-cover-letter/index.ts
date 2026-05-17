import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import { COVER_LETTER_PROMPT, COVER_LETTER_SCHEMA } from "@resumetailor/ai-pipeline"
import * as Sentry from "npm:@sentry/deno"
import { checkRateLimit } from "../_shared/rate-limit.ts"

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  tracesSampleRate: 1.0,
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tailored_resume_id, user_id } = await req.json()

    if (!tailored_resume_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tailored_resume_id, user_id", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check credits
    const { data: credits, error: usageError } = await supabase
      .from('usage_credits')
      .select('credits_remaining, plan')
      .eq('user_id', user_id)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      throw new Error('Failed to verify usage credits')
    }

    if (!credits || credits.credits_remaining <= 0) {
      const dashboardUrl = Deno.env.get('DASHBOARD_URL') || 'http://localhost:3000'
      return new Response(
        JSON.stringify({ 
          error: 'No credits remaining',
          code: 'CREDITS_EXHAUSTED',
          upgrade_url: `${dashboardUrl}/billing`
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate Limiting
    const { allowed } = await checkRateLimit(supabase, user_id, 'generate-cover-letter', 10, 3600);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait an hour.", code: "RATE_LIMIT_EXCEEDED" }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch tailored resume record to get jd_analysis and base_resume_id
    const { data: tailoredRecord, error: tailoredError } = await supabase
      .from('tailored_resumes')
      .select('base_resume_id, jd_analysis, diff_json')
      .eq('id', tailored_resume_id)
      .single()

    if (tailoredError || !tailoredRecord) {
      throw new Error("Tailored resume not found")
    }

    // Fetch base resume for full experience details
    const { data: baseRecord, error: baseError } = await supabase
      .from('resumes')
      .select('parsed_json')
      .eq('id', tailoredRecord.base_resume_id)
      .single()

    if (baseError || !baseRecord) {
      throw new Error("Base resume not found")
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: COVER_LETTER_SCHEMA as never
      }
    })

    const promptText = `
${COVER_LETTER_PROMPT}

JOB DESCRIPTION ANALYSIS:
${JSON.stringify(tailoredRecord.jd_analysis, null, 2)}

CANDIDATE EXPERIENCE:
${JSON.stringify((baseRecord.parsed_json as Record<string, unknown>).sections, null, 2)}
`

    const result = await model.generateContent(promptText)
    const coverLetterJson = JSON.parse(result.response.text())

    // Save to DB
    const { error: dbError } = await supabase
      .from('tailored_resumes')
      .update({ cover_letter_json: coverLetterJson })
      .eq('id', tailored_resume_id)

    if (dbError) throw dbError

    // Decrement credit
    await supabase
      .from('usage_credits')
      .update({ credits_remaining: credits.credits_remaining - 1 })
      .eq('user_id', user_id)

    return new Response(
      JSON.stringify({ cover_letter: coverLetterJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[generate-cover-letter] Error:', errorMessage)
    Sentry.captureException(error)
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR", failedAt: "generate_cover_letter_execution" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
