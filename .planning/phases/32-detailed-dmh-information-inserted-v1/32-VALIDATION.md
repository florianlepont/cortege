---
phase: 32
slug: detailed-dmh-information-inserted-v1
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-23
updated: 2026-10-24
---

# Phase 32 - Validation Strategy

> Per-phase validation contract. Source of the behaviours: the "Validation Architecture" section of `32-RESEARCH.md`. The map below is keyed by the real task IDs of the 16 plans (`32-NN-TT` = plan NN, task TT; 40 tasks, waves 1 to 9). Revised 2026-10-24 (owner decision D-11, amending D-06 and D-09): the drawings are vector path data with a one-shot stroke animation; plan 32-04 has three tasks and plan 32-05 moved to wave 2 (it describes the delivered drawings). `wave_0_complete` stays `false` on purpose: two Wave 0 items cannot sit in wave 1 plans (see "Wave 0 Requirements").

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (react-test-renderer, @testing-library/react-native) |
| **Config file** | `mobile/jest.unit.config.js`; `packages/ibp-domain/jest.config.js` (parity, untouched) |
| **Quick run command** | `npm --workspace mobile run test:unit -- src/app/dmh-guide src/screens/dmh-guide src/screens/factor-detail src/__checks__` |
| **Full suite command** | `npm run test:unit` then `npm run lint`, `npm run typecheck`, `npm run format:check` |
| **Estimated runtime** | quick ~60 s, full ~5 min |

## Sampling Rate

- **After every task commit:** the quick run command for the touched folders
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green and `test:coverage:mobile` thresholds respected (`src/navigation` stays at 100 %)
- **Max feedback latency:** 120 seconds

## Per-Task Verification Map

Shorthand used in the command column (the full command of each task is its `<verify><automated>` in the plan): `mut` = `npm --workspace mobile run test:unit --`; `mtc` = `npm --workspace mobile run typecheck`; `mlint` = `npm --workspace mobile run lint`; `$PH` = `.planning/phases/32-detailed-dmh-information-inserted-v1`. A `\|` in a cell is a shell pipe.

"File Exists" says whether the test the task runs exists before the task: "exists", "extend" (existing suite, new cases), "new, test-first" (the task writes the test before the code, so no verify points at a missing file), "docs" (the check reads a document the task writes), "n/a" (state check).

