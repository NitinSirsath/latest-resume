-- Add missing columns for resume processing
ALTER TABLE public.resumes 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Update existing records to 'completed' if they have parsed_json
UPDATE public.resumes 
SET processing_status = 'completed' 
WHERE parsed_json IS NOT NULL;
