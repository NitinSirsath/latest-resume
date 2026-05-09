import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import { INTERVIEW_PREP_PROMPT, INTERVIEW_PREP_SCHEMA } from "@resumetailor/ai-pipeline"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { tailored_resume_id } = await req.json()
    if (!tailored_resume_id) {
      return new Response(JSON.stringify({ error: "Missing tailored_resume_id", code: "BAD_REQUEST" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Check user credits
    let { data: credits, error: creditsError } = await supabase
      .from('usage_credits')
      .select('credits_remaining, plan')
      .eq('user_id', user.id)
      .single()

    if (creditsError && creditsError.code === 'PGRST116') {
      // Auto-provision credits for existing users
      const { data: newRow, error: insertError } = await supabase
        .from('usage_credits')
        .insert({ user_id: user.id, plan: 'free', credits_remaining: 5 })
        .select('credits_remaining, plan')
        .single()
      if (insertError) throw new Error('Failed to verify usage credits')
      credits = newRow
    } else if (creditsError) {
      throw creditsError
    }

    if (!credits || credits.credits_remaining < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[generate-interview-prep] Fetching tailored resume ${tailored_resume_id}`)

    // 2. Fetch Tailored Resume Data
    const { data: tailoredResume, error: fetchError } = await supabase
      .from('tailored_resumes')
      .select('diff_json, job_title, company, jd_analysis')
      .eq('id', tailored_resume_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !tailoredResume) {
      throw new Error('Tailored resume not found')
    }

    console.log(`[generate-interview-prep] Generating interview prep using Gemini...`)

    // 3. Generate Interview Prep
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: INTERVIEW_PREP_SCHEMA as never,
        temperature: 0.7,
      }
    })

    const content = `
    Job Title: ${tailoredResume.job_title}
    Company: ${tailoredResume.company}

    JD Analysis:
    ${JSON.stringify(tailoredResume.jd_analysis, null, 2)}

    Tailored Resume Changes:
    ${JSON.stringify(tailoredResume.diff_json, null, 2)}
    `

    const result = await model.generateContent(INTERVIEW_PREP_PROMPT + '\n\n' + content)
    const prepJson = JSON.parse(result.response.text())

    // 4. Update DB and decrement credits
    console.log(`[generate-interview-prep] Saving to database...`)

    const { error: updateError } = await supabase
      .from('tailored_resumes')
      .update({ interview_prep_json: prepJson })
      .eq('id', tailored_resume_id)

    if (updateError) throw updateError

    await supabase
      .from('usage_credits')
      .update({ credits_remaining: credits.credits_remaining - 1 })
      .eq('user_id', user.id)

    console.log(`[generate-interview-prep] Success.`)

    return new Response(JSON.stringify({ data: prepJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('[generate-interview-prep] Error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      code: "INTERNAL_ERROR"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
