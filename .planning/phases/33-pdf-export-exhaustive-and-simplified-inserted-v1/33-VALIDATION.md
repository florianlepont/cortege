---
phase: 33
slug: pdf-export-exhaustive-and-simplified
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-23
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `33-RESEARCH.md`, section "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest, `testEnvironment: node` |
| **Config file** | `mobile/jest.unit.config.js` (roots `src`, coverage ratchet) |
| **Quick run command** | `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/screens/survey-detail src/navigation src/__checks__ src/i18n` |
| **Full suite command** | `npm run test:unit`, plus `npm run lint`, `npm run typecheck`, `npm run format:check` |
| **Estimated runtime** | ~30 s quick, a few minutes full |

---

## Sampling Rate

- **After every task commit:** the quick run command
- **After every plan wave:** `npm run test:unit`, `npm run lint`, `npm run typecheck`
- **Before `/gsd-verify-work`:** full suite green, device measurements recorded in the summary, RC-05 closed
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Filled by the planner, one row per task, from this requirement map:

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| REQ-QA-pdf-sections-registry | unique ids, pinned order, mode filter, summary omits photo and factor sections, CSS only of included sections | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/sections.test.ts src/app/survey-pdf/build-html.test.ts` | ❌ W0 (`sections.test.ts`), `build-html.test.ts` edited |
| REQ-C-pdf-two-versions | `mode` flows from input to data, facade keys unchanged, hook refuses summary on a draft, sheet disables the card, nonce handled once | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf-export.test.ts src/screens/survey-detail/useSurveyPdfExport.test.ts` plus the new sheet and request tests | edit + ❌ W0 |
| REQ-C-pdf-summary-page | one page for worst inputs, basemap present or absent, no history, one survey, stale cache, no photo read in the loader | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/summary-section.test.ts src/app/survey-pdf/assemble-export-data.test.ts` | ❌ W0 |
| REQ-C-pdf-modern-layout | cover block, palette keys and contrast, ring/bars/trend SVG strings, no em dash, only `data:` URIs, no network attribute | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/cover-section.test.ts src/app/survey-pdf/palette.test.ts src/app/survey-pdf/styles.test.ts` | ❌ W0 + edits |
| REQ-C-pdf-lean-export | page counts of all fixtures not above today's, map and trend share a page, no block cut | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/build-html.test.ts src/app/survey-pdf/paginate.test.ts` | edit |
| REQ-C-pdf-commune-row | one Commune row, "77186 (département 77)", 2A/2B, 971, 98x, malformed id | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/identity.test.ts` | edit |
| file naming | suffix by mode, regex, draft | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/file-name.test.ts` | edit |
| gates | dash, abbreviations, structure, icons | unit | `npx jest -c jest.unit.config.js src/__checks__` | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Design probe on both engines (throwaway, not committed): SVG gradients, stroke-opacity contour art, CSS gradient background, the new title hierarchy; pictures from `pdftoppm`
- [ ] `sections.test.ts`, `summary-section.test.ts`, `cover-section.test.ts`, sheet route and request hook tests, catalogue test for the choice sheet
- [ ] Fixtures: `mode` on the three existing fixtures; new summary variants (map present, history of one and of three, no history, stale cache)
- [ ] `palette.test.ts` key list and contrast pairs for the new keys
- [ ] A reusable local render harness (throwaway jest test + Chrome headless) described in the plan so every plan can look at the output

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Page counts, file weight, alignment of SVG and gradients, share sheet, generation time on iOS and Android | REQ-C-pdf-lean-export, REQ-C-pdf-modern-layout | print engines differ (WebKit, Chromium); height and width constants are device-measured | iOS simulator, Android emulator, then the owner's iPhone; `pdfinfo`, `pdffonts`, `pdfimages`, `pdftotext -bbox` as in 25.1-07 |
| Owner review of both versions on the phone | success criterion 2 | taste and fitness for patrons | the owner exports both versions of a submitted survey and a draft |

---

## Validation Sign-Off

- [ ] All tasks have an automated verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
