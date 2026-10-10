---
phase: 19-survey-export-ownership
verified: 2026-10-06T21:35:47Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "The PDF contains the ten factor scores"
    reason: "Owner decision 2026-10-07: the ten factor values in the PDF are the class labels (S1, S2 ...), as 19-CONTEXT.md D-02 decided. ROADMAP criterion 3 reworded; no code change."
    accepted_by: owner
    accepted_at: "2026-10-07"
human_verification:
  - test: "On a real phone, open a submitted survey, tap the share button in the header, and send the PDF to Mail, Files or Drive. Repeat in airplane mode after an app restart, on a survey that was opened once while online."
    expected: "The share sheet opens with a PDF that shows site, parcels, observation year, version, date, ten factors and the IBP total. In airplane mode the PDF is still produced and year and version are still filled in (not a dash)."
    why_human: "expo-print and expo-sharing are mocked in every test. The OS share sheet and the offline restart cannot be run from Jest. The owner's phone passes closed OA-48 (the button's prominence) on 2026-10-06 but record nothing about the PDF content or airplane mode."
---

# Phase 10: Survey Export & Ownership Verification Report

**Phase Goal:** The surveyor can get a survey out of the app and clean up their own surveys, with no network and no back-office.
**Verified:** 2026-10-06T21:35:47Z
**Status:** human_needed (no blocking code gap; one product decision on factor scores and one device-only check)
**Re-verification:** No, initial verification

