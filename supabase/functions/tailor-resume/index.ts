import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { corsHeaders } from "../_shared/cors.ts"
import { TAILOR_RESUME_PROMPT, TAILORED_RESUME_SCHEMA } from "@resumetailor/ai-pipeline"

interface TailorResult {
  final_ats_score?: number;
  tailored_sections?: Record<string, unknown> & {
    summary?: { revised?: string };
    experience?: Array<{ company?: string }>;
  };
  change_log?: Array<Record<string, unknown>>;
}

function validateTailorResult(tailorResult: TailorResult, baseResumeJson: Record<string, unknown>): string | null {
  const tailoredSections = tailorResult.tailored_sections;
  if (!tailoredSections) return null; // No changes is valid

  const sections = baseResumeJson.sections as Record<string, unknown> | undefined;

  // 1. summary word count within bounds
  if (tailoredSections.summary?.revised) {
    const origSummary = sections?.summary as { word_count?: number } | undefined;
    const maxWords = (origSummary?.word_count || 0) * 1.1 + 10;
    const revisedWords = tailoredSections.summary.revised.split(/\s+/).length;
    if (revisedWords > maxWords) {
      return `Summary word count exceeded: ${revisedWords} > ${maxWords}`;
    }
  }

  // 2. all experience companies match original companies
  if (tailoredSections.experience) {
    const origExp = (sections?.experience as Array<{ company?: string }> | undefined) || [];
    const origCompanies = new Set(origExp.map(e => e.company).filter(Boolean));
    for (const exp of tailoredSections.experience) {
      if (exp.company && !origCompanies.has(exp.company)) {
        return `Invented company: ${exp.company}`;
      }
    }
  }

  // 3. no new sections invented
  const allowedKeys = ['summary', 'experience', 'skills_added', 'skills_removed'];
  for (const key of Object.keys(tailoredSections)) {
    if (!allowedKeys.includes(key)) {
      return `Invented section: ${key}`;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base_resume_json, base_resume_id, gap_report, jd_analysis, tailored_resume_id } = await req.json()
    
    // 1. Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check Usage Credits
    const { data: record } = await supabase
      .from('tailored_resumes')
      .select('user_id')
      .eq('id', tailored_resume_id)
      .single()

    if (!record?.user_id) throw new Error('Invalid tailored_resume_id')

    const { data: usage, error: usageError } = await supabase
      .from('usage_credits')
      .select('credits')
      .eq('user_id', record.user_id)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('[tailor-resume] Usage check error:', usageError)
      throw new Error('Failed to verify usage credits')
    }

    if (usage && usage.credits <= 0) {
      throw new Error('Insufficient credits. Please upgrade your plan.')
    }

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-latest", // Use Pro for complex constraints
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: TAILORED_RESUME_SCHEMA as never
      }
    })

    // 3. Call Gemini with the shared prompt template
    const origWordCount = (base_resume_json.sections as Record<string, unknown>)?.summary as { word_count?: number } | undefined;
    const maxWords = Math.floor((origWordCount?.word_count || 0) * 1.1) + 10;

    const basePrompt = `
${TAILOR_RESUME_PROMPT.replace('{max_words}', maxWords.toString()).replace('{original_words}', (origWordCount?.word_count || 0).toString())}

ORIGINAL SUMMARY:
${((base_resume_json.sections as Record<string, unknown>)?.summary as { text?: string })?.text || ''}

ORIGINAL EXPERIENCE:
${JSON.stringify((base_resume_json.sections as Record<string, unknown>)?.experience || [], null, 2)}

ORIGINAL SKILLS (flat list):
${((base_resume_json.sections as Record<string, unknown>)?.skills as { flat_list?: string[] })?.flat_list?.join(', ') || ''}

JOB ANALYSIS:
${JSON.stringify(jd_analysis, null, 2)}

GAP REPORT:
${JSON.stringify(gap_report, null, 2)}

STRICT RULES:
- Summary: maximum ${maxWords} words
- Only modify bullets that are directly relevant to the JD
- Only add skills that appear in the JD analysis
- Return ONLY changed sections — do not return unchanged content
- Preserve the candidate's original voice and phrasing style
`

    const generateAndValidate = async (promptText: string, retriesLeft: number): Promise<TailorResult> => {
      const result = await model.generateContent(promptText)
      const tailorResult = JSON.parse(result.response.text()) as TailorResult

      if (tailorResult.change_log && Array.isArray(tailorResult.change_log)) {
        tailorResult.change_log = tailorResult.change_log.map((log, index) => {
          const section = typeof log.section === 'string' ? log.section : 'unknown';
          return {
            ...log,
            change_id: `change_${section.replace(/\W+/g, '_').toLowerCase()}_${index}`
          };
        });
      }

      const errorMsg = validateTailorResult(tailorResult, base_resume_json)
      if (errorMsg) {
        console.warn(`[tailor-resume] Validation failed: ${errorMsg}. Retries left: ${retriesLeft}`)
        if (retriesLeft > 0) {
          const stricterPrompt = promptText + `\n\nSTRICT WARNING: Your previous attempt failed validation: ${errorMsg}. Fix this immediately.`
          return generateAndValidate(stricterPrompt, retriesLeft - 1)
        } else {
          console.warn(`[tailor-resume] Validation failed completely. Returning original.`)
          return {
            final_ats_score: (gap_report as { ats_score_estimate?: number })?.ats_score_estimate || 0,
            tailored_sections: {},
            change_log: []
          }
        }
      }
      return tailorResult
    }

    const tailorResult = await generateAndValidate(basePrompt, 1)

    // 4. Update Database
    const updatePayload: Record<string, unknown> = {
      diff_json: {
        sections: tailorResult.tailored_sections,
        log: tailorResult.change_log
      },
      ats_score: tailorResult.final_ats_score,
    }

    if (base_resume_id) {
      updatePayload.base_resume_id = base_resume_id
    }

    const { error: dbError } = await supabase
      .from('tailored_resumes')
      .update(updatePayload)
      .eq('id', tailored_resume_id)

    if (dbError) throw dbError

    // Decrement credits
    await supabase.rpc('decrement_credits', { target_user_id: record.user_id })

    return new Response(
      JSON.stringify(tailorResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[tailor-resume] Top-level error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage, failedAt: 'tailor_pipeline_execution' }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
