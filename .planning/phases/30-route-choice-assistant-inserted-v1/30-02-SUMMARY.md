---
phase: 30-route-choice-assistant-inserted-v1
plan: 02
subsystem: docs
tags: [owner-gate, route-choice, spec-validation]
requires: [30-01]
provides:
  - "The route-choice rules spec validated by the owner in writing, dated 2026-10-14"
  - "Open points P-1 to P-4 decided"
key-files:
  modified:
    - docs/specs/route-choice-rules-v1.md
completed: 2026-10-14
---

# Phase 30 Plan 02: Owner validation gate Summary

The owner re-read the revised spec and validated it as written on 2026-10-14, with the four open points at their defaults. Gate passed: spec validated on 2026-10-14.

validated_on: 2026-10-14

open_points:
- P-1: default (the survey is finalised and sent to the server only when its parcours is accepted; the working draft stays on the phone until then; back returns to the parcel map with nothing written)
- P-2: default (client marker: the new app sends `X-Cortege-Features: survey_route`; `route_required` is applied only when the header is present)
- P-3: default (submitted surveys show "Parcours : non renseigné" with the sentence "Ce relevé a été fait avant l'assistant de choix du parcours"; their PDF is unchanged)
- P-4: default (the owner reviews every French sentence in plan 30-24, before the tester test)

deviations:
- none (no rule changed; the owner validated the spec as written)

branch: BRANCH UPDATE NEEDED: merge origin/main into the phase branch before wave 3 (phase 29: migration 024, finish sheet, RadioCard)

## Owner reply (verbatim, in chat, 2026-10-14)

"Je valide, tel quel" to "Validez-vous la spec des règles de choix du parcours (docs/specs/route-choice-rules-v1.md), avec P-1 à P-4 aux défauts ?"; P-1 "Finalisé à l'acceptation du parcours", P-2 "Un marqueur envoyé par la nouvelle app", P-3 "« Parcours : non renseigné » + une phrase", P-4 "En fin de phase, avant le test".

## What was changed

Only `docs/specs/route-choice-rules-v1.md`: status line and header validation line, section 13 (validation with the reply quoted), the sentences of sections 4, 8 and 11 that left P-1 to P-4 to a later reading, and a dated entry in the revision log. No rule, code, constant or field was touched.

## Checks

- No U+2014 in the spec; no "à confirmer" or "à fixer à la conception" left.
- Every O-nn and U-O row of section 11 keeps a non-empty "Décision validée" column.
- `api/migrations/024_private_or_public_visibility.sql` is absent from this branch: phase 29 must be merged before wave 3.
