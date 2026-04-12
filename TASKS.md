# Agent Rules (read this first on every iteration)
- Stack: pnpm, TypeScript strict, Deno in edge functions, React 18 + Vite + TanStack Router + TanStack Query
- Gemini calls ONLY from supabase/functions — never from frontend
- Run pnpm typecheck after every file change, fix errors immediately
- Use npm: prefix for imports in Deno edge functions (not node_modules)
- Commit each completed task with conventional commits
- Never hardcode secrets — Deno.env.get() in functions, import.meta.env in React
- Update progress.txt after each task completes

# ResumeTailor Tasks

## Task 05 — Content script JD scrapers
- [ ] src/content/adapters/base.ts — BaseAdapter interface
- [ ] src/content/adapters/linkedin.ts
- [ ] src/content/adapters/naukri.ts
- [ ] src/content/adapters/indeed.ts
- [ ] src/content/adapters/wellfound.ts
- [ ] src/content/detector.ts
- [ ] src/content/index.ts updated to send JD_SCRAPED message
- [ ] pnpm typecheck passes

## Task 06 — Gemini JD analyser edge function
- [ ] supabase/functions/analyze-jd/index.ts full implementation
- [ ] supabase/functions/analyze-gap/index.ts full implementation
- [ ] Both use npm:@google/generative-ai with responseSchema structured output
- [ ] Proper CORS headers for extension origin
- [ ] pnpm typecheck passes

## Task 07 — Gemini resume tailor edge function
- [ ] supabase/functions/tailor-resume/index.ts full implementation
- [ ] packages/ai-pipeline/index.ts prompt templates as constants
- [ ] packages/ai-pipeline/schemas.ts all Gemini responseSchema objects
- [ ] pnpm typecheck passes

## Task 08 — Extension popup full UI
- [ ] State machine: LOADING → SIGNED_OUT → NO_RESUME → READY → TAILORING → DONE
- [ ] TanStack Query mutations calling edge functions
- [ ] shadcn components: Card, Button, Badge, Progress
- [ ] pnpm build succeeds

## Task 09 — Web dashboard
- [ ] TanStack Router file-based routes
- [ ] /dashboard resume vault + tailoring history
- [ ] /tailored/:id diff view with change_log
- [ ] TanStack Query for all data fetching
- [ ] pnpm typecheck passes

## Task 10 — PDF export
- [ ] supabase/functions/export-resume/index.ts
- [ ] PDF via pdf-lib, DOCX via docx (npm: imports for Deno)
- [ ] Returns signed Supabase Storage URL
- [ ] pnpm typecheck passes