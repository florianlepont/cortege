---
phase: 32-detailed-dmh-information-inserted-v1
plan: 05
subsystem: docs
tags: [dendromicrohabitats, content-spec, ibp, french-content, drawings-record]
requires: []
provides:
  - docs/specs/dmh-guide-content-v1.md (sections 1 to 12, status brouillon, validation cells empty)
  - docs/specs/README.md index line
affects: [32-09, 32-10, 32-11]
tech-stack:
  added: []
  patterns: [spec validated before screens (phase 30 precedent)]
key-files:
  created: [docs/specs/dmh-guide-content-v1.md]
  modified: [docs/specs/README.md]
key-decisions:
  - "The IBP 3.2 threshold is the only counting rule; the pocket guide value appears only in the correspondence table column and in the labelled Écart line"
  - "Page marks of the IBP sheet are written in plain French at the end of each rule ('fiche de l'IBP, pages 3 et 12') so they can be shown verbatim"
duration: 25 min
completed: 2026-10-26
status: complete
---

# Phase 32 Plan 05: Dendromicrohabitat guide content spec Summary

French content spec `docs/specs/dmh-guide-content-v1.md` (870 lines, status "brouillon, à valider par le propriétaire et à relire par un expert"): sources and licence, vocabulary, 7 forms, page-cited IBP to pocket guide correspondence table, 15 original-wording group sheets each with its drawing's alt sentence, list order (O-32-12), interface texts, record of the 15 drawings, decisions with defaults, empty validation block.

## Tasks and commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Header and sections 1 to 5 | f91c0091 | docs/specs/dmh-guide-content-v1.md |
| 2 | Section 6, sheets dmh_01 to dmh_08 | 52a7028e | docs/specs/dmh-guide-content-v1.md |
| 3 | Sheets dmh_09 to dmh_15, sections 7 to 12, index line | e1503c76 | docs/specs/dmh-guide-content-v1.md, docs/specs/README.md |

SHA-256 of both PDFs matched the recorded values (pocket guide `cc5fb045...`, IBP sheet `f130b3d6...`); both were read with pdftotext from the session scratchpad and never added to the repository (`git status` shows no PDF).

## Verification

- Task 1 to 3 automated commands: all pass (15 correspondence rows, headings, count line, no U+2014, 15 sheets, O-32-1 to O-32-12 and P-01 to P-04 rows, section 7 and 12, README line).
- Counts: IBP-rule field 15, "Méthode 3.0" 3 (groups 6, 12, 15), "Écart" 9 (groups 3, 4, 5, 6, 7, 12, 13, 14, 15), "Texte du dessin" 15, drawing rows 15, correspondence rows 15. Section 9 has no image format and no credit word; sections 6 to 12 hold no DMH/WSL/CNPF/INRAE and no capital-run token except IBP.
- Empty cells: all 16 "Décision validée" cells, all 15 "Relu (exactitude)" cells, "Ordre validé :", "Validé par le propriétaire le :", "Relu par (expert) :", "Réponse du propriétaire :".
- `npx prettier --check docs/specs/dmh-guide-content-v1.md` passes. `docs/specs/README.md` already fails prettier at HEAD (pre-existing, uses `*(V1)*`); only my index line was added, in the existing style, and the file was not reformatted.

Confusion bullets per group: dmh_01 3, dmh_02 4, dmh_03 3, dmh_04 3, dmh_05 4, dmh_06 4, dmh_07 4, dmh_08 4, dmh_09 4, dmh_10 4, dmh_11 4, dmh_12 4, dmh_13 4, dmh_14 4, dmh_15 4.

## Facts of the research crosswalk that the PDFs contradicted or completed

