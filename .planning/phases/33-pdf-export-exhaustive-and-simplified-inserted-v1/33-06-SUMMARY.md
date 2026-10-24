---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 06
subsystem: pdf-export
tags: [pdf, identity, factor-cards, section-title, contrast]
requires:
  - phase: 33-03
    provides: "sectionTitleCss in styles.ts, section registry"
  - phase: 33-04
    provides: "single Commune row, cover.methodWithCas and cover.versionShort strings"
provides:
  - "one merged identity card (identity rows, rule, 'Critères de diagnostic', method rows)"
  - "methodShortText(method) for the cover"
  - "conditions, route and factor cards in the new style (radius 12, section title, factor tone strip)"
affects: [33-10, 33-13, 33-14]
key-files:
  modified:
    - mobile/src/app/survey-pdf/identity.ts
    - mobile/src/app/survey-pdf/identity.test.ts
    - mobile/src/app/survey-pdf/conditions-section.ts
    - mobile/src/app/survey-pdf/conditions-section.test.ts
    - mobile/src/app/survey-pdf/route-section.ts
    - mobile/src/app/survey-pdf/route-section.test.ts
    - mobile/src/app/survey-pdf/factor-section.ts
    - mobile/src/app/survey-pdf/factor-section.test.ts
key-decisions:
  - "The merged card is one block with id identity; the id identity-method is gone (nothing else referenced it)"
  - "OBS_WIDTH 312 is the legacy 313 minus the one unit the left side grew; the other pieces are not re-summed (legacy calibration)"
  - "The route card lost its now unused CARD_HEADING constant: the 24 unit heading lives in sectionTitleCss, the height estimate is conditionsBlockHeight"
metrics:
  tasks: 2
  files: 8
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 06: Identity card merged, text cards restyled Summary

The identity and method facts now print in one card 29 units shorter than the two it replaces, the conditions, route and factor cards carry the new section title and radius 12, factor cards get a left strip in their tone, and the muted genus chips are readable.

## What was built

- `identity.ts`: `buildIdentityBlocks` returns one `identity` block: `h2.identity-heading` (section title), identity table, `div.identity-rule` (1 unit, line colour), `h3.identity-subheading` ("Critères de diagnostic", 11 / 24 Sora-SemiBold, ink), method table. Estimate = 20 + 24 + identity rows + `RULE_HEIGHT` 1 + `SUBHEADING_HEIGHT` 24 + method rows + 10. Parcel ids are escaped, wrapped in `identity-nowrap` spans and joined by ", "; the estimate counts the joined plain text. `methodShortText` gives "v3.2, cas 2", "v3.2", "v3.0" (also for an untagged survey) or "Non renseigné", built from `resolveMethodVersion` and `fr.surveyExport.cover`.
- `conditions-section.ts`, `route-section.ts`: heading rule replaced by `sectionTitleCss(".conditions-heading" / ".route-heading")`, card radius 12. Heights and rows untouched.
- `factor-section.ts`: `OBS_WIDTH` 312; each card element has `style="border-left-color: <tone>"` (`toneColor(factorTone(points))`, `palette.line` for a missing or not-filled factor, escaped); card radius 12, `border-left: 4px solid line` as CSS default, padding `8px 10px 8px 8px`; `.factor-item` and `.factor-badge` radius 8, chips stay 4; `.factor-group` in accent; `.factor-item-muted` in inkMuted (B.12).

## Commits

| Task | Commit | Content |
|------|--------|---------|
| 1 | db8aeab9 | merged identity card, methodShortText, nowrap ids |
| 2 | 52da12c7 | section titles, radius 12, factor tone strip, OBS_WIDTH 312, B.12 fix |
| fix | 1f34a1c1 | removed the unused `CARD_HEADING` of route-section.ts (lint error found at the end) |

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/__checks__ --coverage=false`: 32 suites, 698 tests passed (before the one-line lint fix; `survey-pdf` alone 603 passed after it). `build-html.test.ts` is unchanged and green: every pinned page count held, as the plan predicted (no estimate had to be corrected).
- `npx tsc --noEmit -p .` (mobile), `npm run lint` (exit 0 after the fix), `npm run typecheck` (exit 0): green.
- `npm run format:check`: only the untracked, pre-existing `.claude/settings.local.json` is reported (not part of this plan, not fixed).
- `git log --format=%s -- mobile/src/app/survey-pdf/build-html.test.ts | grep -c '33-06'` prints 0.
- Render with the 33-01 harness (Chrome headless, layout check only): builder page counts unchanged for all five cases (4, 4, 6, 7, 10); `typical-conditioned` PDF has 7 pages. Page 1 shows the merged "Identification du relevé" card with its accent-bar title, the thin rule and the "Critères de diagnostic" sub-heading, then "Conditions du relevé" and "Parcours utilisé" with the same accent-bar titles, all with rounded 12 corners; the parcel id is on one line. The score card below is still the old style (another plan). Page 2 shows the group heading "Facteurs liés au peuplement et à la gestion forestière" in accent green and cards A (orange), B (red) and C (green) with a tone strip along the left edge that follows the rounded corner. Nothing overflows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused `CARD_HEADING` in route-section.ts**
- **Found during:** final `npm run lint`
- **Issue:** the heading rule that used it was replaced by `sectionTitleCss`; ESLint reports an unused variable (error).
- **Fix:** removed the constant (route height comes from `conditionsBlockHeight`).
- **Files modified:** `mobile/src/app/survey-pdf/route-section.ts`
- **Commit:** 1f34a1c1

Test-side adjustments: the conditions and route CSS tests asserted `font-family: Sora-SemiBold` for the heading; `sectionTitleCss` writes the quoted font stack, so they now assert `sectionTitleCss(...)` itself plus the body and label fonts.

## Notes for next plans

- 33-10 (cover): import `methodShortText` from `identity.ts`.
- The old identity-method block id no longer exists; nothing in `src` referenced it.
- Real-engine confirmation of `OBS_WIDTH` 312 and the identity estimate is left to plan 33-14 (re-measure on iOS and Android), as planned.

## Known Stubs

None.

## Threat Flags

None. T-33-14 (parcel ids escaped before the nowrap span, tested with a hostile id) and T-33-15 (strip colour only from `PdfPalette`, escaped, tested with a hostile palette value) are mitigated.

## Self-Check: PASSED

- identity.ts, factor-section.ts and the other six files exist and are committed; commits db8aeab9 and 52da12c7 exist.
