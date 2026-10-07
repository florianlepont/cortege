# Plan 02-02: Mobile — Explorer map auth, parcel history tap-through, report removal

**Wave:** 2 (merged with wave 4's report removal, since both touch `PublicMapScreen`/`public-map/*` and splitting them would have meant a broken intermediate commit)
**Requirements:** REQ-B-own-surveys-map (client half), criterion 6 (parcel tap-through), criterion 3 (report removal)
**Status:** Done

## What changed

### Auth on the map/parcel-status client (criterion 1, client half)

- `mobile/src/api/ibp-api.ts`: `fetchPublicMapItems` and `fetchPublicParcelStatuses` now take a required `accessToken` and send it like every other authenticated call.
- `mobile/src/hooks/usePublicMapExplorer.ts`: takes `accessToken`; both loaders no-op without one.
- Every other caller of the two functions needed the same token, since the API now rejects them unauthenticated: `mobile/src/hooks/useNearbyParcels.ts` (Home's sector card), `mobile/src/hooks/useParcelStatuses.ts` (survey detail's map preview, parcel selection, the survey-form map). The token is threaded from `useAccessToken()` down through the route wrappers (`SurveyDetailRoute`, `ParcelSelectionRoute`, `SurveyFormRoute`, `PublicMapRoute`) to the screens/hooks that need it — matching the existing "routes read context, screens take props" convention. `AppStateProvider.tsx` passes `surveySync.accessToken` into `useNearbyParcels`.

### Parcel history tap-through (criterion 6)

- New shared pieces, reused as-is by survey detail in the next plan:
  - `mobile/src/app/types.ts`: `ParcelSurveyHistoryItem`/`ParcelSurveyHistoryResponse`.
  - `mobile/src/api/ibp-api.ts`: `fetchParcelSurveyHistory(apiUrl, accessToken, parcelId, limit?)` → `GET /parcels/:parcelId/surveys/history`.
  - `mobile/src/app/ibp-scoring.ts`: `computeIbpTotalDelta`/`computeFactorDeltas` — arithmetic only (`current - previous`) on scores the package already computed, not a re-implemented rule.
  - `mobile/src/hooks/useParcelSurveyHistory.ts`: loads history for a parcel id, cleared when either the id or the token is missing.
  - `mobile/src/i18n/fr/parcel-history.ts`: new catalogue section, registered in `mobile/src/i18n/fr/index.ts`.
- `mobile/src/components/ParcelOverlayPolygons.tsx` already supported an `onParcelPress` prop (used by the survey-creation map); `MapCanvas.tsx` now wires it through as `onSelectParcel`.
- `PublicMapScreen.tsx`: a tap on a `studied` parcel opens `ParcelHistoryCard` (new component, `screens/public-map/ParcelHistoryCard.tsx`) showing the parcel's previous submitted surveys oldest-first with each one's IBP total and its delta against the previous entry. A tap on a `not_studied` parcel does nothing, matching the "studied" gate the roadmap describes. Selecting a survey marker and selecting a parcel are mutually exclusive (one closes the other). Since another member's submitted survey has no local copy to open a full detail view for (the API's `GET /surveys/:id` stays owner-scoped — out of this phase's API boundary), history is the deliverable this criterion can reach without widening the API surface.

### Report entry point removed (criterion 3)

- Deleted from `mobile/src/screens/public-map/SelectedSurveyCard.tsx`: the report button, the inline report form and its state; the card is now a pure summary (method, place, date, "this is your own survey" notice).
- Deleted `handleReportSurvey` from `mobile/src/hooks/survey-sync/useSurveySyncNetwork.ts`, its exposure through `mobile/src/state/sync-actions-context.ts` and `mobile/src/hooks/useSurveySync.ts`.
- Deleted `createSurveyReport`/`CreateReportResponse` from `mobile/src/api/ibp-api.ts`.
- Removed the report-only styles from `mobile/src/screens/public-map/styles.ts` and the report strings from `mobile/src/i18n/fr/public-map.ts`.
- `api/src/reports/` is untouched, as the roadmap specifies — it stays reachable by direct API call for a future moderation UI.
- While in `public-map.ts`, corrected copy that called the map "public"/described survey markers as "relevé public": the map is member-only now, not anonymous-public, so the wording said something false. Updated `count`, `empty`, `filters.subtitle`, `selected.title`, `clusterList.subtitle` and the two a11y label builders.

## Tests

- Updated every existing test that called the now-authenticated client functions or relied on the report UI: `ibp-api.test.ts` (added a `fetchParcelSurveyHistory` case), `useNearbyParcels.test.ts`, `useParcelStatuses.test.ts`, `usePublicMapExplorer.test.ts`, `useSurveySyncNetwork.test.ts`, `useSurveySync.test.ts`, `PublicMapScreen.test.tsx`, `markers.test.tsx`, `routes.test.tsx`.
- New behavioral coverage: a no-token guard test in `useNearbyParcels.test.ts` and `useParcelStatuses.test.ts`; a `PublicMapScreen.test.tsx` case that taps a studied vs. not-studied parcel and asserts the history card opens/doesn't, plus a case proving the report button is gone even for someone else's survey.
- `mobile/src/i18n/catalogue.test.ts` and `mobile/src/screens/public-map/markers.test.tsx`'s "singular and plural forms" test updated for the new `parcelHistory` section and the de-"public"-ified copy.

## Verification

```
npm run typecheck               # clean (domain + mobile + api build)
npm run lint                    # clean, all three workspaces
npm --workspace mobile run test:unit   # 93 suites, 1267 tests passed
npm --workspace api run test:unit      # 32 suites, 745 tests passed (unaffected, run for safety)
npm run format:check            # clean (after prettier --write on 6 files)
```

## Follow-on

- Survey detail (`SurveyDetailScreen`) now carries an `accessToken` prop but does not use it yet, and its own visibility toggle is unchanged — both land in the next plan (02-03), which reuses `useParcelSurveyHistory`/`computeIbpTotalDelta` built here.
- Account deletion entry point (criterion 4) and the remaining UX-audit Lot 0 bugs (criterion 8) are separate plans.
