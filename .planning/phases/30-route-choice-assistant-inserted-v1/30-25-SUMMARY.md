---
phase: 30-route-choice-assistant-inserted-v1
plan: 25
subsystem: user-tests
tags: [tester-session, deferred, bookkeeping]
requires: [30-24]
provides:
  - "The tester protocol, its scenario sheets and its empty report, aligned with the one-question-per-screen step (2026-10-22)"
  - "The bookkeeping of the phase, applied by this plan's closing change"
status: deferred
---

# 30-25 summary: recorded tester session (deferred)

## Decision

On 2026-10-23 the owner said there are no testers before the field tests ("il n'y a que moi") and asked to close phase 30 with this criterion deferred. The plan is **not executed**: no session was run, no report was written, no tester was spoken to.

## What is ready for the session

- `docs/user-tests/route-choice-assistant.md`: protocol (3 to 5 testers, a pre-check of three words, three scenarios with their expected parcours computed from the package, the pass rule of O-13, the consent text, the empty "Rapport" section), updated on 2026-10-22 for the current screens.
- Before the session: deploy the API (migration 025 is in production), install a build with the current code, open the test parcel once online, bring the scenario sheets and a consent form per tester.

## Bookkeeping applied (by the change that closes the phase)

- ROADMAP: Phase 30 ticked with the criterion 4 deferral noted, plans 24/25.
- REQUIREMENTS: `REQ-DOC-route-rules`, `REQ-C-route-guide`, `REQ-C-route-record`, `REQ-C-route-display` and `REQ-C-uncapped-entry` ticked; `REQ-FT-route-test` stays open ("deferred to the field tests"); the six ids added to the traceability table; the guide and record texts corrected (mandatory step, no group name).
- STATE: phase 30 complete, next Phase 31.

No Phase 30.1 and no group requirement (O-14).
