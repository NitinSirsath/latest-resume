# PROJECT: ResumeTailor

## Vision and Goal
ResumeTailor is an AI-driven career optimization tool designed to bridge the gap between static resumes and dynamic job requirements. The core goal is to automate the tedious process of tailoring resumes for specific job descriptions (JDs), increasing the user's "ATS Match Score" and improving their chances of landing interviews.

## Target User
- **Active Job Seekers**: Professionals in tech and services applying to multiple roles daily.
- **Power Applicants**: Users who want to maintain high-quality applications at scale.
- **Platforms Targeted**: LinkedIn, Naukri, Indeed, and Wellfound.

## Core User Flows
1. **Onboarding**: User signs up via Google OAuth on the web dashboard and uploads their master "Base Resume" (PDF/DOCX) to the Vault.
2. **Detection**: User browses job listings on supported portals. The Chrome extension automatically detects the portal and scrapes the JD content.
3. **Intelligence**: The extension triggers a background pipeline:
   - **Analyze JD**: Extracts keywords, tech stack, and seniority.
   - **Analyze Gap**: Compares the scraped JD with the user's Base Resume to generate an ATS score and improvement list.
4. **Tailoring**: User opens the extension popup, sees their match score, and clicks "Tailor Now". The AI generates optimized experience bullets and summaries.
5. **Finalization**: User reviews the "Diff" in the dashboard, exports the tailored resume as a PDF, and submits their application.

## Tech Stack
- **Monorepo**: pnpm Workspaces + Turborepo.
- **Frontend**: React 18, Vite, TanStack Router (v1), TanStack Query (v5).
- **Styling**: Tailwind CSS + shadcn/ui.
- **Backend**: Supabase (Auth, Postgres, Storage, Edge Functions).
- **AI**: Gemini 1.5 Flash/Pro (invoked via Supabase Edge Functions).
- **State**: Zustand (Client UI/Auth), TanStack Query (Server State), Chrome Storage (Extension Context).

## Browser Targets
- **Google Chrome**: Primary target for the extension (Manifest V3).
- **Modern Browsers**: For the web dashboard.

## Extension Anatomy
- **Background Script (`src/background`)**: The "Brain". Handles OAuth flows, orchestrates the AI pipeline across multiple edge function calls, and persists state to `chrome.storage.local`.
- **Content Script (`src/content`)**: The "Sensor". Detects the current job portal and uses specific adapters to scrape the DOM for job details without user intervention.
- **Popup (`src/popup`)**: The "Interface". Displays the current application status, match score, and provides the primary CTA for tailoring.
