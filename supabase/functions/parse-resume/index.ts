import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { encodeBase64 } from "https://deno.land/std@0.203.0/encoding/base64.ts"
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

  let currentResumeId: string | null = null;

  try {
    const body = await req.json()
    const { resume_id } = body
    currentResumeId = resume_id
    
    if (!resume_id) throw new Error('Missing resume_id')

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

    // Mark as processing
    await supabase.from('resumes').update({ processing_status: 'processing' }).eq('id', resume_id)
    console.log(`[parse-resume] Processing resume: ${resume_id}`)

    // 2. Fetch the file content from storage
    console.log('[parse-resume] Fetching PDF from:', resume.file_url)
    const response = await fetch(resume.file_url)
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    
    const arrayBuffer = await response.arrayBuffer()
    const base64Pdf = encodeBase64(arrayBuffer)
    console.log('[parse-resume] PDF fetched and encoded to Base64 (Size:', arrayBuffer.byteLength, 'bytes)')

    // 3. AI Parsing (Gemini can read PDFs directly!)
    console.log('[parse-resume] Sending to Gemini for analysis...')
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    })
    
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
    console.log('[parse-resume] AI response received')
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(text)
    } catch (e) {
      console.error('[parse-resume] Failed to parse AI response as JSON:', text)
      // Fallback for cases where Gemini might still wrap in markdown
      parsedJson = JSON.parse(text.replace(/```json|```/g, ''))
    }

    // 4. Update Database
    console.log('[parse-resume] Updating database with parsed JSON')
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ 
        parsed_json: parsedJson,
        content: text, 
        processing_status: 'completed',
        processing_error: null
      })
      .eq('id', resume_id)

    if (updateError) {
      console.error('[parse-resume] Database update failed:', updateError)
      throw updateError
    }

    console.log('[parse-resume] Success!')
    return new Response(
      JSON.stringify({ success: true, data: parsedJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error('[parse-resume] Top-level error:', error.message)
    
    // Attempt to mark as failed in DB
    if (currentResumeId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
        const supabase = createClient(supabaseUrl, supabaseKey)
        await supabase.from('resumes').update({ 
          processing_status: 'failed',
          processing_error: error.message 
        }).eq('id', currentResumeId)
      } catch (dbUpdateError) {
        console.error('[parse-resume] Failed to update error status in DB:', dbUpdateError.message)
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

