# Task 05 — Content script JD scrapers

## Acceptance criteria
- [ ] src/content/adapters/base.ts — BaseAdapter interface:
      { getJobTitle(): string, getCompany(): string, getDescription(): string, getRequirements(): string[] }
- [ ] src/content/adapters/linkedin.ts — scrapes .job-details__description
- [ ] src/content/adapters/naukri.ts — scrapes .job-desc
- [ ] src/content/adapters/indeed.ts — scrapes #jobDescriptionText
- [ ] src/content/adapters/wellfound.ts — scrapes .job-description
- [ ] src/content/detector.ts — matches hostname → returns correct adapter
- [ ] src/content/index.ts — updated: runs detector, calls adapter, sends structured JD to background
      message type: JD_SCRAPED, payload: { jobTitle, company, description, requirements[], sourceUrl }
- [ ] packages/types/extension.ts — updated with JD_SCRAPED message type and JDPayload type
- [ ] All adapters handle missing elements gracefully (no throws, return empty string)

## Verify with
pnpm typecheck
# manually load extension on a LinkedIn job page and check console for JD_SCRAPED message