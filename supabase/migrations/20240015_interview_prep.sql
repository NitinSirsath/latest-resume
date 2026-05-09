ALTER TABLE public.tailored_resumes
ADD COLUMN IF NOT EXISTS interview_prep_json JSONB;
