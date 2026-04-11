# Task 04 — Extension scaffold

## Acceptance criteria
- [ ] apps/extension/manifest.json — Manifest V3, permissions: storage, identity, activeTab
      host_permissions: linkedin.com, naukri.com, indeed.com, wellfound.com
- [ ] apps/extension/vite.config.ts — multi-entry build:
      popup → src/popup/main.tsx
      content → src/content/index.ts
      background → src/background/index.ts
- [ ] src/popup/main.tsx — React 18 root, renders <App />
- [ ] src/popup/App.tsx — shows SignIn screen if no token, shows Dashboard if authenticated
      use shadcn Card, Button components
- [ ] src/popup/components/SignIn.tsx — "Sign in with Google" button
- [ ] src/popup/components/Dashboard.tsx — placeholder: user email + "Tailor Resume" button (disabled for now)
- [ ] src/background/index.ts — service worker:
      listens for chrome.runtime.onMessage
      handles message types: GET_SESSION, REFRESH_TOKEN
      stores Supabase session in chrome.storage.local
- [ ] src/content/index.ts — content script stub:
      on load: detects current hostname
      logs which portal is detected (linkedin/naukri/indeed/wellfound/unknown)
      sends message to background: { type: "PORTAL_DETECTED", portal: "linkedin" }
- [ ] packages/types/extension.ts — shared message types:
      ExtensionMessage, PortalType, SessionMessage
- [ ] `pnpm build` inside apps/extension succeeds and outputs dist/

## Verify with
cd apps/extension && pnpm build
# dist/ folder should contain popup.html, background.js, content.js