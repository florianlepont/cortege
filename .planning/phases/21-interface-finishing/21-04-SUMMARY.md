# Batch 4 — survey-form/ and survey-detail/ dark-mode sweep (DS-12)

## What shipped

- **survey-form/**: `styles.ts` → `createFormStyles`, `header.styles.ts` → `createHeaderStyles`,
  `factors.styles.ts` → `createFactorStyles`, `parcels.styles.ts` → `createParcelStyles` (also
  carries the DS-15 glass changes, `21-06-SUMMARY.md`), plus every component in the directory
  (`SiteSection`, `ScoringContextSection`, `MethodVersionPicker`, `ParcelsSection`, `FactorsList`,
  `components.tsx`, `FormHeader.tsx`, `FactorPager.tsx`, `FixedActionBar.tsx`,
  `NearbyParcelsSheet.tsx`, `ParcelMapModal.tsx`) and `SurveyFormScreen.tsx`. Sibling helper
  functions within the same file (`CasFields`/`RegionStageFields` in `ScoringContextSection.tsx`,
  `StepButton` via `headerStyles`) take `formStyles`/`headerStyles` as a prop from the component that
  already computed them, rather than calling the hook a second time.
- **survey-detail/**: all six style modules converted (`styles.ts` → `createDetailStyles`,
  `header.styles.ts` → `createHeaderStyles`, `tabs.styles.ts` → `createTabsStyles`,
  `summary.styles.ts` → `createSummaryStyles`, `media.styles.ts` → `createMediaStyles`,
  `context-editor.styles.ts` → `createContextEditorStyles`), plus every component that imports them
  (`DetailHeader`, `AttachmentPhotoPreview`, `FactorsSection`, `ScoringContextEditor`,
  `MediaSection`, `SummaryTab`, `DetailActions`, `HistorySection`, `EventsTab`, `DebugTab`,
  `DetailTabBar`) and `SurveyDetailScreen.tsx` (props type extracted to a sibling
  `screen-props.ts` to clear the repo's 400-line file gate after this batch's and batch 7's changes).
  Sibling helper functions (`HeroSubScorePill` in `DetailHeader.tsx`, `FactorTile` in
  `FactorsSection.tsx`, `HistoryRow` in `HistorySection.tsx`, `FieldRows` in `DebugTab.tsx`) take
  `theme`/`styles` as props from their parent.
- `DetailHeader.test.tsx` updated for the removed `ibpScoreTokens` export (asserts against
  `defaultTheme.ibpScoreColors.<tone>.background` instead).

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
