# Task 01 — Monorepo scaffold

## Acceptance criteria
- [ ] pnpm-workspace.yaml configured for apps/* and packages/*
- [ ] turbo.json with build, dev, typecheck pipelines
- [ ] apps/web — Vite + React 18 + TypeScript + Tailwind + React Router v6
- [ ] apps/web — Vite + React 18 + TypeScript + Tailwind + TanStack Router v1 (file-based) + TanStack Query v5
- [ ] packages/types — shared types: Resume, TailoredResume, User, JDAnalysis, GapReport
- [ ] packages/ui — shadcn/ui initialised, Button + Card + Input components added
- [ ] packages/ai-pipeline — empty index.ts with placeholder exports
- [ ] root package.json with pnpm scripts: dev, build, typecheck
- [ ] .env.example with all keys: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- [ ] `pnpm install` succeeds
- [ ] `pnpm typecheck` passes with zero errors

## Verify with
pnpm install && pnpm typecheck