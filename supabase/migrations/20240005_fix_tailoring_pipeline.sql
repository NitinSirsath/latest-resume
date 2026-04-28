-- Fix tailoring pipeline: make base_resume_id nullable and add tailored_json storage

-- 1. Make base_resume_id nullable (it's unknown at JD analysis time)
ALTER TABLE public.tailored_resumes ALTER COLUMN base_resume_id DROP NOT NULL;

-- 2. Add column to store the full tailored resume JSON output
ALTER TABLE public.tailored_resumes ADD COLUMN IF NOT EXISTS tailored_json JSONB;