**Context that matters for reading this report.** Phase 10 shipped on 2026-09-27 with an "Exporter en PDF" button in `DetailActions.tsx`. The survey page was then redesigned (Phase 12.1, OA-46 to OA-50): the export is now the "Partager" button of the screen header, and `DetailActions.tsx` only shows the sync-error notice. The ROADMAP and VALIDATION wording still names the old button. I verified the criteria against the code on branch `claude/roadmap-seeds-16a6af` (HEAD `0fb6d2f`).

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | From a survey's detail, the surveyor generates a PDF on the device and sends it through the OS share sheet to any installed target. | ✓ VERIFIED (button moved) | `survey-pdf-export.ts` builds an HTML document, renders it with `Print.printToFileAsync({ html, base64: false })` and passes the file to `Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle })`; it returns `false` (not an exception) when `Sharing.isAvailableAsync()` is false. No target is special-cased, so any registered share target works. `SurveyDetailScreen.tsx` imports it, builds `exportData` once from `data.parcelIds`, `detail`, `data.localDraftMeta`, `data.displayedScores` and `data.displayedFactorEntries`, and `handleShare` calls `exportAndShareSurveyPdf(exportData)` with an `Alert` for "no target" and for failure. `handleShare` is handed to `useSurveyDetailHeader` as `onShare`: on iOS a native header button (`square.and.arrow.up`), elsewhere a `share-outline` icon button. `expo-print ~57.0.2` and `expo-sharing ~57.0.22` are in `mobile/package.json`; `expo-sharing` is in the `app.json` plugins. The literal button "Exporter en PDF" and its `loading` state no longer exist (removed with the redesign; `fr.surveyDetail.actions.exportPdf` is gone), so the roadmap's file reference to `DetailActions.tsx` is stale. The header wiring has no unit test (`useSurveyDetailHeader` and the `handleShare` path are not covered; only the export module is). The OS side is a human check. |
| 2 | The export works in airplane mode: the PDF is produced and shared with no API call. | ✓ VERIFIED (code and storage); airplane run is a human check | `grep fetch\|apiRequest mobile/src/app/survey-pdf-export.ts` finds nothing; the module imports only `expo-print`, `expo-sharing`, the domain `FACTOR_KEYS`, the i18n catalogue and a type. The two server-assigned fields are cached locally: `cacheSurveyCanonicalFields` (`storage/surveys.ts:330`) merges `observation_year` and `version_number` into `payload_json` inside a transaction (typed fields only, never touches `payload_completion`); `handleLoadCanonicalDetails` in `useSurveySync.ts:399` calls it after every successful online detail load, in a swallowed microtask so a cache failure cannot become a load failure; `buildSurveyPayloadFromRemote` (`storage/sync.ts:446`) copies both fields on downsync; `useLocalDraftSummary.ts:137` reads them back as `LocalDraftMeta`, and `exportData` falls back to them when `detail` is not loaded. Tests that pass here: `surveys.canonical-fields.sqlite.test.ts` (real SQLite), the two downsync cases in `sync.pull.sqlite.test.ts` (fields present and absent), and the `handleLoadCanonicalDetails` cases in `useSurveySync.test.ts`. Known and documented limit (19-VALIDATION.md): a survey never loaded online shows a dash for year and version; the PDF is still produced. |
| 3 | The PDF contains the survey's identifying data (site, parcel ids, observation year, version, date), the ten factor scores and the IBP total. | ? UNCERTAIN (WARNING, decision requested) | `buildSurveyExportHtml` writes a table with site, parcel ids (or "Non renseignée"), observation year, version, date (`submitted_at ?? created_at`, French long format) and the method; the IBP total as "N / 50" plus stand "/ 35" and context "/ 15" from `IBP_MAX`; then one row for each of the ten `FACTOR_KEYS` with the factor title and `selected_class` ("Non renseigné" when empty). Every text is HTML-escaped (tested). `survey-pdf-export.test.ts` passes (HTML content, placeholders, escaping, generate, share, compose). **What is arguable:** the per-factor value is the class label (for example `S2`), not points. D-02 chose that to mirror the then on-screen tile. After Phase 12.1 the score page (`FactorsList.tsx`) shows `score_points` of 5 for each factor and not the class, so the PDF no longer matches the screen, and "factor scores" read literally means points. The total and subtotals are numeric, so the PDF is usable, but the criterion's wording is only satisfied under the class-label reading. See human verification 1. |
| 4 | The surveyor deletes their own survey behind a confirmation step, and it disappears from their list. | ✓ VERIFIED | The delete entry sits in the "..." menu of the header (`useSurveyDetailHeader.tsx`: native iOS menu item, or `AppActionSheet` opened by `onOpenMenu` elsewhere) and calls `onDeleteSurvey(selectedSurvey.id)`, which `SurveyDetailRoute`, `SurveyListRoute` and `SurveySearchRoute` all bind to `actions.confirmDeleteSurvey`. That function (`useSurveySyncSurveyOperations.ts:355`) shows `Alert.alert` with a cancel and a destructive confirm, and only on confirm calls `queueDeleteSurvey`. `queueDeleteSurvey` (`storage/surveys.ts:239`) runs in one transaction: it clears the survey's queued operations, enqueues an idempotent `survey_delete`, deletes the survey's `local_attachments` and the `local_surveys` row, then removes the attachment files. The list refreshes (`refreshLocalSurveys`) and the open detail screen closes (`onCloseSurveyDetail`) when the delete was queued. Server removal follows through the sync queue (`maybeAutoSync("survey-delete-queued")`). |
| 5 | No private/public visibility control is presented anywhere in the app. | ✓ VERIFIED | No `.tsx` file renders a visibility control: the only `visibility` mentions in screens are `SurveyDetailScreen.tsx:226` (a boolean for the dev-only `DebugTab`, shown only when `shouldShowDevTools()`) and the state plumbing in `AppStateProvider.tsx` (`toggleVisibility`, `visibilityFilter`). `grep toggleVisibility\|setVisibilityFilter\|visibilityFilter` outside `state/` and `hooks/` finds only `app/survey-logic.ts` (a filter default) and `app/types.ts` (a type). The Phase 12.1 search page has status and "with photos" chips only. The visibility status strings in `i18n/fr/status/survey-ops.ts` are reachable only through `handleToggleVisibility`, which no screen calls (dormant, matching the "column dormant server-side" decision for `REQ-C-privacy-choice`). |

