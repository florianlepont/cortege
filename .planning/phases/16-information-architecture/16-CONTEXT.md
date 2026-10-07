---
phase: 16-information-architecture
status: executing
created: 2026-09-27
---

# Phase 7 — Information Architecture: Context

Source: `docs/design/ux-ui-audit-2026-09.md` §3.2 (HOME-01..SYNC-03) and §7 Lot 3.
ROADMAP success criteria: `.planning/ROADMAP.md` "### Phase 7: Information Architecture
(INSERTED, UX audit Lot 3)". Depends on Phase 4 (Visual Foundations & Motion, merged):
`AppPressable`, `Skeleton`/`SkeletonRow`, `brandMotion`, `ui/feedback.ts` are what this phase's
new components (`SyncStatusPill`, `SurveyProgressCard`, `IbpFactorBars`, `AppGroupedList`) build on.

This session executes the phase directly (single agent, no orchestrator/executor split), following
the pattern set by Phase 3/Phase 4: batches, each gated by `npm run lint && npm run typecheck &&
npm run test:unit && npm run format:check`, closed with a `07-0N-SUMMARY.md`.

## Cross-phase coordination

Phase 10 (Survey Export & Ownership) and Phase 8 (Offline Map) were running in parallel. Phase 10
touches `SurveyDetailScreen.tsx`'s action area (PDF export, delete-survey flow) close to but not
overlapping this phase's score-display change. `origin/main` was pulled and merged (fast-forward,
no conflicts) before starting Batch E (survey detail), and again before opening the PR — both
landed by the time this phase reached that point (`bdb2341`, merging PR #174 and #175). Neither
touched the score/factor display this phase changes, and Phase 6/Phase 8 never touched Home, Mes
Relevés, survey detail's score area, or Compte.

## Scope decisions (resolving ambiguity the audit/ROADMAP text leaves open)

- **`SyncStatusPill`'s connectivity/activity state lives in its own context, not the existing
  status-message context.** `status-context.ts` intentionally re-renders only its readers (today:
  Settings) on every status-message update — an unrelated message ("relevé ouvert") must not
  re-render Home or Mes Relevés just because they now show sync state. A new `sync-status-context.ts`
  (`isOnline`, `isSyncing` only) is provided alongside it, following the same narrow-context pattern
  already used for `useAccessToken`/`useNearbyParcelsState`. `useSurveySyncNetwork`/`useSurveySync`
  expose the two booleans; `AppStateProvider` memoises them separately from the status-message value.
- **The pill's "detail sheet" (named in the audit's SYNC-02 recommendation) is not built.** Tapping
  the pill navigates to Settings, which already has the sync actions (manual sync, pull changes,
  advanced refreshes) and is the natural home for that detail. A dedicated bottom sheet is a
  plausible follow-up, not required by the ROADMAP criterion ("visible ... not only in Settings").
- **The survey list row's score (LIST-01) only shows a number for a submitted survey whose canonical
  detail is already cached in `surveyDetails`** (loaded on open, or by the existing auto-load
  effect). Bulk-loading every visible survey's detail just to populate list rows would add a new
  network/DB cost with no success criterion asking for it; a submitted row with no cached score yet
  shows a plain completion ring instead of a fabricated or loading number.
- **Mes Relevés' create card and "à faire" card are removed outright, not folded into the pure
  list.** HOME-01 says Home and Mes Relevés must stop duplicating each other; since Home already
  owns "resume action, alerts, progress" as a dashboard, keeping either card on the list would
  recreate the duplication the criterion is fixing. The list's leading item is reduced to a
  "Résultats" caption, shown only while a search is active.
- **`ListHero` keeps its collapsing-header mechanics (used by the sticky filter bar's positioning
  math) but loses its dashboard content** (the forest-coloured card, stat tiles, dynamic
  "attention"/"up to date" body text, logo ornament, `BrandBump`). It becomes a plain large title
  with an item-count caption, the header "+" and `SyncStatusPill` — visually closer to a native
  large title than a themed hero card, matching "titre large" in the audit's own recommendation text.
- **Compte's "Données" section is one row that opens Settings, not an inlined copy of Settings'
  content.** Settings (`SettingsScreen.tsx`) already covers sync actions, dev tools and account
  deletion, is well-tested, and isn't named as needing changes by any Phase 7 criterion. Duplicating
  or relocating that logic into `AccountScreen.tsx` would be a much larger, riskier change for no
  criterion asking for it; ACC-03's "Données" section is satisfied by a single grouped-list row.
  Identity and profile editing (avatar, name fields) stay their own cards above the grouped list —
  rich, non-tabular content that doesn't read well squeezed into a table row — while Connexion
  (email, password), Données and À propos move into one `AppGroupedList`, with "Se déconnecter"
  isolated in red at the very bottom.
- **DET-01's per-factor bars use a flat 0-5 scale for every factor.** Every IBP factor (A-J) scores
  on the same 0/1/2/5 (or restricted 0/2/5) set (`packages/ibp-domain/src/rules/scales.ts`), so
  `IbpFactorBars` compares them on one shared axis rather than needing a per-factor max lookup.

## Batches

1. Shared components: `SyncStatusPill`, `SurveyProgressCard` (merges `DraftCard` +
   `ContinueDraftCard`), `AppGroupedList`, `IbpFactorBars` — each with a full test file.
2. Expose `isOnline`/`isSyncing` through `useSurveySyncNetwork` → `useSurveySync`, a new narrow
   `sync-status-context`, wired into `AppStateProvider`.
3. Home becomes a dashboard: `SyncStatusPill` in the header, actionable alerts with distinct
   conflict-vs-error copy and an action (SYNC-03), a resume hero + single `SurveyProgressCard` for
   a draft touched within 48h (HOME-02); `AppNotice` gains an optional `action`.
4. Mes Relevés becomes a pure list: header "+" (native header on iOS, `ListHero` elsewhere) and
   `SyncStatusPill`, the create/attention cards removed, swipe-to-delete moved to the right with an
   accessibility-action alternative (LIST-02), rows show a score badge or completion ring (LIST-01).
5. Survey detail: `DetailHeader`'s hero stays the one canonical score display; `FactorsSection`
   drops its duplicate total/sub-score pills and shows `IbpFactorBars` instead (DET-01). Merge
   `origin/main` first (Phase 8/10 coordination).
6. Compte: `AccountScreen` restructured around `AppGroupedList` (ACC-03); ACC-04's placeholder fix.
7. Docs, ROADMAP, final gate, PR.
