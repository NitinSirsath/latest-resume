import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import { ANALYZE_JD_PROMPT, JD_ANALYSIS_SCHEMA } from "../_shared/ai.ts"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { jd_text, user_id } = await req.json()
    
    // 1. Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!! // Using service role to update/persist
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: JD_ANALYSIS_SCHEMA as any
      }
    })

    // 3. Call Gemini
    const result = await model.generateContent([ANALYZE_JD_PROMPT, jd_text])
    const analysis = JSON.parse(result.response.text())

    // 4. Save to Database
    // We update tailored_resumes or insert a new one if not exists
    // For simplicity in this loop, we'll return the analysis and let the caller handle ID creation if needed, 
    // OR create a placeholder row.
    const { data: record, error: dbError } = await supabase
      .from('tailored_resumes')
      .insert({
        user_id,
        job_title: analysis.role_title,
        company: analysis.company || "Unknown", // Schema might need company
        jd_raw: jd_text,
        jd_analysis: analysis,
      })
      .select()
      .single()

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ analysis, id: record.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
