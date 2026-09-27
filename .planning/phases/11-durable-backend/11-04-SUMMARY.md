---
phase: 11-durable-backend
plan: 04
subsystem: api-lint-db
tags: [eslint, sql-injection, postgresql, explain, indexes]

requires: []
provides:
  - "api/eslint-local-rules/sql-no-unsafe-interpolation.js: custom ESLint rule, loaded via --rulesdir"
  - "evidence/explain-output.txt: EXPLAIN (ANALYZE, BUFFERS) for account deletion and survey list queries"
affects: []

tech-stack:
  added: []
  patterns:
    - "Custom ESLint rules loaded via --rulesdir (api/eslint-local-rules/), no plugin package needed"
    - "SCREAMING_SNAKE_CASE naming is the trust boundary for a lint rule that cannot resolve identifiers across module boundaries"

key-files:
  created:
    - api/eslint-local-rules/sql-no-unsafe-interpolation.js
  modified:
    - api/.eslintrc.json
    - api/package.json
    - api/test/attachments-reports-transactions.e2e-spec.ts
    - api/test/e2e-fault-injection.ts
    - api/test/migration-016-ibp-method-version.e2e-spec.ts

key-decisions:
  - "No off-the-shelf ESLint plugin fits raw-pg template-literal SQL as this codebase writes it; a small purpose-built local rule (via --rulesdir, no new dependency) was the right scope"
  - "Gate requires >=2 SQL-keyword matches in a template literal's static text, not 1: single-keyword false positives came from this codebase's own test ids (e2e-tx-update-..., e2e-delete-...) and an unrelated error message containing the word 'from'"
  - "Three genuine identifier-interpolation findings in test-only helpers (dynamic table name, DDL WHEN clause, dynamic column list) got scoped eslint-disable/eslint-enable with a one-line reason each, not a rule weakening — Postgres cannot bind an identifier as a parameter"
  - "Migration 015 (phase 01.7) had already added idx_survey_events_actor_id and dropped the three redundant indexes; this plan's job was only the lint rule and the EXPLAIN evidence, not a new migration"

requirements-completed: [REQ-QA-sql-injection, REQ-QA-indexes]

duration: ~90min
completed: 2026-09-27
---

# Phase 11 Plan 04: SQL-Injection Lint Rule and Index EXPLAIN Evidence Summary

**A custom ESLint rule now rejects interpolating values into SQL strings across `api/src` and
`api/test`, verified against the real codebase with zero unjustified findings.
`EXPLAIN (ANALYZE, BUFFERS)` evidence against a locally seeded 40 000-survey database confirms
`survey_events(actor_id)` is indexed and used, and that account deletion and the survey list
queries are correctly served without the three indexes migration 015 already dropped.**

## Pre-existing state

`api/migrations/015_public_indexes_centroid_columns.sql` (phase 01.7) already:
- adds `idx_survey_events_actor_id ON survey_events (actor_id) WHERE actor_id IS NOT NULL`;
- drops `idx_users_auth0_sub` (duplicate of the `users_auth0_sub_key` UNIQUE constraint),
  `idx_surveys_parcel_id` (duplicate prefix of `idx_surveys_parcel_year_version`), and
  `idx_survey_parcels_survey_id` (duplicate prefix of the `survey_parcels` primary key).

No migration work was needed. This plan's job was the lint rule (new) and the `EXPLAIN` evidence
the requirement explicitly asks for (not previously produced).

## The lint rule