**Score:** 4/5 truths verified, 1 uncertain, 0 behavior-unverified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/src/app/survey-pdf-export.ts` | HTML builder, `generateSurveyExportPdf`, `shareSurveyExportPdf`, `exportAndShareSurveyPdf` | ✓ VERIFIED | 147 lines, imported by `SurveyDetailScreen.tsx` |
| `mobile/src/i18n/fr/survey-export.ts` | PDF strings in their own catalogue section | ✓ VERIFIED | `fr.surveyExport`, no em dashes, French accents fixed in `426c7e9` |
| `mobile/src/storage/surveys.ts` (`cacheSurveyCanonicalFields`) | Offline cache of year and version | ✓ VERIFIED | Called from `useSurveySync.ts` |
| `mobile/src/storage/sync.ts`, `types.ts` | Downsync keeps year and version | ✓ VERIFIED | Lines 446-448, 96-97 |
| `mobile/src/screens/survey-detail/useSurveyDetailHeader.tsx` | Share button and "..." menu | ✓ VERIFIED (replaces the old `DetailActions` button) | Wired in `SurveyDetailScreen.tsx` |
| `mobile/src/screens/survey-detail/DetailActions.tsx` | Originally export and delete buttons | ✓ VERIFIED (changed) | Now only the sync-error notice, retry and discard |
| `mobile/package.json`, `mobile/app.json` | `expo-print`, `expo-sharing` and its plugin | ✓ VERIFIED | Present |
| Tests: `survey-pdf-export.test.ts`, `surveys.canonical-fields.sqlite.test.ts`, `DetailActions.test.tsx` | Exist and pass | ✓ VERIFIED | 3 suites, 13 tests passed here |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Header share button | `exportAndShareSurveyPdf` | `useSurveyDetailHeader` `onShare`, then `handleShare` | WIRED | Not covered by a test |
| `exportAndShareSurveyPdf` | OS share sheet | `Print.printToFileAsync`, `Sharing.shareAsync` | WIRED | Mocked in tests |
| `handleLoadCanonicalDetails` | local `payload_json` | `cacheSurveyCanonicalFields` | WIRED | Best-effort, tested |
| Downsync | local `payload_json` | `buildSurveyPayloadFromRemote` | WIRED | Tested |
| Header "..." menu | `queueDeleteSurvey` | `confirmDeleteSurvey` alert | WIRED | Same function from list and search |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| PDF identity table | `observationYear`, `versionNumber` | `detail` (online) or local payload cache | Yes, or a dash when never loaded | ✓ FLOWING |
| PDF scores | `displayedScores`, `displayedFactorEntries` | `useSurveyDetailData`, from the draft payload or canonical detail, computed by `@cortege/ibp-domain` | Yes | ✓ FLOWING |
| PDF factor rows | `selected_class` | `DisplayedFactorResult` | Yes (class only, see truth 3) | ⚠️ PARTIAL |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Export module, SQLite cache and action tests | `npx jest -c jest.unit.config.js src/app/survey-pdf-export.test.ts src/storage/surveys.canonical-fields.sqlite.test.ts src/screens/survey-detail/DetailActions.test.tsx` (from `mobile/`) | 3 suites, 13 tests passed | ✓ PASS |
| Mobile typecheck | `npx tsc --noEmit -p .` (from `mobile/`) | no output (clean) | ✓ PASS |
| No network call in the export module | `grep -n "fetch\|apiRequest" mobile/src/app/survey-pdf-export.ts` | no match | ✓ PASS |

I did not run the full unit suite, lint or any E2E.

### Probe Execution

No probes declared and `scripts/*/tests/probe-*.sh` does not exist. Skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REQ-C-pdf-export | 10-01 | PDF generated on device, delivered through the OS share sheet, works offline, no API endpoint | ✓ SATISFIED (see truth 3 note) | Truths 1, 2, 3 |
| REQ-B-manage-published | 10-01 | Delete own survey with a confirmation, it leaves the list; visibility toggle removed | ✓ SATISFIED | Truths 4, 5 |

No orphaned requirements. Info: the traceability table in `.planning/REQUIREMENTS.md` (lines 268-269) still lists the status columns as "New" and "Partial" for these two IDs, although the checklist above it is ticked.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/src/app/survey-pdf-export.ts` | 62-66 | The factor row shows the class label only, while the score page shows points. | ⚠️ Warning | See truth 3 and human check 1. |
| `mobile/src/screens/SurveyDetailScreen.tsx` | 90-100 | `handleShare` and the header wiring (`useSurveyDetailHeader`) have no unit test. A broken `onShare` would pass the suite. | ⚠️ Warning | The export module is well tested; the entry point is not. |
| `.planning/ROADMAP.md`, `19-VALIDATION.md` | Phase 10 section | They name the "Exporter en PDF" button in `DetailActions.tsx`, which moved to the header. | ℹ️ Info | Documentation drift only. |
| `mobile/src/hooks/useSurveySync.ts` | 394-404 | The cache write swallows every error (`.catch(() => {})`). | ℹ️ Info | Deliberate (never fail a load), but a persistent failure would silently leave dashes in the offline PDF. |

A grep for `TBD|FIXME|XXX|TODO|HACK` in `survey-pdf-export.ts`, `SurveyDetailScreen.tsx` and `useSurveyDetailHeader.tsx` found nothing.

### Human Verification Required

#### 1. Per-factor points in the PDF

**Test:** Export a submitted survey and compare the factor table with the score page.
**Expected:** The owner decides: class labels are enough, or the PDF should also give the points ("3 / 5") the survey page shows.
**Why human:** Product decision on the wording "ten factor scores". Not a defect in the code as built to D-02.

#### 2. Share sheet and airplane mode on a device

**Test:** Share a PDF from a submitted survey to a real target; repeat in airplane mode after a restart, on a survey opened once online.
**Expected:** PDF opens with all identifying data filled in.
**Why human:** The OS share sheet and an offline restart cannot be exercised from Jest.

### Gaps Summary

There are no blocking code gaps. The phase goal holds: a PDF is generated on the device through `expo-print` and handed to `expo-sharing` with no network call, the server-assigned year and version are cached locally so they survive an offline restart (tested against real SQLite), and a surveyor deletes a survey behind a confirmation with an immediate local removal.

Two things changed since the phase closed. The export entry point moved from a button in the action card to the header's "Partager" button (Phase 12.1), which is a satisfied-differently case rather than a regression. And the survey page now shows factor points where the PDF still prints class labels, so criterion 3 is verified only under the D-02 reading; I left it as UNCERTAIN so the owner decides. The status is `human_needed` for that decision and the one device-only check. Suggested low-cost follow-ups: add `score_points` to the factor rows of the PDF, add a test for the header share wiring, and update the ROADMAP and VALIDATION wording.

---

_Verified: 2026-10-06T21:35:47Z_
_Verifier: Claude (gsd-verifier)_

## Update 2026-10-10

The share-sheet check is D-09 of `docs/user-tests/device-checks.md`. The export was rebuilt in Phase 25.1 and is reworked again in Phase 36, so the check is run on the current export and repeated after Phase 36. Status stays `human_needed` until then.

**Closed 2026-10-10:** the owner shared the PDF of a submitted survey on their iPhone, online and then in airplane mode after an app restart, and it opened with the expected content (check D-09, run on the Phase 25.1 export that replaced this one). The Android share sheet and the export after Phase 36 are tracked in `docs/user-tests/device-checks.md`; they no longer hold this phase open. Status is now `passed`.
