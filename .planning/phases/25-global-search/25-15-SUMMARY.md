---
phase: 25-global-search
plan: 15
status: complete
completed: 2026-10-10
requirements-completed: [REQ-B-global-search]
---

# Plan 25-15 summary: CLAUDE.md note and owner phone check

## What was done

- **Task 1** (CLAUDE.md notes): commit 9c2789fd. Navigation (search tab on every platform, `SearchStack`, `searchHome` and `searchGroup`), hooks, `local_meta` key `search_recents`, the API search files, `GEOCODING_IGN_SEARCH_URL`, migration 022 and the two new e2e suites.
- **Task 2** (owner phone check): PR #262 was pushed after the owner's explicit yes (CI first failed on the e2e spec only: wrong profile route and a `location` field the real validation pipe forbids; fixed, then verified locally against PostgreSQL 16 and green in CI), merged by Claude on the owner's "fusionne", and the production VPS pulled the image (`/v1/search/*` answers 401 without a token). Release build installed on the owner's iPhone from `~/Projects/cortege`, detached on `origin/main`, then put back on `main` at its original commit (tree untouched). The app talks to the production API.
- **Task 3** (record): OA-130 closed, `REQ-B-global-search` ticked, roadmap and state updated.

## Owner confirmation

2026-10-10, iPhone, Release build, production API: "Approved". The Android fourth tab was not seen on a device; its native build passes in CI and the JS tab tree is covered by navigation tests.

## Deviations and notes

- The owner's acceptance was a single word, not a per-step report: the 12 steps were presented, the answer covers them as a whole.
- Tuning values to revisit if the owner notices a poor framing: `PARCEL_FOCUS_SPAN_FACTOR` (parcel zoom) and the place zoom levels in `focus-region.ts`.
- `api/test/check-env-parity.spec.ts` fails on macOS bash 3.2 (`declare -A`), passes in CI on Linux.
- An accent-folding check on Hermes ("foret" finds "Forêt") is covered by unit tests of the fold and by the owner's phone pass.

## Self-Check: PASSED
