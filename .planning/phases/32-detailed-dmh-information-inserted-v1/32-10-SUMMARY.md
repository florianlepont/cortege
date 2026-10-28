---
phase: 32-detailed-dmh-information-inserted-v1
plan: 10
subsystem: mobile-catalogue-and-pure-logic
tags: [dmh, catalogue, structure, spec-sync, search, ordering]
requires: ["32-09"]
provides:
  - fr.dmhGuide typed catalogue (sheet, search, group, sources, forms, 52 types, 15 groups)
  - DMH_GUIDE_STRUCTURE (15 groups to 7 forms and pocket guide types), tied to the validated spec by a test
  - dmhGroupContent(code, methodVersion) with the version 3.0 wording of groups 6, 12 and 15
  - orderDmhRows (mount-time order and open sections) and searchDmhGroups
affects: [32-11, 32-12, 32-13, 32-14, 32-15, 32-16]
tech-stack:
  patterns: [typed catalogue module, spec-sync test reading the validated spec]
key-files:
  created:
    - mobile/src/i18n/fr/dmh-guide.ts
    - mobile/src/i18n/fr/dmh-guide.test.ts
    - mobile/src/app/dmh-guide/structure.ts
    - mobile/src/app/dmh-guide/structure.test.ts
    - mobile/src/app/dmh-guide/content.ts
    - mobile/src/app/dmh-guide/content.test.ts
    - mobile/src/app/dmh-guide/spec-sync.test.ts
    - mobile/src/app/dmh-guide/order.ts
    - mobile/src/app/dmh-guide/order.test.ts
    - mobile/src/app/dmh-guide/search.ts
    - mobile/src/app/dmh-guide/search.test.ts
  modified:
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/catalogue.test.ts
metrics:
  tasks: 3
  completed: 2026-10-27
status: complete
---

# Phase 32 Plan 10: Catalogue, structure, ordering and search Summary

The validated content spec is now code: the typed catalogue `fr.dmhGuide`, the crossing of the fifteen IBP groups with the pocket guide forms and types, a method-aware content accessor, the mount-time ordering of the F list and the accent-insensitive guide search, with tests that keep the code equal to the spec.

## Tasks and commits

| Task | Name | Commit |
|------|------|--------|
| 1 | The `fr.dmhGuide` catalogue module, registered and tested | `109b434e` |
| 2 | Structure, `dmhGroupContent` and `spec-sync.test.ts` | `681e2b6a` |
| 3 | `orderDmhRows` and `searchDmhGroups` | `df1a9452` |

## What was built

