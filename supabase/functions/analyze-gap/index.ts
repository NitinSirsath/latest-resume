import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import { ANALYZE_GAP_PROMPT, GAP_REPORT_SCHEMA } from "@resumetailor/ai-pipeline"
import * as Sentry from "npm:@sentry/deno"

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN'), tracesSampleRate: 1.0 })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { resume_json, jd_analysis, tailored_resume_id } = await req.json()

    if (!resume_json || !jd_analysis || !tailored_resume_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: resume_json, jd_analysis, tailored_resume_id", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    
    // 1. Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: GAP_REPORT_SCHEMA as any
      }
    })

    // 3. Call Gemini
    const prompt = `${ANALYZE_GAP_PROMPT}\n\nRESUME JSON:\n${JSON.stringify(resume_json)}\n\nJOB ANALYSIS:\n${JSON.stringify(jd_analysis)}`
    const result = await model.generateContent(prompt)
    const gapReport = JSON.parse(result.response.text())

    // 4. Update Database
    const { error: dbError } = await supabase
      .from('tailored_resumes')
      .update({
        ats_score: gapReport.ats_score_estimate,
      })
      .eq('id', tailored_resume_id)

    if (dbError) throw dbError

    return new Response(
      JSON.stringify(gapReport),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: unknown) {
    console.error('[analyze-gap] Error:', error)
    Sentry.captureException(error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
