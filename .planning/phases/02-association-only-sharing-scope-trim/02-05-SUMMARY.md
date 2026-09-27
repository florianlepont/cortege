# Plan 02-05: Documentation corrections

**Wave:** 7
**Requirements:** criterion 7 (`docs/specs/epic-a-access-and-security.md`, `docs/specs/user-stories.md` §8)
**Status:** Done

## What changed

- `docs/specs/epic-a-access-and-security.md`: US-A4 (Extended login / social sign-in) was labelled `**Release:** MVP`, contradicting `.planning/REQUIREMENTS.md` (deferred — next milestone, found unbuilt 2026-09-27) and `docs/user-tests/epic-a-access-and-security.md:75`, which already excludes it from the MVP test plan as "scoped to V1." Retagged to `**Release:** V1` with a note citing both.
- `docs/specs/user-stories.md` §8: "Community moderation workflow" (Epic E) and "Team challenges" (Epic F) were filed under "V2 Backlog", but both epics are labelled **V1** in their own spec documents (`docs/specs/epic-e-data-quality-and-trust.md`, `docs/specs/epic-f-participatory-experience-and-gamification.md`) and REQUIREMENTS.md's "Deferred — Next Milestone" bucket, not "Deferred — V2" (which is Epic H only). Split §8 into "Deferred to the next milestone (V1)" (these two items) and "V2 Backlog" (everything else, unchanged) — REQUIREMENTS.md's own next-milestone/V2 split, matching the vocabulary the epic docs already use. Scope kept to exactly the two items ROADMAP criterion 7 names; the section's other stale entries (e.g. PDF/Excel export, now MVP per Phase 10) are `REQ-DOC-taxonomy`'s job in Phase 13, not this phase's.

## Verification

Docs-only change; re-ran the full local gate to confirm no unrelated regression:

```
npm run lint          # clean
npm run typecheck     # clean
npm --workspace mobile run test:unit   # 97 suites, 1279 tests passed
npm run format:check  # clean (prettier does not check .md)
```
