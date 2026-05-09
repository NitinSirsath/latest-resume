ALTER TABLE public.resumes
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Function to ensure only one default per user
CREATE OR REPLACE FUNCTION ensure_single_default_resume()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.resumes
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run before insert or update
DROP TRIGGER IF EXISTS trg_ensure_single_default_resume ON public.resumes;
CREATE TRIGGER trg_ensure_single_default_resume
BEFORE INSERT OR UPDATE OF is_default ON public.resumes
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_resume();
