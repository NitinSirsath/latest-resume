# ResumeTailor — Product Requirements Document (PRD)

## 1. Vision
ResumeTailor is an AI-first career tool that helps job seekers stand out by automatically tailoring their resumes to specific job descriptions with precision and speed. It bridges the gap between static resumes and dynamic job market requirements.

## 2. Target Audience
*   **Job Seekers**: Specifically those in tech and professional services who apply through platforms like LinkedIn, Naukri, and Indeed.
*   **Power Applicants**: Users managing dozens of applications who need to maintain quality while increasing volume.

## 3. Core Features
### A. Browser Extension (The Scraper & Intelligence Hub)
*   **Automatic Detection**: Detects job portals (LinkedIn, Naukri, Indeed, Wellfound).
*   **One-Click Scraping**: Extracts job title, company, description, and requirements.
*   **ATS Analysis**: Real-time gap analysis between the user's base resume and the scraped job description.
*   **On-the-fly Tailoring**: Triggers AI rewrites of summaries and experience bullets directly from the browser popup.

### B. AI Pipeline (The Engine)
*   **JD Analysis**: Structured extraction of seniority, tech stack, and keywords using Gemini 1.5 Pro/Flash.
*   **Gap Analysis**: Quantitative scoring of resume alignment with JD.
*   **Contextual Tailoring**: Rewriting resume sections while preserving factual accuracy but emphasizing relevant skills.

### C. Web Dashboard (The Resume Vault)
*   **Resume Management**: Centralized storage for base resumes and tailored variations.
*   **Tailoring History**: Track where and when specific resumes were used.
*   **Diff View**: Visual side-by-side comparison of original vs. tailored content.
*   **Export**: High-quality PDF and DOCX generation.

## 4. Technical Stack (The "Ralph" Stack)
*   **Monorepo**: pnpm Workspaces + Turborepo.
*   **Frontend**: React 18, Vite, TanStack Router (file-based), TanStack Query v5.
*   **UI/UX**: shadcn/ui, Tailwind CSS (premium aesthetics, dark mode ready).
*   **State Management**: Zustand (Auth, Global UI).
*   **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions).
*   **AI**: Gemini API via Supabase Edge Functions (Deno runtime).

## 5. User Flows
1.  **Onboarding**: Sign in via Google OAuth → Upload Base Resume.
2.  **Discovery**: Visit LinkedIn Job Page → Extension detects portal.
3.  **Analysis**: Scrape JD → Edge Function performs Gap Analysis → Show ATS Score in Popup.
4.  **Tailoring**: User clicks "Tailor Now" → AI rewrites resume → Show Diff → Download PDF.
5.  **Review**: User visits Web Dashboard to see history or download previous versions.

## 6. Security & Privacy
*   **RLS**: Row-Level Security ensures users only see their own resumes.
*   **Secrets**: All API keys (Gemini, Supabase) managed via Supabase Secrets.
*   **Auth**: Secure Google OAuth flow via `chrome.identity`.

---
*Created: 2026-04-12*
