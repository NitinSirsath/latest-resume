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

    // 2. Fetch the file content from storage
    const response = await fetch(resume.file_url)
    const arrayBuffer = await response.arrayBuffer()
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    // 3. AI Parsing (Gemini can read PDFs directly!)
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Pdf,
          mimeType: "application/pdf"
        }
      },
      RESUME_PARSER_PROMPT
    ])
    
    const text = result.response.text()
    const parsedJson = JSON.parse(text.replace(/```json|```/g, ''))

    // 4. Update Database
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ 
        parsed_json: parsedJson,
        content: "Parsed via Gemini PDF Vision" 
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
