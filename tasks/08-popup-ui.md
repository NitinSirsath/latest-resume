# Task 08 — Phase 3: Unified UI & Popup State

## Goals
Transform the extension popup from a static "Signed In" view into a dynamic state machine that guides the user through the tailoring process.

## Acceptance Criteria
- [ ] **Missing UI Components**:
    - Build `Badge`, `Progress`, and `Separator` in `packages/ui`.
- [ ] **Popup State Machine**:
    - Implement the following states in `App.tsx`:
        - `LOADING`: Initial session check.
        - `SIGNED_OUT`: Show Google Login button.
        - `NO_RESUME`: Prompt to upload a base resume (Vault check).
        - `READY`: Show job title + "Tailor Now" button.
        - `TAILORING`: Show progress bar (Analyzing → Tailoring).
        - `DONE`: Show new ATS score and download options.
- [ ] **TanStack Query Mutations**:
    - `useMutation` for triggering the edge functions from the popup.
    - Automatic caching of results in `chrome.storage.session`.

## Verification
- Build extension: `pnpm build`.
- Load in Chrome and visit LinkedIn.
- Verify transition from `READY` to `DONE` via the UI.