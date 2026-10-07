# Batch 3 — Home becomes a dashboard

## What shipped

- `mobile/src/screens/HomeScreen.tsx`: `SyncStatusPill` in the greeting row (SYNC-02); the
  `DraftCard` carousel is gone, replaced by `pickResumeDraft` (the most recently updated
  non-submitted, non-expired survey, only if touched within 48h) driving both the hero CTA
  (HOME-02: "Reprendre *Parcelle X*" primary + "Nouveau relevé" secondary, instead of a CTA frozen
  on "Démarrer un relevé") and a single `SurveyProgressCard` underneath it.
- Alerts (SYNC-03): `pickAlertSurvey` picks the worst survey needing attention (a conflict/blocked
  survey outranks a plain sync error) and the `AppNotice` now carries a distinct message per case —
  a blocked survey never reads "Vérifiez votre connexion" (that bug was already fixed for the
  *status-resolution* function in Phase 2; this is the same fix applied to the *alert copy*, which
  still had the generic connection message) — plus an action: "Voir" opens the survey for a
  conflict, "Réessayer" retries a plain sync error.
- `HomeRoute.tsx`: reads the new `sync-status-context`; `onRetrySurvey` (from `useSurveyActions`)
  and `onOpenSyncStatus` (navigates to the Account tab's Settings screen) added.
- `home.ts`/`components.ts` i18n: `alerts.blockedMessage`/`failedMessage`/`actionView`/
  `actionRetry`, `hero.resume*`; dead `drafts.*` keys removed (the carousel is gone).

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` and
`npm run test:coverage:mobile` — green.
