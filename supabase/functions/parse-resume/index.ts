import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import pdfParse from "npm:pdf-parse/lib/pdf-parse.js"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let currentResumeId: string | null = null;

  try {
    const body = await req.json()
    const { resume_id, file_url, user_id } = body
    currentResumeId = resume_id
    
    if (!resume_id || !file_url) throw new Error('Missing resume_id or file_url')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Mark as processing
    await supabase.from('resumes').update({ processing_status: 'processing' }).eq('id', resume_id)
    console.log(`[parse-resume] Processing resume: ${resume_id}`)

    // 2. Download the PDF
    console.log('[parse-resume] Downloading PDF from:', file_url)
    const response = await fetch(file_url)
    if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`)
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[parse-resume] PDF downloaded, size:', arrayBuffer.byteLength, 'bytes')

    // 3. Extract text content
    console.log('[parse-resume] Extracting text with pdf-parse...')
    const data = await pdfParse(buffer)
    const rawText = data.text
    const wordCount = rawText.split(/\s+/).filter(Boolean).length
    
    const parsedJson = {
      raw_text: rawText,
      word_count: wordCount,
      parsed_at: new Date().toISOString(),
    }

    // 4. Update Database
    console.log('[parse-resume] Updating database with extracted text')
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

    console.log('[parse-resume] Success! Word count:', wordCount)
    return new Response(
      JSON.stringify({ success: true, resume_id, word_count: wordCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    console.error('[parse-resume] Error:', error.message)
    
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
      } catch (dbUpdateError: any) {
        console.error('[parse-resume] Failed to update error status in DB:', dbUpdateError.message)
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
