-- Setup storage buckets and policies for ResumeTailor

-- 1. Create buckets (resumes for base files, outputs for tailored ones)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('outputs', 'outputs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for 'resumes' bucket
CREATE POLICY "Users can upload their own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. RLS Policies for 'outputs' bucket (tailored results)
CREATE POLICY "Users can view their own tailored outputs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'outputs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Note: Edge functions using Service Role will handle the insertion of generated files
