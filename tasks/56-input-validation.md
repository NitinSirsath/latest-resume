# TASK-056 — Input Validation on Edge Functions

## Priority: 🟡 P1
## Branch: `feat/task-056-input-validation`

## Problem
No input validation on any edge function. Data from content scripts (untrusted DOM) flows directly to AI functions without schema validation. Malformed `jd_text` could cause silent failures or prompt injection.

## Files to Modify
- `supabase/functions/analyze-jd/index.ts`
- `supabase/functions/analyze-gap/index.ts`
- `supabase/functions/tailor-resume/index.ts`
- `supabase/functions/write-docx/index.ts`
- `supabase/functions/review-changes/index.ts`

## Solution
Add lightweight validation at the top of each edge function for required request body fields. Since Zod doesn't work well in Deno edge functions (previous issues with bundling), use manual validation with clear error messages:

```typescript
// Validate required fields
const body = await req.json()
if (!body.jd_text || typeof body.jd_text !== 'string') {
  return new Response(
    JSON.stringify({ error: "Missing or invalid jd_text", code: "VALIDATION_ERROR" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
}
```

## Acceptance Criteria
- [ ] Every edge function validates required fields before processing
- [ ] Invalid requests return `{ error, code: "VALIDATION_ERROR" }` with 400 status
- [ ] Error messages are specific (e.g., "Missing jd_text" not "Invalid input")
- [ ] `pnpm review` passes

## Verification
- Call each function with missing/malformed fields → get 400 with clear error
- Call with valid fields → works as before
