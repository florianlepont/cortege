---
phase: 32
slug: detailed-dmh-information-inserted-v1
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-23
updated: 2026-10-27
---

# Phase 32 - Validation Strategy

> Per-phase validation contract. Source of the behaviours: the "Validation Architecture" section of `32-RESEARCH.md`. The map below is keyed by the real task IDs of the 16 plans (`32-NN-TT` = plan NN, task TT; 36 active tasks plus 2 cancelled, waves 1 to 8). Revised 2026-10-24 (owner decision D-11, amending D-06 and D-09): the drawings are vector data, not image files. Revised 2026-10-26 (D-11 amended: the drawings are static): the stroke animation, the path geometry module and the precomputed lengths are gone; plan 32-04 has two tasks (converter, module and gate; then the static `DmhDrawing`), and plan 32-05 is back in wave 1 (it reads the 15 delivered sources directly and needs nothing from 32-04). Revised 2026-10-27 (owner decision, D-08 amended): no timing campaign. Plan 32-07 is skipped (its Task 1 was done, Tasks 2 and 3 are cancelled), plan 32-16 is now the owner's written simplicity check on the phone, plan 32-09 no longer depends on 32-07 and moves to wave 2, so every later plan moves up one wave. `REQ-FT-dmh-speed` now reads "simplicity confirmed by the owner": part (a) is the press-count proxy (32-01-02 records the old flow, 32-14-03 replays the new one with the same payload), part (b) the owner's written confirmation (32-16). `wave_0_complete` stays `false` on purpose: one Wave 0 item cannot sit in a wave 1 plan (see "Wave 0 Requirements").

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
| 32-01-02 | 1 | REQ-C-dmh-fast-entry, REQ-FT-dmh-speed (proxy bar) | Old-flow press count for S1 and S2 and the payload it writes recorded as `OLD_FLOW_PRESSES` and `OLD_FLOW_F_PAYLOAD` | unit (tap-count proxy) | `mut src/screens/factor-detail/dmh-entry-cost.test.tsx && mtc` | new, test-first | pending |
| 32-02-01 | 1 | REQ-DOC-dmh-sources | Owner states which pocket-guide PDF is supplied | checkpoint (decision) | `test -f docs/references/README.md` | exists | pending |
| 32-02-02 | 1 | REQ-DOC-dmh-sources | References README holds both pocket-guide SHA-256, the typology DOI and the licence status; NOTICE section; no PDF in the repository | docs check | `grep -q "10.1016/j.ecolind.2017.08.051" docs/references/README.md && grep -q "## Dendromicrohabitat guide" NOTICE.md` (plus both hashes and the PDF check) | docs | pending |
| 32-03-01 | 1 | REQ-C-dmh-fast-entry | `useHoldRepeat`: immediate step, 120 ms repeat, x2 then x5, clamped, stop and unmount cleanup; `FactorCounterInput` tests pass unedited | unit | `mut src/ui/useHoldRepeat.test.ts src/ui/FactorCounterInput.test.tsx src/__checks__/motion.test.ts` | new, test-first (hook); exists (counter) | pending |
| 32-03-02 | 1 | REQ-C-dmh-fast-entry | `DmhCounterStepper`: 48 pt, one adjustable accessibility element, typed entry handed back as text, "-" disabled at 0, no haptics | unit + gates | `mut src/ui/DmhCounterStepper.test.tsx src/__checks__ src/i18n && mtc` | new, test-first | pending |
| 32-04-01 | 1 | REQ-C-dmh-illustrations | 15 SVG sources present; the converter checks the approved style (refuses a coloured fill, reports missing codes, writes nothing then) and copies path, ellipse and circle elements as they are into `drawings.ts` (15 entries); gate: group codes, widths inside `DMH_DRAWING_STROKE_RANGE` (4 to 12), elements that render (path data, positive radii), 12 KiB per drawing, 120 KiB module, no colour; reproducible output | source gate + script run | `test $(ls $PH/drawings/dmh_*.svg \| wc -l) -eq 15 && mut src/__checks__/dmh-drawings.test.ts src/__checks__/structure.test.ts src/__checks__/catalogue-dash.test.ts && mtc && mlint` (plus the converter runs on `drawings-pilot/` and on a copy with a coloured fill: "missing:" and "style:" reported, module untouched) | new, test-first (Wave 0) | pending |
| 32-04-02 | 1 | REQ-C-dmh-illustrations | `DmhDrawing` renders nothing without data, otherwise one static shape per element in data order (rotated ellipses with their transform), no animation, state or effect, one accessible image; ink `colors.textPrimary` at 4.5:1 on the glass card in both schemes | unit | `mut src/ui/DmhDrawing.test.tsx src/app/visual-tokens.test.ts src/__checks__ && mtc && mlint` | new, test-first (component); extend (tokens test) | pending |
| 32-05-01 | 1 | REQ-DOC-dmh-sources, REQ-C-dmh-guide | Spec sections 1 to 5: draft status, 15 correspondence rows, 43 counted and 9 not counted types (52), no PDF committed | docs check | `grep -q "## 5. Table de correspondance" docs/specs/dmh-guide-content-v1.md && grep -q "43 types comptés, 9 non comptés, 52 au total" docs/specs/dmh-guide-content-v1.md` (plus the 15-row count) | docs | pending |
| 32-05-02 | 1 | REQ-C-dmh-guide, REQ-C-dmh-illustrations | Sheets of dmh_01 to dmh_08, each with the alt sentence of its delivered drawing ("Texte du dessin") | docs check | `grep -q "## 6. Fiches des groupes" docs/specs/dmh-guide-content-v1.md` (plus one heading per code 01 to 08 and 8 alt sentences) | docs | pending |
| 32-05-03 | 1 | REQ-C-dmh-guide, REQ-C-dmh-illustrations, REQ-DOC-dmh-sources | Sheets 09 to 15 with their alt sentences, list order, interface texts, record of the 15 drawings (section 9, empty review cells), O-32-1 to O-32-12 and P-01 to P-04 with defaults (P-03 and P-04 reworded as without object on 2026-10-27), validation block, specs index line | docs check | `grep -q "## 12. Validation" docs/specs/dmh-guide-content-v1.md && grep -q "dmh-guide-content-v1.md" docs/specs/README.md` (plus the heading and decision-row loops, 15 alt sentences and 15 drawing rows) | docs | pending |
| 32-06-01 | 2 | REQ-C-dmh-fast-entry | `withSelectionToggled` keeps option order; the store's `bumpDmhCount` | unit | `mut src/app/factor-selections.test.ts src/hooks/useUncappedEntry.test.ts` | extend | pending |
| 32-06-02 | 2 | REQ-C-dmh-fast-entry | `bumpDmhGroup` ticks and counts in one call; S1 and S2 write exactly `OLD_FLOW_F_PAYLOAD`; scores unchanged | unit + parity | `mut src/hooks/useSurveyForm.test.ts src/screens/factor-detail/dmh-entry-cost.test.tsx && npm --workspace @cortege/ibp-domain run test && mtc` | extend | pending |
| 32-07-01 | 2 | REQ-FT-dmh-speed | Done 2026-10-26 (protocol and patch), reduced 2026-10-27: the timing note records that the campaign was abandoned, keeps S1, S2 (provisional), S3 and the old-flow press counts (8 and 29) as the proxy's reference and one empty result line; the measuring-aid patch stays an unused file | docs + repository state | `grep -q "chronométrage abandonné" docs/user-tests/dmh-entry-timing.md && grep -q "29 appuis" docs/user-tests/dmh-entry-timing.md && test -f $PH/32-dmh-timing-diag.patch && test ! -e mobile/src/diag && test -z "$(git branch --list 'diag/dmh-timing')"` | docs | done |
| 32-07-02 | 2 | (none) | Cancelled: owner timing of the old flow on the iPhone | n/a | n/a (skipped, owner decision 2026-10-27) | n/a | skipped |
| 32-07-03 | 2 | (none) | Cancelled: before medians, real S2 tally, lever proposals | n/a | n/a (skipped, owner decision 2026-10-27) | n/a | skipped |
| 32-08-01 | 3 | REQ-C-dmh-fast-entry | `bumpDmhGroup` in the form context, filled by the single assembler | unit | `mut src/state && mtc` | extend | pending |
| 32-08-02 | 3 | REQ-C-dmh-fast-entry | `bumpDmhGroup` in `UncappedEntryProps` and the route's entry object; fixtures updated | unit | `mut src/navigation/routes/FactorDetailRoute.test.tsx src/screens/FactorDetailScreen.test.tsx src/screens/survey-form/FactorPager.test.tsx && mtc` | extend | pending |
| 32-09-01 | 2 | REQ-DOC-dmh-sources, REQ-C-dmh-guide, REQ-C-dmh-illustrations | Owner, after a named expert's reading, validates the spec and the 15 drawings (contact sheet with label and alt sentence) and settles P-01, P-02 and O-32-1 to O-32-12 (O-32-1 counter size and O-32-12 list order included; P-03 and P-04 without object since 2026-10-27) | manual (checkpoint decision) | `test -f docs/specs/dmh-guide-content-v1.md` | n/a (manual) | pending |
| 32-09-02 | 2 | REQ-DOC-dmh-sources, REQ-C-dmh-guide, REQ-C-dmh-illustrations, REQ-C-dmh-fast-entry | Validation, expert, decisions (O-32-1 as 48 or 56), list order and drawings review cells recorded; P-03 and P-04 cells "Sans objet"; drawings asked for corrected in their sources and the module regenerated; a structural change stops the phase | docs check + source gate | `grep -q "Statut : validée par le propriétaire le" docs/specs/dmh-guide-content-v1.md && grep -q "^decisions:" $PH/32-09-SUMMARY.md && grep -q "^list_order:" $PH/32-09-SUMMARY.md && grep -q "^drawings:" $PH/32-09-SUMMARY.md && mut src/__checks__/dmh-drawings.test.ts` | docs; exists (gate from 32-04-02) | pending |
| 32-10-01 | 3 | REQ-C-dmh-guide, REQ-C-dmh-illustrations, REQ-DOC-dmh-sources | `fr.dmhGuide` transcribed from the validated spec (a required `illustrationAlt` per group, one static drawings sentence, no credit key), registered, passes the dash and abbreviation gates | unit + gates | `mut src/i18n src/__checks__ && mtc` | new, test-first | pending |
| 32-10-02 | 3 | REQ-C-dmh-guide | Structure covers exactly the 15 codes; forms partition them; type numbers unique in 1..52 with the outside set; version 3.0 overrides only for dmh_06, dmh_12, dmh_15; spec-sync | unit | `mut src/app/dmh-guide src/__checks__/structure.test.ts && mtc` | new, test-first (Wave 0) | pending |
| 32-10-03 | 3 | REQ-C-dmh-guide, REQ-C-dmh-fast-entry | `orderDmhRows` orders once at mount; `searchDmhGroups` folds accents, matches label and keywords, empty query returns 15 | unit | `mut src/app/dmh-guide && mtc && mlint` | new, test-first (Wave 0) | pending |
| 32-11-01 | 4 | REQ-C-dmh-fast-entry | `dmhList` strings, shared count parser, optional testID and label on `AppCollapsibleSection` | unit + gates | `mut src/screens/factor-detail/count-from-text.test.ts src/ui/AppCollapsibleSection.test.tsx src/screens/SettingsScreen.test.tsx src/i18n src/__checks__` | new, test-first | pending |
| 32-11-02 | 4 | REQ-C-dmh-fast-entry, REQ-C-dmh-guide | `DmhGroupRow`: "+" ticks and counts 1; "-" floors at 0 and keeps the tick; a counted group cannot be unticked; the info glyph calls the opener with the code; `DMH_STEPPER_SIZE` at the O-32-1 size validated at 32-09, shared with the row's "+" | unit | `mut src/screens/factor-detail/DmhGroupRow.test.tsx src/ui/DmhCounterStepper.test.tsx src/__checks__ && mtc` (plus the comment and shared-constant greps) | new, test-first (row); extend (stepper size test) | pending |
| 32-11-03 | 4 | REQ-C-dmh-fast-entry, REQ-C-dmh-guide | `DmhGroupList`: seven form sections ordered once at mount; the guide entry calls the opener without a code | unit | `mut src/screens/factor-detail src/__checks__ && mtc && mlint` | new, test-first | pending |
| 32-12-01 | 4 | REQ-C-dmh-guide, REQ-C-dmh-illustrations | `DmhGroupPage`: blocks in UI-SPEC order, method-aware rule wording, the group's drawing first in the recognise block with its alt sentence (none when the module has no data for the group) | unit | `mut src/screens/dmh-guide/DmhGroupPage.test.tsx src/__checks__ && mtc` | new, test-first | pending |
| 32-12-02 | 4 | REQ-DOC-dmh-sources, REQ-C-dmh-illustrations | `DmhSourcesPage` shows sources, authors, licence, the drawings sentence and date; alt-sentence check added to the drawings gate | unit + source gate | `mut src/screens/dmh-guide src/__checks__ && mtc && mlint` | new, test-first (page); extend (gate) | pending |
| 32-13-01 | 5 | REQ-C-dmh-guide | Catalogue view with search; optional texts prop on `SearchField` | unit | `mut src/screens/global-search src/screens/dmh-guide/DmhCatalogue.test.tsx src/__checks__ && mtc` | new, test-first (catalogue); extend (field) | pending |
| 32-13-02 | 5 | REQ-C-dmh-guide | `DmhGuideScreen` three views; `DmhGuideRoute` opens the catalogue without a param and a group page with one; version 3.0 wording on a 3.0 survey | unit | `mut src/screens/dmh-guide src/navigation/routes/routes.test.tsx src/__checks__ && mtc` | new, test-first (screen); extend (routes) | pending |
| 32-13-03 | 5 | REQ-C-dmh-guide | Sheet options (iOS form sheet, Android modal), registered in the survey stack only | unit | `mut src/navigation && mtc && mlint && test $(grep -l "surveyDmhGuide" mobile/src/navigation/stacks/*.tsx \| wc -l) -eq 1` | extend | pending |
| 32-14-01 | 6 | REQ-C-dmh-fast-entry | `DmhCountFields` keeps only F's surface; `UncappedFieldBlock` passes only the surface props | unit + structure gate | `mut src/screens/factor-detail/DmhCountFields.test.tsx src/screens/FactorDetailScreen.test.tsx src/__checks__/structure.test.ts && mtc` | extend (rewrite) | pending |
| 32-14-02 | 6 | REQ-C-dmh-fast-entry, REQ-C-dmh-guide | F companion renders `DmhGroupList` (counting only when F is counted in full); opener passed; `FactorDetailScreen.tsx` and `renderFactorField.tsx` at 400 lines or less | unit + structure gate | `mut src/screens/FactorDetailScreen.test.tsx src/screens/factor-detail src/__checks__ && mut src/__checks__/structure.test.ts && test $(wc -l < mobile/src/screens/FactorDetailScreen.tsx) -le 400 && mtc` | extend | pending |
| 32-14-03 | 6 | REQ-C-dmh-fast-entry, REQ-C-dmh-guide, REQ-FT-dmh-speed (part a) | Opener navigates to `surveyDmhGuide`; new flow S1 and S2 below `OLD_FLOW_PRESSES` (8 and 29) with exactly `OLD_FLOW_F_PAYLOAD`; capped flow not above the old count | unit (tap-count proxy) + structure gate | `mut src/screens/survey-form/FactorPager.test.tsx src/navigation src/screens/factor-detail/dmh-entry-cost.test.tsx src/__checks__ && mut src/__checks__/structure.test.ts && test $(wc -l < mobile/src/screens/survey-form/FactorPager.tsx) -le 400 && mtc && mlint` | extend (rewrite of the 32-01 test) | pending |
| 32-15-01 | 7 | REQ-DOC-dmh-sources, REQ-C-dmh-guide | CLAUDE.md phase 32 notes, matching the code; no time figure; the timing named on one line only, as not run | docs check | `grep -q "surveyDmhGuide" CLAUDE.md && grep -q "bumpDmhGroup" CLAUDE.md && grep -q "dmh-entry-timing.md" CLAUDE.md` (plus the dash check on added lines and the one-line timing check) | docs | pending |
| 32-15-02 | 7 | REQ-DOC-dmh-sources | References README links the validated spec | docs check | `grep -q "../specs/dmh-guide-content-v1.md" docs/references/README.md && npx prettier --check docs/references/README.md CLAUDE.md` | docs | pending |
| 32-16-01 | 8 | REQ-FT-dmh-speed (part b) | Owner tries the finished F list on the iPhone (Release build of the phase commit, no patch) and says in writing whether entering many groups is simpler; main checkout restored | manual (checkpoint human-verify, blocking-human) + state check | `git -C ~/Projects/cortege status --porcelain \| wc -l \| tr -d ' ' \| grep -qx 0 && test -d /tmp/cortege-dd/Build/Products/Release-iphoneos/Cortege.app && test ! -e mobile/src/diag && mut src/screens/factor-detail/dmh-entry-cost.test.tsx` | exists (cost test from 32-14-03) | pending |
| 32-16-02 | 8 | REQ-FT-dmh-speed (part b) | One result line in the timing note (answer, date, proxy press counts) and the summary keys; any lever removal, button-size request or "pas plus simple" listed as a gap; no app code changed | docs check | `grep -qE "^Résultat : (plus simple\|pas plus simple)" docs/user-tests/dmh-entry-timing.md && grep -qE "^owner_check: (plus simple\|pas plus simple)" $PH/32-16-SUMMARY.md && grep -q "^gaps:" $PH/32-16-SUMMARY.md` (plus the dash, Prettier and no-app-code checks) | docs | pending |

