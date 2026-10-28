---
phase: 32
plan: 25
subsystem: factor-f-no-group-row
tags: [dmh, factor-f, capped-counters, usability]
status: complete
key-files:
  created:
    - mobile/src/screens/factor-detail/DmhNoneRow.tsx
    - mobile/src/screens/factor-detail/no-dmh-group.ts
    - mobile/src/screens/factor-detail/useLockedCaption.ts
  modified:
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/hooks/useUncappedEntry.ts
    - mobile/src/screens/factor-detail/DmhGroupList.tsx
    - mobile/src/screens/factor-detail/DmhGroupRow.tsx
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/screens/factor-detail/UncappedFieldBlock.tsx
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - mobile/src/state/survey-form-context.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/i18n/fr/factor-detail.ts
    - CLAUDE.md
    - docs/specs/ibp-form-spec.md
commits: [e23ee48a, 157e4ce4]
metrics:
  completed: 2026-10-29
---

# Phase 32 Plan 25: record "no tree carries a dendromicrohabitat"

Closes the dead end named in the risks of 32-24: with "Arbres par ha" read-only, a stand with no dendromicrohabitat could not record 0. No package, API, navigation structure or SQLite change.

## What changed

1. **The row.** `DmhNoneRow` sits alone in its own `AppGroupedContainer` above the first section of the F list, only when the group counters are on the page (capped and counted-in-full). `SelectionCircle` plus the label "Aucun arbre porteur de dendromicrohabitats" (`fr.factorDetail.dmhList.none`), min height 56 (the group rows' styles), testID `dmh-none-row` on the checkbox pressable, role checkbox, state checked/disabled, label as visible label, `feedback.selection()` on a press.
2. **The action.** `markNoDmhGroup(on, cap?)` in `useSurveyForm`, published through `SurveyFormActions` and `AppStateProvider` like `bumpDmhGroup` (no new `useSurveySync` call), reaching the page through `UncappedEntryProps`. On: `clearDmhCounts` (new in `useUncappedEntry`; with `cap`, the capped mode, it also drops the surface text; counted in full the typed surface stays) then `trees_per_ha` "0" and `dmh_groups` [] in one functional `setFactorF`. Stored payload: `F: { trees_per_ha: 0 }` (plus `surface_ha` counted in full if typed); empty `dmh_counts` is omitted by `uncappedPayload`, as before. Off: empties `trees_per_ha`, only if it is "0" with no group, so it never erases a figure.
3. **Derived state** (`isNoDmhGroup` in `no-dmh-group.ts`): ticked iff `trees_per_ha` parses to 0 and no known group is ticked and no count is above 0. So an older survey with a typed 0 and no groups opens with the row ticked, and counters brought back to 0 then unticked also read as "none". Ticked or counted groups show it unticked; touching a counter takes over as before (the sum replaces the 0).
4. **Locked** when any count is above 0: the press shows a caption ("Ramenez d'abord les nombres des groupes à 0 pour choisir cette ligne.") for 4 s, announces it on iOS, changes nothing, hint changes. With groups ticked at count 0 the press clears them without asking. The caption logic is the existing one, extracted as `useLockedCaption` and now shared by `DmhGroupRow` (no behaviour change there; its tests pass untouched).
5. Docs: one sentence each in CLAUDE.md (F list paragraph) and `docs/specs/ibp-form-spec.md` (Factor F, capped counters).

## Verification

Ran and passed: `npm run typecheck`, `npm --workspace mobile run lint`, `npm --workspace mobile run test:unit:coverage` (481 suites, 7585 tests, thresholds met, no threshold message), prettier check on every touched `.ts`/`.tsx`. The `__checks__` gates (no em dash, abbreviations, structure caps, motion) pass; "DMH" is not in any new string. The package did not change, so its coverage run was not repeated. `docs/specs/ibp-form-spec.md` was not run through prettier (it is not in the repo's formatted set).

New tests:
- `ibp-scoring.test.ts`: through the mobile adapter, `F: { trees_per_ha: 0 }` (with and without empty `dmh_groups` and `dmh_counts`) is a scored class 0, counts as filled and is not in the readiness `missing_factors`, in v3.0 and v3.2.
- `useSurveyForm.test.ts` (`markNoDmhGroup`): stored shape in both modes, replaces ticks/counts, keeps the surface counted in full, off, counter takeover, the stale-0 case.
- `DmhGroupList.test.tsx`: position above the first section, absent without counting, derived ticked state (nothing, 0, 5, older capped typed 0 with `null` or `[]`, ticked group, counted group, back to 0), press arguments, haptic, locked press with timer expiry, read-only.
- `dmh-entry-cost.test.tsx`: the real form through the page in both modes (one press stores 0 and the field reads "Arbres par hectare, 0", a second press empties it, takeover, lock, the long way ends in the same state, clearing ticked-at-0 groups). The existing S1/S2 flows are unchanged and keep their press counts.

## Deviations

- **[Rule 1 - Bug] Stale 0 beside a count.** Counted in full with no surface, a stored 0 from the new row would have stayed beside a counted group (the density cannot be derived), scoring class 0 for a stand with counted trees. `bumpDmhGroup` and `setDmhCount` now empty a stored "0" when a count goes up and no figure can be derived (`treesPerHaAfterCount`). This also covers an older typed 0 in that rare state. Everything else in those two actions is unchanged (their existing tests pass).
- `setDmhCount` now always goes through `setFactorF` (it returned early through `writeTreesPerHa` before); same result when a figure is derived.
- Not in the brief: `useLockedCaption` extraction, `no-dmh-group.ts` (also used by the screen for the "any group counted" test), `treesPerHaText` prop on `DmhGroupList`, `onMarkNone` on `DmhListCounting`.
- The testID `dmh-none-row` is on the pressable (the checkbox), not on a wrapper, so a test or a screen reader finds the interactive element.

## Known stubs

None.

## Risks (not seen on a device, I cannot run the app)

- **Never looked at on a screen.** Check on a device: the row's look over the first section (own grouped container, 56 pt, divider inset, pressed fill), the tick animation, the locked caption placement, VoiceOver (checkbox, "Aucun arbre porteur de dendromicrohabitats", hint), light and dark.
- Counted in full, unchecking the row (second press) empties the field only while it is exactly the none state; with a surface typed the page then shows "0" (empty and nothing counted, capped) or "À calculer" only once a count exists, as in 32-24.
- The pressed-while-locked row is not `disabled` (so the caption can show); only a read-only list disables it.
- Wording is my adaptation: label, caption "Ramenez d'abord les nombres des groupes à 0 pour choisir cette ligne.", hint "Enregistre 0 arbre par hectare et décoche les groupes".
- A group ticked at count 0 followed by a press on the row loses the tick without confirmation, as specified (low cost).

## Self-Check: PASSED

Created files exist; commits e23ee48a and 157e4ce4 are in `git log`.
