# Task 09 — Phase 4: Web Dashboard & History

## Goals
Provide a central hub for users to manage their resumes and view their tailoring history in detail.

## Acceptance Criteria
- [ ] **Landing Page**:
    - Update `/` route with a hero section and "Get Started" CTA.
- [ ] **Dashboard Home**:
    - Implement `/dashboard` showing:
        - **Resume Vault**: List of uploaded resumes with "Upload New" functionality.
        - **Tailoring History**: List of all `tailored_resumes` with ATS scores and dates.
- [ ] **Tailored View**:
    - Implement `/tailored/:id` featuring:
        - Side-by-side comparison of original vs. tailored content.
        - Strategic highlighting of keywords and changes (Change Log).
        - Direct download buttons (PDF/DOCX).
- [ ] **TanStack Router**:
    - Proper protected route handling (Auth guard).

## Verification
- Run `pnpm dev` in `apps/web`.
- Verify history list loads data from Supabase.
- Verify side-by-side diff view renders accurately.