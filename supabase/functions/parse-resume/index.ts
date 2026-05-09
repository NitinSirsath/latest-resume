import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import mammoth from "npm:mammoth@1.8.0"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import { PARSE_RESUME_PROMPT, RESUME_SECTIONS_SCHEMA } from "@resumetailor/ai-pipeline"
import * as Sentry from "npm:@sentry/deno"

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN'), tracesSampleRate: 1.0 })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let currentResumeId: string | null = null;

  try {
    const body = await req.json()
    const { resume_id, file_url } = body
    currentResumeId = resume_id
    
    if (!resume_id || !file_url) throw new Error('Missing resume_id or file_url')

    if (!file_url.toLowerCase().split('?')[0].endsWith('.docx')) {
      return new Response(JSON.stringify({ error: "Only DOCX files are supported. Please re-upload as .docx" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Mark as processing
    await supabase.from('resumes').update({ processing_status: 'processing' }).eq('id', resume_id)
    console.log(`[parse-resume] Processing resume: ${resume_id}`)

    // 2. Download the DOCX
    console.log('[parse-resume] Downloading DOCX from:', file_url)
    const response = await fetch(file_url)
    if (!response.ok) throw new Error(`Failed to download DOCX: ${response.statusText}`)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    console.log('[parse-resume] DOCX downloaded, size:', arrayBuffer.byteLength, 'bytes')

    // 3. Extract text content using mammoth
    console.log('[parse-resume] Extracting text with mammoth...')
    const { value: rawText } = await mammoth.extractRawText({ arrayBuffer, buffer })
    
    // 4. Parse sections with Gemini
    console.log('[parse-resume] Calling Gemini to extract sections...')
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESUME_SECTIONS_SCHEMA as never
      }
    })

    const result = await model.generateContent(
      `${PARSE_RESUME_PROMPT}\n\nRESUME TEXT:\n${rawText}`
    )
    const sections = JSON.parse(result.response.text())
    
    const word_count = rawText.split(/\s+/).filter(Boolean).length;

    const parsedJson = {
      source_format: "docx",
      parsed_at: new Date().toISOString(),
      word_count: word_count,
      sections: sections
    };

    // 5. Update Database
    console.log('[parse-resume] Updating database with extracted structured data')
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ 
        content: rawText,
        parsed_json: parsedJson,
        processing_status: 'completed',
        processing_error: null
      })
      .eq('id', resume_id)

    if (updateError) {
      console.error('[parse-resume] Database update failed:', updateError)
      throw updateError
    }

    console.log('[parse-resume] Success! Word count:', word_count)
    return new Response(
      JSON.stringify({ data: { success: true, resume_id, word_count } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[parse-resume] Error:', errorMessage)
    
    // Attempt to mark as failed in DB
    if (currentResumeId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
        const supabase = createClient(supabaseUrl, supabaseKey)
        await supabase.from('resumes').update({ 
          processing_status: 'failed',
          processing_error: errorMessage 
        }).eq('id', currentResumeId)
      } catch (dbUpdateError: unknown) {
        const dbErrorMessage = dbUpdateError instanceof Error ? dbUpdateError.message : String(dbUpdateError);
        console.error('[parse-resume] Failed to update error status in DB:', dbErrorMessage)
      }
    }

    return new Response(
      JSON.stringify({ error: `[DEBUG] ` + errorMessage, code: "INTERNAL_ERROR", stack: errorStack, failedAt: "parse_resume_execution" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
