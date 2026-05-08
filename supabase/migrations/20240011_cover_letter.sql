ALTER TABLE public.tailored_resumes
ADD COLUMN IF NOT EXISTS cover_letter_json JSONB;
