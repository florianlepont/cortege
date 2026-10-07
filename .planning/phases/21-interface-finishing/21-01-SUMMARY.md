# Batch 1 — Theme infrastructure (DS-12)

## What shipped

- `mobile/src/app/theme.ts` (new): `BrandColorScheme`/`BrandThemeMode` types, the light/dark neutral
  palettes, `makeSemanticColors`/`makeComponentColors`/`makeFieldState`/`makeIbpScoreColors`
  factories, `BrandThemeProvider` (resolves "automatic" via `useColorScheme()`, persists the chosen
  mode), and `useBrandTheme()` — returns a light default outside a provider rather than throwing
  (see `21-CONTEXT.md`). Exports `defaultTheme` for tests/helpers that need a `BrandTheme` value
  outside a component.
- `mobile/src/app/brand-tokens.ts` trimmed to theme-invariant tokens only: `brandColors` keeps the
  static hues; `brandSemanticColors`, `brandFieldState`, `ibpScoreTokens`, `brandOnWarningSurface`/
  `brandOnDangerSurface`/`brandOnSuccessSurface` and the color fields of `brandComponentTokens` were
  removed (moved into `theme.ts`); `brandComponentTokens` keeps only its dimension fields. The
  hero-on-dark family renamed `brandSemanticColors.hero*OnDark` → `brandOnDarkColors.*` (still
  static). Every other token group (typography, spacing, radius, shadow, motion, interaction, map,
  onDarkStatus, translucentPanel, mediaBackdrop) is untouched.
- `mobile/src/storage/theme-preference.ts` (+ test): `local_meta` read/write for the theme mode,
  same pattern as `map-preference.ts`, best-effort like `onboarding-preference.ts`.
- `mobile/App.tsx`: `BrandThemeProvider` wraps `AppStateProvider`; `AppShell`'s container background
  now reads `theme.semanticColors.backgroundCanvas`.
- `mobile/src/navigation/AppNavigation.tsx` + new `navigation-theme.ts` (+ test): the status bar
  style and the `NavigationContainer`'s `theme` prop (background/card/text/border from the app's own
  semantic colors) both follow the resolved scheme; the two ternaries were extracted to pure,
  independently-tested functions to keep `AppNavigation.tsx` itself branch-coverage-clean.
- `mobile/src/screens/SettingsScreen.tsx`: new "Apparence" section (Automatique/Clair/Sombre
  `AppChoiceChip` row) wired to `theme.mode`/`theme.setMode`; `mobile/src/i18n/fr/settings.ts` gained
  the `appearance` catalogue entry.
- `mobile/app.json`: `userInterfaceStyle` → `"automatic"`.
- `.eslintrc.json`: `src/app/theme.ts` added to the hex/rgba-literal exclusion list alongside
  `brand-tokens.ts` (it's the new sanctioned home for the palette's raw color values).

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
