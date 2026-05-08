# TASK-041 — CloudConvert Integration (DOCX → PDF)

## Priority: 🔵 P2 (Feature)
## Branch: `feat/task-041-cloudconvert-pdf`
## Depends On: TASK-050 (no point converting a formatting-destroyed DOCX)

## Problem
Users may need PDF output for certain ATS systems. Currently only DOCX is supported.

## Files to Create/Modify
- `supabase/functions/convert-pdf/index.ts` (new edge function)
- `apps/web/src/routes/review.$id.tsx` — add "Download as PDF" button
- `supabase/functions/_shared/cors.ts` — ensure CORS covers new function

## Solution
1. Create `convert-pdf` edge function:
   - Accepts `{ output_url: string, tailored_resume_id: string, user_id: string }`
   - Downloads finalized DOCX from `output_url`
   - Sends to CloudConvert API for DOCX→PDF conversion
   - Uploads PDF to Supabase Storage `outputs/` bucket
   - Returns signed URL for PDF download
2. Add "Download as PDF" button on review success page

## Environment Variables Needed
- `CLOUDCONVERT_API_KEY` — set in Supabase Edge Function secrets

## Acceptance Criteria
- [ ] User can download both DOCX and PDF versions of tailored resume
- [ ] PDF preserves all formatting from the DOCX
- [ ] Loading state shown during conversion
- [ ] Error handling with specific messages
- [ ] `pnpm review` passes

## Verification
- Complete review flow → download PDF → open and verify formatting matches DOCX
