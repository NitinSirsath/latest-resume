CREATE OR REPLACE VIEW resume_processing_status AS
SELECT 
  id,
  title,
  processing_status,
  parsed_json->>'source_format' as source_format,
  (parsed_json->'sections'->'summary'->>'word_count')::int as summary_word_count,
  updated_at
FROM resumes;
