# Batch 4 — Mes Relevés becomes a pure list

## What shipped

- Header "+": on the native iOS tree, `SurveyListRoute.tsx` sets `headerRight` (alongside the
  existing `headerSearchBarOptions`) to a row holding `SyncStatusPill` and an "add" button; on
  Android/the JS fallback, `ListHero` carries both instead (it has no native header to attach to).
- `ListHero.tsx` rewritten: drops the forest-coloured card, stat tiles, dynamic "attention"/"up to
  date" body copy, logo ornament and `BrandBump` — HOME-01's point exactly, this card used to be a
  second dashboard. Keeps the same collapsing-header mechanics (`useHeroGeometry`, the sticky
  filter-bar offset math depends on it) under a plain large title + item-count caption.
- `leading-items.tsx`/`SurveyListScreen.tsx`: the create card and "à faire" card (and
  `AttentionSection.tsx`, `ContinueDraftCard.tsx`, `CreateSurveyCard.tsx`, `StatTile.tsx`, all
  deleted) are gone; the only leading item left is a "Résultats" caption, shown only while a search
  is active. The list is just `visibleSurveys` now — no more excluded-ids bookkeeping.
- `SurveyRow.tsx` (LIST-01/LIST-02): `renderLeftActions` → `renderRightActions` (delete is now
  revealed by swiping left, action on the right — the iOS convention; the existing
  `confirmDeleteSurvey` action already shows a native confirmation, so no second dialog was added).
  `accessibilityActions`/`onAccessibilityAction` add a "delete" rotor action mirroring the swipe, so
  a screen-reader user doesn't need the gesture. A new leading `RowIndicator` shows `IbpScoreBadge`
  for a submitted survey with an already-cached score, a plain checkmark ring for a submitted
  survey with no cached score yet, or a completion ring (`survey.completion_rate`) for anything
  still in progress.
- `brandTintOnLight`/`brandStatTileTint` tokens removed (dead once `CreateSurveyCard`/`StatTile`
  were deleted); several now-dead i18n keys (`hero.eyebrow`/`body`/`compactSummary`, `stats.*`,
  `createCard.*`, `attention.*`, `continueDraft.*`, `section.mine`/`others`) removed from
  `survey-list.ts`.

## Test notes

`survey-list-500.test.tsx`'s `Swipeable` mock updated for `renderRightActions`; its "native iOS
header search" describe block rewritten (it asserted the old create/à-faire cards existed under
native search — now asserts a pure list with a "Résultats" caption only while searching).
`routes.test.tsx`'s `SurveyListRoute` tests extended to cover the new `headerRight` render and the
`isOnline`/`isSyncing`/`surveyDetails` props.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` and
`npm run test:coverage:mobile` — green.
