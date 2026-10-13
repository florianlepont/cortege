---
phase: 30-route-choice-assistant-inserted-v1
plan: 01
subsystem: docs
tags: [spec, ibp, route-choice, cnpf, owner-gate]

requires:
  - phase: 30-route-choice-assistant-inserted-v1
    provides: CONTEXT, RESEARCH and UI-SPEC (the source material of the spec)
provides:
  - docs/specs/route-choice-rules-v1.md, sections 1 to 13, status "brouillon, à valider par le propriétaire"
  - the CNPF methods document (M) recorded in docs/references/README.md with URL, SHA-256 and retrieval date
  - the specs index line
affects: [30-02, 30-03, 30-05, 30-06, 30-07, 30-10, 30-13, 30-15, 30-16, 30-19, 30-21]

tech-stack:
  added: []
  patterns:
    - "rule table with one test case per rule, each row citing a CNPF page (document S or M), ids shared with ROUTE_RULE_CASES"
    - "owner decision table with an empty 'Décision validée' column filled only at the owner gate (30-02)"

key-files:
  created:
    - docs/specs/route-choice-rules-v1.md
  modified:
    - docs/references/README.md
    - docs/specs/README.md

key-decisions:
  - "Spec status stays 'brouillon, à valider par le propriétaire'; no decision cell is filled and the validation lines are empty"
  - "zone_surface_ha is the surface of the sheet (one placette) for typological and systematic; raised as new owner decision O-17"
  - "U-O10 default: detail keys (strata_cover, dmh_counts) are never read by a scorer; the app writes strata_count and trees_per_ha from them while the factor is counted in full"
  - "D-04 recommendation written: pooled group calculation goes to a Phase 30.1; Phase 30 records every input it needs (no migration later)"

requirements-completed: [REQ-DOC-route-rules]

duration: single session
completed: 2026-10-13
status: complete
---

# Phase 30 Plan 01: Route-choice spec Summary

**French route and counting rules (R-01 to R-21, 45 test rows) drafted from the two CNPF documents, with the group-of-placettes model, 32 owner decisions and their recommended defaults, ready for the owner gate 30-02.**

## What was done

1. `docs/references/README.md`: the CNPF methods document M (Gonin and Larrieu, 09/09/25, 28 pp.) with its URL, SHA-256 `3954746756b7...87d7f2` (re-checked against the downloaded PDF before citing pages), retrieval date 2026-10-13, a "Cite as" line and a working-locally note. No PDF added (`git status` shows none).
2. `docs/specs/route-choice-rules-v1.md` (742 lines, French, no U+2014):
   - sections 1 to 4: scope and vocabulary (D-01, O-12), six source discrepancies, glossary, questionnaire with ids `purpose`, `surface`, `homogeneity`, `difficulty`, `narrow`, `refine` and their display conditions;
   - sections 5 to 9: constants, the rule table, zone checks, counting presets, B and F detail entry, the recorded `survey_route`, display rows;
   - sections 10 to 13: group model (tableau 5 factor by factor, G-1 to G-11, size estimate, "Décision D-04"), decision table, proposed requirement ids, empty validation block.
3. `docs/specs/README.md`: one index line.

## Final figures (for the 30-05 fixture and the id consistency test)

- Rule rows: 23, ids `R-01` to `R-11`, `R-11b`, `R-12a`, `R-12b`, `R-13` to `R-21` (there is no plain `R-12`, as in the research table).
- Boundary rows `R-nn#label`: 22 (at 0.5, 1, 5, 10, 20 and 40 ha and the zone, complement and time bounds).
- Total rows starting `| R-`: 45; every one cites a page and carries a `→` test case.
- Owner decisions: O-01 to O-17 (17) and U-O1 to U-O15 (15), 32 rows, all "Décision validée" cells empty.
- Codes: parcours `full`, `partial_strip`, `partial_plot`, `typological`, `systematic`; comptage `capped`, `uncapped`; presets `study`, `mature`, `always_max`, `minimum`, `custom`; zone checks `zone_not_positive`, `zone_too_large`, `zone_above_stand`, `partial_over_half`, `partial_below_minimum`, `complement_below_zone`.

