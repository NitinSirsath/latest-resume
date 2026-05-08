# TASK-053 — Deprecate/Fix export-resume Edge Function

## Priority: 🟡 P1
## Branch: `fix/task-053-export-resume`

## Problem
`export-resume` expects `tailored_resume_json.professional_summary` and `.work_experience[].role`, but the actual data contract uses `tailored_sections.summary.revised` and `experience[].title`. This function crashes on every invocation. It also generates PDFs from scratch using `pdf-lib` — output looks nothing like the original resume.

## Files to Modify
- `supabase/functions/export-resume/index.ts`

## Options
### Option A: Deprecate (Recommended)
- Delete the function or add a deprecation notice returning `{ error: "Use write-docx instead", code: "DEPRECATED" }`
- Remove any references to `export-resume` in the extension/web code
- The primary export path is now `write-docx` → review → download

### Option B: Rewrite for PDF (ties to TASK-041)
- Rewrite to fetch the finalized DOCX from `write-docx` output URL
- Convert to PDF via CloudConvert API
- This becomes part of TASK-041 (CloudConvert integration)

## Acceptance Criteria
- [ ] Function either removed or correctly handles current data shapes
- [ ] No dead code referencing the old data contract
- [ ] `pnpm review` passes

## Verification
- Confirm no runtime errors from the function
- Confirm extension/web download flow still works via `write-docx`