- dmh_06: no threshold differs on the five counted types (fork crack is length > 30 cm in both documents). The research's "fourche: guide length only" is not a difference. The only guide difference is the beaver gnawing (type 25, not counted). The Écart line was written as a scope difference; same for dmh_14 (microsoils).
- dmh_09: the research said "none found"; the pocket guide counts a canker also when it covers "a large part of the trunk" (G p. 44). Put in the table and in the expert list, not as an Écart line (plan fixes 9 Écart lines).
- dmh_04: the guide also requires a roof slope under 45 degrees for the root concavity (G p. 26), absent from the research.
- dmh_12: the guide adds a lichen thickness over 1 cm and counts a single mistletoe ball over 20 cm (IBP: 10 balls over 20 cm).
- Group 15 rule is on I p. 4 (and 13), not p. 3; the table cites "I p. 4 et 13".
- The IBP sheet says it rests on 41 types (I p. 7), the guide counts 43 inside the IBP groups; read as two regroupings (types 8 and 9; type 23 as a variant), to confirm.
- The online verification notes mention 47 types (2020 edition); everything here is the 2024 edition (52 types, 43 + 9, count confirmed).

## Deviations from Plan

**1. [Rule 3 - Blocking] Prettier-ignore around the section 9 and 10 tables.** Prettier pads cells, which breaks the literal `| O-32-1 |` and single-space `svg` | ` patterns of the plan's own verification commands; both tables are wrapped in `prettier-ignore` markers with unpadded rows. The rest of the file is prettier-clean. 32-09 can keep the markers when filling the cells.

**2. [Rule 2 - Missing] Added `### Points à faire vérifier par l'expert`** at the end of section 6 (not in the plan): everything uncertain is marked there rather than in the app texts, since "à vérifier" cannot sit in a catalogue string.

**3. Interface choices for plan 32-10.** The correspondence "Forme" cell holds the form code in backticks (`cavities`), not the French name; "Types sans groupe IBP" is a `###` sub-heading with a table whose first cell is "31. Galles" / "50. Dépôt d'argile ou de limon"; the group 9 sheet lists "Galles" under non-counted while the group 9 table cell says "aucun" (explained under the sub-table).

**4. No new O-32-13.** The galles question is in the expert list instead, to keep O-32-1 to O-32-12 and P-01 to P-04 as the plans expect.

No auth gates. No stubs. Nothing under mobile/, packages/ or api/ touched; STATE.md, ROADMAP.md and REQUIREMENTS.md untouched (section 11 lists the five requirement ids for the orchestrator).

## Points for the owner or the expert (also in section 6, end, and section 10)

- Owner decisions, each with a default: O-32-1 to O-32-12, P-01 to P-04 (notably O-32-7 show the guide thresholds, O-32-12 list order (a), (b) or (c), P-03 pass rule).
- Dmh_01: a round entrance of 7 to 10 cm matches no named size (neither document).
- Dmh_06: confirm the fork crack counts on length alone (I p. 12 against I p. 3); the version 3.0 line assumes crown break and crack unchanged since only the limb break is listed (comparison F-3).
- Dmh_06 and dmh_14: keep the "seuil de l'IBP, pas celui du guide" block when the difference is only an extra type?
- Dmh_09: add an Écart line for the canker clause (then 10 groups carry one)?
- Dmh_11: "plus de 10 ensemble" is my reading of "nombre > 10" (IBP) and "groupe > 10" (guide); drawing shows a cut stump while the IBP counts living trees.
- Dmh_12 version 3.0: assumed same mistletoe rule and 20 % rule as 3.2.
- Phrases from general knowledge, not from the documents (list in the spec): mulm versus a pile of soil or leaves, rot pocket, leafless trees in winter, mistletoe stems and leaves, green film, colour of sap and resin, gallery comb.
- Galles shown on the group 9 page; the clay or silt deposit shown nowhere.
- Drawings: framing at the edge for groups 4 and 8 (strokes reach x = 800), no fine roots drawn in group 14, the three loges of group 1 are not a flute; each alt sentence describes the delivered drawing and must be re-read with the expert.
- The sources page says "Documents consultés le 23 octobre 2026" (date kept from the research and plan 32-02); the files were re-read on 2026-10-26.

## Self-Check: PASSED

Files found: docs/specs/dmh-guide-content-v1.md, docs/specs/README.md. Commits found: f91c0091, 52a7028e, e1503c76.
