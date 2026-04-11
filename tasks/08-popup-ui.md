# Task 08 — Extension popup full UI

## Acceptance criteria
- [ ] Popup renders in 400x500px window
- [ ] State machine: LOADING → SIGNED_OUT → NO_RESUME → READY → TAILORING → DONE
- [ ] SIGNED_OUT: Sign in with Google button
- [ ] NO_RESUME: upload base resume (PDF/DOCX), calls Supabase Storage upload
- [ ] READY: shows detected job title + company (from content script), ATS score badge, "Tailor Now" button
- [ ] TAILORING: progress indicator while edge functions run (3 stages shown)
- [ ] DONE: shows new ATS score, diff summary (X changes made), download PDF button + copy button
- [ ] All state via TanStack Query mutations calling edge functions
- [ ] Uses shadcn: Card, Button, Badge, Progress, Separator

## Verify with
pnpm build && load extension in Chrome, visit a LinkedIn job page