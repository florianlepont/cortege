---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 10
subsystem: docs
tags: [documentation, visibility, privacy, contracts, gate]
status: complete
requires:
  - phase: 29-01 to 29-09
    provides: "the built behaviour the documents describe (predicate, migration 024, frozen visibility, finish sheet, guarantee suite)"
provides:
  - "Technical documents aligned with the build (API and data contracts, sync rules, architecture, superseded publication document)"
  - "Specs and CLAUDE.md aligned with the build (US-C7, US-B3, user stories, form spec, survey visibility bullet, submission step)"
  - "Full repository gate result recorded"
affects: [29-10 Tasks 3 and 4]
tech-stack:
  added: []
  patterns:
    - "Docs written from the SUMMARYs and the code, not from the plan's assumptions"
key-files:
  created: []
  modified:
    - docs/technical/api-contract-v1.md
    - docs/technical/data-contract-v1.md
    - docs/technical/sync-conflict-resolution-v1.md
    - docs/technical/publication-visibility-post-submit-v1.md
    - docs/technical/technical-architecture-v1.md
    - docs/specs/epic-c-ibp-survey-data-entry.md
    - docs/specs/epic-b-survey-preparation.md
    - docs/specs/user-stories.md
    - docs/specs/ibp-form-spec.md
    - CLAUDE.md
key-decisions:
  - "D-07 documented as built: per-channel codes (422 on the PATCH channels and visibility_update, 409 survey_submitted_read_only and sync_version_conflict on upserts), with an explicit sentence that this refines CONTEXT D-07"
  - "D-15 documented as built: the visibilityFilter list filter was removed in 29-05; the summary shows a read-only line"
requirements-completed: []
completed: 2026-10-13
---

# Phase 29 Plan 10: Documentation, full gate, device checks and tracking Summary

**All four tasks are done.** Tasks 1 and 2 (documents, specs, CLAUDE.md, full gate) were done by the executor. Tasks 3 and 4 were done afterwards by the orchestrator: the owner approved the device checks DV-29-01 to DV-29-04 on 2026-10-13 (one global approval, no per-check detail) and validated DV-29-04 on the production server on 2026-10-14; the device-check rows, the REQUIREMENTS trace, the ROADMAP (dependency corrected to Phase 11) and STATE were written then. The contracts, sync rules, specs and CLAUDE.md now describe the built private or shared choice, and the full gate shows no failure caused by this phase.

## Accomplishments

### Task 1: technical documents (commit `835492cc`)

- `api-contract-v1.md`:
  - New paragraph "Survey visibility (Phase 29)": values, meaning of `public` (shared with the association, never the open internet), default `public` from the app, absent value on a create stays `private`, frozen at submit, `PUBLIC_SURVEY_PREDICATE` as the only definition, guard `api/test/survey-read-paths.spec.ts`, identical 404 for private, draft, deleted and unknown ids, D-11 note (next version number counts private surveys, `parcel_version_conflict`, only the number leaks), `survey_id_conflict` note.
  - Lifecycle rule: nothing editable after submit; per-channel error table (PATCH and PATCH /visibility 422, equal value 200 no-op on /visibility, upsert higher version 409 `survey_submitted_read_only`, same version 409 `sync_version_conflict`, sync `visibility_update` per-operation `fatal_error` 422) with the sentence that it refines D-07; submit-race note (row lock plus `AND status <> 'submitted'`).
  - `PATCH /surveys/{id}/visibility` is drafts only and owner only; resend and Case B2 text (drafts only); sync rules; reports 404 for a survey the reporter may not read; map inclusion rules; community list, detail (history lists shared surveys only), attachments; search members count shared surveys only; parcel statuses; caller-aware parcel history (`submittedVisibleToCallerSql`); error code entries.
- `data-contract-v1.md`: column meaning, new section 10.3 (migration 024: backfill of submitted surveys, `backfilled` events, restored partial index), consistency rules (read-only after submit, retention keeps visibility, D-11).
- `sync-conflict-resolution-v1.md`: Case B2 for drafts only, submitted case is B3 `sync_version_conflict`, `visibility_update` and upsert refusal codes.
- `publication-visibility-post-submit-v1.md`: banner "Superseded for the post-submit rule by Phase 29", Status, rules, contract delta and test matrix rewritten or struck through.
- `technical-architecture-v1.md`: map read statement true again with the history exception; save-draft flow mentions the `surveyFinish` step.

### Task 2: specs, CLAUDE.md, gate (commit `e4e2b670`)