| Task ID | Wave | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|----------|-----------|-------------------|-------------|--------|
| 32-01-01 | 1 | REQ-C-dmh-fast-entry (structure) | Field renderers moved to `renderFactorField.tsx`, no behaviour change; `FactorDetailScreen.tsx` at 280 lines or less; its test file unedited | unit + structure gate | `mut src/screens/FactorDetailScreen.test.tsx src/screens/survey-form src/__checks__/structure.test.ts && mtc && test $(wc -l < mobile/src/screens/FactorDetailScreen.tsx) -le 280` | exists | pending |
| 32-01-02 | 1 | REQ-C-dmh-fast-entry | Old-flow press count for S1 and S2 and the payload it writes recorded as `OLD_FLOW_PRESSES` and `OLD_FLOW_F_PAYLOAD` | unit (tap-count proxy) | `mut src/screens/factor-detail/dmh-entry-cost.test.tsx && mtc` | new, test-first | pending |
| 32-02-01 | 1 | REQ-DOC-dmh-sources | Owner states which pocket-guide PDF is supplied | checkpoint (decision) | `test -f docs/references/README.md` | exists | pending |
| 32-02-02 | 1 | REQ-DOC-dmh-sources | References README holds both pocket-guide SHA-256, the typology DOI and the licence status; NOTICE section; no PDF in the repository | docs check | `grep -q "10.1016/j.ecolind.2017.08.051" docs/references/README.md && grep -q "## Dendromicrohabitat guide" NOTICE.md` (plus both hashes and the PDF check) | docs | pending |
| 32-03-01 | 1 | REQ-C-dmh-fast-entry | `useHoldRepeat`: immediate step, 120 ms repeat, x2 then x5, clamped, stop and unmount cleanup; `FactorCounterInput` tests pass unedited | unit | `mut src/ui/useHoldRepeat.test.ts src/ui/FactorCounterInput.test.tsx src/__checks__/motion.test.ts` | new, test-first (hook); exists (counter) | pending |
| 32-03-02 | 1 | REQ-C-dmh-fast-entry | `DmhCounterStepper`: 48 pt, one adjustable accessibility element, typed entry handed back as text, "-" disabled at 0, no haptics | unit + gates | `mut src/ui/DmhCounterStepper.test.tsx src/__checks__ src/i18n && mtc` | new, test-first | pending |
| 32-04-01 | 1 | REQ-C-dmh-illustrations | `drawing-geometry.ts`: subpaths split, commands normalised (dots kept), ellipse to cubics, rotation, strict parse, lengths (line, closed square, straight cubic, circle), stored length; the converter checks the pilot style and refuses an incomplete set without writing | unit + script run | `mut src/app/dmh-guide/drawing-geometry.test.ts && mtc` (plus the converter run on `drawings-pilot/`: "missing:" reported, no "style:", module untouched) | new, test-first | pending |
| 32-04-02 | 1 | REQ-C-dmh-illustrations | 15 SVG sources present (missing ones drawn in the pilot style); `drawings.ts` generated with 15 entries; gate: group codes, frame, widths in `DMH_DRAWING_STROKE_WIDTHS`, paths parse as one subpath, fresh lengths, 8 KiB per drawing, 80 KiB module, no colour; reproducible output | source gate | `test $(ls $PH/drawings/dmh_*.svg \| wc -l) -eq 15 && mut src/__checks__/dmh-drawings.test.ts src/__checks__/structure.test.ts src/__checks__/catalogue-dash.test.ts && mtc && mlint` | new, test-first (Wave 0) | pending |
| 32-04-03 | 1 | REQ-C-dmh-illustrations | `drawingTimeline` and `strokeReveal`; `DmhDrawing` renders nothing without data, draws the strokes once in source order (one delayed timing with `ReduceMotion.System`, no replay on re-render), complete at the first frame under Reduce Motion, one accessible image; ink `colors.textPrimary` at 4.5:1 on the glass card in both schemes | unit + motion gate | `mut src/app/dmh-guide src/ui/DmhDrawing.test.tsx src/app/visual-tokens.test.ts src/__checks__ && mtc && mlint` | new, test-first (motion, component); extend (tokens test) | pending |
| 32-05-01 | 2 | REQ-DOC-dmh-sources, REQ-C-dmh-guide | Spec sections 1 to 5: draft status, 15 correspondence rows, 43 counted and 9 not counted types (52), no PDF committed | docs check | `grep -q "## 5. Table de correspondance" docs/specs/dmh-guide-content-v1.md && grep -q "43 types comptés, 9 non comptés, 52 au total" docs/specs/dmh-guide-content-v1.md` (plus the 15-row count) | docs | pending |
| 32-05-02 | 2 | REQ-C-dmh-guide, REQ-C-dmh-illustrations | Sheets of dmh_01 to dmh_08, each with the alt sentence of its delivered drawing ("Texte du dessin") | docs check | `grep -q "## 6. Fiches des groupes" docs/specs/dmh-guide-content-v1.md` (plus one heading per code 01 to 08 and 8 alt sentences) | docs | pending |
| 32-05-03 | 2 | REQ-C-dmh-guide, REQ-C-dmh-illustrations, REQ-DOC-dmh-sources | Sheets 09 to 15 with their alt sentences, list order, interface texts, record of the 15 drawings (section 9, empty review cells), O-32-1 to O-32-12 and P-01 to P-04 with defaults, validation block, specs index line | docs check | `grep -q "## 12. Validation" docs/specs/dmh-guide-content-v1.md && grep -q "dmh-guide-content-v1.md" docs/specs/README.md` (plus the heading and decision-row loops, 15 alt sentences and 15 drawing rows) | docs | pending |
| 32-06-01 | 2 | REQ-C-dmh-fast-entry | `withSelectionToggled` keeps option order; the store's `bumpDmhCount` | unit | `mut src/app/factor-selections.test.ts src/hooks/useUncappedEntry.test.ts` | extend | pending |
| 32-06-02 | 2 | REQ-C-dmh-fast-entry | `bumpDmhGroup` ticks and counts in one call; S1 and S2 write exactly `OLD_FLOW_F_PAYLOAD`; scores unchanged | unit + parity | `mut src/hooks/useSurveyForm.test.ts src/screens/factor-detail/dmh-entry-cost.test.tsx && npm --workspace @cortege/ibp-domain run test && mtc` | extend | pending |
| 32-07-01 | 2 | REQ-FT-dmh-speed | French timing protocol written before any measurement; measuring aid exists only as a patch file | docs + repository state | `test -f $PH/32-dmh-timing-diag.patch && grep -q "## 7. Résultats avant" docs/user-tests/dmh-entry-timing.md && test ! -e mobile/src/diag && test -z "$(git branch --list 'diag/dmh-timing')"` | docs | pending |
| 32-07-02 | 2 | REQ-FT-dmh-speed | Owner times the old flow: S1, S2, S3, three runs each, iPhone Release build of origin/main | manual (checkpoint human-action) + state check | `git -C ~/Projects/cortege status --porcelain \| wc -l \| tr -d ' ' \| grep -qx 0` | n/a (manual) | pending |
| 32-07-03 | 2 | REQ-FT-dmh-speed | Before medians recorded; S2 fixture = the owner's tally; old-flow bar re-measured for S2 | unit + docs | `mut src/screens/factor-detail/dmh-entry-cost.test.tsx src/hooks/useSurveyForm.test.ts && grep -q "^baseline:" $PH/32-07-SUMMARY.md` | exists (from 32-01-02) | pending |
| 32-08-01 | 3 | REQ-C-dmh-fast-entry | `bumpDmhGroup` in the form context, filled by the single assembler | unit | `mut src/state && mtc` | extend | pending |
| 32-08-02 | 3 | REQ-C-dmh-fast-entry | `bumpDmhGroup` in `UncappedEntryProps` and the route's entry object; fixtures updated | unit | `mut src/navigation/routes/FactorDetailRoute.test.tsx src/screens/FactorDetailScreen.test.tsx src/screens/survey-form/FactorPager.test.tsx && mtc` | extend | pending |
| 32-09-01 | 3 | REQ-DOC-dmh-sources, REQ-C-dmh-guide, REQ-C-dmh-illustrations | Owner, after a named expert's reading, validates the spec and the 15 drawings (contact sheet with label and alt sentence) and settles P-01 to P-04 and O-32-1 to O-32-12 | manual (checkpoint decision) | `test -f docs/specs/dmh-guide-content-v1.md` | n/a (manual) | pending |
| 32-09-02 | 3 | REQ-DOC-dmh-sources, REQ-C-dmh-guide, REQ-C-dmh-illustrations, REQ-C-dmh-fast-entry, REQ-FT-dmh-speed | Validation, expert, decisions, list order, drawings review cells and confirmed pass rule recorded; drawings asked for corrected in their sources and the module regenerated; a structural change stops the phase | docs check + source gate | `grep -q "Statut : validée par le propriétaire le" docs/specs/dmh-guide-content-v1.md && grep -q "Règle de réussite confirmée" docs/user-tests/dmh-entry-timing.md && grep -q "^levers:" $PH/32-09-SUMMARY.md && grep -q "^drawings:" $PH/32-09-SUMMARY.md && mut src/__checks__/dmh-drawings.test.ts` | docs; exists (gate from 32-04-02) | pending |
| 32-10-01 | 4 | REQ-C-dmh-guide, REQ-C-dmh-illustrations, REQ-DOC-dmh-sources | `fr.dmhGuide` transcribed from the validated spec (a required `illustrationAlt` per group, one static drawings sentence, no credit key), registered, passes the dash and abbreviation gates | unit + gates | `mut src/i18n src/__checks__ && mtc` | new, test-first | pending |
| 32-10-02 | 4 | REQ-C-dmh-guide | Structure covers exactly the 15 codes; forms partition them; type numbers unique in 1..52 with the outside set; version 3.0 overrides only for dmh_06, dmh_12, dmh_15; spec-sync | unit | `mut src/app/dmh-guide src/__checks__/structure.test.ts && mtc` | new, test-first (Wave 0) | pending |
| 32-10-03 | 4 | REQ-C-dmh-guide, REQ-C-dmh-fast-entry | `orderDmhRows` orders once at mount; `searchDmhGroups` folds accents, matches label and keywords, empty query returns 15 | unit | `mut src/app/dmh-guide && mtc && mlint` | new, test-first (Wave 0) | pending |
| 32-11-01 | 5 | REQ-C-dmh-fast-entry | `dmhList` strings, shared count parser, optional testID and label on `AppCollapsibleSection` | unit + gates | `mut src/screens/factor-detail/count-from-text.test.ts src/ui/AppCollapsibleSection.test.tsx src/screens/SettingsScreen.test.tsx src/i18n src/__checks__` | new, test-first | pending |
| 32-11-02 | 5 | REQ-C-dmh-fast-entry, REQ-C-dmh-guide | `DmhGroupRow`: "+" ticks and counts 1; "-" floors at 0 and keeps the tick; a counted group cannot be unticked; the info glyph calls the opener with the code | unit | `mut src/screens/factor-detail/DmhGroupRow.test.tsx src/__checks__ && mtc` | new, test-first | pending |
| 32-11-03 | 5 | REQ-C-dmh-fast-entry, REQ-C-dmh-guide | `DmhGroupList`: seven form sections ordered once at mount; the guide entry calls the opener without a code | unit | `mut src/screens/factor-detail src/__checks__ && mtc && mlint` | new, test-first | pending |
| 32-12-01 | 5 | REQ-C-dmh-guide, REQ-C-dmh-illustrations | `DmhGroupPage`: blocks in UI-SPEC order, method-aware rule wording, the group's drawing first in the recognise block with its alt sentence (none when the module has no data for the group) | unit | `mut src/screens/dmh-guide/DmhGroupPage.test.tsx src/__checks__ && mtc` | new, test-first | pending |
| 32-12-02 | 5 | REQ-DOC-dmh-sources, REQ-C-dmh-illustrations | `DmhSourcesPage` shows sources, authors, licence, the drawings sentence and date; alt-sentence check added to the drawings gate | unit + source gate | `mut src/screens/dmh-guide src/__checks__ && mtc && mlint` | new, test-first (page); extend (gate) | pending |
| 32-13-01 | 6 | REQ-C-dmh-guide | Catalogue view with search; optional texts prop on `SearchField` | unit | `mut src/screens/global-search src/screens/dmh-guide/DmhCatalogue.test.tsx src/__checks__ && mtc` | new, test-first (catalogue); extend (field) | pending |
| 32-13-02 | 6 | REQ-C-dmh-guide | `DmhGuideScreen` three views; `DmhGuideRoute` opens the catalogue without a param and a group page with one; version 3.0 wording on a 3.0 survey; a re-render keeps the same group page (its drawing does not replay) | unit | `mut src/screens/dmh-guide src/navigation/routes/routes.test.tsx src/__checks__ && mtc` | new, test-first (screen); extend (routes) | pending |
| 32-13-03 | 6 | REQ-C-dmh-guide | Sheet options (iOS form sheet, Android modal), registered in the survey stack only | unit | `mut src/navigation && mtc && mlint && test $(grep -l "surveyDmhGuide" mobile/src/navigation/stacks/*.tsx \| wc -l) -eq 1` | extend | pending |
| 32-14-01 | 7 | REQ-C-dmh-fast-entry | `DmhCountFields` keeps only F's surface; `UncappedFieldBlock` passes only the surface props | unit + structure gate | `mut src/screens/factor-detail/DmhCountFields.test.tsx src/screens/FactorDetailScreen.test.tsx src/__checks__/structure.test.ts && mtc` | extend (rewrite) | pending |
| 32-14-02 | 7 | REQ-C-dmh-fast-entry, REQ-C-dmh-guide | F companion renders `DmhGroupList` (counting only when F is counted in full); opener passed; `FactorDetailScreen.tsx` and `renderFactorField.tsx` at 400 lines or less | unit + structure gate | `mut src/screens/FactorDetailScreen.test.tsx src/screens/factor-detail src/__checks__ && mut src/__checks__/structure.test.ts && test $(wc -l < mobile/src/screens/FactorDetailScreen.tsx) -le 400 && mtc` | extend | pending |
| 32-14-03 | 7 | REQ-C-dmh-fast-entry, REQ-C-dmh-guide | Opener navigates to `surveyDmhGuide`; new flow S1 and S2 below `OLD_FLOW_PRESSES` with exactly `OLD_FLOW_F_PAYLOAD`; capped flow not above the old count | unit (tap-count proxy) + structure gate | `mut src/screens/survey-form/FactorPager.test.tsx src/navigation src/screens/factor-detail/dmh-entry-cost.test.tsx src/__checks__ && mut src/__checks__/structure.test.ts && test $(wc -l < mobile/src/screens/survey-form/FactorPager.tsx) -le 400 && mtc && mlint` | extend (rewrite of the 32-01 test) | pending |
| 32-15-01 | 8 | REQ-DOC-dmh-sources, REQ-C-dmh-guide | CLAUDE.md phase 32 notes, matching the code; no timing result stated before 32-16 | docs check | `grep -q "surveyDmhGuide" CLAUDE.md && grep -q "bumpDmhGroup" CLAUDE.md && grep -q "dmh-entry-timing.md" CLAUDE.md` (plus the dash check on added lines) | docs | pending |
| 32-15-02 | 8 | REQ-DOC-dmh-sources | References README links the validated spec | docs check | `grep -q "../specs/dmh-guide-content-v1.md" docs/references/README.md && npx prettier --check docs/references/README.md CLAUDE.md` | docs | pending |
| 32-16-01 | 9 | REQ-FT-dmh-speed | Timing build: finished phase commit plus the measuring aid (recorder module identical), main checkout restored | repository and build state | `git -C ~/Projects/cortege status --porcelain \| wc -l \| tr -d ' ' \| grep -qx 0 && test -d /tmp/cortege-dd/Build/Products/Release-iphoneos/Cortege.app && test ! -e mobile/src/diag && grep -q "^timing_build:" $PH/32-16-SUMMARY.md` | n/a | pending |
| 32-16-02 | 9 | REQ-FT-dmh-speed | Owner times the new flow: S1, S2, S3, three runs each, same protocol and aid; answers on the three levers and the button size | manual (checkpoint human-action) + state check | `git -C ~/Projects/cortege status --porcelain \| wc -l \| tr -d ' ' \| grep -qx 0` | n/a (manual) | pending |
| 32-16-03 | 9 | REQ-FT-dmh-speed | After medians and changes, P-03 verdict, lever statuses and O-32-1 recorded; `DMH_STEPPER_SIZE` equals `stepper_size:` | unit + docs | `mut src/ui/DmhCounterStepper.test.tsx src/screens/factor-detail src/__checks__ && grep -qE "^Verdict : (réussi\|échoué)" docs/user-tests/dmh-entry-timing.md && grep -qE "^stepper_size: (48\|56)" $PH/32-16-SUMMARY.md` (plus the constant, CLAUDE.md and dash checks) | exists | pending |

