-- Fix resumes stuck in pending state that actually have parsed_json
UPDATE public.resumes
SET processing_status = 'completed'
WHERE processing_status = 'pending'
AND parsed_json IS NOT NULL;

-- Fix resumes stuck in pending with no parsed_json and no content
-- These need to be re-uploaded, so mark them failed with a clear message
UPDATE public.resumes  
SET processing_status = 'failed',
    processing_error = 'Resume was uploaded before parsing was implemented. Please re-upload.'
WHERE processing_status = 'pending'
AND parsed_json IS NULL
AND content IS NULL;
