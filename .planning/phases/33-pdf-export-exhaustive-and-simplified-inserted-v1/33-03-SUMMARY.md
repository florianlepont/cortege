---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 03
subsystem: mobile-pdf-export
tags: [pdf, sections-registry, pagination, page-kinds, css]
requires:
  - phase: 33-02
    provides: ExportMode, PdfBlock.pageStyle, forest palette keys
provides:
  - "PDF_SECTIONS / sectionsFor(mode): the one ordered section registry (D-10)"
  - "paginate.ts cover and summary page kinds from PdfBlock.pageStyle"
  - "styles.ts page-kind CSS, COVER_*/SUMMARY_* geometry, PDF_LOGO_DATA_URI, sectionTitleCss"
affects: [33-04, 33-13]
tech-stack:
  patterns: ["registry of sections filtered by mode, assembler = two flatMaps"]
key-files:
  created:
    - mobile/src/app/survey-pdf/sections.ts
    - mobile/src/app/survey-pdf/sections.test.ts
  modified:
    - mobile/src/app/survey-pdf/build-html.ts
    - mobile/src/app/survey-pdf/build-html.test.ts
    - mobile/src/app/survey-pdf/paginate.ts
    - mobile/src/app/survey-pdf/paginate.test.ts
    - mobile/src/app/survey-pdf/styles.ts
    - mobile/src/app/survey-pdf/styles.test.ts
key-decisions:
  - "A page-style block skips the fill-factor check: it is isolated by startsAlone/followsAlone, so a cover after the invisible font warm-up stays on page 1"
  - "The legacy-equality test rebuilds the old fixed lists from the section builders and compares the whole document, so it keeps guarding the complete PDF after the plan"
metrics:
  tasks: 2
  files: 8
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 03: Section registry and page kinds Summary

The PDF sections now register through one frozen ordered list (`sections.ts`), the assembler is two flatMaps over `sectionsFor(data.mode)`, and the paginator prints cover and summary pages with their own chrome. The running header lost its 26-unit logo; one shared helper draws the new section title.

## What was built

- `sections.ts`: `PdfSection`, frozen `PDF_SECTIONS` (identity, conditions, route, score-summary, factor-chart, factors, map, trend, photos, all `complete` only) and `sectionsFor(mode)`. `sectionsFor("summary")` is empty until plan 33-13 appends its entries.
- `build-html.ts` names no section any more (no section import left). The font warm-up block stays outside the registry and first.
- `paginate.ts`: a block with `pageStyle` is alone on its page (before, first and after positions tested), the block after it opens a new page, a keepWithNext run stops at it. Cover pages: no running header, footer with "Page n / N", class `page-cover`, banner and watermark kept on a draft. Summary pages: no header, footer without the page number, class `page-summary`. `PageChrome.logoDataUri` removed (U-01).
- `styles.ts`: `COVER_PANEL_HEIGHT` 380, `COVER_BANNER_TOP` 392, `COVER_WATERMARK_TOP` 555, `SUMMARY_BODY_TOP` 36, `SUMMARY_BODY_HEIGHT` 764, `PDF_LOGO_DATA_URI` (moved, with its rejection cases), `PDF_CLASS.pageCover` / `pageSummary` (`logo` removed), the page-kind rules written after the draft body rule, and `sectionTitleCss(selector, palette)` (13 / 24, accent, 4-unit bar, padding 8).

## Commits

- fd1c0efe feat(33-03): ordered section registry and a two-flatMap assembler
- 15846b66 feat(33-03): cover and summary page kinds, header without logo, section title helper

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/__checks__ --coverage=false`: 32 suites, 660 tests passed. All pinned page counts of `build-html.test.ts` unchanged.
- `npx tsc --noEmit -p .` (mobile), `npm run lint`, `npm run typecheck`: green.
- `npm run format:check`: only `.claude/settings.local.json` (untracked, pre-existing, not part of this plan) is reported.
- The optional render with the harness of 33-RENDER-HARNESS.md was not run: the complete document is proven equal to the old fixed lists by test, and the header change is a pure removal of an image.

## Deviations from Plan

None - plan executed as written. One small addition: `packPages` also ends a keepWithNext run at a page-style block (a heading must not be held to a cover or summary), covered by a test.

## Notes for next plans

- To add a section (cover, summary in 33-13), append an entry to `PDF_SECTIONS` with `modes`; do not touch `build-html.ts`. 33-13 removes `score-summary` and adds `cover` and `summary`.
- A cover or summary block must set `pageStyle`; its html fills the whole `.page-body` (cover: 595 x 840 at 0,0; summary: 515 x 764 at x 40, y 36... the summary body keeps `left: 40` and `width: 515` from the base rule).
- Section plans of wave 3 use `sectionTitleCss(".x-heading", palette)` inside their own CSS function.
- The existing `build-html.test.ts` "prints ... exactly as the fixed lists did" case must keep passing for the complete mode until a plan changes the complete layout on purpose; it then needs updating in that plan.

## Known Stubs

None.

## Threat Flags

None. T-33-06 (chrome text escaped), T-33-07 (logo data URI moved with its rejection cases, CSP unchanged) and T-33-08 (page-style isolation tested) are mitigated as planned.

## Self-Check: PASSED

- sections.ts and sections.test.ts exist; commits fd1c0efe and 15846b66 exist.
