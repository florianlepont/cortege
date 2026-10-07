# Phase 2: Association-only sharing & scope trim — Research

**Gathered:** 2026-09-27
**Method:** two parallel Explore agents (API surface, mobile surface), cross-checked against `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md`.

## API surface

### `GET /public/map-items` and `GET /public/parcels/status`

- `api/src/surveys/public.controller.ts` — `PublicController`, no `@UseGuards(...)`, no class decorator at all. Only controller under `api/src/` without `AuthGuard`.
- `api/src/surveys/public-map.service.ts` — both methods take no `user` argument.
- Filtering is in SQL, `api/src/surveys/public-map.queries.ts:11`:
  `const PUBLIC_SURVEY_PREDICATE = "s.status = 'submitted' AND s.visibility = 'public' AND s.deleted_at IS NULL"`.
  Reused in `buildPublicMapItemsQuery` (~L64), `LATEST_PUBLIC_SURVEY_OF_PARCEL` (~L140, feeds both parcel-status queries), `PUBLIC_STUDIED_BY_COMMUNES_SQL` (~L217).
- A partial index `idx_surveys_public_submitted` (migration `015_public_indexes_centroid_columns.sql`) has a predicate string that must **match exactly** what the query uses, or Postgres won't use it. Changing the predicate requires a new migration that replaces the index.
- `api/src/surveys/surveys.module.ts` declares `PublicController` and `PublicMapService`; already imports whatever `AuthModule` the other controllers in the same module use (`SurveysController`, `ParcelsController` both already use `AuthGuard`).

### `visibility` column

- DB: `api/migrations/001_init.sql` — `visibility TEXT NOT NULL DEFAULT 'private'` + `CHECK (visibility IN ('private','public'))`. Only other migration touching it: `015` (the partial index predicate).
- API: `PATCH /surveys/:id/visibility` (`surveys.controller.ts`) → `surveysService.patchSurveyVisibility` (`surveys.service.ts`, several hundred lines of plumbing: upsert paths, `patchSurvey`, `applyVisibilityChange` emitting a `visibility_changed` survey_event, same-version replay handling). Also threaded through sync DTOs and `packages/ibp-domain/src/contract/survey.ts`.
- `api/src/reports/reports.service.ts:191-199` `canReportSurvey` gates on `visibility === "public"`.
- `api/src/surveys/parcels.service.ts:119` — history query gates on `(s.visibility = 'public' OR s.user_id = $2)`.
- Mobile: `mobile/src/screens/survey-detail/DetailActions.tsx` renders the private/public toggle button (`onToggleVisibility` prop); `DetailHeader.tsx` renders the visibility chip; `mobile/src/app/types.ts` has a client-side `visibilityFilter`.

**Decision for this phase:** keep the `visibility` column, constraint, PATCH endpoint and sync plumbing untouched server-side (REQUIREMENTS.md: "Restored with `REQ-C-privacy-choice`" next milestone — ripping out the column would make that a bigger job later for no gain now). Only:
1. drop the `visibility = 'public'` filter from the three public/history read paths so every submitted survey is visible to any authenticated member,
2. require auth on `PublicController`,
3. remove the mobile UI control and its prop plumbing (dead client code, since the column stays but the client no longer offers per-survey choice).

### `reports` module

- Self-contained: `api/src/reports/{reports.controller,service,module,types}.ts`, DTOs. `reports.module.ts` imports only `AuthModule` + `SurveysDataModule`; nothing else in the app imports it. Safe to leave untouched server-side per roadmap criterion 3.
- Mobile call site: `createSurveyReport()` in `mobile/src/api/ibp-api.ts`, invoked by `handleReportSurvey` in `mobile/src/hooks/survey-sync/useSurveySyncNetwork.ts:273-314`, exposed through `mobile/src/state/sync-actions-context.ts`, and rendered by `mobile/src/screens/public-map/SelectedSurveyCard.tsx` (button + inline form), wired from `PublicMapScreen.tsx` / `PublicMapRoute.tsx`. i18n strings in `mobile/src/i18n/fr/public-map.ts` and `mobile/src/i18n/fr/status/sync.ts`.

