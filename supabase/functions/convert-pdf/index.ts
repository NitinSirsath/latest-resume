import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import CloudConvert from "npm:cloudconvert@2.3.7"
import { corsHeaders } from "../_shared/cors.ts"
import * as Sentry from "npm:@sentry/deno"

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN'), tracesSampleRate: 1.0 })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tailored_resume_id, user_id } = await req.json()

    if (!tailored_resume_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tailored_resume_id, user_id", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const cloudConvertKey = Deno.env.get('CLOUDCONVERT_API_KEY')
    if (!cloudConvertKey) {
      throw new Error("CLOUDCONVERT_API_KEY is not configured")
    }

    // 1. Get DOCX URL
    const { data: tailoredData, error: dbError } = await supabase
      .from('tailored_resumes')
      .select('output_url')
      .eq('id', tailored_resume_id)
      .eq('user_id', user_id)
      .single()

    if (dbError || !tailoredData?.output_url) {
      throw new Error("DOCX output URL not found. Ensure the resume is generated first.")
    }

    // 2. Initialize CloudConvert
    const cloudConvert = new CloudConvert(cloudConvertKey)

    console.log(`[convert-pdf] Starting conversion for ${tailored_resume_id}`)

    // 3. Create and wait for Job
    const job = await cloudConvert.jobs.create({
      tasks: {
        'import-my-file': {
          operation: 'import/url',
          url: tailoredData.output_url
        },
        'convert-my-file': {
          operation: 'convert',
          input: 'import-my-file',
          output_format: 'pdf',
          engine: 'office' // Use Microsoft Office engine for best fidelity
        },
        'export-my-file': {
          operation: 'export/url',
          input: 'convert-my-file'
        }
      }
    })

    const finishedJob = await cloudConvert.jobs.wait(job.id)
    
    // 4. Extract PDF URL
    const exportTask = finishedJob.tasks.find(t => t.name === 'export-my-file')
    const pdfUrl = exportTask?.result?.files?.[0]?.url

    if (!pdfUrl) {
      throw new Error("CloudConvert did not return a PDF URL")
    }

    console.log(`[convert-pdf] Downloading PDF from CloudConvert...`)
    
    // 5. Download the PDF and save to Supabase Storage
    const response = await fetch(pdfUrl)
    if (!response.ok) throw new Error("Failed to download PDF from CloudConvert")
    
    const arrayBuffer = await response.arrayBuffer()
    const pdfBytes = new Uint8Array(arrayBuffer)

    const fileName = `${user_id}/${tailored_resume_id}/tailored-resume.pdf`
    
    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage
      .from('outputs')
      .getPublicUrl(fileName)

    const pdf_output_url = publicData.publicUrl

    // 6. Update Database
    await supabase
      .from('tailored_resumes')
      .update({ pdf_output_url }) // Add this column if it doesn't exist
      .eq('id', tailored_resume_id)

    console.log(`[convert-pdf] Success! PDF available at ${pdf_output_url}`)

    return new Response(
      JSON.stringify({ data: { success: true, pdf_output_url } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[convert-pdf] Error:', errorMessage)
    Sentry.captureException(error)
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR", failedAt: "convert_pdf_execution" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
