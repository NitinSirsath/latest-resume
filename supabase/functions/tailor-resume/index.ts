import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import { TAILOR_RESUME_PROMPT, TAILORED_RESUME_SCHEMA } from "../_shared/ai.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base_resume_json, gap_report, jd_analysis, tailored_resume_id } = await req.json()
    
    // 1. Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Initialize Gemini (Using Flash for speed as requested)
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: TAILORED_RESUME_SCHEMA as any
      }
    })

    // 3. Call Gemini with the shared prompt template
    const prompt = `${TAILOR_RESUME_PROMPT}

BASE RESUME:
${JSON.stringify(base_resume_json)}

JOB ANALYSIS:
${JSON.stringify(jd_analysis)}

GAP REPORT:
${JSON.stringify(gap_report)}`

    const result = await model.generateContent(prompt)
    const tailorResult = JSON.parse(result.response.text())

    // 4. Update Database — persist full tailored JSON, diff, and ATS score
    const updatePayload: Record<string, any> = {
      diff_json: tailorResult.change_log,
      ats_score: tailorResult.final_ats_score,
      tailored_json: tailorResult.tailored_resume,
    }

    const { error: dbError } = await supabase
      .from('tailored_resumes')
      .update(updatePayload)
      .eq('id', tailored_resume_id)

    if (dbError) throw dbError

    return new Response(
      JSON.stringify(tailorResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
