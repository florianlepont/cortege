# Batch 1 — Typography scale, elevation tokens, BrandHighlight (DS-05, DS-10, DS-11)

## What shipped

- `brand-tokens.ts`: `brandTypeScale` (documents the existing type ramp); `brandFontScaleCaps`
  (`default: 2, display: 1.35, title: 1.5, body: 1.8, label: 1.6, meta: 1.6, button: 1.4,
  input: 1.6`) — per-role caps on Dynamic Type growth, capped rather than uncapped so a body
  paragraph doesn't out-grow a title at AX3 while still respecting the OS accessibility setting;
  `brandElevation.level0-3` (a four-step shadow scale); `brandRadius.badge`/`badgeSm`.
- `AppText.tsx`: applies `maxFontSizeMultiplier={maxFontSizeMultiplier ?? brandFontScaleCaps.default}`
  so every text role gets a sane ceiling by default, overridable per call site.
- Six call sites with a sub-12pt `fontSize` (9/10/11) bumped to the 12pt floor (iOS HIG minimum
  legible size).
- New `BrandHighlight.tsx` (+ test): the charter §6.1 uppercase highlight-fill treatment, padding
  approximated at 0.5× x-height, for on-brand emphasis on new/touched surfaces (DS-11 lands
  additively, not as a retrofit — see `09-CONTEXT.md`).

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
