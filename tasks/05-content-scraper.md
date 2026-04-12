# Task 05 — Content script JD scrapers

## Acceptance criteria
- [x] src/content/adapters/base.ts — BaseAdapter interface
- [x] src/content/adapters/linkedin.ts — scrapes .job-details__description
- [x] src/content/adapters/naukri.ts — scrapes .job-desc
- [x] src/content/adapters/indeed.ts — scrapes #jobDescriptionText
- [x] src/content/adapters/wellfound.ts — scrapes .job-description
- [x] src/content/detector.ts — matches hostname → returns correct adapter
- [x] src/content/index.ts — updated with detector and JD_SCRAPED message
- [x] packages/types/extension.ts — updated with message types
- [x] All adapters handle missing elements gracefully

## Verify with
pnpm typecheck
# manually load extension on a LinkedIn job page and check console for JD_SCRAPED message