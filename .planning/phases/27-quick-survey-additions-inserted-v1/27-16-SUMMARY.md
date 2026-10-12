---
phase: 27-quick-survey-additions-inserted-v1
plan: 16
subsystem: mobile-pdf
tags: [pdf, conditions, weather, doubt-badge, factor-note, pagination, escape-html]
requires:
  - phase: 27-03
    provides: "fr.surveyExport.conditions and fr.surveyExport.factors.doubt / note"
  - phase: 27-09
    provides: "formatWeatherLine, formatObservationTime, weatherProvenance (weather.ts)"
  - phase: 27-10
    provides: "DisplayedFactorResult.doubt / note on the factor entries the PDF already receives"
provides:
  - "survey-pdf/conditions-section.ts: buildConditionsBlock, conditionsSectionCss, conditionsBlockHeight"
  - "SurveyExportData.conditions { note, weather }, read from the local draft by assembleSurveyExportData"
  - "PdfPalette.warning / warningSoft (light theme)"
  - "Douteux badge and factor note on every PDF factor card, with height estimates"
affects: [27-21]
tech-stack:
  added: []
  patterns: ["pure PDF block builder returning null when empty", "per-paragraph line counting for free text height estimates"]
key-files:
  created:
    - mobile/src/app/survey-pdf/conditions-section.ts
    - mobile/src/app/survey-pdf/conditions-section.test.ts
  modified:
    - mobile/src/app/survey-pdf/types.ts
    - mobile/src/app/survey-pdf/palette.ts
    - mobile/src/app/survey-pdf/palette.test.ts
    - mobile/src/app/survey-pdf/assemble-export-data.ts
    - mobile/src/app/survey-pdf/assemble-export-data.test.ts
    - mobile/src/app/survey-pdf/factor-section.ts
    - mobile/src/app/survey-pdf/factor-section.test.ts
    - mobile/src/app/survey-pdf/build-html.ts
    - mobile/src/app/survey-pdf/build-html.test.ts
    - mobile/test/survey-export-fixtures.ts
    - "the other survey-pdf *.test.ts files (fake palette and makeData extended by the new keys)"
key-decisions:
  - "D-17, D-26: the conditions block is one packable block (id conditions) after the identity blocks, omitted when there is no weather value and no note; the weather source row is derived from weatherProvenance (Météo-France / modifiée par l'observateur / Saisie par l'observateur)"
  - "D-13: the badge and the note are read from the factor entries (doubt, note) the screen already hands over; scores, classes, chart and totals are untouched (tests compare the markup with and without annotations)"
  - "The note is clamped in the builders (1000 and 300) through normalizeNoteText, defence in depth on top of the entry clamp"
requirements-completed: []
duration: 45 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 16: PDF conditions block, doubt badge and factor note Summary

The exported PDF now prints a "Conditions du relevé" block (weather sentence, weather source with the Météo-France attribution, survey note) after the identity cards, and a "Douteux" badge plus the observer's note on each factor card, all escaped, clamped and measured so the packer never splits a block.

## What was built

- **Export data and palette (Task 1).** `SurveyExportData.conditions { note, weather }` is read by `assembleSurveyExportData` from the local draft it already loads (`survey_note` trimmed, blank as null; `weather` only when an object). A draft that is missing or unreadable gives `{ note: null, weather: null }`, like `rawFactors` gives `{}`. `PdfPalette` gains `warning` (`onSurface.warning`) and `warningSoft` (`colors.warningSoft`) of the light theme; `palette.test.ts` checks the pair and both contrasts against paper and against the soft fill at 4.5:1.
- **Conditions block (Task 2).** `conditions-section.ts`: rows only when they have content (Météo sentence with the time last, "Source de la météo", "Note du relevé"); `null` when there is neither. Weather values come from `formatWeatherLine`, the time from `observed_at ?? requested_at`, the source from `weatherProvenance`. The note sits in `.conditions-note` (`white-space: pre-wrap; overflow-wrap: anywhere`) and is clamped to 1000. Height is `20 + 24 + 10 + sum(6 + 13 x lines)`, lines counted per paragraph at 80 characters.
- **Factor cards and registration (Task 3).** `.factor-badge` ends `.factor-head` (head height 20 unchanged, so the card height does not move); `<p class="factor-user-note">` sits between `.factor-body` and `.factor-scale`, clamped to 300, height `6 + 12 x lines` per paragraph at 112 characters. A card with neither is byte-identical to before. `collectBlocks` order: identity, identity-method, conditions (only when not null), score summary, chart, factor cards, map, trend, photos; `collectCss` adds `conditionsSectionCss` after `identityCss`.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | cc21b334 | feat(27-16): carry the conditions and the doubt colours into the PDF data |
| 2 | 36d1b7db | feat(27-16): add the Conditions du relevé block to the PDF |
| 3 | ca5c8acd | feat(27-16): print the doubt badge and the factor note on the PDF factor cards |

