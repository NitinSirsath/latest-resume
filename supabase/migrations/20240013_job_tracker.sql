CREATE TABLE public.tracked_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company TEXT NOT NULL,
  role_title TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'Saved',
  salary_range TEXT,
  tailored_resume_id UUID REFERENCES public.tailored_resumes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_tracked_jobs_modtime 
  BEFORE UPDATE ON public.tracked_jobs 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_modified_column();

-- Enable RLS
ALTER TABLE public.tracked_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tracked jobs"
  ON public.tracked_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked jobs"
  ON public.tracked_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked jobs"
  ON public.tracked_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked jobs"
  ON public.tracked_jobs FOR DELETE
  USING (auth.uid() = user_id);
