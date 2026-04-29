import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tailored_resume_json, user_id, id } = await req.json()
    
    // 1. Initialize Supabase (Service Role for system writes)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Generate PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let page = pdfDoc.addPage([612, 792]) // Standard Letter
    const { width, height } = page.getSize()
    let y = height - 50

    // Title / Header
    page.drawText('Tailored Resume', { x: 50, y, size: 20, font: boldFont, color: rgb(0, 0, 0.5) })
    y -= 40

    // Summary
    page.drawText('Professional Summary', { x: 50, y, size: 12, font: boldFont })
    y -= 20
    const summaryLines = wrapText(tailored_resume_json.professional_summary, 80)
    for (const line of summaryLines) {
      if (y < 50) { page = pdfDoc.addPage([612, 792]); y = height - 50; }
      page.drawText(line, { x: 50, y, size: 10, font })
      y -= 12
    }
    y -= 20

    // Work Experience
    page.drawText('Work Experience', { x: 50, y, size: 12, font: boldFont })
    y -= 20
    for (const exp of tailored_resume_json.work_experience) {
      if (y < 80) { page = pdfDoc.addPage([612, 792]); y = height - 50; }
      page.drawText(`${exp.company} - ${exp.role}`, { x: 50, y, size: 11, font: boldFont })
      y -= 15
      if (Array.isArray(exp.bullets)) {
        for (const bullet of exp.bullets) {
          if (y < 50) { page = pdfDoc.addPage([612, 792]); y = height - 50; }
          page.drawText(`• ${bullet}`, { x: 60, y, size: 10, font })
          y -= 12
        }
      }
      y -= 15
    }

    const pdfBytes = await pdfDoc.save()

    // 3. Upload to Storage
    const fileName = `${user_id}/${id}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 4. Create Signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from('outputs')
      .createSignedUrl(fileName, 3600) // 1 hr

    if (signedError) throw signedError

    return new Response(
      JSON.stringify({ url: signedData.signedUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    console.error('[export-resume] Top-level error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  words.forEach(word => {
    if ((currentLine + word).length > maxChars) {
      lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine += word + ' '
    }
  })
  lines.push(currentLine.trim())
  return lines
}
