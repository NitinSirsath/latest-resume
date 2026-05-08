# TASK-052 — Missing MANUAL_DETECT Handler in Background

## Priority: 🔴 P0 (Ship Blocker)
## Branch: `feat/task-052-manual-detect`

## Problem
`Dashboard.tsx` sends `sendMessage('MANUAL_DETECT', ...)` when the user clicks "Scan Page", but there is **no `MANUAL_DETECT` handler** registered in `background/index.ts`. This will throw a runtime error every time the button is pressed.

## Files to Modify
- `apps/extension/src/background/index.ts` — add `MANUAL_DETECT` message handler
- `packages/types/src/index.ts` — add `MANUAL_DETECT` to `ExtensionMessaging` type (if not present)

## Solution
Add `onMessage('MANUAL_DETECT', ...)` handler that:
1. Queries the active tab
2. Sends a message to the content script on that tab to re-run JD detection
3. Returns `{ success: boolean; error?: string }` to the popup

## Acceptance Criteria
- [ ] "Scan Page" button works without runtime errors
- [ ] Triggers JD detection on the active tab
- [ ] Returns meaningful error if no content script is loaded on the tab
- [ ] `pnpm review` passes

## Verification
- Open a LinkedIn job page, click "Scan Page" in popup — JD should be detected
- Open a non-job page, click "Scan Page" — should show error message gracefully
