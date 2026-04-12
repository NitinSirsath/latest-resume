# ResumeTailor — Technical Roadmap (Phased)

This roadmap orchestrates the development of ResumeTailor through 5 distinct phases. Each phase builds upon the previous, ensuring a verifiable and iterative cycle.

## Phases at a Glance

| Phase | Goal | Key Task Files | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **AI Core & Pipelines** | `06-gemini-jd-analyser.md`, `07-gemini-tailor.md` | 🔄 In Progress |
| **Phase 2** | **Extension Logic** | `05-content-scraper.md` (Update) | ⏸ Pending |
| **Phase 3** | **Unified UI & State** | `08-popup-ui.md` | ⏸ Pending |
| **Phase 4** | **Web Dashboard** | `09-web-dashboard.md` | ⏸ Pending |
| **Phase 5** | **Export & Polish** | `10-pdf-export.md` | ⏸ Pending |

---

## Phase 1: AI Core & Pipelines
*Focus: Getting the intelligence right before the UI.*

- [ ] Implement Gemini Schemas in `packages/ai-pipeline/src/schemas.ts`
- [ ] Implement Prompt Templates in `packages/ai-pipeline/src/prompts.ts`
- [ ] Full implementation of `supabase/functions/analyze-jd`
- [ ] Create `supabase/functions/analyze-gap`
- [ ] Full implementation of `supabase/functions/tailor-resume`
- [ ] Integration: Verified via `curl` tests.

## Phase 2: Extension Intelligence
*Focus: Orchestrating the data flow between Web and AI.*

- [ ] Improve Scraper robustness (MutationObserver vs setTimeout).
- [ ] Background message handler for `JD_SCRAPED` to trigger edge functions.
- [ ] Chrome Storage caching for active JD and Analysis results.

## Phase 3: Unified UI & State
*Focus: Building a premium, responsive popup experience.*

- [ ] Add missing shadcn components to `packages/ui`.
- [ ] Implement Popup State Machine (LOADING → SIGNED_OUT → NO_RESUME → READY → TAILORING → DONE).
- [ ] TanStack Query mutations for tailoring flow.

## Phase 4: Web Experience
*Focus: The "Resume Vault" and History.*

- [ ] Implement `/dashboard` layout.
- [ ] Resume upload & list view.
- [ ] Side-by-side Diff Viewer for tailored results.

## Phase 5: Export & Polish
*Focus: High-fidelity output and final security check.*

- [ ] PDF and DOCX generation edge functions.
- [ ] Signed download URL logic.
- [ ] Storage RLS policies for `outputs/`.
- [ ] Performance audit & bundle size optimization.

---
*Reference: Use pnpm typecheck at every phase increment.*
