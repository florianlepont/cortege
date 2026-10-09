---
phase: 24-survey-history-split
plan: 12
status: complete
completed: 2026-10-09
requirements-completed: [REQ-C-history-split]
---

# Plan 24-12 summary: CLAUDE.md note and owner phone check

## What was done

- **Task 1** (CLAUDE.md navigation note): commit 7ce5e4b3. `surveyHistory` is the parcel history, `surveyJournal` sits behind the header "…" menu, `communityHistory` is registered in the survey and Explorer stacks, and the history arithmetic lives in `mobile/src/app/parcel-history.ts` and `trend-geometry.ts`.
- **Task 2** (owner phone check): two Release builds installed on the owner's iPhone from `~/Projects/cortege`, detached on the phase branch (then on the fix branch) and restored to `main` (f7ba29d0) each time, untracked files untouched. The owner needed server data with histories, so the demo seed was extended (1000 community surveys with 3 to 8 per parcel and 20 owner surveys; dry run on the IGN cadastre locally and on the VPS: 206 sites, 385 parcels, nothing dropped). The owner ran the seed on the VPS; its own output was not reported back to this session.
- **Task 3** (record): OA-124 closed, `REQ-C-history-split` ticked, roadmap and state updated (this commit).

## Owner confirmation

Owner reply on 2026-10-09, after the rebuild with all the fixes below: "tout est bon !".

## Findings of the phone check, all fixed and confirmed

| Finding | Fix |
|---------|-----|
| Tapping a studied parcel opened the parcel history panel | Opens the latest survey's page directly (#256, OA-128) |
| Large-parcel zones needed a deep zoom in then out to see the coloured parcels | Studied parcels load and draw from zoom 12, API answers them from the database between 12 and 15 (#256, OA-128) |
| "Parcelles" opened on the phone's position instead of the survey's parcels | The routes hand the survey's own position to the screen (#257, OA-129) |

## Device assumptions

The owner gave one overall confirmation ("tout est bon !") and did not report the arrow "→", the curve reveal, the two-line row label or the mixed-method cut one by one. No fallback was requested (" à " for the arrow, the dash reveal), so none was applied. The API serving `ibp_method_version` has been in production since 3759bada.

## Deviations and known limits

- The mixed-method case could only appear on the phone once the server deployed (merge 3759bada); it was not shown on the simulator.
- `api/test/check-env-parity.spec.ts` fails locally on `main` too (34 tests, environment related), unrelated to this phase.
- The API e2e specs (`parcel-history`, `community-survey-detail`, `public-map-items`) ran only in CI.
- Both history endpoints still return the oldest 20 rows: a parcel with more than 20 surveys would lose its newest (documented, not reachable with the demo data).
- `addPendingParcelDownload` and `useOfflinePendingParcelDrain` remain (nothing queues any more); a later clean-up.
- `SurveyParcelSelectionScreen` has no unit test (heavy map mocks); its start point is covered by the route tests and the phone check.