## Verification

- `npx jest -c jest.unit.config.js src/app/survey-pdf --coverage=false`: 23 suites, 477 tests pass (conditions-section 21, factor-section 26, build-html and palette/assemble extended).
- `npm --workspace mobile run test:unit:coverage`: 343 suites, 4697 tests pass; coverage ratchets hold.
- `npm --workspace mobile run lint`, `npm run lint`, `npm run typecheck` clean; `npm run format:check` reports only the local `.claude/settings.local.json`.
- Acceptance greps: `buildConditionsBlock`, `escapeHtml`, `pre-wrap`, `overflow-wrap: anywhere`, `factor-badge`, `factor-user-note`, `conditionsSectionCss` all found where the plan says.

## Device check not done here

The real page count and a page image on the iOS simulator and the Android emulator are owned by plan 27-21. Here only the pure height estimates and unit tests exist. The pagination test records its estimate-level page count in its name (4 pages without annotations, 6 with the maximal survey).

## Deviations from Plan

### Auto-fixed Issues

None for Rules 1 to 3. Points to know:

1. **Page budget finding (for 27-21).** The UI-SPEC 4.4 target is "at most one page more" for the maximal survey. With the estimates the spec prescribes (267 px for the conditions block with a 1000 character note and a weather, 42 px per 300 character factor note, 687 px in all against a capacity of 680) the fully maximal fixture goes from 4 to 6 pages: the note alone adds one page, the ten factor notes alone add one page, and the two together add two because blocks are never split. The unit test therefore bounds the growth at `+2` and the exact count is left to the device check. If the devices confirm two extra pages, the UI-SPEC target (or the fixture) needs revisiting; no estimate was changed to hide it.
2. **Weather-only height.** The plan's "weather-only block = 73" is the height of one row. A weather with values always shows two rows (sentence and source), so the real weather-only block is 92 (73 + 19). The test pins both numbers.
3. **Unit spaces.** The catalogue keeps a non-breaking space between a value and its unit (`14 °C`), so tests compare with those characters.
4. **Test fixtures outside the plan's file list.** Every other `survey-pdf/*.test.ts` and `mobile/test/survey-export-fixtures.ts` needed the new `conditions` field and the two palette keys to compile; no logic change there.
5. **RED/GREEN.** Tests and code of each task were written together and committed together (the plan asks for no separate RED commit).

## Known Stubs

None. The conditions are read from the real local draft and the badge and note from the real factor entries.

## Threat Flags

None new. T-27-53: every dynamic value goes through `escapeHtml` (tests with `<`, `&`, quotes, an `<img onerror>` and `<script>` payload); the content security policy is unchanged. T-27-54: notes clamped to 1000 and 300 in the builders, per-paragraph estimates, pagination test at the maximal fixture (blocks whole, each on one page). T-27-55 accepted as planned.

## Self-Check: PASSED

- Files present: `mobile/src/app/survey-pdf/conditions-section.ts`, `mobile/src/app/survey-pdf/conditions-section.test.ts`
- Commits present in `git log`: cc21b334, 36d1b7db, ca5c8acd
- Gates run on the final tree: jest (survey-pdf and the full mobile coverage run), lint, typecheck, format
