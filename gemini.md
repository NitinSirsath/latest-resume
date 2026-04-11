# gemini.md

## Stack
- pnpm workspaces + Turborepo
- TypeScript strict mode everywhere
- Supabase Edge Functions = Deno runtime (not Node — no fs, no process.env, no require)
- Gemini calls ONLY from supabase/functions — never from frontend or extension directly
- React 18 + Vite + shadcn/ui + Tailwind
- TanStack Router v1 for routing (file-based, type-safe) — NOT React Router
- TanStack Query v5 for all server state (Supabase fetches, mutations, caching)
- Zustand for client-only UI state (auth session, extension popup state)

## Rules
- Always run `pnpm typecheck` after any code change
- Commit after each completed task: conventional commits (feat:, fix:, chore:)
- If a test fails 3 times, stop and document the blocker in progress.json
- Never hardcode secrets — use Deno.env.get() in edge functions, import.meta.env in React
- Never modify .env files without showing diff first
- Never force-push

## Forbidden
- Do not call Gemini API from apps/ directly
- Do not use npm or yarn
- Do not use Node-specific APIs in supabase/functions