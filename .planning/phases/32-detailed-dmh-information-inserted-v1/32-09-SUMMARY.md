---
phase: 32-detailed-dmh-information-inserted-v1
plan: 09
subsystem: content-gate
tags: [dmh, content-spec, owner-validation, drawings-review]
requires: ["32-02", "32-04", "32-05"]
provides:
  - docs/specs/dmh-guide-content-v1.md validated by the owner on 2026-10-27 (status "validée", no expert)
  - decisions O-32-1 to O-32-12, P-01 to P-04 recorded, list order, drawings review
affects: [32-10, 32-11, 32-12, 32-13, 32-14, 32-15, 32-16]
key-files:
  modified:
    - docs/specs/dmh-guide-content-v1.md
    - docs/specs/README.md
decisions:
  - "The owner validates the spec without an expert (quote: je peux valider sans); the thresholds and drawings were read by the owner only."
  - "Every default of section 10 is kept; no text, drawing or threshold changed."
metrics:
  tasks: 2
  completed: 2026-10-27
status: complete
---

# Phase 32 Plan 09: Owner validation of the DMH content spec Summary

The owner validated `docs/specs/dmh-guide-content-v1.md` as written on 2026-10-27, with every default kept and no expert; the spec status is now "validée" and plans 32-10 onward may transcribe it.

validated_on: 2026-10-27

expert: aucun, validé par le propriétaire seul le 2026-10-27

Owner statements (verbatim, 2026-10-27): "je peux valider sans [expert], mais j'ai pas vu les textes et tous les dessins". The assistant then sent a single page showing each of the 15 drawings next to its texts; the owner replied "c'est bon !". Read as option `valide`. Because no expert read the document, the spec states (sections 12 and the header) that the thresholds and the drawings' accuracy were read by the owner only, so the field tests can still catch errors; the "Points à faire vérifier par l'expert" at the end of section 6 stay unconfirmed and are kept as written.

decisions:

- O-32-1: 48 (constante, default kept; plan 32-11 applies 48 through DMH_STEPPER_SIZE)
- O-32-2: default kept, short names on the list and official names on the group page
- O-32-3: default kept, a counted group cannot be unticked until its count is 0
- O-32-4: default kept, all sections open when nothing is ticked, otherwise only those with a tick
- O-32-5: default kept, no search on the F list
- O-32-6: default kept, 15 drawings by the assistant, all read by the owner, none corrected
- O-32-7: default kept, differing threshold block shown, labelled, IBP value first
- O-32-8: default kept, no tick shortcut from a group page
- O-32-9: default kept, own-words sources statement
- O-32-10: done, written validation on 2026-10-27 without expert
- O-32-11: default kept, summary line shown
- O-32-12: option (a), ticked or counted first, then the IBP order
- P-01: 2024 French edition (SHA-256 in the spec header)
- P-02: no expert, owner validates alone on 2026-10-27
- P-03: without object since 2026-10-27 (owner decision, no timing)
- P-04: without object since 2026-10-27 (the three levers stay as built)

No answer differs from a default, so there is nothing to classify as "constante" or "structurelle" and no "PHASE REPLAN NEEDED".

list_order: dmh_01, dmh_02, dmh_03, dmh_04, dmh_05, dmh_06, dmh_07, dmh_08, dmh_09, dmh_10, dmh_11, dmh_12, dmh_13, dmh_14, dmh_15

drawings: aucune correction. The 15 rows of section 9 read "exact, lu par le propriétaire le 2026-10-27, sans expert"; the SVG sources and `mobile/src/app/dmh-guide/drawings.ts` are untouched (not regenerated).

- dmh_01 Loges de pic: exact (owner read)
- dmh_02 Cavités à terreau: exact (owner read)
- dmh_03 Orifices et galeries d'insectes: exact (owner read)
- dmh_04 Concavités: exact (owner read)
- dmh_05 Aubier apparent: exact (owner read)
- dmh_06 Aubier et bois de cœur apparents: exact (owner read)
- dmh_07 Bois mort dans le houppier: exact (owner read)
- dmh_08 Agglomérations de gourmands ou de rameaux: exact (owner read)
- dmh_09 Loupes et chancres: exact (owner read)
- dmh_10 Champignons pérennes: exact (owner read)
- dmh_11 Champignons éphémères: exact (owner read)
- dmh_12 Plantes et lichens épiphytiques ou parasites: exact (owner read)
- dmh_13 Nids: exact (owner read)
- dmh_14 Microsols: exact (owner read)
- dmh_15 Coulées de sève et de résine: exact (owner read)

deviations:

- The review of the drawings and of the thresholds is by the owner alone (no expert), recorded as an explicit owner statement as the Task 1 acceptance allows. The prose of the spec was adapted accordingly (header paragraph, section 7 note, section 8 intro, section 9 register intro, section 10 intro, section 12).
- The section 9 review cells read "exact, lu par le propriétaire le 2026-10-27, sans expert" instead of the plan's "relu par <expert>" form, since no expert exists.
- `docs/specs/README.md` is not Prettier-clean at the base commit (22 lines reflowed by `prettier --write`), so only the one index line was edited by hand; the plan's `prettier --check` on that file fails for a reason older than this plan. `format:check` only covers ts, tsx and json, so CI is unaffected. The spec itself and `drawings.ts` pass Prettier.
- Task 1 was executed by the orchestrator conversation (contact page and owner reply), not by this agent.

## Verification

- Task 2 verify greps (validation date, status line, "Relu par (expert) : .") pass; no em dash in the spec; all 15 section 9 review cells and all 16 section 10 decision cells filled; O-32-1 cell reads 48; P-03 and P-04 read "Sans objet, décision du propriétaire du 2026-10-27"; "Ordre validé" lists the 15 codes on one line.
- `npm --workspace mobile run test:unit -- src/__checks__/dmh-drawings.test.ts`: 19 passed.
- `npx prettier --check docs/specs/dmh-guide-content-v1.md mobile/src/app/dmh-guide/drawings.ts`: clean.
- The verify command's `grep "—"` is a hard no-match on the spec (0 occurrences).
