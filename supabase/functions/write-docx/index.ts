import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import JSZip from "npm:jszip@3.10.1"
import { corsHeaders } from "../_shared/cors.ts"
import * as Sentry from "npm:@sentry/deno"

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN'), tracesSampleRate: 1.0 })

// Define strict types instead of any
interface ReviewDecision {
  change_id: string;
  section: string;
  accepted: boolean;
  alternative_requested: boolean;
  final_text: string;
}

interface ChangeLogEntry {
  change_id: string;
  section: string;
  change_type: string;
  original: string;
  changed_to: string;
  reason: string;
  impact: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function unescapeXml(text: string): string {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

/**
 * Replace text within DOCX XML while preserving all formatting.
 * Works paragraph-by-paragraph: concatenates <w:t> text within each <w:p>,
 * checks for a match, then redistributes replacement text into the first
 * run and clears subsequent runs.
 */
function replaceTextInDocXml(xml: string, searchText: string, replaceText: string): string {
  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (paragraph) => {
    const tElements: Array<{ fullMatch: string; text: string; index: number }> = []
    const tRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g
    let m
    while ((m = tRegex.exec(paragraph)) !== null) {
      tElements.push({ fullMatch: m[0], text: unescapeXml(m[1]), index: m.index })
    }

    if (tElements.length === 0) return paragraph

    const fullText = tElements.map(e => e.text).join('')
    if (!fullText.includes(searchText)) return paragraph

    // Perform replacement on concatenated text, redistribute into runs
    const newFullText = fullText.replace(searchText, replaceText)
    let result = paragraph

    // Process from end to start so indices stay valid
    for (let i = tElements.length - 1; i >= 0; i--) {
      const elem = tElements[i]
      const newText = i === 0 ? escapeXml(newFullText) : ''
      const newElement = `<w:t xml:space="preserve">${newText}</w:t>`
      result = result.substring(0, elem.index) + newElement + result.substring(elem.index + elem.fullMatch.length)
    }

    return result
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tailored_resume_id, user_id, decisions } = await req.json()

    if (!tailored_resume_id || !user_id || !decisions) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tailored_resume_id, user_id, decisions", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    
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

    // Get file_url: prefer FK join result, fallback to direct lookup, fallback to latest user resume
    const joinedResumes = tailoredData.resumes as { file_url?: string } | undefined
    let fileUrl = joinedResumes?.file_url

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
    // 3. Open DOCX as ZIP and modify document.xml in-place
    const zip = await JSZip.loadAsync(arrayBuffer)
    const docXmlFile = zip.file("word/document.xml")
    if (!docXmlFile) throw new Error("Invalid DOCX: missing word/document.xml")

    let docXml = await docXmlFile.async("string")

    const changeLog = (tailoredData.diff_json?.log as ChangeLogEntry[]) || []
    const typedDecisions = (decisions as ReviewDecision[]) || []

    let appliedCount = 0
    for (const decision of typedDecisions) {
      if (decision.accepted) {
        const logEntry = changeLog.find(l => l.change_id === decision.change_id)
        if (logEntry?.original && decision.final_text) {
          const before = docXml
          docXml = replaceTextInDocXml(docXml, logEntry.original, decision.final_text)
          if (docXml !== before) appliedCount++
        }
      }
    }

    console.log(`[write-docx] Applied ${appliedCount} changes in-place`)

    // 4. Write modified XML back to ZIP and generate output
    zip.file("word/document.xml", docXml)
    const outputBytes = await zip.generateAsync({ type: "uint8array" })

    // 5. Upload to Storage
    const fileName = `${user_id}/${tailored_resume_id}/tailored-resume.docx`
    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(fileName, outputBytes, {
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
      JSON.stringify({ data: { success: true, output_url, tailored_resume_id } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[write-docx] Top-level error:', errorMessage)
    Sentry.captureException(error)
    return new Response(
      JSON.stringify({ error: errorMessage, code: "INTERNAL_ERROR", failedAt: "write_docx_execution" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
