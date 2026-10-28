---
phase: 32-detailed-dmh-information-inserted-v1
plan: 02
subsystem: docs
tags: [dendromicrohabitats, sources, licence, notice]
requires: []
provides:
  - sources and licence status of the DMH guide recorded in docs/references/README.md and NOTICE.md
affects: [32-05, 32-09, 32-12]
key-files:
  modified:
    - docs/references/README.md
    - NOTICE.md
decisions:
  - "D-01: reference edition is the 2024 French second edition (W1), confirmed by the owner without a file"
  - "D-02, D-09: own wording and original drawings; the PDFs are never copied or reproduced"
metrics:
  completed: 2026-10-26
status: complete
---

# Phase 32 Plan 02: DMH sources and licence record Summary

Sources of the dendromicrohabitat guide (WSL pocket guide 2024 FR and EN, Larrieu et al. 2018, IBP FR v3.2 thresholds) recorded with SHA-256 values, dates and licence status as found, plus the NOTICE paragraph on own wording and association-owned drawings.

edition: 2024-fr
confirmed_on: 2026-10-24

## Reference edition

- Edition: 2024 French second revised edition of the "Guide de poche des dendromicrohabitats" (W1), 64 pages.
- SHA-256: `cc5fb0450b4dcf6c79b16e173fa7f28d5464035801b756b24950ba88e42a7e68` (taken from 32-RESEARCH.md, downloaded by the research on 2026-10-23; no new download).
- Owner reply to Task 1 (checkpoint:decision): "edition-2024", given in the conversation on 2026-10-24. No file supplied, so no comparison against a supplied file was possible; the research copy is the reference. Crosswalk numbering (52 types) of 32-05 and structure of 32-10 stand.
- English edition (W2) fingerprint `b4335f8dc93b4218aabe8bee91ee6336d2dca87e85e745f7c1a1ad8e232aa946` recorded as a cross-check source only.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Owner states which pocket-guide PDF they supply (answered "edition-2024") | no commit (decision) |
| 2 | Record sources and licence status in references README and NOTICE | b2b1e585 |

## Deviations from Plan

None. Task 1 was already answered by the owner and was not asked again. The SHA-256 values come from 32-RESEARCH.md, as the plan allows for the "edition-2024" branch (the README says so).

## Issues Encountered

None. No PDF added to the repository (`docs/references/*.pdf` is ignored).

## Known Stubs

None.

## Self-Check: PASSED
