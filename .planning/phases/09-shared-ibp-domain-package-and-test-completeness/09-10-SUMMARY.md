---
phase: 09-shared-ibp-domain-package-and-test-completeness
plan: 10
subsystem: mobile-form-state
tags: [ibp-method-version, ibp-cas, form, draft-patcher, i18n, contexts]
requires:
  - "01.8-07: mobile adapter (computeRetainedScoresFromRawFactors with context, migrateDraftToV32)"
  - "01.8-08: storage write rule for ibp_method_version / ibp_cas / ibp_cas3_scale"
provides:
  - "fr.ibpMethod catalogue section (version, cas, cas-3 toggle, switch texts, v3.2 factor help and hints)"
  - "helpForMethod(version) in app/constants.ts"
  - "Form state ibpMethodVersion / ibpCas / ibpCas3Scale + setters; A native cover field"
  - "Draft patcher handleSwitchSurveyToV32 / handleUpdateSurveyIbpCas / handleUpdateSurveyCas3Scale"
  - "Form context and surveys actions (updateIbpCas, updateCas3Scale, switchToV32)"
affects:
  - "01.8-13 (form screens): renders the new form state and actions, uses helpForMethod"
  - "01.8-14 (detail): calls switchToV32 / updateIbpCas / updateCas3Scale"
tech-stack:
  added: []
  patterns:
    - "Draft patch mutators may return null: the change does not apply to the draft's method version"
    - "The live preview scores exactly the payload the form saves"
key-files:
  created:
    - mobile/src/i18n/fr/ibp-method.ts
  modified:
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/fr/labels.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/validation.ts
    - mobile/src/i18n/fr/status/editing.ts
    - mobile/src/i18n/catalogue.test.ts
    - mobile/src/app/constants.ts
    - mobile/src/app/survey-logic.test.ts
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/hooks/useSurveyForm.test.ts
    - mobile/src/hooks/useEditingDraft.ts
    - mobile/src/hooks/useEditingDraft.test.ts
    - mobile/src/hooks/useSurveyDraftPatcher.ts
    - mobile/src/hooks/useSurveyDraftPatcher.test.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/state/survey-form-context.ts
    - mobile/src/state/surveys-context.ts
    - mobile/src/state/contexts.test.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/jest.unit.config.js
decisions:
  - "The form's live preview scores buildFactorsPayload() (what is saved), not the raw strings: A without its cover is neither sent nor scored, in both versions"
  - "setIbpMethodVersion is a no-op when the form already follows that version (resolved), so choosing v3.0 on a legacy draft never stamps it; any real switch resets the cas/flag and the region/stage defaults"
  - "Region and stage patch handlers do nothing on a v3.2 draft (switchNotAllowed status), like the cas handlers on a v3.0 draft"
  - "useEditingDraft signatures follow the form's draftInput key order and carry the draft's method fields, so a draft opened unchanged is not re-saved"
metrics:
  duration: "~70 min"
  completed: 2026-09-26
  tasks: 3
  files: 21
---

# Phase 01.8 Plan 10: Method version in the form, draft patcher and contexts Summary

The survey form now knows its survey's IBP method: new surveys start on v3.2 with cas 1, v3.0 can be chosen, and untagged legacy drafts keep `null` (v3.0) without ever being stamped. Factor A takes the native cover (CH-1). The draft patcher can switch an unsubmitted v3.0 draft to v3.2 and edit the cas and cas-3 flag of a v3.2 draft. The French catalogue has a new `ibpMethod` section, and the v3.0 help is fixed for BUG-1 and BUG-2. All of it reaches the screens through the form and surveys contexts.

## Tasks

