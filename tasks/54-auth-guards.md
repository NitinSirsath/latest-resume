# TASK-054 — Auth Guard on Protected Web Routes

## Priority: 🔴 P0 (Ship Blocker)
## Branch: `feat/task-054-auth-guards`

## Problem
The web dashboard has no route-level auth guard. Unauthenticated users navigating to `/dashboard`, `/review/:id`, or `/tailored/:id` see the page with empty data instead of being redirected to `/login`.

## Files to Modify
- `apps/web/src/routes/__root.tsx` — or create a protected layout route
- `apps/web/src/routes/dashboard.tsx`
- `apps/web/src/routes/review.$id.tsx`
- `apps/web/src/routes/tailored.$id.tsx`

## Solution
Use TanStack Router's `beforeLoad` hook to check auth state:

```typescript
// Option 1: Per-route beforeLoad
export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    const session = useAuthStore.getState().session
    if (!session) throw redirect({ to: '/login' })
  },
  component: Dashboard,
})
```

```typescript
// Option 2: Protected layout route (preferred — DRY)
// apps/web/src/routes/_protected.tsx
export const Route = createFileRoute('/_protected')({
  beforeLoad: () => {
    const session = useAuthStore.getState().session
    if (!session) throw redirect({ to: '/login' })
  },
  component: () => <Outlet />,
})
// Then nest: _protected/dashboard.tsx, _protected/review.$id.tsx, etc.
```

## Acceptance Criteria
- [ ] Unauthenticated users are redirected to `/login` for all protected routes
- [ ] Redirect preserves the intended destination (redirect back after login)
- [ ] `pnpm review` passes

## Verification
- Open `/dashboard` in incognito — should redirect to `/login`
- Sign in — should land on `/dashboard`
