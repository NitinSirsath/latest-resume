# Tasks Roadmap — Next Phase

> Updated: 2026-05-09

## Dependency Graph
```
TASK-050 (DOCX formatting) ──► TASK-041 (CloudConvert PDF)
                             ──► TASK-053 (Deprecate export-resume)

TASK-051 (Tailor orchestration) ──► TASK-052 (MANUAL_DETECT handler)

TASK-054 (Auth guards) — independent

TASK-055 (Shared client) ──► TASK-056 (Input validation)
```

## Parallelizable Groups for Worktrees

These groups have **zero file overlap** and can be worked on simultaneously:

| Worktree | Branch | Tasks | Files Touched |
|----------|--------|-------|---------------|
| **wt-docx** | `feat/task-050-docx-formatting` | TASK-050 | `supabase/functions/write-docx/` |
| **wt-extension** | `feat/task-051-tailor-orchestration` | TASK-051, TASK-052 | `apps/extension/src/background/`, `apps/extension/src/popup/hooks/`, `packages/types/` |
| **wt-web** | `feat/task-054-auth-guards` | TASK-054 | `apps/web/src/routes/` |
| **wt-infra** | `refactor/task-055-shared-client` | TASK-055 | `packages/shared/`, `apps/*/src/lib/supabase.ts` |
| **wt-edge** | `feat/task-056-input-validation` | TASK-056 | `supabase/functions/*/index.ts` (⚠️ conflicts with wt-docx on write-docx) |
| **wt-cleanup** | `fix/task-053-export-resume` | TASK-053 | `supabase/functions/export-resume/` |
| **wt-pdf** | `feat/task-041-cloudconvert-pdf` | TASK-041 | New function + `apps/web/src/routes/review.$id.tsx` |

> ⚠️ **wt-edge** (TASK-056) touches all edge functions including write-docx. Merge TASK-050 first.

## Priority Order
1. 🔴 **P0** — TASK-050, TASK-051+052, TASK-054 (parallel worktrees)
2. 🟡 **P1** — TASK-053, TASK-055, TASK-056 (after P0 merged)
3. 🔵 **P2** — TASK-041 (after TASK-050 merged)
