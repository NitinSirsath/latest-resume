# TASK-050 — Fix DOCX Output: Formatting is Destroyed

## Priority: 🔴 P0 (Ship Blocker)
## Branch: `feat/task-050-docx-formatting`

## Problem
`write-docx` uses `mammoth.extractRawText()` then rebuilds the DOCX from plain text using the `docx` library. This **destroys all formatting** — bold, italics, headings, bullet lists, indentation, fonts, and page layout. The user uploads a polished resume and gets back a wall of plain text in a new DOCX.

## Files to Modify
- `supabase/functions/write-docx/index.ts`

## Solution
Replace the extract-and-rebuild approach with **in-place XML manipulation**:
1. Use `JSZip` (`npm:jszip@3.10.1`) to open the `.docx` as a ZIP archive
2. Read `word/document.xml` as a string
3. For each accepted change, find the `original` text within `<w:p>` paragraphs by concatenating `<w:t>` runs
4. Replace the matched text in-place — put replacement in first `<w:t>` run, clear subsequent runs
5. Repack the ZIP → upload to Storage

## Key Implementation Details
- Remove `mammoth` and `docx` imports — replace with `jszip`
- Add `escapeXml()` / `unescapeXml()` helpers for safe XML text handling
- Use `xml:space="preserve"` on modified `<w:t>` elements to prevent whitespace stripping
- Process `<w:t>` elements from end-to-start within each paragraph so string indices stay valid
- Add `Sentry.captureException` in catch block (currently missing)

## Acceptance Criteria
- [ ] Original DOCX formatting (fonts, bold, bullets, spacing, margins) is preserved in output
- [ ] Only the text content of accepted changes differs from original
- [ ] `pnpm review` passes (typecheck + forbidden patterns)
- [ ] `mammoth` and `docx` dependencies removed from this function

## Verification
- Upload a formatted `.docx` resume, run through tailor + review flow
- Downloaded output retains all original formatting with only accepted text changes applied