Requirement coverage (every phase requirement has automated tasks; `REQ-FT-dmh-speed`, now "simplicity confirmed by the owner", has the automated proxy and the manual owner check):

| Requirement | Tasks |
|-------------|-------|
| REQ-C-dmh-guide | 32-05-01, 32-05-02, 32-05-03, 32-09-01, 32-09-02, 32-10-01, 32-10-02, 32-10-03, 32-11-02, 32-11-03, 32-12-01, 32-13-01, 32-13-02, 32-13-03, 32-14-02, 32-14-03, 32-15-01 |
| REQ-DOC-dmh-sources | 32-02-01, 32-02-02, 32-05-01, 32-05-03, 32-09-01, 32-09-02, 32-10-01, 32-12-02, 32-15-01, 32-15-02 |
| REQ-C-dmh-illustrations | 32-04-01, 32-04-02, 32-05-02, 32-05-03, 32-09-01, 32-09-02, 32-10-01, 32-12-01, 32-12-02 |
| REQ-C-dmh-fast-entry | 32-01-01, 32-01-02, 32-03-01, 32-03-02, 32-06-01, 32-06-02, 32-08-01, 32-08-02, 32-09-02, 32-10-03, 32-11-01, 32-11-02, 32-11-03, 32-14-01, 32-14-02, 32-14-03 |
| REQ-FT-dmh-speed (simplicity confirmed by the owner) | part (a), automated proxy: 32-01-02 (old-flow bar), 32-14-03 (new-flow replay, same payload); reference note: 32-07-01; part (b), owner's written check: 32-16-01, 32-16-02 |
| structure gate (400-line cap, unused styles, literals) | 32-01-01, 32-10-02, 32-14-01, 32-14-02, 32-14-03 (every task running `src/__checks__` also runs it) |
| parity (scores unchanged) | 32-06-02 (package suite), and `npm run test:unit` in the verification of 32-14 and in 32-16-01 |

