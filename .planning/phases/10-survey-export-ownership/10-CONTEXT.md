# Phase 10: Survey Export & Ownership — Context

**Gathered:** 2026-09-27
**Status:** Ready for execution
**Source:** `.planning/ROADMAP.md` "Phase 10" section (5 success criteria, criterion 5 already struck
through as done in Phase 2), `.planning/REQUIREMENTS.md` (`REQ-C-pdf-export`, `REQ-B-manage-published`).

## Scope boundary

In scope: `mobile/src/screens/SurveyDetailScreen.tsx` and `survey-detail/DetailActions.tsx` (the
action bar), a new `mobile/src/app/survey-pdf-export.ts` module, a new `surveyExport` i18n section,
and the small local-storage extension needed to read a submitted survey's server-assigned
`observation_year`/`version_number` with no network call. `expo-print` and `expo-sharing` added to
`mobile/package.json` (SDK-57-compatible versions via `npx expo install`, no config plugin needed
for `expo-print`; `expo-sharing`'s plugin was added to `app.json` automatically).

**Out of scope:** the survey detail score display itself (Phase 7, running in parallel, owns
`IbpFactorBars`) — this phase only adds a new action button and reads data already computed by the
screen (`displayedScores`, `displayedFactorEntries`, `activeSiteName`), never touches how scores are
rendered. No API endpoint, no Drive OAuth integration (roadmap criterion 1's own constraint).

## Findings that shaped the plan

- **REQ-B-manage-published was already built**, not "Partial" as `REQUIREMENTS.md`'s stale note
  claimed (the note described the Phase-2-era visibility-toggle removal, not this requirement's own
  delete flow). `DetailActions.tsx` already had a delete button; `confirmDeleteSurvey` in
  `useSurveySyncSurveyOperations.ts` already shows an `Alert.alert` confirmation (Annuler/Supprimer,
  destructive style) before calling `queueDeleteSurvey`, which deletes the `local_surveys` row
  **synchronously inside the same transaction** — so the survey disappears from the list
  immediately, before any network round-trip. Verified via `mobile/src/storage/surveys.ts`
  (`queueDeleteSurvey`, ~line 239). No code change needed for this requirement; only the
  `REQUIREMENTS.md` status line is corrected.
- **Roadmap criterion 5 (no visibility control) is confirmed still true**, not re-verified from
  scratch: `SurveyListScreen`'s `visibilityFilter`/`setVisibilityFilter` props are unused
  (`_`-prefixed, per the lint convention for intentionally-unused params) and unrendered;
  `SurveyDetailScreen`'s only remaining `survey.visibility` read feeds `DebugTab`'s dev-only
  `publishableOnPublicMap` flag, not a user-facing control. Phase 2 already removed the toggle
  (`DetailActions`/`DetailHeader`) and its D-01 decision keeps the column dormant server-side.
- **D-01, observation year and version number are not stored locally today.** The mobile app never
  writes `observation_year`/`version_number` itself (the server assigns them); they exist only in
  the in-memory `surveyDetails` map, populated by `handleLoadCanonicalDetails` on an online fetch
  and lost on app restart. For the PDF to show them **after an app restart in airplane mode**
  (roadmap criterion 2's literal reading, not just "the export call itself makes no request"), two
  small additive changes close the gap:
  1. `buildSurveyPayloadFromRemote` (`storage/sync.ts`) now copies both fields from a downsynced
     `RemoteSurvey` into local `payload_json` (they were silently dropped before).
  2. A new `cacheSurveyCanonicalFields(surveyId, fields)` (`storage/surveys.ts`) is called,
     best-effort, from `handleLoadCanonicalDetails` every time the canonical detail loads online, so
     a survey submitted and viewed at least once while connected keeps these two fields available
     offline afterward. Neither change touches `payload_completion` (that computation never reads
     these fields).
  When truly unavailable (never cached, never fetched this session), the PDF shows "—" rather than
  blocking the export — matching how the app already tolerates a missing `detail` for an
  unsynced-detail submitted survey.
- **`parcel_ids` needed no such fix**: it is already part of `SurveyQueuePayload` and written at
  every draft save, so it survives offline with no change.
- **D-02, per-factor content shown in the PDF is the class label, not a raw numeric score.** The
  on-screen `FactorTile` (`FactorsSection.tsx`) already shows `selected_class` (e.g. `S2`), not
  `score_points`, as "the factor's score" — the PDF mirrors that existing convention exactly rather
  than introducing a second numeric representation the app doesn't otherwise show. `displayedScores`
  (IBP total, stand/context subtotals) already carries the numeric total.
- **D-03, PDF content lives in its own `surveyExport` i18n section**, not `surveyDetail`, since it
  is rendered HTML for `expo-print`, never an on-screen label — mixing the two would make
  `surveyDetail`'s section harder to audit for actual screen text.
- **D-04, no dedicated export screen or dialog.** Per roadmap criterion 1's own framing ("from a
  survey's detail... sends it through the OS share sheet"), the flow is one button in the existing
  actions card (`DetailActions.tsx`): generate → open the OS share sheet. A failure (PDF generation
  or "no share target") surfaces as a single `Alert.alert`, matching the existing pattern for other
  action failures in the same file.

## Package changes

- `expo-print` (`~57.0.2`) and `expo-sharing` (`~57.0.22`) added via `npx expo install` from the
  `mobile` workspace (after `npm install` at the repo root, since neither workspace had
  `node_modules` yet in this environment). `expo-sharing`'s config plugin was appended to
  `app.json`'s `plugins` array automatically; `app.json` was re-run through Prettier afterward since
  the Expo CLI's own JSON writer re-indents arrays that already fit on one line.

## Wave plan

Single wave — the scope is one action button plus its data plumbing, not a multi-screen change.

1. Add `expo-print`/`expo-sharing`.
2. `mobile/src/app/survey-pdf-export.ts` — pure HTML builder (`buildSurveyExportHtml`, unit-tested
   on its own) plus the two side-effecting steps (`generateSurveyExportPdf`, `shareSurveyExportPdf`)
   composed into `exportAndShareSurveyPdf`.
3. Local-storage fix for `observation_year`/`version_number` (D-01).
4. Wire the export button into `DetailActions.tsx`, fed by a `SurveyExportData` computed once in
   `SurveyDetailScreen.tsx` from data already in scope there (`detail`, `localDraftMeta`,
   `displayedScores`, `displayedFactorEntries`, `activeSiteName`).
5. `REQUIREMENTS.md` status correction for `REQ-B-manage-published` (Built, not Partial) and
   `REQ-C-pdf-export` (Built).
6. Phase gate: full test gate, `10-VALIDATION.md`, `ROADMAP.md` checkbox + progress-table row, push,
   draft PR.

## Claude's discretion

- Exact PDF layout (a simple HTML table document, styled inline, no charting) — no design system
  exists for a printed document; the on-screen brand tokens don't apply to a PDF renderer.
- Whether to surface a loading state on the button (`loading` prop, matching `AppButton`'s existing
  API) — done, since PDF generation is not instant on a real device.
