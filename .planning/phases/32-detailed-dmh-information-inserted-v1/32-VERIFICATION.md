---
phase: 32-detailed-dmh-information-inserted-v1
verified: 2026-10-28T00:00:00Z
status: human_needed
score: 3/3 roadmap criteria verified in code (criterion 3 with an owner-accepted tie on S1), 5/5 requirements covered with caveats on 2 (REQ-C-dmh-illustrations expert check waived; REQ-FT-dmh-speed rests on the owner's word)
behavior_unverified: 0
overrides_applied: 0
re_verification: none (initial verification, run on the merged commit db43306f, PR #316)
gaps: []
deferred: []
human_verification:
  - test: "Plans 32-20 to 32-35 (capped counters, header and toast, F look on A-J, C/D/E lower class hidden, G open-area zones, Incertitude wording, 'Définir le parcours') on a real phone"
    expected: "Each 'Not verified' list in those summaries and the 'Pending' list of 32-UAT.md is walked through and confirmed by the owner (build 8c04fecc or later)"
    why_human: "Every one of these summaries states the assistant never saw them render; the last recorded owner approval (32-UAT.md rows 1 and 2) is for builds 89b453b0 and e15fb772, which predate them"
  - test: "Expert reading of the 15 drawings and of the counting thresholds in docs/specs/dmh-guide-content-v1.md (section 6 'Points à faire vérifier par l'expert', section 9)"
    expected: "A forest-microhabitat expert confirms or corrects each drawing and each threshold; corrections go in a dated revision of the spec"
    why_human: "Requirement text says 'checked for accuracy by a domain expert'; the owner validated alone on 2026-10-27 and the spec says so (section 12). Content correctness cannot be established by code analysis"
  - test: "Android pass on the guide sheet, the F list and the redesigned factor pages (modal presentation, hardware back, steppers, sliders)"
    expected: "Guide opens as a modal from F rows, Accueil and the search; hardware back steps sources > group > catalogue; nothing clipped"
    why_human: "32-UAT.md: 'the whole phase is untested on Android'"
  - test: "Dark mode and VoiceOver on the guide, the F list, the none row, the zone list"
    expected: "Readable contrast, correct labels and order"
    why_human: "Contrast is unit-tested for the guide tokens; real rendering and screen-reader behaviour were never seen"
  - test: "Read the licence terms of the Swiss institute publication page when it is reachable"
    expected: "Confirms 'all rights reserved' or grants reuse; the README records HTTP 500 and 503 when it was checked on 2026-10-23"
    why_human: "The terms-of-use page could not be read; the reuse position (own wording, facts only, no image) is the safe one but the page was never read"
---

# Phase 32: Detailed DMH Information (INSERTED, V1) Verification Report

**Phase Goal:** While recording, the observer gets detailed information on dendromicrohabitats (many potential DMH), in a tool or a dedicated page.
**Verified:** 2026-10-28 (worktree on the commit of PR #316, `db43306f`)
**Status:** human_needed. No roadmap truth failed; the open items are things the code cannot prove (expert accuracy of drawings and thresholds, device and Android behaviour of the later plans).
**Re-verification:** No, initial verification.

Method note: the PR landed as one squashed commit, so the "package changes only as documented" check was done on `git show HEAD -- packages api`. The SUMMARY files were used only to find where to look; every row below was read in code or run.

## Evidence run by the verifier

| Check | Command | Result |
| ----- | ------- | ------ |
| Typecheck | `npm run typecheck` (ibp-domain, mobile, api build) | exit 0 |
| Mobile lint | `npm --workspace mobile run lint` | exit 0, no output |
| Mobile unit tests with coverage | `npm --workspace mobile run test:unit:coverage` | 495 suites, 7853 tests, all passed; all files 97.55 % statements, 93.19 % branches, 97.14 % functions, 97.91 % lines; exit 0 (Jest printed its usual "did not exit one second after" notice) |
| Package tests with coverage | `npm --workspace @cortege/ibp-domain run test:coverage` | 14 suites, 544 tests passed; 100 / 100 / 100 / 100; exit 0 |
| API parity through the adapter | `npx jest -c jest.unit.config.js test/ibp-parity.spec.ts` (api) | 128 passed, includes MAT-LOW-05, MAT-F-CAP, MAT-G-UNC cases |
| Not run | API e2e (`surveys-submit.e2e-spec.ts` new cases need a database); device runs | not run |

## Goal Achievement: roadmap success criteria

| # | Criterion | Status | Evidence |
| - | --------- | ------ | -------- |
| 1 | A tool or page reachable from the DMH inputs explains each DMH with its identification information, offline | VERIFIED | Route `surveyDmhGuide: { group?: DmhGroupCode } \| undefined` typed in three stacks (`mobile/src/navigation/types.ts:37,76,168`) and registered in `SurveysStack.tsx:209`, `HomeStack.tsx:29`, `SearchStack.tsx:46`, all with `dmhGuideScreenOptions`. Entry from each F row: info button in `mobile/src/screens/factor-detail/DmhGroupList.tsx:101` through `FactorPager.tsx:78,244` to `FactorDetailRoute.tsx:140-143` (`navigation.navigate("surveyDmhGuide", { group })`). Entry from Accueil: `HomeRoute.tsx:58-61`. Entry from the global search: `mobile/src/app/global-search.ts:79-82` (`matchGuideGroups` over `searchDmhGroups`), opened by `SearchHomeRoute.tsx:113-115` and `SearchGroupRoute.tsx:206-208`. Offline: grep for `fetch(`, `apiRequest`, `ibp-api`, `axios`, `XMLHttpRequest`, `http://`, `https://` in `mobile/src/app/dmh-guide`, `mobile/src/screens/dmh-guide`, `navigation/routes/DmhGuideRoute*` returns nothing outside tests; the only imports from outside the guide folders are `factor-selections`, `search-text` and the shared `SearchField`. Content is static: `mobile/src/app/dmh-guide/content.ts` reads `fr.dmhGuide` (`mobile/src/i18n/fr/dmh-guide.ts`, 471 lines). |
| 2 | The content crosses the IBP typology with the WSL one, and sources and licence for reuse are recorded | VERIFIED (record complete; licence page of the publisher never read, see human list) | Crossing: `mobile/src/app/dmh-guide/structure.ts` maps each of the 15 groups to a form and to counted and not-counted pocket-guide type numbers; `spec-sync.test.ts` compares it with section 5 of `docs/specs/dmh-guide-content-v1.md` (form, counted types, outside-IBP types, the sub-table of unassigned types, list order, the 7 form names, type names per sheet). Texts: `mobile/src/i18n/fr/dmh-guide.test.ts` (last block, from "equals the validated spec") compares definition, IBP rule, 3.0 rule, recognition, confusions, difference, drawing alt text and keywords character for character with section 6 of the spec, for each of 15 groups. Spec header "Statut : validée par le propriétaire le 2026-10-27" (`docs/specs/dmh-guide-content-v1.md:3`), asserted by `spec-sync.test.ts`. Sources recorded: `docs/references/README.md:75` (section "Dendromicrohabitats: pocket guide and typology (Phase 32)": FR and EN editions with URL, retrieval date 2026-10-23, SHA-256 and byte size; Larrieu 2018 with DOI; licence status "treated as all rights reserved"; reuse rules), `NOTICE.md:61`, and in the app `fr.dmhGuide.sources` (`i18n/fr/dmh-guide.ts:363`) rendered by `screens/dmh-guide/DmhSourcesPage.tsx`, reached from `DmhSourcesLinkRow.tsx` and the third view of `DmhGuideScreen.tsx`. |
| 3 | Recording a survey with many potential DMH is simpler than before (press-count proxy plus owner confirmation, no timing, owner decision 2026-10-27) | VERIFIED with a stated tie; owner confirmation is on record but not re-given for the final build | Proxy: `mobile/src/screens/factor-detail/dmh-entry-cost.test.tsx` (real `useSurveyForm`, real `FactorDetailScreen`, real group list). It asserts the new press count equals trees + section presses and compares it with the recorded old-flow constants `OLD_FLOW_PRESSES = { S1: 8, S2: 29 }` (`dmh-entry-scenarios.ts:54-57`), and that the stored F payload equals `OLD_FLOW_F_PAYLOAD`. Results as asserted: S1 = 8 against 8, a TIE (test uses `toBeLessThanOrEqual`); S2 = 26 against 29 (strictly less, `toBeLessThan`). So on the press count the gain is 3 presses (about 10 %) on one scenario and zero on the other; the proxy alone does not show "fewer taps" for S1. Caveats stated plainly: the old-flow numbers are recorded constants (the old flow code no longer exists, they were measured by plan 32-01 before the change), and S2 is a provisional "many" tally (comment at `dmh-entry-scenarios.ts:28-29`; plan 32-07 that would have replaced it with the owner's real survey was skipped). The tie comes from every section starting closed, by the owner's explicit choice of 2026-10-28 (test header). Owner confirmation: `32-UAT.md` rows 1-2 ("Plus simple : la nouvelle liste du facteur F et le guide me conviennent", build 89b453b0 line; "Ça me va, on peut clôturer la phase 32", build e15fb772) and `32-16-SUMMARY.md`. Those two approvals predate plans 32-20 to 32-35, which changed the F page again (capped counters, none row, header, toast, zone list). |

## Observable truths from the locked decisions

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| T1 | 15 groups, one sheet each, plus a searchable catalogue (D-04, D-06) | VERIFIED | `fr.dmhGuide.groups` has all 15 codes, each with keywords, definition, IBP rule, recognise, 2-4 confusions, alt text (`dmh-guide.test.ts` "every group has the required fields"); `DmhCatalogue.tsx`, `DmhGroupPage.tsx`, `app/dmh-guide/search.ts`; the three views in `DmhGuideScreen.tsx` |
| T2 | Drawings: 15 static SVG data sets, original, no animation (D-11) | VERIFIED in code; accuracy NOT verified | `mobile/src/app/dmh-guide/drawings.ts` has 15 entries (`grep -c` = 15, 44 004 bytes, header says generated from the SVG sources in this phase folder); `src/__checks__/dmh-drawings.test.ts:209` asserts `Object.keys(DMH_DRAWINGS)` has length 15 and the size budgets; `mobile/src/ui/DmhDrawing.tsx` is a plain function of props ("no state, no effect, no timer", lines 34-40) and the drawing code has no reanimated import (the only reanimated use in `screens/dmh-guide` is the view transition in `DmhGuideScreen.tsx:11`, not the drawings). Stroke colour from the theme (`semanticColors.ctaPrimary`). Accuracy of each drawing: only the owner read them (spec section 12); spec lists known drawing defects at the end of section 11 of its own list (groups 4, 8 touching the frame, 14 roots missing, 1 not in flute alignment, 11 shows a stump). |
| T3 | No copyrighted text or image copied (D-02, D-09) | VERIFIED as far as possible without the source PDF | Git added files of the commit contain no image or PDF other than the association's own SVG sources and three pilot PNG renders of its own drawings under `.planning/phases/32-.../drawings-pilot/`. No raster asset added under `mobile/`. `NOTICE.md:61-68` and `docs/references/README.md` state no third-party text, photo or drawing is reproduced. The guide PDFs are not in the repository, so a sentence-by-sentence comparison against them could not be done: the text is original wording by construction (spec section 2) and by the owner's validation, not by an automated check. Type names and thresholds are facts and are reused, with the sources cited on the in-app page. |
| T4 | Package changes only as documented; no existing parity case changed score | VERIFIED, with one rule relaxation to flag (below) | `git show HEAD -- packages/ibp-domain/src/parity/cases.ts`: the only removed line is a doc comment; 214 lines added, all new cases (see list). Package, API adapter and mobile adapter parity runs all pass (domain 544 tests, API parity 128, mobile 7853). |
| T5 | SQLite schema still version 5; API code unchanged except tests | VERIFIED | `mobile/src/storage/db.ts:27` `SCHEMA_VERSION = 5`; `git show --stat HEAD` shows no change under `mobile/src/storage`, `api/src` or `api/migrations`. The only API file touched is `api/test/surveys-submit.e2e-spec.ts` (two new e2e cases: capped F counts kept verbatim, G `open_areas_ha` kept verbatim; not run here, they need a database). |
| T6 | Owner decisions in code: sections closed by default, "Incertitude", "DMH" only in factor-pager, no em dash | VERIFIED | Closed: `AppCollapsibleSection` defaults `defaultExpanded = false` (`ui/AppCollapsibleSection.tsx:49`); the F list passes `section.defaultExpanded` from `app/dmh-guide/order.ts:60`, which is true only for a section holding a ticked or counted group at mount (documented in the file header as the owner's 2026-10-28 amendment); `order.test.ts:12` asserts all closed on an empty survey. Wording: `grep -rniE "douteu"` over `mobile/src`, `docs`, `packages/ibp-domain/src`, `api/src`, `CLAUDE.md` finds only two lines of `docs/project/presentation-association.md` ("relevés douteux" = moderation reports, a different thing); catalogue uses "Incertitude" (`i18n/fr/factor-detail.ts:188-200`, `survey-detail.ts:212`, `survey-export.ts:176`). Abbreviation: the only non-test, non-comment use of the word DMH in `mobile/src` is `i18n/fr/factor-pager.ts:15` (`F: "DMH"`), enforced by `__checks__/abbreviations.test.ts:63` (`file-only`, `factor-pager.ts`); the catalogue-wide ban on the abbreviation in the guide module is tested in `dmh-guide.test.ts`. Dash: remaining U+2014 in `mobile/src/i18n` are in comments of `survey-list.ts`, `survey-form.ts`, `genus.ts` and test fixtures; `__checks__/catalogue-dash.test.ts` strips comments and passes. |

## Package surface added in this phase (HEAD diff of `packages/ibp-domain`)

Exported from the package index (`index.ts`):

- `factor-details.ts`: `OPEN_AREAS_MAX_COUNT` (line 53), `cappedDmhCounts` (112), `cappedDmhTotalPerHa` (127), `clampOpenAreaHa` (188), `sumOpenAreasHa` (194), `floweringPercentFromAreas` (205), `openAreasExceedSurface` (214), `readOpenAreasHa` (224); `UNCAPPED_DETAIL_KEYS` gains `G: ["open_areas_ha"]`.
- `rules/common.ts`: `DENSITY_COUNT_KEYS` (237), `readDensityPerHa` (267), `densityLowerCountNeeded` (282), `readFactorAGenusCount` (newly re-exported), types `DensityFactor`, `DensityPerHa`, `GenusCountOutcome`.
- Module-internal but new: `DENSITY_LOWER_UNREAD_FROM_PER_HA` (208), `densityPerHa` (250), used by `v3-0.ts` and `v3-2.ts`.

Parity cases added (all new, none edited): `MAT-F-CAP-01@both` (draft and submit), `MAT-F-CAP-02@both`, `MAT-G-UNC-01@both` (draft, submit), `MAT-G-UNC-02@both` (over, none), `MAT-LOW-01` to `MAT-LOW-05@both`. They are listed in `docs/technical/ibp-validation-matrix-v2.md` (lines 205-232 for the F and G ones).

Finding to flag, not a failure: `readDensityPair` (`rules/common.ts:222`) was relaxed (plan 32-32). A C, D or E whose lower-class count is absent, null or blank is now read as 0 and SCORED when the upper class is at least 1 per hectare; before the phase it was unreadable (invalid). Two assertions of `rules/rules.test.ts` were rewritten to reflect that (`{ bmg_count: 1, surface_ha: 1 }` moved to surface 2 to stay invalid; the v3.2 `{ bmg_count: 3, surface_ha: 1 }` assertion moved to a new "scored 5" test). No existing score changes: where the lower class was supplied, the result is identical, and when the upper density is at least 1 per hectare the scorers never read the lower class (typed lower count that does not change the score is asserted in the new tests). It does, however, contradict the CONTEXT phase boundary sentence "IBP rules, the package ... do not change", and it widens what the API accepts on submit with no API code change (the API image carries the package). It is documented in `32-32-SUMMARY.md` and by the MAT-LOW cases. Operational risk: an app build that omits the lower count sends data an API without this package build would still reject, so the API image should be deployed first; no summary states that order.

## Required artifacts (spot level 1-3, plus data flow)

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `mobile/src/app/dmh-guide/{content,structure,order,search,drawings}.ts` | VERIFIED | Exist, substantive, imported by screens and by `global-search.ts`; tested |
| `mobile/src/screens/dmh-guide/*` (screen, catalogue, group page, sources page, callout) | VERIFIED | Wired through `DmhGuideRoute`; each file within the 400-line cap (`structure.test.ts` passes) |
| `mobile/src/ui/DmhDrawing.tsx`, `DmhCounterStepper.tsx` | VERIFIED | Used by `DmhGroupPage.tsx` and the F row |
| `mobile/src/i18n/fr/dmh-guide.ts` | VERIFIED | Typed catalogue, texts equal to the spec by test; data flows: group page reads `dmhGroupContent` -> catalogue -> spec-equal strings, no empty stub |
| `docs/specs/dmh-guide-content-v1.md`, `docs/references/README.md`, `NOTICE.md` | VERIFIED | Present, validated status, sources, SHA-256, licence status, reuse rules |
| `32-UAT.md` | VERIFIED | Honest partial status, lists pending checks and the "Not done" items |

## Requirements Coverage

| Requirement | Source | Status | Evidence |
| ----------- | ------ | ------ | -------- |
| REQ-DOC-dmh-sources | REQUIREMENTS.md:247 | SATISFIED | Sources, authors, licence status, retrieval date, SHA-256 in `docs/references/README.md:75+`; crosswalk and texts in `docs/specs/dmh-guide-content-v1.md`, validated in writing by the owner 2026-10-27 (without an expert; the requirement text only asks for the owner) |
| REQ-C-dmh-guide | REQUIREMENTS.md:248 | SATISFIED | Criterion 1 and T1; per-group sheet with IBP rule, recognition, confusions and pocket-guide types, searchable catalogue, sources shown |
| REQ-C-dmh-illustrations | REQUIREMENTS.md:249 | PARTIAL: present and static, expert check not done | 15 original static drawings (T2). The requirement says "checked for accuracy by a domain expert"; no expert read them (spec section 12, STATE.md line 33). The checkbox `[x]` in REQUIREMENTS.md overstates this; it is waived by the owner's decision, not met |
| REQ-C-dmh-fast-entry | REQUIREMENTS.md:250 | SATISFIED with caveat | "Fewer taps and less scrolling" is shown only for S2 (26 against 29); S1 is a tie (8 against 8). Stored payload unchanged for the old-flow scenarios (asserted). Less scrolling is not measured by any test |
| REQ-FT-dmh-speed | REQUIREMENTS.md:251 | SATISFIED on the owner's word | Owner written confirmation recorded in `32-UAT.md` rows 1-2 and `32-16-SUMMARY.md`; no timing by design. The confirmation does not cover plans 32-20 to 32-35 |
| Orphaned requirements | grep `Phase 32` in REQUIREMENTS.md | none | The five IDs above are the only ones mapped (lines 316-320) |

## Anti-Patterns

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| 131 non-test .ts/.tsx files of the commit (outside .planning and docs) | | grep for TBD, FIXME, XXX | Info | No debt marker found |
| `mobile/src/screens/factor-detail/dmh-entry-scenarios.ts` | 28-29 | Provisional S2 scenario comment ("Plan 32-07 replaces it") never replaced because 32-07 was skipped | Warning | The comment promises a replacement that will not happen; S2's "many" tally is invented, not the owner's real survey |
| `docs/specs/dmh-guide-content-v1.md` | 569-606 | 11 open "to be checked by the expert" points kept as written | Warning | Content confidence is the owner's alone |

## Gaps

None that fail a roadmap truth. Risks and honest limits:

1. Last recorded owner approval predates the final shape of the phase. `32-UAT.md` has the owner confirming builds 89b453b0 and e15fb772; plans 32-20 to 32-35 (capped per-group counters with new stored `dmh_counts` in capped mode, header and toast, the F look applied to A-J, hidden BMm/GB counter, G zones, Incertitude, "Définir le parcours") are all marked "not seen on a device" in their summaries and appear under "Pending" in the UAT. The ROADMAP line "complete 2026-10-28" and STATE.md "closed 2026-10-28" sit before the 2026-10-30 decisions of plans 32-33 to 32-35 recorded in the same documents, a dating inconsistency in the planning records.
2. Criterion 3 is a tie on S1 and a 3-press gain on S2 against recorded constants and a provisional S2; the criterion rests on the owner's judgement, which is its stated definition.
3. No expert reading of the drawings and thresholds; spec content is "validated without expert".
4. The whole phase is untested on Android; dark mode and VoiceOver unseen.
5. PDF not updated for the capped per-hectare counts (printed without "par hectare") nor for the G zones (`32-UAT.md` "Not done"; `survey-pdf/factor-fields.ts:247-275` prints `dmh_counts` as counts and adds the surface line only when counts exist; it has no capped per-hectare wording and no G zone line). The only PDF files touched in the commit are the "Incertitude" wording ones.
6. Known overlap of the A-J pager bar with the bottom tab bar on factor pages (pre-existing, recorded in UAT).
7. Phase boundary drift: the CONTEXT promised no package, rule or stored-data change; the follow-ups changed all three (new `dmh_counts` shape in capped mode, new `open_areas_ha` key, relaxed C/D/E lower-class rule). Each is owner-decided, documented (CLAUDE.md, spec, validation matrix) and covered by parity cases, but it is no longer true that the phase left stored data and rules untouched. Deploy order API before app is not written down.
8. Licence: the publisher terms page was never readable (README records HTTP 500 and 503); "all rights reserved" is assumed, which the own-wording approach already respects.
9. API e2e cases added in this phase were not run by the verifier (database needed). The known macOS-only `check-env-parity` failure was not triggered because the API suite was not run in full.

## Human Verification Required

1. **Later plans on the phone (32-20 to 32-35).** Test: install a Release build of main and walk the `Pending` list in `32-UAT.md` (C/D/E caption and hidden lower counter, A cover and per-cas genus list, B strata rows, G zone list including 20 zones and the above-100 percent warning, Incertitude pill/badge/PDF, "Définir le parcours", stepper hold-repeat and haptics). Expected: owner confirms each in writing. Why human: never seen on a screen.
2. **Expert reading.** Test: give the spec and the 15 drawings to a forest-microhabitat expert. Expected: dated spec revision for any correction. Why human: accuracy of identification content.
3. **Android pass.** Test: guide as modal from F row, Accueil, search; hardware back; steppers and sliders. Why human: untested on Android.
4. **Dark mode and VoiceOver.** Test: guide, F list, none row, zone list. Why human: unseen.
5. **Publisher licence page.** Test: read it when reachable. Why human: external page.

## Gaps Summary

The code delivers the three roadmap criteria: the guide exists offline in three entry points with 15 spec-equal group sheets, 15 static original drawings, recorded sources and licence, and an automated press-count proxy that passes (tie on S1, 26 against 29 on S2). Typecheck, lint, 7853 mobile tests and 544 package tests all pass; the schema is still version 5 and API source is unchanged. Nothing fails, but the verdict is `human_needed` because accuracy of the drawings and thresholds was never reviewed by an expert, the final form of the phase (plans 32-20 to 32-35) was never confirmed on a device, Android was never run, and the speed criterion is by design the owner's judgement rather than a measurement.

---

_Verified: 2026-10-28_
_Verifier: Claude (gsd-verifier)_


## Update 2026-10-30

The owner reported that the expert has read the 15 drawings, the texts and the IBP thresholds and that everything is fine, with no correction. This closes the gap on the missing expert reading (gap 2) except for the expert's name and the date of the reading, which were not given (spec section 12). Android, dark mode, VoiceOver and the owner's confirmation of plans 32-20 to 32-35 on a device remain open.
