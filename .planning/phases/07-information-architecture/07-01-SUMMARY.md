# Batch 1 — Shared components

Four new components from the audit's component table (§6), each built on Phase 4's primitives
and each with a full test file.

## What shipped

- `mobile/src/ui/SyncStatusPill.tsx`: the 4-state pill (offline · N à envoyer · en cours · à jour,
  SYNC-02). `resolveSyncStatusPillState({isOnline, isSyncing, pendingCount})` is exported and unit
  tested on its own: offline always wins, then an in-progress sync, then unsent work. A haptic
  success (`ui/feedback.ts`) fires once on the syncing → up-to-date transition, tracked via a ref so
  it never re-fires on unrelated re-renders.
- `mobile/src/ui/SurveyProgressCard.tsx`: replaces `components/cards/DraftCard.tsx` (deleted) and
  `screens/survey-list/ContinueDraftCard.tsx` (deleted in batch 4) — one card for a draft's
  progress, used on Home's dashboard. Same visual language as the old `DraftCard` (accent bar,
  progress bar, relative time, sync-blocked/pending indicator), `width: "100%"` instead of a fixed
  220pt carousel card.
- `mobile/src/ui/AppGroupedList.tsx`: the iOS grouped-list primitive for Compte (batch 6). Sections
  with an optional title/footer; rows are either `"nav"` (label, optional value, chevron when
  `onPress` is set, `destructive`/`centered` variants for a red isolated row like "Se déconnecter")
  or `"custom"` (arbitrary content, for the email-edit inline form).
- `mobile/src/ui/IbpFactorBars.tsx`: horizontal bars A-J (DET-01), grouped "Peuplement et gestion"
  (A-G) then "Contexte" (H-J) via the package's `STAND_FACTOR_KEYS`/`CONTEXT_FACTOR_KEYS`. Each bar
  is a factor's retained points out of 5 (every factor shares that scale); a missing/null entry
  shows the catalogue's "not filled" placeholder instead of a fabricated zero.
- `AppNotice.tsx` gains an optional `action` prop (SYNC-03: an actionable notice — "Voir",
  "Réessayer" — instead of a dead end), used starting in batch 3.
- `fr.components`: `draftCard` renamed to `surveyProgressCard`; new `ibpFactorBars` and
  `syncStatusPill` sections.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — green.
