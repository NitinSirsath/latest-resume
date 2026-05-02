// Deno-compatible re-export with explicit .ts extensions
// This file is used by Supabase Edge Functions via the import_map.json
export * from './prompts.ts';
export * from './schemas.ts';
export * from './schemas/job-description.ts';

export const placeholder = "AI Pipeline initialized";
