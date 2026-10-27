---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 04
subsystem: pdf-export
tags: [pdf, catalogue, identity, file-name, i18n]
status: complete
requires:
  - phase: 33-02
    provides: "ExportMode type and SurveyExportData.mode"
provides:
  - "fr.surveyExport.identity.communeValue; identity.commune now 'Commune'; identity.department removed"
  - "fr.surveyExport.cover.* (scoreA11y, subscoreA11y, outOf, methodWithCas, versionShort) and summary.* (eyebrow, mapHeading, metaLine, subscores, trendUnavailable)"
  - "fr.surveyExport.file.summarySuffix = 'resume'"
  - "shortenText(text, max) and shortenList(items, max) in survey-pdf/html.ts"
  - "buildExportFileName({ ..., mode }) with the -resume suffix"
affects: [33-06, 33-10, 33-11]
key-files:
  modified:
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/i18n/fr/survey-export.test.ts
    - mobile/src/app/survey-pdf/identity.ts
    - mobile/src/app/survey-pdf/identity.test.ts
    - mobile/src/app/survey-pdf/html.ts
    - mobile/src/app/survey-pdf/html.test.ts
    - mobile/src/app/survey-pdf/file-name.ts
    - mobile/src/app/survey-pdf/file-name.test.ts
    - mobile/src/app/survey-pdf/run-export.ts
    - mobile/src/app/survey-pdf/run-export.test.ts
duration: short
completed: 2026-10-24
---

# Phase 33 Plan 04: Commune row, cover and summary strings, summary file name

One merged "Commune" row ("77186 (département 77)"), every new cover and summary string in the catalogue, `shortenText`/`shortenList` for fixed boxes, and the `-resume.pdf` file name of the summary.

## Tasks

| Task | Commit | Content |
|------|--------|---------|
| 1 | ed19fded | Catalogue: `identity.communeValue`, `cover`, `summary`, `file.summarySuffix`, pinned in `survey-export.test.ts` |
| 2 | 085b51c9 | One Commune row, 98x three-character département, `identity.department` removed, `identity.commune` = "Commune", `shortenText` / `shortenList` |
| 3 | eace8b20 | `buildExportFileName` takes `mode`, summary gets `-resume` and never `-brouillon`, runner passes `data.mode` |

## Decisions and notes

- Task 1 keeps `identity.commune` / `identity.department` as they were and Task 2 changes them together with their only reader (identity.ts), so every commit typechecks.
- `inseeFromParcelId` already had the 97 rule; 98 was added (`startsWith("98")`). Corsica stays two characters via the regex.
- `shortenText` cuts at the last space (searched up to index `max - 1`, so a space right after the kept text counts) when it lies at index >= max / 2, else inside the word; always ends with one U+2026 and is at most `max` long. `max <= 0` gives "". `shortenList` follows the plan exactly: when the first item alone plus ", …" does not fit it falls back to `shortenText(first, max)`, so a first item that fits `max` but not the mark is returned without ellipsis (plan behaviour, noted for the cover/summary builders: give a `max` with room for the mark).
- Page 1 of the v3.2 fixture: the identity card is 19 units shorter for a valid parcel id (tested by comparing a valid and a malformed id); `build-html.test.ts` was not edited and still passes.

## Deviations from Plan

None - plan executed as written. (Test-side adjustment: in `identity.test.ts` the caption list is compared with `escapeHtml(t.identity.observationYear)`, because the caption contains an apostrophe that the builder escapes.)

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/i18n src/__checks__ --coverage=false`: 41 suites, 820 tests passed (console noise from map-snapshot tests is expected logging).
- `npx tsc --noEmit -p .` in `mobile/`: clean.
- `npm run lint`: exit 0. `npm run typecheck`: exit 0.
- `npm run format:check`: only warning is the untracked, pre-existing `.claude/settings.local.json` (not part of this plan, not fixed).
- Acceptance greps: `summarySuffix: "resume"`, `trendUnavailable`, `methodWithCas`, `IBP_MAX.stand`, `startsWith("98")`, `export function shortenList/shortenText`, `mode: data.mode`, `summarySuffix` in file-name.ts all present; "code officiel" and `"Département"` absent from the catalogue.

## Threat model

T-33-09: slug unchanged, suffix from a closed set, SAFE pattern test now loops over mode x draft x year x hostile names. T-33-10: anchored regex kept, value escaped by `textRow`. T-33-11: helpers shorten raw text and document that callers escape.

## For the next plans

- 33-06 / 33-10 read `cover.*`; 33-11 reads `summary.*` (all live in `fr.surveyExport`). The summary must not print `trend.unavailable`.
- Callers of `buildExportFileName` must now pass `mode`.
- Escape after shortening: `escapeHtml(shortenList(ids, n))`.

## Known Stubs

None.

## Self-Check: PASSED

Files and commits ed19fded, 085b51c9, eace8b20 exist.