`api/eslint-local-rules/sql-no-unsafe-interpolation.js`, loaded via ESLint 8's `--rulesdir` flag
(`api/package.json` lint scripts updated; enabled as `"sql-no-unsafe-interpolation": "error"` in
`api/.eslintrc.json`). Full design rationale is in the file's header comment. In short: a template
literal is inspected only once its static text contains at least two SQL-keyword matches (avoids
false positives on this codebase's own test ids and error messages); every interpolated expression
inside it must then be provably one of: a literal, `.length`-based arithmetic, a ternary of two
safe branches, a lookup into a `const` object whose every value is safe, a `.join()` of an array
whose every `.push()`ed element is safe, a locally-resolvable `const`/`let` whose every write is
safe, or a SCREAMING_SNAKE_CASE identifier (this codebase's existing convention for exported SQL
fragment constants such as `SURVEY_EVENT_INSERT_SQL`).

### Verification against the real codebase

Iteratively run against all of `api/src` and `api/test` until every finding was either a genuine
gap in the rule (fixed) or a real, justified exception:

1. First pass: one false positive (`public-map.queries.ts`) traced to a scope-resolution bug — a
   `.push()`ed argument referenced a `const` declared inside a nested `if` block, unreachable by
   walking only `scope.upper`. Fixed by descending into child scopes whose node range encloses the
   argument (`findInnermostScope`).
2. Second pass, full tree: 11 findings, all in `api/test/*.e2e-spec.ts`. Nine were false positives
   from the single-keyword gate matching English inside test ids
   (`e2e-tx-update-${Date.now()}`, `e2e-delete-${Date.now()}`) and an error message containing the
   word "from". Fixed by raising the gate to ≥2 keyword matches.
3. Final pass: 2 remaining findings (4 individual lines), both genuine and both in test-only
   helpers that interpolate an **identifier** (a table name, a dynamic column list), which Postgres
   cannot bind as a query parameter:
   - `attachments-reports-transactions.e2e-spec.ts`'s `countRows(table, ...)` — `table` is always
     a hardcoded literal at each call site.
   - `e2e-fault-injection.ts`'s `CREATE TRIGGER ... WHEN (${whenClause})` — `whenClause` is already
     built from `assertSafeValue`-checked, quote-escaped literals (an existing safeguard from
     T-01.4-05), not from unvalidated input.
   - `migration-016-ibp-method-version.e2e-spec.ts`'s `insertSurvey` helper — dynamic column list
     built from a literal test-authored object, never external input.
   Each got a narrowly-scoped `eslint-disable`/`eslint-enable` (or `eslint-disable-next-line` where
   the whole expression fit one line) with a one-line reason, not a rule change.
4. `api/src` is fully clean under the rule with **zero** exceptions needed.

### Positive control

A hand-written fixture (`db.query(\`SELECT id FROM users WHERE email = '${email}'\`)`) was linted
in isolation with the rule and correctly flagged, confirming the rule actually catches the pattern
it exists to prevent.

## EXPLAIN evidence

Seeded a local PostgreSQL 16 database (native cluster, matching the phase 01.7 local-testing
pattern) with 5 001 users, 40 020 surveys, 40 020 survey_events and 40 020 survey_parcels (plus one
pinned "explain target" user with 20 surveys/events for a realistic account-deletion target), then
ran every query on the account-deletion and survey-list paths inside a transaction rolled back
afterwards (so the seeded data survives for inspection). Full output:
`.planning/phases/11-durable-backend/evidence/explain-output.txt`; seed and query scripts alongside
it. Highlights:

| Query | Plan uses |
|---|---|
| `auth.guard.ts` lookup `WHERE auth0_sub = $1` | `Index Scan using users_auth0_sub_key` (the UNIQUE constraint's own index — not the dropped `idx_users_auth0_sub`) |
| `users.service.ts` `deleteAccount`: `UPDATE survey_events SET actor_id = NULL WHERE actor_id = $1 AND survey_id IN (...)` | `Bitmap Index Scan on idx_survey_events_actor_id` |
| `deleteAccount`: attachment/event/survey deletes on `surveys(user_id)` | `Bitmap Index Scan on idx_surveys_user_status` throughout (no dropped index needed) |
| `deleteAccount`: `DELETE FROM survey_events WHERE survey_id IN (...)` | `Index Scan using idx_survey_events_survey` |
| `GET /v1/surveys` list (`buildListForUserQuery`, `WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC, id DESC`) | `Bitmap Index Scan on idx_surveys_user_status` |
| Parcel-based survey lookup `WHERE parcel_id = ANY($1)` | `Bitmap Index Scan on idx_surveys_parcel_year_version` (the dropped `idx_surveys_parcel_id` was a pure prefix duplicate) |
| `survey_parcels` lookup `WHERE survey_id = $1` | `Index Only Scan using survey_parcels_pkey` (the dropped `idx_survey_parcels_survey_id` was a pure prefix duplicate of the PK) |

No query in this set produced a sequential scan on any seeded table. Every dropped index's job is
demonstrably covered by a surviving index or constraint.

## Verification

- `npm run lint` (root, all three workspaces) clean.
- `npm run format:check` clean after `prettier --write` on the one file whose block-comment
  placement needed re-wrapping.
- `npm run typecheck` clean (the new `.js` rule file is outside every `tsconfig` include).