| Task | Name | Commits | Main files |
|---|---|---|---|
| 1 | Catalogue section, v3.0 help fixes, field labels, `helpForMethod` | e9d1c2e (RED), 581fc7b (GREEN) | i18n/fr/ibp-method.ts, labels.ts, index.ts, factor-detail.ts, validation.ts, app/constants.ts |
| 2 | Form hook and new-draft defaults | daae0b0 (RED), f55cb3a (GREEN) | hooks/useSurveyForm.ts, hooks/useEditingDraft.ts, app/constants.ts |
| 3 | Draft patcher, status texts, context wiring | 50c8ea9 (RED), 61bcff5 (GREEN) | hooks/useSurveyDraftPatcher.ts, i18n/fr/status/editing.ts, state/*, jest.unit.config.js |

## What changed

**Catalogue (`fr.ibpMethod`, new file `i18n/fr/ibp-method.ts`)**
- It holds `versionTitle`, `versions` (keyed by the two tags: "IBP v3.2 (2026)" and "IBP v3.0 (ancienne méthode)") and `versionHint`.
- It also holds `versionLockedHint`, `legacyVersionLabel`, `casTitle`, `casLabels` 1–4 ("Cas N"), `casCaptions` 1–4, `cas3ScaleLabel`, `cas3ScaleHint`, `switchToV32`, `switchToV32Hint` and `nativeCoverField`.
- `factorHelp` and `factorInputHints` cover A–J, with 3 hints per factor, all static strings. They follow RESEARCH §3.4:
  - A: the cover cap, the supplementary genera for cas 2 and 4, and the scales per cas;
  - B: strata heights per cas;
  - C/D/E: diameters per cas and the slow-growing species;
  - F: groups 6, 7, 12 and 15, and orchards;
  - G: the intermediate and high strata are excluded;
  - H: grazing, orchards and the 10 % rule;
  - I: the 11 types, including « Mer ou océan », and wheel ruts excluded;
  - J: the 12 types.
- Linear stands are not mentioned.

**v3.0 help (`labels.ts`)**
- A carries the cap. B has no cap and no cover input: it points to Factor A.
- G ends with "Score 0, 2 ou 5", and H says "Seules les valeurs 0, 2 ou 5 sont acceptées".
- Each factor still has 3 hints. The edited strings have correct accents.

**Field labels**
- `native_cover_percent: "Couvert des essences autochtones (%)"` is added to `factorDetail.fieldLabels` and to `validation.fields`.

**`app/constants.ts`**
- `helpForMethod(version)` returns `{ help, hints }`: `fr.ibpMethod` for v3.2, `fr.labels` otherwise (null included).
- `DEFAULT_SURVEY_FORM` gains `ibpMethodVersion` (v3.2), `ibpCas` (1) and `ibpCas3Scale` (false).
- Its `factorA` is now `{ native_genus_count, native_cover_percent }` and its `factorB` is `{ strata_count }`.

**Form (`useSurveyForm.ts`)**
- New state: `ibpMethodVersion`, `ibpCas` and `ibpCas3Scale`.
- New actions:
  - `setIbpMethodVersion(next)`: a no-op when the form already follows that version. Switching to v3.2 sets the cas from `casFromRegionStage` (null when ambiguous). Switching to v3.0 clears the cas and flag. Either switch resets region/stage to their defaults.
  - `setIbpCas` and `setIbpCas3Scale`.
- Factor A has two required fields. It is sent only when the count is an integer ≥ 0 and the cover is between 0 and 100. B sends `{ strata_count }` only.
- H uses the package's `allowedScoresFor("H")` in both the payload and the field error. There are no more `[0, 2, 5]` literals.
- `applyDraftToForm`:
  - keeps the draft's raw version, with null for untagged or unknown versions;
  - reads the cas and flag only for v3.2;
  - reads A's cover from `A.native_cover_percent`, else from B's `covered_autochthonous_percent` or `native_cover_percent`.
- `draftInput` sends:
  - `ibp_method_version` only when the form has one;
  - `ibp_cas` and `ibp_cas3_scale` for v3.2;
  - region/stage for v3.0 or null.
- The preview calls `computeRetainedScoresFromRawFactors(buildFactorsPayload(), { ibp_method_version, ibp_cas, ibp_cas3_scale, region_version, vegetation_stage })`.
- The exported type `SurveyFormDraftInput` describes the saved shape.

**New and edited drafts (`useEditingDraft.ts`)**
- A new draft is created as `{ site_name, ibp_method_version: v3.2, ibp_cas: 1, ibp_cas3_scale: false, factors, parcel_ids }`, with no region or stage.
- The signature of an edited draft (`storedDraftSignature`) keeps the stored method fields in the form's key order.

**Draft patcher (`useSurveyDraftPatcher.ts`)**
- The base is now built from the draft's own method fields. The version key is absent when the draft is untagged, the cas and flag appear for v3.2 only, and region/stage for v3.0 only. The old ACA default no longer re-adds a region to v3.2 drafts.
- The update sends the version only if the draft has one, the cas and flag for v3.2, and region/stage for v3.0.
- Mutators may return null. The patcher then writes nothing and shows `switchNotAllowed`.
- New handlers:
  - `handleSwitchSurveyToV32` runs `migrateDraftToV32` on v3.0 or untagged drafts.
  - `handleUpdateSurveyIbpCas` and `handleUpdateSurveyCas3Scale` work on v3.2 drafts only.
- The existing region and stage handlers now apply to v3.0 drafts only.
- The read-only guard for submitted surveys is unchanged and covers the new handlers.

**Status texts (`status/editing.ts`)**
- New entries: `ibpCasUpdated`, `cas3ScaleUpdated`, `switchedToV32` and `switchNotAllowed`. Each takes `({ name })`.

**Contexts**
- `SurveyFormState` gains `ibpMethodVersion`, `ibpCas` and `ibpCas3Scale`.
- `SurveyFormActions` gains `setIbpMethodVersion`, `setIbpCas` and `setIbpCas3Scale`.
- `SurveyActions` gains `updateIbpCas`, `updateCas3Scale` and `switchToV32`.
- `AppStateProvider` wires them through `useStableActions` and the form memo. It is still the single assembler.
- `routes.test.tsx` has the new form state fields in its mock.

## Tests

- The mobile suite had 84 suites and 1158 tests before (after the 01.8-07 and 01.8-08 merge). It now has 84 suites and 1201 tests (+43), all green.
- `useSurveyForm.test.ts` gains 21 tests in "method version and cas", plus 1 test for the B field. Among them:
  - the fresh v3.2 defaults, with no region/stage;
  - the switch to v3.0 and back, with the cas pre-filled to 4 for M/thermo and null for ACA/subalpin;
  - A with 5 genera and 40 % cover gives 2; A without a cover is neither sent nor scored;
  - G under cas 3 with 0.5 % gives 2, cas 1 with 6 % gives 2, cas 3 with 6 % gives 5, and the flag under cas 2 gives 5;
  - B is sent as strata only, and H accepts only 0, 2 or 5;
  - a legacy draft stays untagged and its cover moves to A;
  - choosing v3.0 on a legacy draft does not stamp it.
- Existing tests were updated for the new A and B shapes and the v3.2 default.
- `useEditingDraft.test.ts`:
  - new drafts are created with the v3.2 defaults;
  - a v3.2 draft or a legacy draft opened unchanged is not re-saved;
  - a changed v3.2 draft autosaves with its method fields and no region.
- `useSurveyDraftPatcher.test.ts` gains 11 tests. The stored payload is checked with storage's real `applyMethodFields`.
  - Switching an ACA/collinéen draft with B cover 40 gives v3.2, cas 1, A cover 40, and no region/stage. The status names the survey.
  - Switching an ACA/subalpin draft leaves the cas null.
  - A submitted survey gets no write and the read-only status.
  - Renaming a v3.2 draft adds no region/stage. Renaming a legacy draft keeps it untagged.
  - The cas and flag handlers write on v3.2 drafts only. The region and stage handlers do nothing on v3.2 drafts.
- `contexts.test.tsx` checks:
  - the new form state and setters, and the new survey actions;
  - that changing the cas changes only the form value, with its actions kept stable.
- `render-counts.test.tsx` was not edited and is green (5 tests).
- `catalogue.test.ts` is green, which covers the new function leaves.
- `survey-logic.test.ts`:
  - `helpForMethod` for v3.2, v3.0 and null;
  - the v3.0 BUG-1 and BUG-2 texts;
  - the cas labels;
  - the `DEFAULT_SURVEY_FORM` fields.

## Coverage

Measured with `node scripts/coverage-by-directory.js mobile`, floored:

| Row | Before | Measured | After |
|---|---|---|---|
| ./src/app/ | 91/80/96/95 | 91/80/97/95 | **91/80/97/95** (functions raised) |
| ./src/hooks/ | 90/79/94/90 | 90/80/94/90 | **90/80/94/90** (branches raised) |
| all other rows | – | unchanged | unchanged |

No row was lowered.

## Verification

- `npm --workspace mobile run test:unit:coverage`: 84 suites and 1201 tests pass, and the thresholds are met.
- The structure gates `literals`, `status-ids`, `unused-styles` and `long-files` are all at 0.
- `npm run lint` has 0 warnings. `npm run typecheck` exits 0. `npm run format:check` is clean.
- `grep -c "\[0, 2, 5\]" mobile/src/hooks/useSurveyForm.ts` returns 0.
- `fr.ibpMethod` is registered in `index.ts`.

## Deviations from Plan

1. **[Rule 3, blocking] `mobile/src/i18n/catalogue.test.ts` edited** (not in the plan's file list). Its section-list assertion had to include `ibpMethod` to register the new section. Commit e9d1c2e.
2. **[Rule 2, correctness] The region and stage patch handlers no-op on v3.2 drafts.** Before, they would have written a region onto a v3.2 draft, or reported a change that storage drops. They now show `switchNotAllowed`, like the cas handlers do on v3.0 drafts. Commit 61bcff5.
3. **The preview scores the saved payload.** Before, it scored the raw strings. Now a partially filled A (count without cover) is not scored under v3.0 either, so the preview matches what is saved. Commit f55cb3a.
4. **`useEditingDraft` signatures follow the draftInput key order.** Before, the key order differed, so every draft opened for editing autosaved once. Now a draft opened unchanged does not. A legacy draft whose B cover moves to A still differs, so it saves on its next autosave (CH-7 "on the next save"). Commit f55cb3a.
5. **[Gate] `switchNotAllowed` in `patchSurveyDraftDirectly` uses `surveyName(current)`.** The `status-ids` scanner flagged `currentName(surveyId)` inside the status call. The resulting name is the same. Commit 61bcff5.

No package installs. Every file outside the plan's list is named above.

## Notes for 01.8-13 and 01.8-14

- `FactorDetailScreen` should use `helpForMethod(form.state.ibpMethodVersion)` in place of `HELP_BY_FACTOR` and `FACTOR_INPUT_HINTS_BY_FACTOR`, which stay as the v3.0 texts.
- The keys `fieldLabels.covered_autochthonous_percent` and `validation.fields.covered_autochthonous_percent` are no longer used by the form. I kept them for any legacy display, and 01.9-32 can drop them.
- `setIbpMethodVersion` does not check the survey status itself. The form never holds a submitted survey: `handleStartEditSurvey` refuses to open one.

## TDD Gate Compliance

| Task | RED | Failure seen | GREEN |
|---|---|---|---|
| 1 | e9d1c2e | TS2305 `helpForMethod` missing, TS2339 `fr.ibpMethod` missing | 581fc7b |
| 2 | daae0b0 | TS2339 new form properties missing; 3 `useEditingDraft` failures | f55cb3a |
| 3 | 50c8ea9 | TS2339 new handlers, status texts and context keys missing | 61bcff5 |

## Known Stubs

None.

## Threat Flags

None. The threat register is covered:
- **T-01.8-28:** the patcher's read-only guard is tested for the switch, cas and flag handlers.
- **T-01.8-29:** legacy drafts send no version key, in the form, the signature and the patcher (tests).
- **T-01.8-30:** the new status texts take the survey name only, and the `status-ids` gate is at 0.

## Self-Check: PASSED

- FOUND: mobile/src/i18n/fr/ibp-method.ts and every modified file listed.
- FOUND commits: e9d1c2e, 581fc7b, daae0b0, f55cb3a, 50c8ea9, 61bcff5.
