import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"

const RESUME_PARSER_PROMPT = `
  You are an expert resume parser. Analyze the provided resume text and extract the information into the following JSON schema:
  
  {
    "basics": { "name": "...", "email": "...", "phone": "...", "summary": "..." },
    "experience": [{ "company": "...", "role": "...", "start": "...", "end": "...", "highlights": ["..."] }],
    "education": [{ "institution": "...", "degree": "...", "year": "..." }],
    "skills": ["..."]
  }
  
  Return ONLY the JSON.
`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { resume_id } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch the resume details
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resume_id)
      .single()

    if (fetchError) throw fetchError

    // 2. Fetch the file content from storage
    // Note: In a real app, we'd use a PDF parser library. 
    // For this prototype, we'll assume the text is already available or use a simple fetch.
    const response = await fetch(resume.file_url)
    const blob = await response.blob()
    const text = await blob.text() // Simple fallback: assumes text-based or accessible file

    // 3. AI Parsing
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
    
    const result = await model.generateContent([RESUME_PARSER_PROMPT, text])
    const parsedJson = JSON.parse(result.response.text().replace(/```json|```/g, ''))

    // 4. Update Database
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ 
        parsed_json: parsedJson,
        content: text.substring(0, 1000) // Store snippet
      })
      .eq('id', resume_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, data: parsedJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