Requirement coverage (every phase requirement has automated tasks; REQ-FT-dmh-speed also has the two manual timing sessions):

| Requirement | Tasks |
|-------------|-------|
| REQ-C-dmh-guide | 32-05-01, 32-05-02, 32-05-03, 32-09-01, 32-09-02, 32-10-01, 32-10-02, 32-10-03, 32-11-02, 32-11-03, 32-12-01, 32-13-01, 32-13-02, 32-13-03, 32-14-02, 32-14-03, 32-15-01 |
| REQ-DOC-dmh-sources | 32-02-01, 32-02-02, 32-05-01, 32-05-03, 32-09-01, 32-09-02, 32-10-01, 32-12-02, 32-15-01, 32-15-02 |
| REQ-C-dmh-illustrations | 32-04-01, 32-04-02, 32-04-03, 32-05-02, 32-05-03, 32-09-01, 32-09-02, 32-10-01, 32-12-01, 32-12-02 |
| REQ-C-dmh-fast-entry | 32-01-01, 32-01-02, 32-03-01, 32-03-02, 32-06-01, 32-06-02, 32-08-01, 32-08-02, 32-09-02, 32-10-03, 32-11-01, 32-11-02, 32-11-03, 32-14-01, 32-14-02, 32-14-03 |
| REQ-FT-dmh-speed | 32-07-01, 32-07-02, 32-07-03, 32-09-02, 32-16-01, 32-16-02, 32-16-03 |
| structure gate (400-line cap, unused styles, literals) | 32-01-01, 32-10-02, 32-14-01, 32-14-02, 32-14-03 (every task running `src/__checks__` also runs it) |
| parity (scores unchanged) | 32-06-02 (package suite), and `npm run test:unit` in the verification of 32-14 and 32-16 |

