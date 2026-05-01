# AGENT STANDARDS (GEMINI.md)

## 1. Project Identity
ResumeTailor is an AI-driven career optimization tool designed to bridge the gap between static resumes and dynamic job requirements by automating the resume tailoring process to increase the "ATS Match Score".
The core pipeline is: DOCX in → section parse → AI surgical edit → diff review → DOCX out.
The philosophy is: minimum change, maximum relevance, user stays in control.

## 2. Monorepo Map (Quick Reference)
| Package | Purpose | Rules |
|---------|---------|-------|
| apps/web | dashboard UI only | No shared logic |
| apps/extension | extension UI + background only | Background orchestrates AI pipeline |
| packages/types | all TypeScript interfaces | Shared across Deno and Vite |
| packages/ai-pipeline | all prompts + schemas | No prompts in edge functions |
| packages/shared | supabase client | Unified client |
| supabase/functions | all backend + AI logic | Deno runtime, no Node APIs |

## 3. The Data Contract (Non-Negotiable Shapes)

parsed_json shape (output of parse-resume):
```typescript
{
  source_format: "docx",
  parsed_at: string,
  word_count: number,
  sections: {
    summary: { text: string, word_count: number },
    experience: Array<{
      company: string,
      title: string,
      duration: string,
      bullets: string[]
    }>,
    skills: {
      categories: Record<string, string[]>,
      flat_list: string[]
    },
    education: Array<{
      institution: string,
      degree: string,
      year: string
    }>
  }
}
```

tailored_sections shape (output of tailor-resume):
```typescript
{
  final_ats_score: number,
  tailored_sections: {
    summary?: {
      original: string,
      revised: string,
      keywords_added: string[],
      word_count_delta: number,
      reason: string
    },
    experience?: Array<{
      company: string,
      bullets_changed: Array<{
        index: number,
        original: string,
        revised: string,
        reason: string
      }>
    }>,
    skills_added: string[],
    skills_removed: string[]
  },
  change_log: Array<{
    section: string,
    change_type: "modified" | "added" | "removed",
    original: string,
    changed_to: string,
    reason: string,
    impact: "high" | "medium" | "low"
  }>
}
```

review_decision shape (user's accept/reject decisions):
```typescript
{
  tailored_resume_id: string,
  decisions: Array<{
    change_id: string,
    section: string,
    accepted: boolean,
    alternative_requested: boolean,
    final_text: string
  }>
}
```

## 4. Hard Rules (Never Violate)
- NEVER call Gemini from apps/ — always through supabase/functions/
- NEVER use Node.js APIs in supabase/functions/ — Deno only
- NEVER use localStorage in extension — chrome.storage.local only
- NEVER modify manifest.json without explicit instruction
- NEVER use `any` in TypeScript — use @resumetailor/types
- NEVER drop or rename DB columns — only add
- NEVER change the 3 data contract shapes above without instruction
- NEVER run supabase db reset
- NEVER hardcode API keys, user IDs, or URLs

## 5. AI Prompting Standards
Every prompt sent to Gemini must follow these rules:
- Include word count constraint: "Maximum X words — original is Y words"
- Include voice instruction: "Preserve the candidate's original tone and style"
- Include minimum change instruction: "Modify the minimum number of words necessary"
- Include output format: "Return only the changed text, nothing else"
- Include reason requirement: "For every change, provide a reason in max 15 words"
- Use structured JSON output with responseMimeType: "application/json"
- Include responseSchema matching the relevant schema from packages/ai-pipeline

## 6. Edge Function Standards
Every edge function must:
- Handle OPTIONS for CORS preflight
- Use corsHeaders from ../_shared/cors.ts on EVERY response including errors
- Return { data: ... } on success
- Return { error: string, code: string } on failure
- Log with prefix: [function-name] at every major step
- Use SUPABASE_SERVICE_ROLE_KEY for DB writes
- Use Deno.env.get() for all env vars
- Never exceed 200 lines — split into helpers if needed

## 7. Task Completion Protocol
For every single task, the AI must follow this strict sequence:

1. **Write Code**: The AI modifies the target file.
2. **Automated Validation**: The AI must run `pnpm review` (which includes `pnpm typecheck` and the `scripts/review-task.js` forbidden pattern scan) to guarantee no syntax, type, or rule errors were introduced.
3. **Self-Review Checklist**: Before showing the diff, the AI must confirm:
   - Only files listed in the task were touched
   - No data contract shapes changed unless task requires it
   - Zero `any` types introduced
   - All catch blocks have `failedAt: 'specific-step-name'`
   If any answer is NO, fix before showing diff.
4. **Generate Diff**: The AI runs `git diff` on the modified files and presents the clean diff directly in the chat.
5. **Explain the "Why"**: The AI provides a 1-sentence explanation of how the code specifically solves the task.
6. **Human Checkpoint**: The AI stops and waits. It does not update progress.json and does not move to the next task until the user explicitly replies with "Approved".
7. **Commit**: Once approved, create a git commit. Every git commit message must follow this format:
   feat: [description] ([TASK-ID])
   
   Modified: [files]
   Next task: [TASK-ID]
   Review: pnpm review PASSED
8. **Progress Update**: Only after the commit, update progress.json and proceed.

## 8. UI Standards
- All diff UI must use these exact color tokens:
  Added: green-500 / bg-green-50
  Removed: red-500 / bg-red-50
  Unchanged: gray-700 / bg-gray-50
- All change cards must show: section name, reason, impact badge, accept/reject buttons
- Impact badges: HIGH (red), MEDIUM (yellow), LOW (gray)
- Loading states required for all async operations
- Error states must show specific message — never "Something went wrong"