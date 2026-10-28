---
phase: 32
plan: 23
subsystem: factor-f-capped-counters
tags: [dmh, factor-f, capped-mode, package, parity]
status: complete
key-files:
  modified:
    - packages/ibp-domain/src/factor-details.ts
    - packages/ibp-domain/src/index.ts
    - packages/ibp-domain/src/parity/cases.ts
    - mobile/src/hooks/useUncappedEntry.ts
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/ui/DmhCounterStepper.tsx
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/DmhGroupList.tsx
    - mobile/src/screens/factor-detail/DmhGroupRow.tsx
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/i18n/fr/factor-detail.ts
    - docs/specs/ibp-form-spec.md
    - docs/specs/route-choice-rules-v1.md
commits: [ea8acbd2, d8d2d82c, 1681bad8, 2d5d693a, d9e7aaca, 5fa914f3]
metrics:
  completed: 2026-10-28
---

# Phase 32 Plan 23: one counter per dendromicrohabitat group in the capped mode

In the capped survey mode ("relevé plafonné") each group row of factor F now has the same "+" and stepper as the counted-in-full mode, but in whole trees per hectare, 0 to 2 per group. The total `trees_per_ha` is the sum of the counters.

## Owner decisions applied

1. Capped rows: "+" on an unticked row ticks and counts 1, then the stepper. Value = whole trees per hectare, 0 to 2. The stepper stops at 2 (the "+" at 2 does nothing, is disabled and dimmed; spoken value "N arbres par hectare, au plus 2", hint "Double-tapez pour saisir le nombre, 2 au plus"). Row caption "Arbres par hectare"; list helper "Comptez au plus 2 arbres par hectare pour chaque groupe." No surface field, no division.
2. `trees_per_ha` is derived as the sum; "Total : N arbres par hectare" shows under the list when above 0. The "Arbres par ha" field is read-only, with the caption "Calculé d'après les groupes ci-dessous.", as soon as one counter is above 0; with every counter at 0 the typed number stays editable. Touching a counter takes over from a typed number.
3. Storage: `dmh_counts` (0 to 2) is written with `dmh_groups` and the derived `trees_per_ha`; `surface_ha` is not written.
4. Row order, tick locking (a counted group cannot be unticked until 0) and section state are unchanged. The counted-in-full mode keeps its rules.
5. Docs updated: form spec F, route rules (table row and a new paragraph in section 7), API contract, data contract, validation matrix v2, CLAUDE.md (two sentences), follow-up file marked resolved.

## Package and API changes

- Package `packages/ibp-domain/src/factor-details.ts`: two new pure helpers, `cappedDmhCounts(counts)` (each value held at `DMH_GROUP_DENSITY_CAP_PER_HA`, code order) and `cappedDmhTotalPerHa(counts)` (sum of the capped values), exported from `index.ts`, unit tests added (coverage stays 100 percent).
- No scoring rule changed. `dmh_counts` was already unread by every scorer and accepted without `surface_ha` (only a missing `trees_per_ha` makes F unreadable). No existing parity case changed.
- New parity cases `MAT-F-CAP-01@both` (draft and submit: `trees_per_ha=3` with groups and counts, no surface: F=2, totals 14/7/21) and `MAT-F-CAP-02@both` (capped shape without `trees_per_ha`: unreadable F, like `MAT-F-UNC-02`), with the rows in `docs/technical/ibp-validation-matrix-v2.md`. They run in the package, through the API adapter and through the mobile adapter (all green).
- API: no code change (the server stores `factors` verbatim and delegates the rules to the package). One e2e test added to `api/test/surveys-submit.e2e-spec.ts` proving a capped payload with counts and no surface is stored verbatim and scores from `trees_per_ha` alone.
- Old capped payloads (typed number, ticks only) still validate and open as they were (parity cases, `useSurveyForm` test).

## Mobile changes

