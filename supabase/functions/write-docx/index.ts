import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import mammoth from "npm:mammoth@1.8.0"
import { Document, Packer, Paragraph, TextRun, PatchType, patchDocument } from "npm:docx@9.0.2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tailored_resume_id, user_id } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch tailored resume and join to base resume for the original file URL
    const { data: tailoredData, error: tailoredError } = await supabase
      .from('tailored_resumes')
      .select('*, resumes!base_resume_id(file_url)')
      .eq('id', tailored_resume_id)
      .single()

    if (tailoredError) throw tailoredError
    if (!tailoredData) throw new Error("Tailored resume not found")

    console.log('[write-docx] base_resume_id:', tailoredData.base_resume_id)
    console.log('[write-docx] resumes join:', JSON.stringify(tailoredData.resumes))

    // Get file_url: prefer FK join result, fallback to direct lookup, fallback to latest user resume
    let fileUrl = (tailoredData.resumes as any)?.file_url

    if (!fileUrl && tailoredData.base_resume_id) {
      // Direct lookup using FK
      const { data: resumeData } = await supabase
        .from('resumes')
        .select('file_url')
        .eq('id', tailoredData.base_resume_id)
        .single()
      fileUrl = resumeData?.file_url
    }

    if (!fileUrl) {
      // Last resort: use the user's most recently uploaded resume
      console.log('[write-docx] base_resume_id is null, falling back to latest resume for user:', user_id)
      const { data: latestResume } = await supabase
        .from('resumes')
        .select('file_url')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      fileUrl = latestResume?.file_url
    }
    if (!fileUrl) throw new Error("Original resume file URL not found")

    // 2. Download original DOCX
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error("Failed to download original DOCX")
    const arrayBuffer = await response.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // 3. Extract text, apply edits, build simple DOCX
    const { value: rawText } = await mammoth.extractRawText({ arrayBuffer, buffer })
    let modifiedText = rawText

    const tailored_sections = tailoredData.diff_json?.sections || {}

    if (tailored_sections.summary?.revised && tailored_sections.summary?.original) {
      modifiedText = modifiedText.replace(tailored_sections.summary.original, tailored_sections.summary.revised)
    }

    if (tailored_sections.experience) {
      tailored_sections.experience.forEach((exp: any) => {
        if (exp.bullets_changed) {
          exp.bullets_changed.forEach((bullet: any) => {
            if (bullet.original && bullet.revised) {
              modifiedText = modifiedText.replace(bullet.original, bullet.revised)
            }
          })
        }
      })
    }

    // 4. Build new DOCX
    const paragraphs = modifiedText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => new Paragraph({
        children: [new TextRun(line)]
      }))

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })

    const b64 = await Packer.toBase64String(doc)
    const docxBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))

    // 5. Upload to Storage
    const fileName = `${user_id}/${tailored_resume_id}/tailored-resume.docx`
    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(fileName, docxBytes, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 6. Create Public URL
    const { data: publicData } = supabase.storage
      .from('outputs')
      .getPublicUrl(fileName)

    const output_url = publicData.publicUrl

    // 7. Update DB
    await supabase
      .from('tailored_resumes')
      .update({ output_url })
      .eq('id', tailored_resume_id)

    return new Response(
      JSON.stringify({ success: true, output_url, tailored_resume_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    console.error('[write-docx] Top-level error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
