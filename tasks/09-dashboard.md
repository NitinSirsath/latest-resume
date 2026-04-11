# Task 09 — Web dashboard

## Acceptance criteria
- [ ] / route — landing page (hero + CTA to sign in)
- [ ] /login — Google OAuth sign in
- [ ] /dashboard — protected, shows:
      resume vault (list of uploaded resumes, upload new)
      tailoring history (list of tailored_resumes rows, with ATS scores)
- [ ] /tailored/:id — full diff view of a tailored resume:
      side by side: original vs tailored
      change_log rendered as highlighted diffs
      download PDF / DOCX buttons
- [ ] All data via TanStack Query (useQuery for lists, useMutation for uploads)
- [ ] TanStack Router file-based routes

## Verify with
cd apps/web && pnpm dev
# navigate all routes, check auth redirect works