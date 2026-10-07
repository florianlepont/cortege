# Plan 02-01: API — association-only reads

**Wave:** 1
**Requirements:** REQ-B-own-surveys-map (server half)
**Status:** Done

## What changed

- `api/src/surveys/public.controller.ts`: `PublicController` now requires authentication (`@UseGuards(AuthGuard)`), matching every other controller in the API. `GET /public/map-items` and `GET /public/parcels/status` return 401 without a bearer token.
- `api/src/surveys/public-map.queries.ts`: `PUBLIC_SURVEY_PREDICATE` dropped `visibility = 'public'`; every submitted, non-deleted survey is now eligible, for any authenticated member.
- `api/src/surveys/parcels.service.ts` / `parcels.controller.ts`: `GET /parcels/:parcelId/surveys/history` dropped its `(visibility = 'public' OR user_id = $2)` clause — now unconditional on `status = 'submitted'`. The now-unused `user`/`AuthenticatedUser` parameter was removed from the service method and the controller (dead after the clause it fed disappeared).
- `api/migrations/017_association_only_visibility.sql`: drops and recreates `idx_surveys_public_submitted` (migration 015) without the `visibility` predicate, so the planner still uses a partial index instead of a sequential scan against the new query shape.
- The `visibility` column, its CHECK constraint, `PATCH /surveys/:id/visibility` and the sync-payload plumbing are untouched (per `11-CONTEXT.md` D-01): they stay dormant until a future privacy-choice milestone restores `REQ-X-visibility`.

## Tests

- `api/test/parcels.service.spec.ts`: updated for the new `getParcelSurveyHistory(parcelId, limit)` signature.
- `api/test/public-map.service.spec.ts`: SQL-string assertions no longer expect `visibility = 'public'`.
- `api/test/public-map-items.e2e-spec.ts`: added a "requires authentication" case (401 on both routes without a token); rewrote the sharing-model case to prove a **different** authenticated member sees both a public and a private submitted survey (never a draft) — replacing the old "toggle to private hides it" case, which no longer holds.
- `api/test/public-map-bbox.e2e-spec.ts`, `public-map-method-version.e2e-spec.ts`: added an access token to every request; flipped the "private survey excluded" assertions to "private survey included" (it's submitted, so it's shown to any member).
- `api/test/public-routes-explain.e2e-spec.ts`: the "same rows as pre-01.7" parity checks now compare against the legacy queries with the visibility predicate stripped (`dropVisibilityPredicate` helper) — the 10k-row EXPLAIN fixtures and `scripts/explain-public-routes.js`'s own historical "before" baseline are untouched, since that script's job is a frozen performance-history snapshot, not a correctness oracle.
- `api/test/migration-016-ibp-method-version.e2e-spec.ts`: the runner scans the whole migrations directory, so it now also applies 017 in the same run; the assertion was narrowed to "016 immediately follows 015" instead of "016 is the last migration applied."

## Verification

Ran locally against a real PostgreSQL 16 instance (this environment ships one; `docker compose` wasn't available so the DB was started directly and `ibp_test` created to match `.env.test.example`):

```
npm run lint          # clean
npm run typecheck     # clean (ibp-domain + mobile + api build)
npm --workspace api run test:unit   # 32 suites, 745 tests passed
npm run test:e2e      # 33 suites, 208 passed, 3 skipped
npm run format:check  # clean (after prettier --write on public-map.service.spec.ts)
```

## Follow-on

Mobile still calls the two public routes and the history endpoint without an access token / at all — that's wave 2 (`02-02`) and wave 3 (`02-03`).