## Wave 0 Requirements

| Wave 0 item (research "Wave 0 Gaps") | Planned in | Wave | In a wave 1 plan? |
|--------------------------------------|------------|------|-------------------|
| `mobile/src/__checks__/dmh-drawings.test.ts` (15 groups, widths, elements that render, 12 KiB and 120 KiB budgets, no colour; replaces the image byte-budget gate of the first plan set) | 32-04-01 | 1 | yes |
| `renderFactorField` extraction from `FactorDetailScreen.tsx`, existing tests green | 32-01-01 | 1 | yes |
| Tap-count fixture S1/S2 against the OLD flow (baseline number) | 32-01-02 | 1 | yes |
| `mobile/src/app/dmh-guide/` tests: structure, search, order (and spec-sync) | 32-10-02, 32-10-03 | 3 | no |
| Instrumented baseline build and owner timing of the old flow | none (dropped by the owner on 2026-10-27, D-08 amended; 32-07 skipped) | n/a | n/a |

Why `wave_0_complete: false`:

- The `dmh-guide` tests encode the validated content (type numbers, forms, version 3.0 overrides, the validated list order). That content exists only after the owner's written gate 32-09-01 (wave 2), so the tests cannot be written in wave 1 without encoding unvalidated thresholds (T-32-21). Each is written test-first inside the task that needs it, so no task's verify points at a missing test file.
- The timed baseline is no longer a Wave 0 item: the owner dropped it on 2026-10-27. The old-flow bar is the press-count fixture of 32-01-02 (wave 1), recorded before any change to the factor F entry (the first such change is 32-14, wave 6).
- Nothing else is missing: no framework install is needed.