## Wave 0 Requirements

| Wave 0 item (research "Wave 0 Gaps") | Planned in | Wave | In a wave 1 plan? |
|--------------------------------------|------------|------|-------------------|
| `mobile/src/__checks__/dmh-drawings.test.ts` (15 groups, paths parse, fresh lengths, 8 KiB and 80 KiB budgets, no colour; replaces the image byte-budget gate of the first plan set) | 32-04-02 | 1 | yes |
| `renderFactorField` extraction from `FactorDetailScreen.tsx`, existing tests green | 32-01-01 | 1 | yes |
| Tap-count fixture S1/S2 against the OLD flow (baseline number) | 32-01-02 | 1 | yes |
| `mobile/src/app/dmh-guide/` tests: structure, search, order (and spec-sync) | 32-10-02, 32-10-03 | 4 | no |
| Instrumented baseline build and owner timing of the old flow | 32-07-01, 32-07-02, 32-07-03 | 2 | no |

Why `wave_0_complete: false`:

- The `dmh-guide` tests encode the validated content (type numbers, forms, version 3.0 overrides, the validated list order). That content exists only after the owner's written gate 32-09-01 (wave 3), so the tests cannot be written in wave 1 without encoding unvalidated thresholds (T-32-21). Each is written test-first inside the task that needs it, so no task's verify points at a missing test file.
- The baseline timing updates the S2 fixture created by 32-01-02, so it depends on 32-01 and sits in wave 2. It still runs before any change to the factor F entry: the first such change is 32-14 (wave 7), which depends on it through 32-09, 32-10 and 32-11.
- Nothing else is missing: no framework install is needed.

