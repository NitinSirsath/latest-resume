# TASK-051 — Fix Extension Tailoring Flow: Disconnected Orchestration

## Priority: 🔴 P0 (Ship Blocker)
## Branch: `feat/task-051-tailor-orchestration`

## Problem
The background script handles `START_ANALYSIS` and runs the pipeline through analyze-jd → fetch-resume → analyze-gap, then stops at `READY`. The `useTailorMutation` hook calls `tailor-resume` directly from the popup via `supabase.functions.invoke`. This violates the architecture rule: *"Background script is the only place permitted to orchestrate multi-step AI pipelines."*

## Files to Modify
- `apps/extension/src/background/index.ts` — add `START_TAILOR` message handler
- `apps/extension/src/popup/hooks/useTailorMutation.ts` — send message to background instead of calling edge function directly
- `packages/types/src/index.ts` — add `START_TAILOR` to `ExtensionMessaging` type (if needed)

## Solution
1. Add `onMessage('START_TAILOR', ...)` in `background/index.ts` that:
   - Reads stored context (activeJD, analysis, gapReport, tailoredResumeId)
   - Fetches base resume from DB
   - Calls `tailor-resume` edge function
   - Updates chrome.storage with result or error
2. Update `useTailorMutation` to `sendMessage('START_TAILOR', undefined)` instead of calling `supabase.functions.invoke` directly
3. Update `ExtensionMessaging` type if `START_TAILOR` is not already defined

## Acceptance Criteria
- [ ] All AI pipeline calls (analyze-jd, analyze-gap, tailor-resume) go through background script
- [ ] Popup never calls `supabase.functions.invoke` directly
- [ ] Error states are properly reflected in chrome.storage and shown in popup
- [ ] `pnpm review` passes

## Verification
- Trigger full pipeline from extension popup: detect JD → analyze → tailor
- Confirm in DevTools background console that tailor-resume is called from background, not popup
