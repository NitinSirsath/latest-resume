ALTER TABLE tailored_resumes
ADD COLUMN IF NOT EXISTS job_url text,
ADD COLUMN IF NOT EXISTS application_status text DEFAULT 'prepared';
