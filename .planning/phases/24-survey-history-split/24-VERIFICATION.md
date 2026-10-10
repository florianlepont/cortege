---
phase: 24-survey-history-split
verified: 2026-10-10T00:00:00Z
status: passed
score: 3/3 success criteria verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 24: Survey History Split Verification Report

**Phase Goal:** The survey's change log and the parcel's history are two separate things, each easy to read.
**Verified:** 2026-10-10 (written after the fact: the phase shipped on 2026-10-09 without a VERIFICATION.md; this report is built from the plan summaries, the tests and the owner's confirmation)

## Success criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The change log and the history of earlier surveys on the parcel are two distinct entries, placement decided on a mock-up first | VERIFIED | The change log is the "Journal du relevé" page (`surveyJournal`, behind the header "..." menu, `SurveyJournalScreen`), the parcel history is `surveyHistory` / `ParcelHistoryView` with the trend curve; plans 24-03, 24-06, 24-07, 24-08; mock-up validated by the owner (24-CONTEXT.md, 24-UI-SPEC.md) |
| 2 | A survey from another member keeps showing the parcel history and never the change log | VERIFIED | `CommunitySurveyScreen` and `CommunityHistoryScreen` register no journal route; covered by their tests |
| 3 | The owner confirms it on their phone, light and dark | VERIFIED | Plan 24-12 summary: owner reply 2026-10-09 after the rebuild, "tout est bon !"; OA-124 closed |

## Automated checks (2026-10-10)

`npx jest --config jest.unit.config.js` on `SurveyJournalScreen`, the community survey screens, `ParcelHistoryView`, `EventsTab` and the navigation tests: 21 suites, 310 tests, all passing. `npm run lint` passes (exit 0).

## Human verification

None open: the phone check was done in plan 24-12.

## Notes

`24-VALIDATION.md` was left in `draft` after execution; it is set to `approved` with this report.
