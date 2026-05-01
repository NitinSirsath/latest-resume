import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import { ANALYZE_JD_PROMPT, JD_ANALYSIS_SCHEMA } from "@resumetailor/ai-pipeline"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const req_json = await req.json()
    const { jd_text, user_id } = req_json
    
    // 1. Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!! // Using service role to update/persist
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check Usage Credits
    const { data: usage, error: usageError } = await supabase
      .from('usage_credits')
      .select('credits')
      .eq('user_id', user_id)
      .single()

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 is no rows returned
      console.error('[analyze-jd] Usage check error:', usageError)
      throw new Error('Failed to verify usage credits')
    }

    if (usage && usage.credits <= 0) {
      throw new Error('Insufficient credits. Please upgrade your plan.')
    }

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: JD_ANALYSIS_SCHEMA as any
      }
    })

    // 3. Call Gemini
    console.log('[analyze-jd] Calling Gemini AI...')
    const prompt = `${ANALYZE_JD_PROMPT}\n\nJOB DESCRIPTION:\n${jd_text}`
    
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    console.log('[analyze-jd] AI Response received')
    
    let analysis
    try {
      analysis = JSON.parse(text)
    } catch (e) {
      console.error('[analyze-jd] Failed to parse AI response:', text)
      throw new Error('AI returned invalid JSON')
    }

    // 4. Save to Database
    console.log('[analyze-jd] Saving to database for user:', user_id)
    const { data: record, error: dbError } = await supabase
      .from('tailored_resumes')
      .insert({
        user_id,
        job_title: analysis.role_title,
        company: analysis.company || "Unknown",
        jd_raw: jd_text,
        jd_analysis: analysis,
        job_url: req_json.job_url,
        application_status: 'prepared'
      })
      .select()
      .single()

    if (dbError) {
      console.error('[analyze-jd] Database error:', dbError)
      throw dbError
    }

    // Decrement credits
    await supabase.rpc('decrement_credits', { target_user_id: user_id })

    console.log('[analyze-jd] Success! Record ID:', record.id)
    return new Response(
      JSON.stringify({ analysis, id: record.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: unknown) {
    console.error('[analyze-jd] Error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
