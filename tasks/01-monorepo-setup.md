# Task 01 — Monorepo scaffold

## Acceptance criteria
- [x] pnpm-workspace.yaml configured for apps/* and packages/*
- [x] turbo.json with build, dev, typecheck pipelines
- [x] apps/web — Vite + React 18 + TypeScript + Tailwind + TanStack Router v1 (file-based) + TanStack Query v5
- [x] apps/extension — Manifest V3 scaffold with popup, content, background entries
- [x] packages/types — shared types: Resume, TailoredResume, User, JDAnalysis, GapReport
- [x] packages/ui — shadcn/ui components added: Button, Card, Input
- [x] packages/ai-pipeline — placeholder exports added
- [x] root package.json with pnpm scripts: dev, build, typecheck
- [x] .env.example with all keys: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- [x] `pnpm install` succeeds
- [x] `pnpm typecheck` passes with zero errors

## Verify with
pnpm install && pnpm typecheck