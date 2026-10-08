# Batch 2 — `ui/` primitives dark-mode sweep (DS-12)

## What shipped

Every `ui/` component that read a now-theme-owned token converts to the same mechanical pattern:
`useBrandTheme()` + `useMemo(() => createStyles(theme), [theme])`, with `AppButton.tsx` as the
worked example the rest of the sweep (this batch and every later one) copied exactly.

Converted: `AppActionSheet`, `AppButton`, `AppCard` (+ new `glass` prop, see `21-05-SUMMARY.md`),
`AppChoiceChip`, `AppCollapsibleSection`, `AppField`, `AppGroupedList`, `AppNotice`,
`AppSectionHeader`, `AppSettingsRow`, `AppStatusChip`, `FactorChipsInput`, `FactorCounterInput`,
`FactorGenusListInput`, `FactorInputShell`, `FactorProgressRing`, `FactorSegmentedInput`,
`FactorSliderInput`, `GenusRecognitionModal`, `IbpFactorBars`, `IbpScoreBadge`, `IbpTotalGauge`,
`Skeleton`, `SurveyProgressCard`, `SyncStatusPill`.

Notable per-file decisions:

- `IbpScoreBadge.tsx`'s `getIbpScoreColors(score)` helper became `getIbpScoreColors(score, theme)`
  — the underlying `ibpScoreTokens` it read no longer exists as a static export. Every call site
  across the app (`DetailHeader.tsx`, `home/SectorScoreCard.tsx`) updated to pass `theme`.
- `AppField.tsx`'s `placeholderTextColor` default (previously a destructured static value) computes
  `theme.colors.textSecondary` in the component body instead, since a destructured default can't
  reference the hook.
- `AppGroupedList.tsx`'s non-exported `NavRow` and `FactorsList.tsx`'s `FactorTile` (and similar
  sibling helper components in later batches) take `theme`/`styles` as props from their parent
  rather than calling `useBrandTheme()` a second time.
- `FactorProgressRing.tsx` has no `StyleSheet.create` (SVG props only); it calls `useBrandTheme()`
  directly without a `createStyles` factory.
- `brandColors.terracotta`/`.moss`/`.ochre` (theme-invariant hues) stayed on the static `brandColors`
  import wherever a file used only those — no hook needed purely for them.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