- Specs: US-C7 rewritten (sheet "Qui peut voir ce relevé ?", "Partagé avec l'association" pre-selected, "Privé", captions quoted exactly from `mobile/src/i18n/fr/survey-finish.ts`, offline button "Enregistrer le choix", frozen after submit, no moderator read path, deferred to V3); US-B3 loses the visibility switch; `user-stories.md` and `ibp-form-spec.md` aligned (default, placement, frozen, wording, never "public" in the UI).
- `CLAUDE.md`: "Survey visibility (Phase 29)" bullet in the API IBP section, "Submission step (Phase 29)" bullet in the mobile Navigation section (SQLite schema still version 5), `024_private_or_public_visibility.sql` in the migrations row, the new suites (`private-visibility`, `private-visibility-retention`, `survey-read-paths`, `migration-024-visibility-backfill`) in the notable suites.

## Task Commits

1. Task 1: `835492cc` (docs)
2. Task 2: `e4e2b670` (docs)

## Gate results (from the repo root, local PostgreSQL `ibp_test`)

| Step | Result |
|------|--------|
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run test:unit` | domain 269 tests pass; API 55 of 56 suites pass (1327 tests); the only failure is `check-env-parity.spec.ts` (50 tests, bash 3.2 on the Mac, known, CI runs it). Because the root script chains with `&&`, the mobile suite was run separately: `npm --workspace mobile run test:unit`, 409 suites, 5969 tests, all pass |
| `npm run format:check` | only `.claude/settings.local.json` (untracked tooling file, ignored per instruction) |
| `npm run test:e2e` (second run) | 47 of 49 suites pass, 356 tests pass; failures are only the two known environmental suites: `list-pagination.e2e-spec.ts` (1 test, timezone) and `migrate-lock.e2e-spec.ts` (2 tests, create database permission) |

Faithful note: the first `npm run test:e2e` run also failed `surveys-method-version.e2e-spec.ts` (1 test, "submits a v3.2 survey with its cas", `socket hang up`). It is not reproducible: the suite alone passes (16 of 16) and the full e2e run repeated once more passed it. Treated as a transient local flake (the HTTP socket), not a regression of this phase; no code changed between the runs. Worth watching in CI.

No file under `packages/**` changed in this plan, so no extra native CI trigger comes from it.

## Differences from the plan's assumptions (trusted the code and SUMMARYs)

- Error codes: the plan's text listed them per channel; the docs follow the built table of 29-06 (PATCH /surveys/:id refuses `visibility` by key presence, even an equal value; PATCH /visibility with the stored value is a 200 no-op).
- `PATCH /surveys/{id}/visibility` was documented as owner only (the code looks the row up as the owner); the older "moderators/admins where applicable" wording was removed.
- Reports: the author still gets 403 on their own survey, moderators and admins keep reporting any live survey (29-04).
- Community detail `history` lists shared surveys only (it uses the predicate), so the contract says so.
- The `visibilityFilter` list filter no longer exists (removed in 29-05), documented as removed rather than kept.
- Per orchestrator instructions, the iOS device build sentence of Task 2 was skipped, and STATE.md, ROADMAP.md and REQUIREMENTS.md were not touched.
- Markdown files are not checked by `format:check` (the script covers only ts, tsx and json), so no Prettier run applied to the documents.

## Deviations from Plan

None beyond the orchestrator overrides above. In two pre-existing lines of `api-contract-v1.md` (the `survey_submitted_read_only` and `submitted_read_only_fields` error code entries) I replaced the old em dash separator by a colon, because those lines were edited and the "no em dash added" check counts them.

## Known Stubs

None.

## Threat Flags

None. T-29-34 (stale docs re-deriving visibility by hand) is mitigated: contract and CLAUDE.md name `PUBLIC_SURVEY_PREDICATE` and `survey-read-paths.spec.ts`.

## Tasks 3 and 4 (closed 2026-10-14)

- Task 3: owner device checks approved on 2026-10-13 (DV-29-01 to DV-29-04, one global approval). DV-29-04 was validated by the owner on the production server on 2026-10-14, after the server updated to commit `647699d9`. DV-29-05 (Android emulator) was not run and moves to Phase 35.
- Task 4: done in commit `633ac20f` (rows DV-29-01 to DV-29-05 in `docs/user-tests/device-checks.md`, `REQ-C-privacy-choice` traced, ROADMAP Depends on Phase 11, STATE). The follow-up fix #301 removed the visibility line of a draft (owner decision 2026-10-14).

## Self-Check: PASSED

- Modified files present: the five technical documents, four specs and `CLAUDE.md`.
- Commits found: `835492cc`, `e4e2b670`.
- Acceptance greps pass: `Superseded for the post-submit rule by Phase 29`, `submittedVisibleToCallerSql`, `survey-read-paths.spec.ts`, `024`, `parcel_version_conflict`, `sync_version_conflict`, `surveyFinish`, `Partagé avec l'association`, zero "There is no private/public choice yet", zero em dash added in `docs/technical`, `CLAUDE.md`, `docs/specs`.
- STATE.md, ROADMAP.md and REQUIREMENTS.md untouched.