## Deviations from Plan

### Spec-writing findings (no code involved)

**1. [Rule 2 - missing decision] New owner decision O-17**
- **Found during:** Task 2 (suggested zone for the typological and systematic parcours)
- **Issue:** UI-SPEC section 6 asks "Surface totale des placettes" for these two parcours, but the CNPF sheet's "zone de relevé IBP" is per sheet (one sheet per placette, M p. 5) and plan 30.1 needs each placette's own surface.
- **Fix:** the spec defines `zone_surface_ha` as the surface of this sheet (1 ha, 0.20 ha) and adds `sample_total_ha` as an aid only. Raised as O-17 with the UI-SPEC label to correct (plans 30-16, 30-19).
- **Files modified:** docs/specs/route-choice-rules-v1.md
- **Commit:** e3bfe76a, c52f22a3

**2. [Rule 2 - missing codes] Codes added beyond the research list**
- Reasons `typological_study` (R-05 with `study`), `typological_large` and `large_stand` (R-11b); error codes `surface_missing` and `surface_invalid` (R-01); advice `group_pending` (R-04, R-05, R-15, O-06); result field `sample_total_ha`. Without them a sentence of the guide would have no rule behind it. Listed in section 5 "Codes ajoutés" for the 30-10 and 30-13 wording review.
- `linear_stand_unsupported` is NOT created, following decision O-10 as written in the plan (no code, no question).

**3. [Correction of the research] Source facts re-read against the PDFs**
- The learning time disagrees inside M itself (M p. 2 and S p. 19: half a day; M p. 17 and p. 19: one day). The app writes no duration.
- The box-plot "valeurs adjacentes" ARE defined (M p. 27, Q1 minus 1.5 IQR and symmetric); only the quartile method is missing (G-9). The dispersion scale wording is "moyenne, élevée, très élevée".
- Page numbers were re-derived from the PDF footers (footer at the bottom of each page) for every cited page of M and for S p. 6, 18, 19, 20.

**4. [Plan instruction followed over research] U-O10 default**
- The plan fixes the default as "a detail key is never read by a scorer; the app writes the scored key". The research proposed that the package scorers read the details. The spec follows the plan; the alternative is listed as the structural effect of U-O10 (30-06, 30-11, 30-17).

**5. [Narrower than UI-SPEC] Question conditions**
- Following the plan's rule "a question is asked only when its answer can change the result": `narrow` is asked only for a partial route on a homogeneous, easy stand (otherwise the strip is already forced); `homogeneity` is asked for rapid diagnosis and study only between 1 and 40 ha. The UI-SPEC table is broader ("partial route only"); plan 30-05 and 30-15 follow the spec.

**6. [Tooling note] Prettier**
- `prettier --check` warns on the three Markdown files (table alignment and `*` versus `_` emphasis). The two README files already failed before this plan and Markdown is outside the `format:check` glob, so nothing was reformatted (the plan allows whitespace fixes only).

**7. [Process note]** The worktree branch is `claude/amazing-benz-d223f1`, not `worktree-agent-*`; the allow-list check of the commit protocol was not applied because the orchestrator ran this plan as a sequential executor. HEAD was never on a protected branch. `.planning/STATE.md` was already modified before the plan and was not touched or staged.

## Known Stubs

None. The only intentionally empty cells are the "Décision validée" column and the two validation lines of section 13, which plan 30-02 fills with the owner's written answer.

## Threat flags

None. No code, endpoint or schema was added.

## Commits

- 167da388: docs(30-01): add CNPF methods document reference and route-choice spec sections 1 to 4
- e3bfe76a: docs(30-01): add route-choice spec sections 5 to 9 (rules, counting, entry, record, display)
- c52f22a3: docs(30-01): add route-choice spec sections 10 to 13 and the specs index line

## Self-Check: PASSED

- docs/specs/route-choice-rules-v1.md, docs/references/README.md, docs/specs/README.md exist and are committed.
- Task verify commands exit 0; no U+2014 in the spec; no PDF in `git status`.
- Commits 167da388, e3bfe76a, c52f22a3 are in the log.
