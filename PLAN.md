# PLAN.md (Full Feature Roadmap)

## Phase 1 — Output Quality Foundation (Current Priority)
Goal: Make the DOCX output actually good before adding more features.

TASK-010: Upgrade TAILOR_RESUME_PROMPT
File: packages/ai-pipeline/src/prompts.ts
What: Add word count enforcement, voice preservation, minimum change rules
Verify: AI output word count never exceeds original + 10%

TASK-011: Add post-AI validation layer in tailor-resume
File: supabase/functions/tailor-resume/index.ts
What: After Gemini responds, validate:
- summary word count within bounds
- all experience companies match original companies
- no new sections invented
- all changed bullets reference skills from JD analysis
If validation fails → retry once with stricter prompt → if still fails → return original
Verify: Invalid AI outputs never reach the user

TASK-012: Add change_id to every item in change_log
File: supabase/functions/tailor-resume/index.ts
What: Each change_log entry needs a unique id: "change_{section}_{index}"
This is required for the accept/reject system to work
Verify: Every change_log item has a unique change_id

TASK-013: Add reason and impact to every change
File: packages/ai-pipeline/src/schemas.ts + prompts.ts
What: Gemini must return reason (max 15 words) and impact (high/medium/low)
for every single change it makes
Verify: No change_log entry is missing reason or impact

## Phase 2 — Diff Review System
Goal: User reviews and controls every change before downloading.

TASK-020: Create review-changes edge function
File: supabase/functions/review-changes/index.ts (new)
What:
- Accepts: { change_id, tailored_resume_id, accepted: false, user_id }
- When accepted = false → calls Gemini with:
  "The user rejected this change to their {section}.
   Original: {original_text}
   Rejected suggestion: {revised_text}
   Reason it was rejected: user preferred original style
   Provide ONE alternative improvement that:
   - Uses different phrasing than the rejected version
   - Still incorporates these keywords: {keywords_from_jd}
   - Maximum {word_count} words
   - Returns only the alternative text, nothing else"
- Returns: { alternative_text: string, change_id: string }
Verify: Alternative is meaningfully different from rejected version

TASK-021: Create DiffCard component
File: packages/ui/src/components/DiffCard.tsx (new)
What: A single change card showing:
  - Section badge (Summary / Experience - Company Name / Skills)
  - Impact badge (HIGH/MEDIUM/LOW with color)
  - Reason text (from change_log)
  - GitHub-style diff:
    Red line: original text with red left border + bg-red-50
    Green line: revised text with green left border + bg-green-50
  - Two buttons: "Accept" (green) and "Get Alternative" (outlined)
  - When "Get Alternative" clicked:
    Show loading spinner
    Call review-changes edge function
    Replace green line with new alternative
    Re-enable Accept/Get Alternative for the new suggestion
  - Accepted state: card gets checkmark overlay, muted colors
Props:
  change: ChangeLogItem
  onAccept: (changeId: string, finalText: string) => void
  onRequestAlternative: (changeId: string) => Promise<string>
Verify: Component renders all states correctly

TASK-022: Create DiffReviewPanel component
File: packages/ui/src/components/DiffReviewPanel.tsx (new)
What:
  - Header: "Review Your Changes" + ATS score badge
  - Summary stats: "X changes • Y high impact • Z accepted"
  - Tabs: All Changes / High Impact / By Section
  - List of DiffCard components
  - Sticky footer:
    "Accept All" button
    "Download DOCX" button (disabled until at least 1 change accepted)
    Change counter: "X of Y accepted"
  - When Download clicked:
    Collect all final_text from accepted decisions
    Call write-docx with review_decision shape
    Trigger file download
Props:
  changeLog: ChangeLogItem[]
  tailoredResumeId: string
  atsScore: number
  onDownload: (decisions: ReviewDecision[]) => void
Verify: Cannot download with zero accepted changes

TASK-023: Update write-docx to accept review decisions
File: supabase/functions/write-docx/index.ts
What:
- Update input to accept review_decision shape
- Only apply changes where accepted: true
- For each accepted change, use final_text (may be original or alternative)
- Rejected changes → keep original text from parsed_json
- Update output_url in DB after successful write
Verify: Rejected changes are never in the output DOCX

TASK-024: Add diff review route in web dashboard
File: apps/web/src/routes/ (new route)
What:
- Route: /dashboard/review/:tailoredResumeId
- Fetches tailored_resume record
- Renders DiffReviewPanel with change_log data
- Handles download trigger
- After download: shows success state with "View History" link
Verify: Route is reachable, data loads, download works

TASK-025: Add diff review in extension popup
File: apps/extension/src/popup/ (new view)
What:
- New REVIEW state in popup state machine
- After tailoring completes → popup shows "Review Changes" button
- Clicking opens web dashboard review route in new tab:
  chrome.tabs.create({ url: `${DASHBOARD_URL}/review/${tailoredResumeId}` })
- This is intentional — full diff review needs dashboard space
- Popup shows summary: "X changes ready to review. ATS: {score}"
Verify: "Review Changes" button opens correct dashboard URL

## Phase 3 — Polish & Reliability
TASK-030: Add retry UI for failed pipeline steps
TASK-031: Add resume version history in dashboard
TASK-032: Add application tracking (job URL + status)
TASK-033: Write integration tests for parse-resume and tailor-resume

## Phase 4 — Production
TASK-040: CI/CD via GitHub Actions
TASK-041: CloudConvert integration for DOCX → PDF option
TASK-042: Error monitoring (Sentry)
TASK-043: Usage limits enforcement via usage_credits table
