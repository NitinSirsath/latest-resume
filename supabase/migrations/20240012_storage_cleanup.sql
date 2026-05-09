-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add cleaned_at column
ALTER TABLE public.tailored_resumes
ADD COLUMN IF NOT EXISTS cleaned_at TIMESTAMPTZ;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_outputs()
RETURNS void AS $$
DECLARE
  old_record RECORD;
BEGIN
  FOR old_record IN
    SELECT id, output_url, user_id
    FROM public.tailored_resumes
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND output_url IS NOT NULL
  LOOP
    -- Mark as cleaned (actual storage deletion via edge function or DB trigger in future)
    UPDATE public.tailored_resumes
    SET output_url = NULL,
        cleaned_at = NOW()
    WHERE id = old_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily at 2am UTC
SELECT cron.schedule('cleanup-old-outputs', '0 2 * * *', 'SELECT cleanup_old_outputs()');