## Manual-Only Verifications

| Behavior | Requirement | Task | Why Manual | Test Instructions |
|----------|-------------|------|------------|-------------------|
| Owner tries the finished factor F list on their own phone and confirms in writing that entering many groups is simpler than before (or says what bothers them, or asks to remove a lever or for bigger counter buttons) | REQ-FT-dmh-speed | 32-16-01 (recorded by 32-16-02) | Owner judgement on a device; part (b) of ROADMAP criterion 3 as amended on 2026-10-27 | Owner iPhone, Release build of the finished phase commit with no patch; a draft counted in full and a capped draft; a survey with many groups (their own, or S2 of `docs/user-tests/dmh-entry-timing.md`); the answer goes to the "Résultat :" line of that note, with the proxy press counts of 32-14-SUMMARY.md; no time is measured |
| Expert reading of all group texts, the crosswalk and the accuracy of the 15 drawings; the counter button size (O-32-1) | REQ-DOC-dmh-sources, REQ-C-dmh-illustrations, REQ-C-dmh-fast-entry | 32-09-01 | Domain judgement and owner choice | Owner plus a named expert sign off `docs/specs/dmh-guide-content-v1.md` and each drawing (contact sheet in the scratchpad) before any catalogue text or screen; the owner answers O-32-1 with 48 or 56 |
| Sheet reads well (detents, dark mode) and the drawings render as their sources on iPhone and Android | REQ-C-dmh-guide, REQ-C-dmh-illustrations | none (phase gate) | Visual | At `/gsd-verify-work 32`: iOS simulator (the first tap after launch is lost, verify twice) and the owner's phone; Android modal on the emulator. On a group page the drawing is there at once and still, and matches its source on the contact sheet of 32-09 (rotated ellipses at the right angle, the `h0.1` dots visible as round dots); it is legible in light and dark; a drawing corrected in 32-09 is looked at again |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies: all 36 active tasks carry an `<automated>` command; the two tasks with a manual core (32-09-01, 32-16-01) carry a state or file check and are listed under Manual-Only; the two cancelled tasks of the skipped plan 32-07 (32-07-02, 32-07-03) are not run
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (none is without one)
- [x] Wave 0 covers all MISSING references: every new test is written test-first in its own task; the one Wave 0 item outside wave 1 is explained above
- [x] No watch-mode flags (no `--watch` in any plan)
- [x] Feedback latency < 120 s for the per-task commands (the coverage run of 32-14, the full suite and the gates run before the owner check of 32-16 are plan-level checks)
- [x] `nyquist_compliant: true` set in frontmatter
- [ ] `wave_0_complete`: stays `false` (one Wave 0 item is in wave 3, for the reason above)

**Approval:** pending
