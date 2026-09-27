---
phase: 10
slug: survey-export-ownership
status: complete
created: 2026-09-27
---

# Phase 10 — Validation

**PR**: opened from branch `claude/phase-10-survey-export-ownership`, draft, watched for CI/review.

## Test infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Mobile: Jest 29 + ts-jest, `react-test-renderer`. API/ibp-domain unaffected by this phase (mobile-only change) |
| **Full local gate** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green |
| **Coverage** | `npm --workspace mobile run test:unit:coverage` (what CI's `unit-mobile` job actually runs) — thresholds pass |
| **CI** | Not run by this session directly; the PR's own GitHub Actions run is the CI record, watched via the PR subscription |

## Success criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | From a survey's detail, the surveyor generates a PDF on the device and sends it through the OS share sheet to any installed target | ✅ Done | `DetailActions.tsx`'s "Exporter en PDF" button → `exportAndShareSurveyPdf` (`survey-pdf-export.ts`) → `expo-print` (`printToFileAsync`) → `expo-sharing` (`shareAsync`, any registered target — Drive, Wimi, mail, AirDrop are all OS share-sheet targets, none special-cased) |
| 2 | Works in airplane mode: PDF produced and shared with no API call | ✅ Done | `survey-pdf-export.ts` calls only `expo-print`/`expo-sharing`, no `fetch`/`apiRequest`. Identifying data sourced from data already loaded on device (`SurveyDetailScreen`'s `exportData`); `observation_year`/`version_number` (server-assigned, previously only in an in-memory per-session cache) are now cached into local `payload_json` whenever fetched online (`cacheSurveyCanonicalFields`) and copied through on downsync (`buildSurveyPayloadFromRemote`), so they survive an app restart offline. When genuinely never cached, the PDF shows "—" rather than blocking the export |
| 3 | PDF contains site, parcel ids, observation year, version, date, the ten factor scores and the IBP total | ✅ Done | `buildSurveyExportHtml` — identity table (site/parcels/year/version/date/method) + factor table (all 10 `FACTOR_KEYS`, class label matching the on-screen `FactorTile` convention) + IBP total/stand/context. Unit-tested in `survey-pdf-export.test.ts` |
| 4 | Surveyor deletes their own survey behind a confirmation step; it disappears from their list | ✅ Already built, verified | `DetailActions.tsx` → `confirmDeleteSurvey` (`useSurveySyncSurveyOperations.ts`) shows an `Alert.alert` confirmation, then `queueDeleteSurvey` deletes the `local_surveys` row synchronously — no code change needed; `REQUIREMENTS.md`'s stale "Partial" note corrected |
| 5 | No private/public visibility control anywhere in the app | ✅ Done in Phase 2, re-verified | `SurveyListScreen`'s `visibilityFilter` props are unused/unrendered; `SurveyDetailScreen`'s remaining `survey.visibility` read only feeds `DebugTab`'s dev-only flag, never a user-facing control |

## Deviations from the roadmap's literal wording, and why

None. Criterion 2's "no API call" is read as "the export action itself performs no network
request" (confirmed: `survey-pdf-export.ts` has no `fetch`/`apiRequest` import), combined with a
best-effort local cache so the specific fields the roadmap calls out (observation year, version)
are actually available offline in the realistic case (a survey submitted and viewed at least once
online) rather than only in the degenerate case where the app process never restarted.

## Known remaining gap

If a submitted survey's canonical detail was **never** fetched online in any app session since it
was created (e.g. downsynced from a server response that itself omitted the fields, or created and
submitted entirely offline and never opened again while connected), `observation_year`/
`version_number` show "—" in the PDF rather than the real value. This is a genuine data-availability
gap, not a bug in this phase's code — the mobile app has no other source for server-assigned
fields. It does not block any success criterion (the PDF is still produced and shared, with the
other identifying fields intact) and is left as a known limitation rather than widening this
phase's API scope.