- `useUncappedEntry`: `bumpDmhCount` and `setDmhCount` take an optional `cap`. With it counts are held at the cap, every stored count is brought to the cap (this normalises counts left by a counted-in-full survey), the surface is dropped and the return value is `cappedDmhTotalPerHa`. Without it, behaviour is unchanged.
- `useSurveyForm`: `setDmhCount` and `bumpDmhGroup` pass the cap through.
- `DmhCounterStepper`: optional `max` (default 999): "+" does nothing at the bound, disabled state, dimmed glyph, capped spoken value and hint.
- `DmhGroupRow`, `DmhGroupList`: `maxCount` and `counting.max`; capped heading unchanged, capped helper, total line (`dmh-total`), new style key `total` (used).
- `FactorDetailScreen`, `renderFactorField`, `CountingModeStrip`: F without a full count and with the form entry gets capped counting; the trees-per-hectare field is `editable={false}` with `DerivedFromGroupsCaption` while a counter is above 0.
- Catalogue `fr.factorDetail.dmhList`: `treesCaptionPerHa`, `cappedHelper`, `totalPerHa`, `derivedFromGroups`, `a11y.withCountPerHa`, `stepper.valueCapped`, `stepper.editHintCapped`. No em dash, no "DMH", no abbreviation outside the allowlist.

## Tests

- Package: factor-details helpers, parity cases. Hooks: capped bump/set, cap, takeover from a typed number, surface dropped, payload shape, old payload loads, round trip. UI: stepper max, row, list (heading, helper, total in plural and singular, no total at 0), screen (read-only field and caption, entry wiring).
- `dmh-entry-cost.test.tsx`: the capped flow S1 now counts: 8 presses (3 sections + 5), the same as the full flow and a tie with the old flow, payload equal to the recorded S1 payload minus `surface_ha`; a second test proves the stepper stops at 2 and the total field is read-only.
- `capped-counts-export.test.ts` (in `screens/factor-detail/`, nothing under `survey-pdf/` was edited): the existing PDF reader prints the derived total, groups and counts of a capped payload and no surface line.

## Verification

Ran and passed: `npm run typecheck`, `npm run lint`, `npm run format:check` (only `.claude/settings.local.json` warns), `npm --workspace @cortege/ibp-domain run test:coverage` (481 tests, 100 percent), `npm --workspace mobile run test:unit:coverage` (480 suites, 7551 tests, thresholds met, `src/navigation` untouched and at its thresholds), API parity spec (100 tests), mobile parity (112), all `__checks__` gates, API e2e `surveys-submit` (8 of 8).

Not clean, not caused by this plan: `npm run test:unit` stops at the API step on `check-env-parity.spec.ts` (50 tests; known bash 3.2 limitation on the Mac, CI runs it), so I ran the mobile unit suite separately as above. Full API e2e (Postgres available locally): 49 of 52 suites pass; `public-routes-explain`, `list-pagination` (events pagination) and `migrate-lock` fail, none touches factor F or this plan's files; I could not confirm they also fail on a clean main (no checkout allowed).

## Deviations from the plan

- Added a small e2e test in the API suite (not requested) to prove the capped shape is stored verbatim.
- The cap is passed as a third argument of the existing actions rather than adding new actions, so the shape of `UncappedEntryProps` stays compatible with every existing caller.

## Risks and things not seen on a device

I cannot run the app. The owner should check on the phone:

- Capped survey, factor F: "+" on a group counts 1 and ticks; the stepper stops at 2 and the "+" dims at 2; the total under the list; the "Arbres par ha" field greys and takes the sum from the first counter; with every counter back at 0 the field is editable again (it then shows 0, the derived value).
- A capped survey saved before this change: the typed number is kept until a counter is touched; the first touch replaces it by the sum (decision 2).
- Counted-in-full survey: unchanged (surface, no per-group cap).
- Dark mode and the dimmed "+" glyph; VoiceOver value "N arbres par hectare, au plus 2".
- Known edge cases, not handled by design: if the route is changed from counted in full to capped after counts were entered, counts above 2 and the surface stay stored until a counter is touched (the first touch brings counts to 2 and drops the surface). The PDF prints the counts under "Arbres par groupe de dendromicrohabitats" without "par hectare" for a capped survey (the PDF was not to be touched; the line above it reads "N arbres / ha"). The derived total can exceed 8 (up to 30), the score is unaffected.
