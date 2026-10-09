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
- **Task 2** (owner phone check): three Release builds installed on the owner's iPhone from `~/Projects/cortege`, detached on the phase branch and restored to `main` (f7ba29d0) each time, untracked files untouched. The owner had to see the phase on server data, so the demo data was rebuilt first (1000 community surveys with 3 to 8 per parcel and 20 owner surveys; dry run on the IGN cadastre then on the VPS: 206 sites, 385 parcels, nothing dropped).
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

The arrow "→", the curve reveal and the two-line row label were part of the phone check the owner confirmed. No switch to the fallbacks (" à ", dash reveal) was needed. The mixed-method curve was checked on the phone against the redeployed API (`ibp_method_version` in production since 3759bada).

## Deviations and known limits

- The mixed-method case was seen on the phone only after the server deployed (merge 3759bada), not on the simulator.
- `api/test/check-env-parity.spec.ts` fails locally on `main` too (34 tests, environment related), unrelated to this phase.
- The API e2e specs (`parcel-history`, `community-survey-detail`, `public-map-items`) ran only in CI.
- Both history endpoints still return the oldest 20 rows: a parcel with more than 20 surveys would lose its newest (documented, not reachable with the demo data).
- `addPendingParcelDownload` and `useOfflinePendingParcelDrain` remain (nothing queues any more); a later clean-up.
- `SurveyParcelSelectionScreen` has no unit test (heavy map mocks); its start point is covered by the route tests and the phone check.
