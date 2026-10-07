# Batch 2 — Color tokens, contrast fixes, ESLint rule (DS-01, DS-02, DS-04)

## What shipped

- **125→0 hard-coded hex/rgba literals.** Re-measured at 119 occurrences across 21 files on this
  branch (the audit's count predates Phase 3); all migrated to tokens in `brand-tokens.ts`. New token
  groups added: `brandOnDarkStatus` (success/warning/danger pairs over the dark forest hero),
  `brandTranslucentPanel` (floating panel opacities over the map, a Liquid Glass placeholder pending
  Phase 12), `brandMediaBackdrop`, `brandTintOnLight` (CreateSurveyCard's decorative tints),
  `brandStatTileTint`; plus new flat keys on the existing `brandSemanticColors` "on dark" family
  (`heroTextMutedOnDark`, `heroSurfaceOnDark`, `heroSurfaceStrongOnDark`, `heroBorderStrongOnDark`,
  `heroAccentTintOnDark`, `heroScrimOnDark`, `haloOnDark`) and three new `brandColors` entries
  (`forestNight`, `disabledMuted`, `disabledNeutral`). `brandMapTokens` gained the public map's
  existing pin colors (tokenized as-is — MAP-03's actual marker redesign is Phase 9's job).
  Several near-duplicate opacity values (e.g. five different white-on-forest translucencies) were
  deliberately consolidated onto one shared token rather than preserved as one-off magic numbers;
  a few visually-adjacent one-off hues (warm salmon-tan report button, `#8EA97C` button border) were
  repointed onto existing tokens instead of adding new near-duplicates. All of this is a deliberate
  simplification, not an oversight — see 13-CONTEXT.md.
- **DS-01/DS-02 contrast fixes** (owner-approved for the IBP badge specifically; the same fix applied
  consistently to every other white/ochre/terracotta-on-soft-background pair the audit's contrast
  table flagged as failing WCAG):
  - `ibpScoreTokens.colors.high`: white-on-moss (2.85:1) → forest-on-sage (5.03:1). `mid`/`low` get
    the same treatment (soft background + new `brandOnWarningSurface`/`brandOnDangerSurface` dark
    text tokens, ~5:1+) instead of white on a saturated fill.
  - `brandComponentTokens.notice.{warningText,dangerText}`, `brandComponentTokens.surveyList.
    {workflowWarningText,workflowDangerText,supportDangerText,badgeDangerText}`, and
    `brandFieldState.error.{text,icon}` — all previously the raw `ochre`/`terracotta` hue on a soft
    background (2.90:1 / 2.97:1, both WCAG fails) — now use the darkened surface tokens.
- **ESLint rule** (`mobile/.eslintrc.json`): `no-restricted-syntax` rejects a `#hex` or `rgba(`/`rgb(`
  string literal anywhere under `src/**` except `src/app/brand-tokens.ts` and test files. Ran clean
  against the fully migrated tree — nothing left for it to flag, which is the point.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(104 suites / 1339 tests), including the new ESLint rule.

## Known gap

Same as batch 1: no simulator in this session, so the contrast/token changes are checked by the
sketchboard Artifact (already using the real forest/sage pairing per the owner's decision) and by
lint/typecheck/tests, not by eyeballing the running app.
