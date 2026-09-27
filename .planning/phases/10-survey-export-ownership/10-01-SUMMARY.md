# Plan 10-01: On-device PDF export + delete/visibility verification

**Wave:** 1 (single wave)
**Requirements:** REQ-C-pdf-export, REQ-B-manage-published
**Status:** Done

## What changed

### PDF export (REQ-C-pdf-export)

- `mobile/package.json` / `mobile/app.json`: added `expo-print` (`~57.0.2`) and `expo-sharing`
  (`~57.0.22`) via `npx expo install` (SDK-57-compatible versions); `expo-sharing`'s config plugin
  registered in `app.json`.
- `mobile/src/app/survey-pdf-export.ts` (new): `buildSurveyExportHtml` (pure HTML string builder —
  identifying data table + factor/class table + IBP total), `generateSurveyExportPdf` (expo-print,
  no network), `shareSurveyExportPdf` (expo-sharing, returns `false` when no share target exists
  instead of throwing), `exportAndShareSurveyPdf` (composes the two).
- `mobile/src/i18n/fr/survey-export.ts` (new): PDF document strings, its own catalogue section
  (`fr.surveyExport`) since this text is rendered HTML, never an on-screen label.
- `mobile/src/i18n/fr/survey-detail.ts`: `actions` section gained `exportPdf`/`exportingPdf`/
  `exportFailed`/`exportShareUnavailable`.
- `mobile/src/screens/survey-detail/DetailActions.tsx`: new "Exporter en PDF" button (secondary
  variant, `share-outline` icon, `loading` state while generating) next to the existing delete
  button; `Alert.alert` on failure or "no share target".
- `mobile/src/screens/SurveyDetailScreen.tsx`: computes `exportData: SurveyExportData` once (site
  name, parcel ids, observation year, version number, method version, date, scores, factor entries)
  from data already in scope (`detail`, `localDraftMeta`, `displayedScores`,
  `displayedFactorEntries`), reusing the screen's existing draft/canonical merge logic rather than
  duplicating it.
- `mobile/src/screens/survey-detail/useLocalDraftSummary.ts`: `LocalDraftMeta` gained
  `parcel_ids`/`observation_year`/`version_number`, read straight from the local draft payload —
  the offline fallback source for `exportData` when the canonical detail hasn't loaded.
- **Offline correctness for `observation_year`/`version_number` (D-01)**, since the mobile app never
  writes these itself (server-assigned) and they previously lived only in an in-memory,
  per-session cache:
  - `mobile/src/storage/types.ts`: `SurveyQueuePayload` gained `observation_year?: number` /
    `version_number?: number`.
  - `mobile/src/storage/sync.ts`: `buildSurveyPayloadFromRemote` now copies both fields from a
    downsynced `RemoteSurvey` (they were silently dropped before).
  - `mobile/src/storage/surveys.ts`: new `cacheSurveyCanonicalFields(surveyId, fields)`, a
    best-effort merge into local `payload_json` (never touches `payload_completion`).
  - `mobile/src/hooks/useSurveySync.ts`: `handleLoadCanonicalDetails` calls
    `cacheSurveyCanonicalFields` after every successful online detail fetch, wrapped so a caching
    failure (or, in a test double, a missing mock) can never be mistaken for a detail-load failure.

### Verification (no code change)

- **REQ-B-manage-published**: already fully built — `DetailActions.tsx`'s delete button →
  `confirmDeleteSurvey`'s `Alert.alert` confirmation → `queueDeleteSurvey`, which deletes the
  `local_surveys` row synchronously (survey disappears from the list immediately, sync to the
  server happens after). `REQUIREMENTS.md`'s "Partial" note was stale (it described the Phase-2
  visibility-toggle removal, not this flow); corrected to Built.
- **Roadmap criterion 5** (no visibility control anywhere): re-confirmed. `SurveyListScreen`'s
  `visibilityFilter` props are unused and unrendered; `SurveyDetailScreen`'s only remaining
  `survey.visibility` read feeds `DebugTab`'s dev-only flag.

## Tests

- `mobile/src/app/survey-pdf-export.test.ts` (new): HTML content (identifying data, factor
  classes, IBP total, escaping), placeholder fallbacks, `generateSurveyExportPdf`/
  `shareSurveyExportPdf`/`exportAndShareSurveyPdf` against mocked `expo-print`/`expo-sharing`.
- `mobile/src/screens/survey-detail/DetailActions.test.tsx` (new): delete wiring, retry/discard
  visibility, export success/share-unavailable/failure paths.
- `mobile/src/storage/surveys.canonical-fields.sqlite.test.ts` (new): `cacheSurveyCanonicalFields`
  against real SQLite (partial writes, missing survey id, `payload_completion` untouched).
- `mobile/src/storage/sync.pull.sqlite.test.ts`: two new cases for `observation_year`/
  `version_number` surviving a downsync (present and absent).
- `mobile/src/hooks/useSurveySync.test.ts`, `.logout-purge.test.ts`, `src/state/contexts.test.tsx`,
  `src/state/render-counts.test.tsx`: updated `../storage/surveys` mocks to export
  `cacheSurveyCanonicalFields`; added two `handleLoadCanonicalDetails` cases (caches the fields on
  success; a caching failure never surfaces as a load failure).
- `mobile/src/screens/survey-detail/ScoringContextEditor.test.tsx`: `LocalDraftMeta` test literal
  updated for the three new fields.
- `mobile/src/i18n/catalogue.test.ts`: `surveyExport` added to the expected section list.

## Verification

```
npm run lint                    # clean — mobile, api, ibp-domain
npm run typecheck               # clean — ibp-domain, mobile, api build
npm run test:unit               # ibp-domain 9/9, api 32/32 (752 tests), mobile 112/112 (1382 tests)
npm run format:check            # clean
npm --workspace mobile run test:unit:coverage   # coverage thresholds pass (used by CI's unit-mobile job)
```
