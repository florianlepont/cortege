---
phase: 30-route-choice-assistant-inserted-v1
status: passed-with-deferral
verified: 2026-10-23
---

# Phase 30 verification

| # | Success criterion | Result |
|---|-------------------|--------|
| 1 | Rules written and validated by the owner before any screen | Passed: `docs/specs/route-choice-rules-v1.md`, validated 2026-10-14 (section 13); revised with the owner afterwards (journal of revisions) |
| 2 | A guided flow suggests the route and explains each choice in plain French | Passed: the mandatory step "Choix du parcours" (one question per screen, reasons behind a glyph, schema of each parcours); wording approved 2026-10-22; used by the owner on an iPhone |
| 3 | The route used is recorded and shown as text in the survey detail and the PDF | Passed: "Parcours utilisé" card on the "Parcelles" page, "Parcours utilisé" block of the PDF; the API refuses a new survey without a route (`route_required`) for the new client; checked on the iPhone, the iOS simulator and the Android emulator |
| 4 | A tester who does not know the method completes the choice without help, in a recorded test | **Deferred** to the field tests by the owner (2026-10-23): no tester before them. Protocol ready, `REQ-FT-route-test` stays open |

Checks at closing: lint, typecheck, format, package tests (468, coverage 100 %), API parity, mobile unit tests with coverage thresholds (444 suites, 6751 tests), CI of PR 309 green. API in production runs the merge of PR 299 (migration 025 applied at start).

Open items: see the "Left open" section of `30-24-SUMMARY.md`.
