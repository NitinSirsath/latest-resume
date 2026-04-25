# STATUS: ResumeTailor Project Audit

## Complete & Working ✅
- **Monorepo Setup**: pnpm workspaces and Turborepo are configured and functional.
- **Database Schema**: `resumes` and `tailored_resumes` tables are created with proper RLS policies.
- **Scraper Infrastructure**: Detection logic and adapters for LinkedIn, Indeed, Naukri, and Wellfound are implemented and correctly sending data to the background script.
- **JD & Gap Analysis**: `analyze-jd` and `analyze-gap` edge functions are implemented and utilizing Gemini 1.5 Flash for structured data extraction.
- **Base Resume Vault**: Web dashboard can upload files to Supabase Storage and track them in the database.

## Broken & Why ❌
- **`export-resume` Edge Function**: The file exists but is effectively a placeholder or missing critical logic for PDF/DOCX generation.
- **Background Orchestration**: The pipeline in `background/index.ts` is a "waterfall" of awaits without robust retry logic; if one edge function fails, the entire context in storage stays in a stale state.
- **Tailoring Logic**: The `tailor-resume` function updates the DB but doesn't yet trigger the "Export" flow correctly, leaving the user with a "Diff" but no downloadable file.

## Partially Done 🏗️
- **Extension Popup UI**: Basic Dashboard and SignIn views exist, but the state machine (transitions between scraping, analyzing, and tailoring) is not fully synchronized with background states.
- **Auth Sync**: While Google OAuth works in both, the extension and web dashboard don't explicitly "share" the session state cleanly; if a user logs out of one, the other might remain logged in until a refresh.

## Missing Entirely 🕳️
- **PDF Export Implementation**: No actual PDF generation library is fully integrated in the edge functions.
- **Unit/Integration Tests**: There are zero tests in the codebase.
- **Deployment Config**: No CI/CD pipelines (GitHub Actions) or production Supabase/Vercel project configurations found.

## Known Bugs 🐜
- **Scraper Fragility**: LinkedIn adapter uses specific CSS classes (`.job-details__description`) which break when LinkedIn rotates their A/B testing layouts.
- **Silent Failures**: If the Gemini API hits a safety filter, the edge function returns a 500 but the extension popup doesn't show a clear "Safety Blocked" message.

## Structural Problems 🏗️
- **Code Duplication**: `lib/supabase.ts` is duplicated between `apps/web` and `apps/extension`. This should be moved to a shared package.
- **Zustand vs Chrome Storage**: The extension uses `chrome.storage` for context but doesn't use a store like Zustand for UI state, leading to complex `useEffect` chains for storage listeners.
- **No Validation Layer**: Data flowing from Content Scripts (untrusted DOM) to Edge Functions (trusted AI) is not validated via Zod on the ingestion side.
