# Batch 7 — Survey-detail history as an icon timeline (DET-05)

## What shipped

- New `survey-detail/event-icons.ts` (+ test): one Ionicons name and semantic tone
  (`neutral`/`success`/`warning`/`danger`) per known event type, mirroring `event-labels.ts`'s
  known/unknown-type guard (an unrecognized type gets a generic neutral dot, never a raw lookup).
- `EventsTab.tsx` rewritten: the plain `event_type` + date rows became a vertical icon timeline (a
  colored dot with its Ionicon, connected by a rail to the next event, no rail after the last one).
  Tone maps to theme colors via a small `toneColors(theme, tone)` helper (`successSoft`/`forest`,
  `warningSoft`/`onSurface.warning`, `errorSoft`/`onSurface.danger`, `panelMuted`/`textSecondary`).
  A first load (`isLoading` with no events yet) shows three `SkeletonRow` placeholders (Phase 4's
  component) instead of a "Chargement…" text line; a pull-to-refresh of an already-populated list
  keeps the existing rows on screen. New `tabs.styles.ts` entries: `timelineRow`, `timelineRail`,
  `timelineDot`, `timelineConnector`, `timelineContent`. The existing `eventRow`/`eventTitle`/
  `eventPayload` styles stayed (still used by `DebugTab.tsx`'s raw event dump).
- `SurveyDetailScreen.tsx`: the screen's own `ScrollView` gained a `RefreshControl`, attached only
  while the Historique tab is active, calling the same `onLoadSurveyEvents` the tab's manual
  "Recharger" button already used (see `12-CONTEXT.md` for why pull-to-refresh lives on the screen,
  not inside the tab).
- `DetailTabBar.test.tsx`'s pre-existing `EventsTab` describe block updated for the new loading
  state (asserts a `SkeletonRow` renders instead of the removed "Chargement…" text); new
  `EventsTab.test.tsx` covers the skeleton/empty/timeline/refresh-in-flight/reload-button states
  directly.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green, including
`npm run test:coverage:mobile` (the stricter per-directory CI gate).
