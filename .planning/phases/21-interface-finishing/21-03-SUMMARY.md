# Batch 3 — Screens, navigation and onboarding dark-mode sweep (DS-12)

## What shipped

Same mechanical pattern as batch 2, applied to every remaining screen and navigation file:

- **survey-list/ + home/**: `survey-list/styles.ts` → `createListStyles`, `row-styles.ts` →
  `createRowStyles`, plus `FilterBar`, `FilterPanel`, `ListEmptyState`, `ListHero`, `SurveyRow`,
  `leading-items.ts`, `SurveyListScreen.tsx`; `home/styles.ts` → `createStyles`, plus
  `SectorScoreCard.tsx` and `HomeScreen.tsx`.
- **account/ + auth-gate/ + misc screens**: `account/styles.ts` → `createAccountStyles`/
  `createIdentityStyles`, `IdentityCard.tsx`, `AccountScreen.tsx`; `auth-gate/styles.ts` →
  `createAuthStyles`/`createDevModalStyles`, `AuthGateScreen.tsx`, and its two other importers
  (`HeroSection.tsx`, `AuthPanel.tsx`, not previously known to import the shared style module);
  `ProfileSetupScreen.tsx`, `LocalDataOwnerConflictScreen.tsx`, `FactorDetailScreen.tsx` (styles
  extracted to a sibling `factor-detail.styles.ts` to clear the repo's 400-line file gate).
- **onboarding/ + components/**: `OnboardingCarouselScreen.tsx`, `PermissionsPrimingScreen.tsx`,
  `TypewriterSplash.tsx` (only needed the `brandOnDarkColors` rename, no hook), `ParcelNearbyCard.tsx`.
- **navigation/**: `stacks/stack-options.ts`'s `baseStackScreenOptions` → `createBaseStackScreenOptions(theme)`;
  `tab-config.tsx`'s `JS_TAB_BAR_STYLE` constant removed, `buildJsTabBarStyle`/`jsTabScreenOptions`
  gained a required `theme` first argument (`nativeTabScreenOptions` unchanged — its only color,
  `forest`, is theme-invariant). All four stacks (`AccountStack`, `HomeStack`, `PublicMapStack`,
  `SurveysStack`) and both root tab trees (`JsRootTabs`, `NativeRootTabs`) updated to call
  `useBrandTheme()` and pass it through. `SurveysStack.tsx` additionally carries the DS-15 formSheet
  change (`21-06-SUMMARY.md`).
- Test fixes for the shape changes: `navigation.test.tsx` and `tabs.test.tsx`'s `@react-navigation/native`
  mocks gained `DefaultTheme`/`DarkTheme` stubs; both files' `JS_TAB_BAR_STYLE`/`baseStackScreenOptions`
  assertions moved to `buildJsTabBarStyle(defaultTheme, …)`/`createBaseStackScreenOptions(defaultTheme)`;
  `state/render-counts.test.tsx`'s own `@react-navigation/native` mock gained the same two stubs;
  `state/contexts.test.tsx`'s `react-native` mock gained `useColorScheme: () => null` (it renders the
  real `App.tsx`, which now mounts `BrandThemeProvider`); `SettingsScreen.test.tsx` gained an
  `AppChoiceChip` mock; `home/SectorScoreCard.test.tsx` updated for the `getIbpScoreColors` signature
  change.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
