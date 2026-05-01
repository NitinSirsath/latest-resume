import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import mammoth from "npm:mammoth@1.8.0"
import { corsHeaders } from "../_shared/cors.ts"

function parseDocxIntoSections(rawText: string) {
  const sections: any = {
    summary: null,
    experience: [],
    skills: { categories: {}, flat_list: [] },
    education: []
  };

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentSection = '';
  let currentExp: any = null;
  let currentEdu: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    if (/^(summary|professional summary|profile|about me)$/i.test(line)) {
      currentSection = 'summary';
      sections.summary = { text: '', word_count: 0 };
      continue;
    } else if (/^(experience|work experience|employment|career history)$/i.test(line)) {
      currentSection = 'experience';
      continue;
    } else if (/^(skills|technical skills|core competencies|technologies)$/i.test(line)) {
      currentSection = 'skills';
      continue;
    } else if (/^(education|academic|qualification)$/i.test(line)) {
      currentSection = 'education';
      continue;
    }

    if (currentSection === 'summary') {
      sections.summary.text += (sections.summary.text ? ' ' : '') + line;
      sections.summary.word_count = sections.summary.text.split(/\s+/).filter(Boolean).length;
    } else if (currentSection === 'experience') {
      // detect company: company name followed by role title on next line, and bullet points
      // We do a simple heuristic: if line doesn't start with bullet and next line doesn't start with bullet, it might be company and title
      const isBullet = /^[•\-*]/.test(line);
      if (!isBullet && i + 1 < lines.length && !/^[•\-*]/.test(lines[i + 1])) {
        // Assume company and title, maybe duration on the same line or next
        if (currentExp) {
          sections.experience.push(currentExp);
        }
        currentExp = {
          company: line,
          title: lines[i + 1],
          duration: '',
          bullets: []
        };
        i++; // skip next line as it's title
      } else if (isBullet && currentExp) {
        currentExp.bullets.push(line.replace(/^[•\-*]\s*/, ''));
      } else if (currentExp && !isBullet) {
        // Maybe duration or additional info
        if (!currentExp.duration) currentExp.duration = line;
      }
    } else if (currentSection === 'skills') {
      // flat list or comma separated
      const parts = line.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        parts.forEach(p => {
          if (!sections.skills.flat_list.includes(p)) sections.skills.flat_list.push(p);
        });
      } else {
        // could be category: skill1, skill2
        const colonParts = line.split(':');
        if (colonParts.length > 1) {
          const category = colonParts[0].trim();
          const items = colonParts[1].split(',').map(s => s.trim()).filter(Boolean);
          sections.skills.categories[category] = items;
          items.forEach(p => {
            if (!sections.skills.flat_list.includes(p)) sections.skills.flat_list.push(p);
          });
        } else {
          if (!sections.skills.flat_list.includes(line)) sections.skills.flat_list.push(line);
        }
      }
    } else if (currentSection === 'education') {
      // simplistic parsing
      if (!currentEdu) {
        currentEdu = { institution: line, degree: '', year: '' };
      } else if (!currentEdu.degree) {
        currentEdu.degree = line;
      } else if (!currentEdu.year) {
        currentEdu.year = line;
        sections.education.push(currentEdu);
        currentEdu = null;
      }
    }
  }

  if (currentExp) sections.experience.push(currentExp);
  if (currentEdu) sections.education.push(currentEdu);

  const word_count = rawText.split(/\s+/).filter(Boolean).length;

  return {
    source_format: "docx",
    parsed_at: new Date().toISOString(),
    word_count: word_count,
    sections: sections
  };
}

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

    const parsedJson = parseDocxIntoSections(rawText);

    // 4. Update Database
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

    console.log('[parse-resume] Success! Word count:', parsedJson.word_count)
    return new Response(
      JSON.stringify({ success: true, resume_id, word_count: parsedJson.word_count }),
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
      JSON.stringify({ error: `[DEBUG] ` + error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
