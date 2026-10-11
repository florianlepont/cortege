---
phase: 27-quick-survey-additions-inserted-v1
plan: 03
subsystem: mobile-ui
tags: [i18n, catalogue, note-field, contrast, survey-note, factor-note, weather]
requires:
  - phase: 27-02
    provides: "note limits (1000 and 300) and the canonical helpers the write paths will call"
provides:
  - "fr.conditions catalogue module (Conditions section, weather statuses, survey note, read-only and summary strings)"
  - "fr.factorDetail.strip, fr.surveyDetail.factors.doubtBadge/noteMore/noteLess and a11y.factorReadOnly, fr.surveyExport.conditions, fr.parcelHistory noteA11y, fr.search matchedInNote"
  - "NoteField UI primitive (counter, maxLength, live region, onCommit on blur)"
  - "ochre switch-track contrast pair, both schemes"
affects: [27-10, 27-14, 27-15, 27-16, 27-18, 27-19]
tech-stack:
  added: []
  patterns: ["no-break space written as the \\u00a0 escape in catalogue strings (a literal one fails no-irregular-whitespace in templates and comments)"]
key-files:
  created:
    - mobile/src/i18n/fr/conditions.ts
    - mobile/src/i18n/fr/conditions.test.ts
    - mobile/src/i18n/fr/catalogue-additions-27.test.ts
    - mobile/src/ui/NoteField.tsx
    - mobile/src/ui/NoteField.test.tsx
  modified:
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/i18n/fr/parcel-history.ts
    - mobile/src/i18n/fr/search.ts
    - mobile/src/i18n/catalogue.test.ts
    - mobile/src/app/visual-tokens.test.ts
key-decisions:
  - "D-18, D-26, D-06: all phase copy lives in the typed catalogue, with the Source : Météo-France attribution and both visibility helpers"
  - "Light scheme: the ochre switch track reaches only 2.90:1 on warningSoft, so plan 27-14 must drop the soft fill of the ON row in light (keep hairline and label colour)"
  - "openFactor stays backward compatible: its only caller (FactorsList) compiles unchanged, flags are optional"
requirements-completed: []
duration: 35 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 03: Catalogue copy and NoteField Summary

The whole French text of phase 27 is in the typed catalogue (new `fr.conditions` module plus additions to five modules), the shared `NoteField` primitive exists with tests, and the ochre switch-track contrast is measured in both schemes.

## What was built

- `fr/conditions.ts` (`fr.conditions`): title, subtitle, eight sky labels, weather fields with units, range messages and accessibility labels, the seven status lines, the refill confirmation (with the added `cancel: "Annuler"`), `source: "Source : Météo-France"`, the `parts` line builders, the survey note texts (visibility helper, hint, counter and its spoken twin), read-only and summary strings. Units follow a no-break space.
- Additions: `factorDetail.strip` (doubt switch and note links named per factor), `surveyDetail.factors.doubtBadge/noteMore/noteLess` and `a11y.factorReadOnly`, `a11y.openFactor` accepting `doubtful` and `hasNote` (output unchanged without flags), `surveyExport.conditions` and `factors.doubt/note`, `parcelHistory.page.list.noteA11y`, `search.rows.matchedInNote`.
- `ui/NoteField.tsx`: multiline `AppField` (13 SemiBold label, line height 20, min and max height from props, `maxLength`, sentence capitals, spell check), helper line plus right-aligned counter that wraps under the helper at large text, counter in `onSurface.warning` and a polite live region from 90 % of the limit, `onCommit(value)` on blur with the raw text (normalisation stays in the write paths of 27-08 and 27-13).
- `visual-tokens.test.ts`: one pair per scheme for the ochre switch track.

## Contrast result for plan 27-14

| Scheme | ochre vs glass card | ochre vs warningSoft |
|--------|--------------------|----------------------|
| light | 3.25:1 (pass) | 2.90:1 (fails 3:1) |
| dark | 5.14:1 (pass) | 4.46:1 (pass) |

Plan 27-14 must apply the UI-SPEC fallback in the light scheme: the ON row of the "Douteux" strip drops its `warningSoft` fill and keeps the hairline (`notice.warningBorder`) and the `onSurface.warning` label. The test pins this (light: `onSurface.warning` on the glass card is at least 4.5:1; the soft-fill pair is asserted to stay below 3:1 so a token change forces a revisit). The dark scheme keeps the soft fill.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 691c7a7d | feat(27-03): add fr.conditions catalogue module |
| 2 | 4e90eff8 | feat(27-03): add strip, score row, PDF, history and search strings |
| 1 (fix) | a61ffdd3 | fix(27-03): write no-break spaces of fr.conditions as escapes |
| 3 | edc14bab | feat(27-03): add NoteField primitive and ochre switch-track contrast pair |

## Verification

- `npx jest -c jest.unit.config.js` on mobile: 329 suites, 4430 tests pass (includes the source gates catalogue-dash, abbreviations, structure, icons, motion, layers, fonts and visual-tokens)
- `src/i18n` statements, functions and lines at 100 % for the new modules (a subset-only run shows branches below the 76 % ratchet because other suites cover the older branches; the full run passes)
- `npm run lint`, `npm run typecheck` clean; `npm run format:check` reports only `.claude/settings.local.json` (a local settings file, as in plan 27-02)
- Docker not needed: no API or database part in this plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `src/i18n/catalogue.test.ts` knew a fixed list of sections**
- **Found during:** Task 2 verify (`src/i18n` subset)
- **Issue:** the section-list test failed on the new `conditions` section, and the function-entry test failed because `weather.parts.line` takes a list, not a parameter object
- **Fix:** added `conditions` to the expected sections and a `LIST_ARGUMENTS` entry for `conditions.weather.parts.line`
- **Files modified:** `mobile/src/i18n/catalogue.test.ts` (not in the plan's file list)
- **Commit:** 4e90eff8

**2. [Rule 1 - Bug] Literal no-break spaces failed lint**
- **Found during:** Task 3 lint run
- **Issue:** `fr/conditions.ts` held literal U+00A0 characters in templates and a comment, which `no-irregular-whitespace` rejects
- **Fix:** written as ` ` escapes (the strings are identical at runtime; the tests assert the real character)
- **Commit:** a61ffdd3

**3. Task 3 order.** The component and its test were written together; the RED run was not committed separately (the plan marks the task `tdd` but asks for no separate RED commit).

### Deferred Issues (out of scope)

None from this plan.

## Known Stubs

None. The catalogue strings are not yet read by any screen; the screens are the job of plans 27-10, 27-14, 27-15, 27-16, 27-18 and 27-19.

## Threat Flags

None. T-27-07 (oversized note) is mitigated at the input by the hard `maxLength` (the write paths clamp again via 27-02 helpers); T-27-08 (note believed private) by the visibility helper strings and the `helper` prop of `NoteField`.

## Self-Check: PASSED

- Files present: `mobile/src/i18n/fr/conditions.ts`, `conditions.test.ts`, `catalogue-additions-27.test.ts`, `mobile/src/ui/NoteField.tsx`, `NoteField.test.tsx`
- Commits present in `git log`: 691c7a7d, 4e90eff8, a61ffdd3, edc14bab
- Acceptance greps: `conditions: conditionsFr`, `Source : Météo-France`, `Visible par les membres qui peuvent lire ce relevé.`, `matchedInNote`, `doubtBadge`, `factorReadOnly`, `weatherSentence`, `noteA11y`, `export function NoteField`, `accessibilityLiveRegion`, `ochre` in `visual-tokens.test.ts`
