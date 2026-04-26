-- Initial Schema for ResumeTailor

-- 1. Resumes table
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    parsed_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tailored Resumes table
CREATE TABLE IF NOT EXISTS public.tailored_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    base_resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    job_url TEXT,
    jd_raw TEXT NOT NULL,
    jd_analysis JSONB,
    ats_score INTEGER,
    diff_json JSONB,
    output_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Usage Credits table
CREATE TABLE IF NOT EXISTS public.usage_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free',
    credits_remaining INTEGER NOT NULL DEFAULT 5,
    reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailored_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_credits ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Resumes: Users can only see/edit their own resumes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own resumes') THEN
        CREATE POLICY "Users can manage their own resumes" ON public.resumes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Tailored Resumes: Users can only see/edit their own tailored resumes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own tailored resumes') THEN
        CREATE POLICY "Users can manage their own tailored resumes" ON public.tailored_resumes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Usage Credits: Users can only read their own credits
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read their own credits') THEN
        CREATE POLICY "Users can read their own credits" ON public.usage_credits FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Trigger to create usage_credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_credits (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 7. Updated at trigger for resumes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_resume_updated') THEN
        CREATE TRIGGER on_resume_updated
          BEFORE UPDATE ON public.resumes
          FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
