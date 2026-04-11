# Task 07 — Gemini resume tailor edge function

## Acceptance criteria
- [ ] supabase/functions/tailor-resume/index.ts — full implementation:
      accepts POST { base_resume_json, gap_report, jd_analysis, tailored_resume_id }
      calls Gemini with tailor schema:
        { tailored_resume: { summary, experience[], skills[] }, change_log[]: { section, original, changed_to, reason }, final_ats_score }
      updates tailored_resumes row with output
      returns full tailored resume + change_log
- [ ] packages/ai-pipeline/index.ts — exports prompt templates as constants:
      ANALYZE_JD_PROMPT, ANALYZE_GAP_PROMPT, TAILOR_RESUME_PROMPT
      (edge functions import these — single source of truth for prompts)
- [ ] packages/ai-pipeline/schemas.ts — exports all Gemini responseSchema objects

## Verify with
supabase functions serve tailor-resume
# POST with sample resume JSON and gap report, should return tailored resume + change_log