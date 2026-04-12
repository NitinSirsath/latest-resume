# Task 10 — Phase 5: Export & Production Polish

## Goals
Finalize the product with high-fidelity exports and ensure the security and performance are production-ready.

## Acceptance Criteria
- [ ] **Edge Function: `export-resume`**:
    - Build `supabase/functions/export-resume/index.ts`.
    - Support PDF generation via `npm:pdf-lib`.
    - Support DOCX generation via `npm:docx`.
    - Implement signed URL generation for secure, temporary downloads.
- [ ] **Infrastructure**:
    - Configure Supabase Storage buckets for `outputs/`.
    - Apply RLS policies to the storage bucket.
- [ ] **Performance & Bundle**:
    - Optimize extension bundle size for Chrome Web Store.
    - Final `pnpm typecheck` and lint pass across the monorepo.
- [ ] **Final Polish**:
    - Dark mode support for the popup.
    - Success/Error toast notifications in the web dashboard.

## Verification
- Successfully download a tailored resume as a PDF from the extension.
- Verify that storage URLs expire and are not publicly accessible.