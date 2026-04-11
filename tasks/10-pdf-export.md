# Task 10 — PDF and DOCX export

## Acceptance criteria
- [ ] supabase/functions/export-resume/index.ts:
      accepts POST { tailored_resume_json, format: "pdf" | "docx" }
      generates PDF using pdf-lib (npm: import)
      generates DOCX using docx (npm: import)
      uploads to Supabase Storage: outputs/{user_id}/{tailored_resume_id}.pdf
      returns signed download URL (expires 1 hour)
- [ ] Extension popup download button calls this function
- [ ] Dashboard /tailored/:id download buttons call this function

## Verify with
supabase functions serve export-resume
# POST sample resume JSON, should return a signed URL that downloads a valid PDF