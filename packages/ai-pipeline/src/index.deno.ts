// Deno-compatible re-export with explicit .ts extensions
// This file is used by Supabase Edge Functions via the import_map.json
// Note: schemas/job-description.ts uses zod (npm) and is NOT needed by edge functions
export * from './prompts.ts';
export * from './schemas.ts';

export const placeholder = "AI Pipeline initialized";
