# Task 11: Workflow Optimization, Error UI, & Dark Mode

## Description
This phase transitions the browser extension from an auto-triggering AI pipeline to a manual user-triggered workflow to save API quotas. It also introduces a clean UI to parse and display Gemini 429 Rate Limit errors, and integrates a comprehensive Dark Mode across both the Web Application and the Browser Extension using Tailwind CSS and a theme provider.

## Checklist

### Phase 1: Workflow Modification
- [x] **Background Script (`apps/extension/src/background/index.ts`)**: 
  - In `onMessage('JD_SCRAPED')`, stop immediately calling `runPipeline(payload, session.user.id)`. 
  - Instead, update `chromeStorage` with `activeJD: payload` and set `status: 'IDLE'`.
  - Add a new message listener for `START_ANALYSIS` that reads `activeJD` from `chromeStorage` and manually calls `runPipeline`.
- [x] **Extension Dashboard (`apps/extension/src/popup/components/Dashboard.tsx`)**: 
  - Add a new UI block for when `status === 'IDLE'` and `context.activeJD` exists. 
  - Display the detected Job Title and Company.
  - Render a primary "Start AI Analysis" button.
  - Connect this button to send the `START_ANALYSIS` message to the background script using `chrome.runtime.sendMessage`.

### Phase 2: Error UI Cleanup
- [x] **Error Parsing**: In `Dashboard.tsx`, create a helper to intercept generic error messages (e.g., from `tailorMutation.error` or `exportMutation.error`). If it contains "429" or "quota", display: *"Rate Limit Exceeded: You have hit the AI limit. Please wait a minute and try again."*
- [x] **UI Overflow Fix**: Apply strict Tailwind boundary classes to the error containers (e.g., `max-h-32 overflow-y-auto break-words text-xs bg-red-50 text-red-500 rounded p-2`) to ensure large JSON error dumps do not break the extension popup bounds.

### Phase 3: Dark Mode Configuration
- [x] **Tailwind Configs**: Add `darkMode: "class"` to both `apps/web/tailwind.config.js` and `apps/extension/tailwind.config.js`.
- [x] **Theme Provider (`packages/ui/src/components/theme-provider.tsx`)**: 
  - Create a React context provider to manage `theme` state (`light`, `dark`, `system`).
  - Automatically add/remove the `.dark` class on the HTML `document.documentElement` root based on the theme.
  - Persist user choice appropriately (e.g. using localStorage).
- [x] **Theme Toggle (`packages/ui/src/components/theme-toggle.tsx`)**: 
  - Create a button using `lucide-react` icons (Sun/Moon) to allow manual theme switching.

### Phase 4: Dark Mode Integration
- [x] **Web App Wrapper**: Wrap the `Router` or `RootContent` inside `apps/web/src/main.tsx` or `__root.tsx` with `<ThemeProvider defaultTheme="system">`.
- [x] **Extension Wrapper**: Wrap `apps/extension/src/popup/main.tsx` in `<ThemeProvider defaultTheme="system">`.
- [x] **Web UI Implementation**: Insert the `ThemeToggle` component into the Web App Header inside `apps/web/src/routes/__root.tsx`.
- [x] **Extension UI Implementation**: Insert the `ThemeToggle` component into the Extension Popup Header in `Dashboard.tsx`.
- [x] **Audit**: Ensure existing hardcoded colors (e.g., `bg-white`, `text-slate-900`, `bg-slate-50`) have correct `dark:` counterparts across both apps.

## Verify with
1. Run `pnpm build` in the extension to ensure it compiles.
2. Verify clicking a LinkedIn job shows the "Start AI Analysis" button instead of auto-loading.
3. Toggle dark mode in both apps and verify color inversion.
