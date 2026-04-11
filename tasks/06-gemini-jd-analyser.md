# Task 06 — Gemini JD analyser edge function

## Acceptance criteria
- [ ] supabase/functions/analyze-jd/index.ts — full implementation:
      accepts POST { jd_text: string, user_id: string }
      validates JWT from Authorization header using Supabase service client
      calls Gemini with responseMimeType: "application/json" and full responseSchema
      schema output: { role_title, seniority_level, required_skills[], nice_to_have_skills[], ats_keywords[], years_experience_required, tech_stack[] }
      saves result to tailored_resumes.jd_analysis in Postgres
      returns { analysis, id }
- [ ] supabase/functions/analyze-gap/index.ts — full implementation:
      accepts POST { resume_json, jd_analysis, tailored_resume_id }
      calls Gemini with gap schema: { ats_score_estimate, missing_skills[], weak_sections[], keyword_gaps[] }
      updates tailored_resumes.ats_score
      returns gap report
- [ ] Both functions use npm:@google/generative-ai (Deno import)
- [ ] Both functions have proper CORS headers for extension origin
- [ ] Error handling: if Gemini fails, return 500 with { error: message }

## Verify with
supabase functions serve analyze-jd
curl -X POST http://localhost:54321/functions/v1/analyze-jd \
  -H "Content-Type: application/json" \
  -d '{"jd_text": "Senior React developer needed...", "user_id": "test"}'
# should return structured JSON analysis