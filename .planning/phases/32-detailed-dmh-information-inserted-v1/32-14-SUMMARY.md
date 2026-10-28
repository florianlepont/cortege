---
phase: 32-detailed-dmh-information-inserted-v1
plan: 14
subsystem: mobile-factor-f-page
tags: [dmh, factor-f, group-list, guide-entry, interaction-cost]
requires: ["32-01", "32-08", "32-11", "32-13"]
provides:
  - factor F page renders DmhGroupList (capped: tick; counted in full: "+" and stepper), surface block under it
  - onOpenDmhGuide from FactorDetailRoute through FactorPager and FactorDetailScreen to the list (surveyDmhGuide)
  - FactorFieldExtras (sixth parameter of renderFactorField)
  - new-flow replay of S1 and S2 against OLD_FLOW_PRESSES and OLD_FLOW_F_PAYLOAD
key-files:
  modified:
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/screens/factor-detail/DmhCountFields.tsx
    - mobile/src/screens/factor-detail/DmhCountFields.test.tsx
    - mobile/src/screens/factor-detail/UncappedFieldBlock.tsx
    - mobile/src/screens/factor-detail/dmh-entry-cost.test.tsx
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/FactorDetailScreen.test.tsx
    - mobile/src/screens/survey-form/FactorPager.tsx
    - mobile/src/screens/survey-form/FactorPager.test.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.test.tsx
decisions:
  - "The block of DmhCountFields now carries testID dmh-surface-block (was dmh-count-fields), so no testID of the file starts with dmh-count-"
  - "O-32-4 (validated at 32-09): all sections open when nothing is ticked, so the replay needs no section header press"
metrics:
  tasks: 3
  completed: 2026-10-27
status: complete
---

# Phase 32 Plan 14: The group list on the factor F page, the guide entry and the interaction cost Summary

The factor F page now shows the sectioned group list in place of the 15 companion chips and the separate counter block, the guide opens from its entry row and from each group's info glyph, and the replay of the two recording scenarios needs fewer presses than the recorded old flow while writing exactly the old payload.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 + 2 | DmhCountFields keeps only the surface; the F companion renders DmhGroupList; FactorDetailScreen passes the counting entry and the guide opener; new-flow cost test | bffefb39 |
| 3 | Guide opener through FactorPager and FactorDetailRoute (navigates to surveyDmhGuide) | 988a5838 |

## Press counts (part (a) of ROADMAP criterion 3, "simpler than before", not timed)

Real `useSurveyForm`, real `FactorDetailScreen`, real `DmhGroupList`, full counting mode, surface typed as setup. One press per "+" (ticks the group and counts 1), then one stepper press per further tree.

| Scenario | Groups / trees | Old flow (chip, then + per tree) | New flow | Stored F payload |
| -------- | -------------- | -------------------------------- | -------- | ---------------- |
| S1 | 3 groups, 5 trees | 8 | 5 | equals OLD_FLOW_F_PAYLOAD.S1 |
| S2 | 9 groups, 20 trees | 29 | 20 | equals OLD_FLOW_F_PAYLOAD.S2 |
| S1 capped | 3 groups, tick only | 3 chips | 3 ticks | `dmh_groups` = the S1 codes in option order |

New presses equal the tree total (one per tree, the group tick is folded into the first "+"). No section header press is counted: with nothing ticked at mount every section is open (O-32-4). Part (b), the owner's written confirmation on the phone, is plan 32-16. No time gain is measured or claimed.

## What was built

- `renderFactorField`: sixth parameter `extras: FactorFieldExtras = {}` (`uncappedEntry`, `onOpenDmhGuide`). The F companion is `DmhGroupList` with the field's selection and `onChange`, counting `{ counts, onBump: bumpDmhGroup, onSetCount: setDmhCount }` only when the entry is present (which `FactorDetailScreen` only passes when F is counted in full), and the guide opener (no-op default). `renderCompanion` became `renderEvidenceChips`, for H only; H, B, I and J are unchanged.
- `DmhCountFields`: only F's surface (props `surfaceText`, `zoneSurfaceHa`, `onChangeSurface`, `editable`), prefill once from the route zone and the "D'apres le parcours" caption kept; title, helper and counter rows removed (the list heading carries them). `UncappedFieldBlock` passes only the three surface props.
- `FactorDetailScreen`: optional `onOpenDmhGuide`, passed with `detailEntry` as the extras of every `renderFactorField` call (202 lines).
- `FactorPager` (required `onOpenDmhGuide`, 380 lines) and `FactorDetailRoute` (`handleOpenDmhGuide` = `navigate("surveyDmhGuide", { group })`; `{ group: undefined }` opens the catalogue).
- Tests: `DmhCountFields` (surface only, prefill, read-only), `FactorDetailScreen` (list probe capped, counting in full, surface block order, H untouched, no-op defaults), `FactorPager` (forwarding), `FactorDetailRoute` (both navigate calls), `dmh-entry-cost` (S1, S2, capped S1).

## Verification

- `npm --workspace mobile run test:unit:coverage`: 463 suites, 6995 tests pass, no threshold message (navigation folder: `FactorDetailRoute.tsx` 100 % statements and lines).
- `npx jest` on `src/screens src/navigation src/__checks__ src/i18n`: 220 suites, 3204 tests pass (structure gate, motion, icons, dash, abbreviations included).
- `npm --workspace mobile run typecheck`: clean. `eslint` on `src/screens/factor-detail`, `FactorDetailScreen*`, `src/screens/survey-form`, `src/navigation/routes`: clean. `prettier --check` on every touched file: clean. `npm run format:check` reports only `.claude/settings.local.json` (not part of this plan).
- `git diff --stat HEAD~2 HEAD -- packages/ibp-domain api mobile/src/storage` is empty; `dmh-entry-scenarios.ts` is not touched by either commit.
- The acceptance check `git diff --stat origin/main -- packages/ibp-domain api mobile/src/storage` is not empty in this worktree, because the branch base lags `origin/main` (diff in `packages/ibp-domain/src/bands.ts` and `index.ts` comes from main, not from this plan).

## Deviations from Plan

**1. [Rule 3 - Blocking] Tasks 1 and 2 committed together, cost test with them.** `FactorDetailScreen.test.tsx` is shared by both tasks and, once chips leave F, the old-flow replay of `dmh-entry-cost.test.tsx` cannot pass, so keeping each commit green needed the three in one commit (bffefb39). Task 3 is its own commit (988a5838).

**2. [Rule 1 - Test adaptation] Block testID renamed to `dmh-surface-block`** to honour "no testID starting with dmh-count-"; nothing else read the old `dmh-count-fields` handle.

**3. Capped replay setup.** A capped F stores `dmh_groups` only together with its scored key, so the capped test types trees per hectare once (not counted) before the ticks.

`npm run test:coverage:mobile` is not a script of this repo (the workspace script is `test:unit:coverage`, run instead).

## Owner decisions applied

O-32-4 (all sections open when nothing is ticked), O-32-1 (48 pt "+" and stepper, via the 32-11 constant), O-32-3 (locked untick, in the row). No "PHASE REPLAN NEEDED" in 32-09.

## Known Stubs

None.

## Threat Flags

None. T-32-35 mitigated (new-flow payload equals OLD_FLOW_F_PAYLOAD for S1 and S2; package, API and storage untouched). T-32-36 mitigated (H companion and B, I, J chip tests kept; only the F branch replaced).

## Self-Check: PASSED

Commits bffefb39 and 988a5838 are in the branch history; all modified files exist and pass the runs above.