### `DELETE /me`

- `api/src/users/users.controller.ts` — `@Delete("me")` under `@UseGuards(AuthGuard)`, class already exists and works: anonymizes retained (submitted/synced) surveys (nulls `survey_events.actor_id` then `surveys.user_id`), hard-deletes draft surveys + dependents, deletes the `users` row, then (best-effort, non-blocking, outside the transaction) deletes the Auth0 user and leftover storage objects.
- Mobile client: `deleteMyAccount(apiUrl, accessToken)` **already exists** in `mobile/src/api/ibp-api.ts`, currently only called internally from `mobile/src/hooks/useSurveySync.ts:240` as part of an existing local-reset flow — **no UI button anywhere calls it**.
- No API changes needed for criterion 4 — purely a mobile entry point + confirmation dialog.

### `GET /parcels/:parcelId/surveys/history`

- `api/src/surveys/parcels.controller.ts` → `parcels.service.ts` `getParcelSurveyHistory`. Query already returns full IBP `scores`/`factor_results` per past submitted survey on the parcel, ordered by `observation_year`/`version_number`/`submitted_at` ascending, gated by `(visibility='public' OR user_id=$2)` (point above — becomes unconditional once the visibility gate is dropped).
- No mobile call site exists at all (`grep -rni history mobile/src` finds only unrelated comments). Greenfield mobile work: new `ibp-api.ts` client function + UI.

### Auth guard pattern

- `AuthGuard` (`api/src/auth/auth.guard.ts`) is never global; every controller applies it with a class-level `@UseGuards(AuthGuard)`. `PublicController` is the sole exception. Adding the same line there is the idiomatic fix.

### No membership/association entity

- Zero code hits for "association" as a data concept — no membership table. "Any association member" = "any authenticated user" for this phase; there is no group to join against. Confirmed by the repo owner's framing in ROADMAP.md ("every authenticated member sees every member's submitted surveys").
- `surveys.repository.ts`'s owner-scoped queries (`GET /surveys` own list, `findOwned`) stay as-is — those back the *my surveys* screens, not the member-facing map/history this phase changes.

## Mobile surface

### Explorer / public map

- `mobile/src/screens/PublicMapScreen.tsx` (+ `mobile/src/screens/public-map/*`), route `mobile/src/navigation/routes/PublicMapRoute.tsx`, hook `mobile/src/hooks/usePublicMapExplorer.ts`.
- `mobile/src/api/ibp-api.ts`: `fetchPublicMapItems` / `fetchPublicParcelStatuses` currently take **no access token** at all (true anonymous calls) — contrast with every other client function in the file which takes `accessToken`.
- Tap behaviour today: `PublicMapScreen.handleSelectSurvey` only sets local `selectedItem` state, opening the floating `SelectedSurveyCard` — **no navigation to any detail/history screen exists**.

### Survey detail

- `mobile/src/screens/SurveyDetailScreen.tsx` + `mobile/src/screens/survey-detail/*`.
- Visibility toggle lives in `DetailActions.tsx` (`isPublic = survey.visibility === "public"`, button calling `onToggleVisibility`), chip in `DetailHeader.tsx`. `onToggleVisibility` is threaded as a prop from the state layer.
- No "previous surveys on parcel" section exists; the Events tab (`EventsTab.tsx`) shows only this survey's own lifecycle events, unrelated.

### Report entry point — full removal list

