import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import * as Sentry from "npm:@sentry/deno"

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN'), tracesSampleRate: 1.0 })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { change_id, tailored_resume_id, accepted, user_id } = await req.json()

    if (!change_id || !tailored_resume_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: change_id, tailored_resume_id, user_id", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (accepted !== false) {
      return new Response(
        JSON.stringify({ error: "Only rejected changes require alternatives", code: "INVALID_REQUEST" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log(`[review-changes] Generating alternative for change ${change_id}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: tailoredRecord, error: dbError } = await supabase
      .from('tailored_resumes')
      .select('diff_json, jd_analysis')
      .eq('id', tailored_resume_id)
      .eq('user_id', user_id)
      .single()

    if (dbError || !tailoredRecord) {
      console.error('[review-changes] DB Error:', dbError)
      throw new Error("Tailored resume not found")
    }

    const changeLogs = tailoredRecord.diff_json?.log as Array<Record<string, unknown>> || []
    const targetChange = changeLogs.find(log => log.change_id === change_id)

    if (!targetChange) {
      throw new Error(`Change ID ${change_id} not found in log`)
    }

    const section = typeof targetChange.section === 'string' ? targetChange.section : 'unknown'
    const originalText = typeof targetChange.original === 'string' ? targetChange.original : ''
    const revisedText = typeof targetChange.changed_to === 'string' ? targetChange.changed_to : ''
    const wordCount = originalText ? originalText.split(/\s+/).length + 5 : 50

    const jdKeywords = tailoredRecord.jd_analysis?.ats_keywords || []

    const prompt = `
The user rejected this change to their ${section}.
Original: ${originalText}
Rejected suggestion: ${revisedText}
Reason it was rejected: user preferred original style

Provide ONE alternative improvement that:
- Uses different phrasing than the rejected version
- Still incorporates these keywords: ${jdKeywords.join(', ')}
- Maximum ${wordCount} words
- Returns only the alternative text, nothing else
`

    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-latest" 
    })

    const result = await model.generateContent(prompt)
    const alternativeText = result.response.text().trim()

    return new Response(
      JSON.stringify({ data: { alternative_text: alternativeText, change_id } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[review-changes] Error:', errorMessage)
    Sentry.captureException(error)
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR", failedAt: "review_changes_execution" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
