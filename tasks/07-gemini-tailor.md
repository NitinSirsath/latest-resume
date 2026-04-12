# Task 07 — Phase 1: AI Core (Tailoring)

## Goals
Implement the final stage of the AI pipeline: rewriting the resume content to optimize for the target job description while retaining factual integrity.

## Acceptance Criteria
- [ ] **Prompt & Schema**:
    - `packages/ai-pipeline/src/prompts.ts` — constant for TAILOR_RESUME_PROMPT.
    - `packages/ai-pipeline/src/schemas.ts` — schema including `tailored_resume`, `change_log[]`, and `final_ats_score`.
- [ ] **Edge Function: `tailor-resume`**:
    - [ ] Accepts `base_resume_json`, `gap_report`, and `jd_analysis`.
    - [ ] Calls Gemini with consolidated context.
    - [ ] Updates `tailored_resumes` row with `diff_json` and `output_url`.
    - [ ] Returns tailored resume + change log.
- [ ] **Shared Pipeline**:
    - Ensure `packages/ai-pipeline/src/index.ts` exports the orchestrator functions used by the edge functions.

## Verification
```bash
# Test Tailoring
curl -X POST http://localhost:54321/functions/v1/tailor-resume \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"id": "test-uuid", "resume": {...}, "gap_report": {...}}'
```