1. `mobile/src/screens/public-map/SelectedSurveyCard.tsx` — remove report state/JSX (own-survey notice + meta display stay).
2. `mobile/src/screens/public-map/styles.ts` — remove `report*` style keys.
3. `mobile/src/screens/PublicMapScreen.tsx` — drop `onReportSurvey` prop.
4. `mobile/src/navigation/routes/PublicMapRoute.tsx` — drop the wiring.
5. `mobile/src/state/sync-actions-context.ts` — remove `handleReportSurvey` from the context type.
6. `mobile/src/hooks/survey-sync/useSurveySyncNetwork.ts` — delete `handleReportSurvey` + `createSurveyReport` import.
7. `mobile/src/api/ibp-api.ts` — delete `createSurveyReport()` + `CreateReportResponse`.
8. `mobile/src/api/ibp-api.test.ts`, `useSurveySyncNetwork.test.ts`, `PublicMapScreen.test.tsx` — drop report-flow assertions.
9. `mobile/src/i18n/fr/public-map.ts`, `mobile/src/i18n/fr/status/sync.ts` — remove report strings.

No dedicated route/modal — it's an inline panel, so no navigation route to delete.

### Compte (Account) screen

- `mobile/src/screens/AccountScreen.tsx` composed of `account/IdentityCard.tsx`, `account/ProfileCard.tsx`, `account/AccountSettingsRows.tsx` (email + password-reset rows, exported `LogoutButton`). **No danger zone / delete-account section exists today.**
- `deleteMyAccount()` client function already exists but is unused by any UI.

### UX audit Lot 0 bugs — current code

- **BUG-03** `mobile/src/app/survey-logic.ts:93-101` `resolveSurveyUiStatus`: checks `status === "submitted"` before `sync_state === "failed"`, so a submitted-but-failed-sync survey reads "Soumis"/green. Consumed by `mobile/src/screens/survey-list/SurveyRow.tsx` (tone + label) and `AttentionSection.tsx`.
- **BUG-04** decimal comma: lives in `mobile/src/hooks/useSurveyForm.ts:122,133` (`numberError`/`oneOfError`, `Number(value)` parsing for factor fields) — **deferred, see CONTEXT.md** (Phase 3 territory).
- **BUG-05** account-deletion copy: nothing exists yet (no deletion UI at all) — write correct copy ("anonymisées", not "supprimées") from scratch alongside the new button; danger zone must not be the first Settings section.
- **BUG-06** status bar: three call sites use RN's own `StatusBar`, not `expo-status-bar`: `mobile/src/navigation/AppNavigation.tsx:46` (`Platform.OS === "android" ? "dark-content" : "light-content"` — iOS always gets light-content regardless of screen), `mobile/src/screens/AuthGateScreen.tsx:152` and `mobile/src/components/TypewriterSplash.tsx:92` (both hardcoded `light-content`, fine since those are dark splash/auth screens).
- **BUG-07** `mobile/src/navigation/tab-config.tsx:33-38` `ANDROID_TAB_ICONS`: `home` and `surveys` both `require("../../assets/tabs/surveys.png")` — no `home.png` asset exists. The JS-tree icon map (`JS_TAB_ICONS`, Ionicons) is already correct; bug is Android-native-tabs only.
- **BUG-08** `mobile/src/screens/HomeScreen.tsx:77` — `<RefreshControl onRefresh={onRefresh} refreshing={false} .../>` hardcoded, unlike `SurveyListScreen.tsx` which threads real state.
- **DS-01/DS-02/DS-14** — all token-level, in `mobile/src/app/brand-tokens.ts`: DS-01 badge contrast (`ui/IbpScoreBadge.tsx`, moss bg / white text at small size), DS-02 warning/danger notice text contrast (`ui/AppNotice.tsx`, `ui/AppButton.tsx` `dangerSoft`, `components/cards/DraftCard.tsx` small text), DS-14 input border contrast (`inputBorder` token, ~1.34:1).

### i18n

`mobile/src/i18n/fr/` — one module per screen/area, plus `status/*` for status-line text. Touches for this phase: `public-map.ts` (remove report strings), `survey-detail.ts` (add history/deltas strings, remove visibility strings), `account.ts` (add delete-account strings), `status/sync.ts` (remove report statuses).