## Manual-Only Verifications

| Behavior | Requirement | Task | Why Manual | Test Instructions |
|----------|-------------|------|------------|-------------------|
| Before timing of the old factor F flow on a real survey: S1, S2, S3, three runs each, medians recorded | REQ-FT-dmh-speed | 32-07-02 (recorded by 32-07-03) | Needs a human on a device | Owner iPhone, Release build of origin/main with the measuring-aid patch; protocol in `docs/user-tests/dmh-entry-timing.md` sections 2 to 5 (from `32-RESEARCH.md` "Measurement protocol") |
| After timing of the finished flow, same protocol and aid; pass rule P-03 applied; levers and stepper size (O-32-1) settled | REQ-FT-dmh-speed | 32-16-02 (recorded by 32-16-03) | Needs a human on a device; the verdict of ROADMAP criterion 3 | Owner iPhone, Release build of the finished phase commit with the same patch (ported if needed, recorder unchanged); three runs each of S1, S2, S3 in the rotating order; "## 8. Résultats après" and "Verdict :" in the timing document |
| Expert reading of all group texts, the crosswalk and the accuracy of the 15 drawings | REQ-DOC-dmh-sources, REQ-C-dmh-illustrations | 32-09-01 | Domain judgement | Owner plus a named expert sign off `docs/specs/dmh-guide-content-v1.md` and each drawing (contact sheet in the scratchpad) before any catalogue text or screen |
| Sheet reads well (detents, dark mode) and the drawings draw well on iPhone and Android | REQ-C-dmh-guide, REQ-C-dmh-illustrations | none (phase gate) | Visual and motion | At `/gsd-verify-work 32`: iOS simulator (the first tap after launch is lost, verify twice) and the owner's phone; Android modal on the emulator. On a group page the drawing draws itself once, in order, with no stray dot before a stroke starts, and does not replay while the page stays open; with Reduce Motion on (Réglages, Accessibilité, Mouvement) it is complete at once; it is legible in light and dark; a drawing corrected in 32-09 is looked at again |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies: all 40 tasks carry an `<automated>` command; the three tasks with a manual core (32-07-02, 32-09-01, 32-16-02) carry a state or file check and are listed under Manual-Only
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (none is without one)
- [x] Wave 0 covers all MISSING references: every new test is written test-first in its own task; the two Wave 0 items outside wave 1 are explained above
- [x] No watch-mode flags (no `--watch` in any plan)
- [x] Feedback latency < 120 s for the per-task commands (the coverage run of 32-14 and the full suite are plan-level checks)
- [x] `nyquist_compliant: true` set in frontmatter
- [ ] `wave_0_complete`: stays `false` (two Wave 0 items are in waves 2 and 4, for the reasons above)

**Approval:** pending
