import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "https://esm.sh/@google/genai@0.1.2"
import { INTERVIEW_PREP_PROMPT, INTERVIEW_PREP_SCHEMA } from "../../packages/ai-pipeline/src/index.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError
    if (profile.credits < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[generate-interview-prep] Fetching tailored resume ${tailored_resume_id}`)

    // 2. Fetch Tailored Resume Data
    const { data: tailoredResume, error: fetchError } = await supabase
      .from('tailored_resumes')
      .select('tailored_sections, job_title, company')
      .eq('id', tailored_resume_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !tailoredResume) {
      throw new Error('Tailored resume not found')
    }

    console.log(`[generate-interview-prep] Generating interview prep using Gemini...`)

    // 3. Generate Interview Prep
    const ai = new GoogleGenerativeAI({ apiKey: Deno.env.get('GEMINI_API_KEY') || '' })
    
    const content = `
    Job Title: ${tailoredResume.job_title}
    Company: ${tailoredResume.company}

    Candidate Resume Context:
    ${JSON.stringify(tailoredResume.tailored_sections, null, 2)}
    `

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: "user",
        parts: [{ text: INTERVIEW_PREP_PROMPT + '\n\n' + content }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: INTERVIEW_PREP_SCHEMA as any,
        temperature: 0.7,
      }
    })

    if (!response.text) throw new Error("No response from AI")

    const prepJson = JSON.parse(response.text)

    // 4. Update DB and decrement credits
    console.log(`[generate-interview-prep] Saving to database...`)
    
    const { error: updateError } = await supabase
      .from('tailored_resumes')
      .update({ interview_prep_json: prepJson })
      .eq('id', tailored_resume_id)

    if (updateError) throw updateError

    const { error: creditError } = await supabase
      .rpc('decrement_credits', { user_id: user.id, amount: 1 })

    if (creditError) throw creditError

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
