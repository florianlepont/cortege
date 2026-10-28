---
phase: 32
plan: 17c
subsystem: mobile factor F group list
tags: [dmh, collapsible, owner-feedback]
status: complete
---

# Phase 32 Plan 17c: sections closed by default Summary

Every section of the factor F group list now starts closed, except one that holds a ticked or counted group at mount (owner request, 2026-10-28, amending O-32-4).

## What changed

- `mobile/src/app/dmh-guide/order.ts`: `defaultExpanded` is true only for a section with a ticked or counted group. The state is still computed once at mount (`useState` in `DmhGroupList`), so ticking never opens or closes a section.
- Tests updated: `order.test.ts` (nothing active: all closed), `DmhGroupList.test.tsx` (all closed at mount, a header press opens and closes a section, ticking after mount moves nothing, tests that touch a row open its section first), `dmh-entry-cost.test.tsx` (header press counted the first time a form is needed).
- `docs/specs/dmh-guide-content-v1.md` O-32-4 carries the dated owner amendment; the `CLAUDE.md` sentence on the F list now says sections start closed.

## Press counts (honest)

| Scenario | Old flow | New flow before | New flow now |
| --- | --- | --- | --- |
| S1 (3 groups, 3 forms) | 8 | 5 | 8 (3 section presses + 5): a TIE |
| S2 (9 groups, 6 forms) | 29 | 20 | 26 (6 section presses + 20) |

S1 is a tie on presses with the old flow, by the owner's explicit choice of 2026-10-28. The cost test asserts `toBeLessThanOrEqual` for S1 (with a comment) and keeps `toBeLessThan` strictly for S2. The gain remains on the loaded scenario. The phase criterion is the owner's own judgement on the phone ("plus simple", confirmed 2026-10-27), not a press count. The stored payload assertions are unchanged.

## Deviations from Plan

The S1 assertion was relaxed from strict to less-or-equal, on the explicit instruction of the coordinator relaying the owner's decision.

## Verification

Jest `src/screens/factor-detail`, `src/app/dmh-guide`, `src/__checks__`: 22 suites, 254 tests pass (including the spec-sync test). Typecheck and scoped eslint clean; prettier clean on the changed TS files.
