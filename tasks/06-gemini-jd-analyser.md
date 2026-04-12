# Task 06 — Phase 1: AI Core (JD Analysis & Gap)

## Goals
Implement the intelligence layer that extracts structured data from JDs and calculates the fitness of the user's resume.

## Acceptance Criteria
- [ ] **Prompts & Schemas**:
    - `packages/ai-pipeline/src/prompts.ts` — constants for ANALYZE_JD and ANALYZE_GAP.
    - `packages/ai-pipeline/src/schemas.ts` — Gemini `responseSchema` objects for structured JSON.
- [ ] **Edge Function: `analyze-jd`**:
    - [ ] Validates Supabase JWT.
    - [ ] Calls Gemini with `responseMimeType: "application/json"`.
    - [ ] Saves to `tailored_resumes.jd_analysis`.
    - [ ] Handles CORS for `chrome-extension://*`.
- [ ] **Edge Function: `analyze-gap`**:
    - [ ] Takes `resume_json` + `jd_analysis`.
    - [ ] Returns structured gap report (ats_score, missing_skills, keyword_gaps).
    - [ ] Updates `tailored_resumes.ats_score`.

## Verification
```bash
# Test JD Analysis
curl -X POST http://localhost:54321/functions/v1/analyze-jd \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"jd_text": "Senior React dev needed...", "user_id": "test-uuid"}'

# Test Gap Analysis
curl -X POST http://localhost:54321/functions/v1/analyze-gap \
  -H "Content-Type: application/json" \
  -d '{"resume_json": {}, "jd_analysis": {}, "id": "test-uuid"}'
```