- `mobile/src/i18n/fr/dmh-guide.ts`: `dmhGuideFr` with `sheet`, `search`, `group`, `sources` (three documents, one static sentence for the association's drawings, no per-drawing credit key), `forms` (official names), `types` (52 names keyed by the 2024 number) and `groups` (15 entries typed `as const satisfies Record<DmhGroupCode, DmhGroupText>`, each with `illustrationAlt`). Registered as `dmhGuide: dmhGuideFr`.
- `structure.ts`: `DMH_FORM_IDS`, `DMH_WSL_EDITION`, `DMH_WSL_TYPE_COUNT`, `DMH_GUIDE_STRUCTURE`, `DMH_WSL_TYPES_WITHOUT_IBP_GROUP`, `DMH_LIST_ORDER` (written out, equal to "Ordre validé"), `formOf`, `groupsOf`, plus `DMH_UNGROUPED_TYPES_SHOWN_ON` (see deviation 2). No French text.
- `content.ts`: `dmhGroupContent`. Groups 6, 12, 15 return `ibpRuleV30` with `versionNote: "v30"` for a null, empty or version 3.0 method, `ibpRule` with `"v32"` for 3.2; other groups have `versionNote: null`. The label is `selectionLabel("F", code, methodVersion)`.
- `order.ts`: ticked or counted groups first (section then row), then `DMH_LIST_ORDER`; all sections open when nothing is active, else only sections holding an active group (O-32-4 default kept by 32-09). Unknown codes ignored, inputs not mutated.
- `search.ts`: `foldSearchText` over label, keywords and counted type names, IBP order, empty query returns the 15 codes.
- No module computes a density, cap or score (T-32-25).

## Verification

- `npm --workspace mobile run test:unit -- src/app/dmh-guide src/i18n src/__checks__`: 23 suites, 339 tests passed. Full `npm --workspace mobile run test:unit`: 455 suites, 6906 tests passed.
- The abbreviation, dash, structure, icons and catalogue gates pass with no change to `mobile/src/i18n/fr/abbreviations.ts` or `mobile/src/__checks__` (`git diff --name-only` empty for both).
- `npm --workspace mobile run typecheck` clean; `npx eslint` on `src/app/dmh-guide` and `src/i18n` (run from `mobile/`) clean; `npx prettier --check` on the plan's files clean.
- Structure gate grep `grep -cE "\"[A-Z][a-zé]+ [a-zé]+" mobile/src/app/dmh-guide/structure.ts` prints 0.

### Verbatim transcription (T-32-23)

`dmh-guide.test.ts` parses section 6 of the spec and asserts, for all 15 groups, that keywords, definition, IBP rule, version 3.0 rule, recognition, confusions, difference and drawing alt sentence are string-equal to the spec (not a sample). It also asserts the group heading labels equal `factorInput.dmhGroupOptions`. The five groups named for the plan's spot check (dmh_01, dmh_05, dmh_06, dmh_12, dmh_15) are among the 15 compared by that test; no hand reading was needed beyond it.

### Spec-sync mutation check

With `dmh_03` changed from `wslTypes: [11]` to `[31]` in `structure.ts`, `spec-sync.test.ts` failed (2 tests: "dmh_03: form and type numbers equal the table" and the group sheet type names), then the file was restored and the suite passed (35 of 35 in `src/app/dmh-guide`). The spec status line (`Statut : validée`) is asserted too.

## Deviations from Plan

**1. [Rule 3 - Blocking] `catalogue.test.ts` section list**
- **Found during:** Task 1 verification.
- **Issue:** `mobile/src/i18n/catalogue.test.ts` lists every key of `fr` and failed on the new `dmhGuide` section.
- **Fix:** added `"dmhGuide"` to the expected list (a registry of sections, not a gate policy).
- **Files modified:** `mobile/src/i18n/catalogue.test.ts`. **Commit:** `109b434e`.

**2. [Rule 2 - Correctness] Galls on the group 9 sheet**
- **Issue:** the spec shows "Galles" (type 31) under "Types décrits, non comptés" on the group 9 sheet while the section 5 table (and so `DMH_GUIDE_STRUCTURE`) ranges type 31 in no group.
- **Fix:** kept the table exact and added the display-only map `DMH_UNGROUPED_TYPES_SHOWN_ON = { dmh_09: [31] }`, which `dmhGroupContent` adds to the not-counted list. `spec-sync.test.ts` compares each page's type lists to the sheets of section 6, so the map is proven.
- **Files modified:** `structure.ts`, `content.ts`. **Commit:** `681e2b6a`.

**3. Typing of `groups`.** The object is `as const satisfies Record<DmhGroupCode, DmhGroupText>` (the plan said `satisfies` and `as const`); the accessor reads it as `DmhGroupText`, so optional fields stay accessible.

**4. Apostrophes.** The spec uses straight apostrophes (not typographic ones); the catalogue keeps them as written.

## Owner decisions applied

O-32-2 (short names on the list, official names on the group page: `forms` here holds the official ones), O-32-4 (open sections), O-32-7 (difference block data), O-32-9 (own-words sources), O-32-12 option (a) (`DMH_LIST_ORDER` is the IBP order 1 to 15). No answer differed from a default.

## Known Stubs

None. The `forms` short list titles and the counter strings of the F list (`fr.factorDetail.dmhList`) belong to a later plan.

## Threat Flags

None (pure data and local string folding; nothing stored or sent).

## Self-Check: PASSED

Created files exist (`mobile/src/i18n/fr/dmh-guide.ts` and the ten files under `mobile/src/app/dmh-guide/` and `mobile/src/i18n/fr/` listed above); commits `109b434e`, `681e2b6a` and `df1a9452` are in `git log`.
