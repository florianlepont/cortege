# Batch 1 — Fonts (DS-03)

Sora (title/body stand-in for Mazzard H) and Jost (meta stand-in for Futura) load as embedded fonts
through the `expo-font` config plugin — no async `useFonts()` flash, no screen left in the OS default
face.

## What shipped

- `mobile/assets/fonts/`: `Sora_{500Medium,600SemiBold,700Bold,800ExtraBold}.ttf`,
  `Jost_{400Regular,500Medium,600SemiBold}.ttf`, both `OFL-*.txt` licences. Sourced from the
  `@expo-google-fonts/{sora,jost}` npm packages (used only to obtain the binaries, then uninstalled —
  the app does not depend on them at runtime).
- `mobile/app.json`: `expo-font` plugin entry listing the 7 files.
- `mobile/src/app/brand-tokens.ts`: `brandFontFamilies` now records `standIn` alongside the charter's
  real `preferred` name; every `brandTypography` role names a concrete embedded font file instead of
  family + numeric `fontWeight` (avoids Android re-synthesizing a different weight on top of a static
  font file). Added `brandDefaultFontFamily` (`Jost_400Regular`).
- `mobile/src/ui/AppText.tsx`: new default-font wrapper. React Native's `Text` has no `defaultProps`
  in this RN version (it's a plain function component, not a class), so there is no way to patch a
  global default the way older RN apps did — `AppText` is the substitute: it renders RN's `Text` with
  `brandDefaultFontFamily` first in the style array, so an explicit `fontFamily` from a
  `brandTypography` role still overrides it.
- Every other `Text` import from `"react-native"` across `mobile/src` (61 files) now imports
  `{ AppText as Text }` from `ui/AppText` instead — a mechanical, import-only change (verified by
  script, not by hand) that leaves every JSX call site unchanged. This is what makes criterion 1
  ("no screen renders in the OS default face") actually hold app-wide, not just in the ~45 files that
  already spread a `brandTypography` role.

## Decisions carried from the sketchboard session (see 04-CONTEXT.md)

Sora + Jost over Plus Jakarta Sans + Jost; forest-on-sage IBP badge (batch 2); press spring
unchanged (batch 3) — all owner-approved 2026-09-27 before this batch was written.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(104 suites / 1339 tests). `npm run typecheck`'s API leg needed a root `npm install` first: this
container had never installed the `api` workspace's dependencies (pre-existing, unrelated to this
phase) — fixed as part of getting an accurate gate, no `package.json` changed by it.

## Known gap

No simulator/display in this cloud session, so the font swap is not eyeballed in the running app.
Visual confidence instead comes from the sketchboard Artifact (real Sora/Jost webfonts, iterated
live with the product owner before this batch was written), plus typecheck/tests as correctness
gates. Per `CLAUDE.md`'s UI-testing guidance, this is stated rather than claimed as verified-in-app.
