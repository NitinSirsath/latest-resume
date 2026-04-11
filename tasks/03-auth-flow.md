Read gemini.md and tasks/03-auth-flow.md.

Implement auth for both apps/web (React SPA) and apps/extension (Manifest V3 service worker).

For the extension: use chrome.identity.launchWebAuthFlow for the OAuth redirect.
Store the Supabase session in chrome.storage.local.
The service worker must refresh the token before it expires.

Run pnpm typecheck. Fix all errors.

Commit: "feat: auth flow web and extension"
Update progress.json accordingly.