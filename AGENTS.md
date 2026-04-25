# AGENTS: Rules for Future AI Contributors

## Folder & File Structure
- **Apps**: `apps/extension` and `apps/web`. Never add shared logic here; use `packages/`.
- **Shared UI**: All components must be added to `packages/ui` first, then imported.
- **AI Logic**: Prompts and schemas MUST live in `packages/ai-pipeline`. Do not define prompts inside edge functions.
- **Backend**: All server-side logic must be in `supabase/functions`.

## Naming Conventions
- **Files**: Kebab-case for all files (`analyze-jd`, `tailor-resume`).
- **Components**: PascalCase for React components.
- **Variables**: camelCase for TS/JS, snake_case for Database columns.
- **Conventional Commits**: Use `feat:`, `fix:`, `chore:`, or `refactor:`.

## Forbidden Actions
- **Do NOT** modify `manifest.json` permissions unless explicitly requested.
- **Do NOT** call Gemini (or any LLM) directly from `apps/`. It must go through a Supabase Edge Function.
- **Do NOT** use Node.js specific APIs (e.g., `fs`, `process`) in `supabase/functions`; they run on Deno. Use `Deno.env.get()` for environment variables.

## Extension Boundaries
- **Content Scripts**: Keep them lightweight. Only for DOM interaction and portal detection. No heavy logic or API calls.
- **Background Script**: The only place permitted to orchestrate multi-step AI pipelines.
- **Storage**: Use `chrome.storage.local` for shared state between popup and background. Never use `localStorage` in extension scripts.

## Code Style Rules
- **TypeScript Strict**: No `any` allowed. Use interfaces from `@resumetailor/types`.
- **Async/Await**: Always use try/catch blocks. Background scripts must handle failures gracefully by updating storage state.
- **TanStack**: Use TanStack Router for all web routing and TanStack Query for all server-state.

## What to do when unsure
- **Ask immediately** if a portal adapter's selectors are ambiguous.
- **Never assume** the user has a valid session; always check `supabase.auth.getSession()` before initiating the AI pipeline.

## Task Completion Checklist
- [ ] Run `pnpm typecheck` and ensure zero errors.
- [ ] Verify that no secrets are hardcoded.
- [ ] Update `progress.json` with the latest task status.
- [ ] Ensure `manifest.json` version is incremented if making breaking changes to the extension.
- [ ] Check CORS headers if adding/modifying an Edge Function.
