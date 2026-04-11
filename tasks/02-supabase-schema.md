# Task 02 — Supabase schema + local dev

## Acceptance criteria
- [ ] supabase/config.toml configured for local dev
- [ ] Migration file: 20240001_initial_schema.sql with tables:
      resumes (id, user_id, title, file_url, parsed_json, created_at, updated_at)
      tailored_resumes (id, user_id, base_resume_id, job_title, company, job_url, jd_raw, jd_analysis, ats_score, diff_json, output_url, created_at)
      usage_credits (user_id, plan, credits_remaining, reset_at)
- [ ] RLS enabled on all tables, policies: users can only SELECT/INSERT/UPDATE/DELETE their own rows
- [ ] TypeScript types generated into packages/types/supabase.ts
- [ ] supabase/functions/analyze-jd/index.ts — Edge Function stub that returns { ok: true }
- [ ] supabase/functions/tailor-resume/index.ts — Edge Function stub that returns { ok: true }
- [ ] `supabase start` succeeds locally

## Verify with
supabase start
supabase db reset