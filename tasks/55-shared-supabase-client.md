# TASK-055 — Deduplicate Supabase Client into packages/shared

## Priority: 🟡 P1
## Branch: `refactor/task-055-shared-client`

## Problem
`apps/web/src/lib/supabase.ts` and `apps/extension/src/lib/supabase.ts` are duplicated. `packages/shared` exists but isn't used consistently. Flagged in STATUS.md as a structural problem.

## Files to Modify
- `packages/shared/src/index.ts` — export client factory
- `apps/web/src/lib/supabase.ts` — import from `@resumetailor/shared`
- `apps/extension/src/lib/supabase.ts` — import from `@resumetailor/shared`

## Solution
1. Create a `createSupabaseClient(storage?)` factory in `packages/shared`
2. Web uses default `localStorage` adapter
3. Extension uses a custom adapter wrapping `chrome.storage.local`
4. Both apps import `supabase` from `@resumetailor/shared`

## Acceptance Criteria
- [ ] Single source of truth for Supabase client creation
- [ ] Web and extension both work with their respective storage backends
- [ ] No duplicated Supabase config
- [ ] `pnpm review` passes

## Verification
- Auth flow works in both web dashboard and extension after refactor
