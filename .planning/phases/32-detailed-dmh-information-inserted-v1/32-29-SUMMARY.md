---
phase: 32
plan: 29
subsystem: factor-pages-new-design
tags: [hero-card, key-figure, intro-paragraph, ibp-domain-readers]
status: complete
key-files:
  created:
    - mobile/src/app/factor-key-figure.ts
    - mobile/src/app/number-range.ts
    - mobile/src/screens/factor-detail/FactorKeyHero.tsx
    - packages/ibp-domain/src/rules/readers.test.ts
  modified:
    - packages/ibp-domain/src/index.ts
    - packages/ibp-domain/src/rules/common.ts
    - packages/ibp-domain/src/rules/v3-0.ts
    - packages/ibp-domain/src/rules/v3-2.ts
    - mobile/src/screens/factor-detail/FactorHeroCard.tsx
    - mobile/src/screens/factor-detail/DmhHeroCard.tsx
    - mobile/src/screens/factor-detail/FactorIntro.tsx
    - mobile/src/screens/factor-detail/CountingModeStrip.tsx
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/survey-form/FactorPager.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - mobile/src/i18n/fr/factor-detail.ts
    - CLAUDE.md
metrics:
  completed: 2026-10-29
---

# Phase 32 Plan 29: the factor F design on the other factors, step 1 of 3

Owner approved the mockup `maquettes3.html` (A, C, G, H phones). This step gives factors A to E and G to J the new top of page: an intro paragraph ending with the inline help link, a hero card with the factor's key figure, then the pills and the inputs. The input controls are NOT converted here (steps 2 and 3); they stay in the glass card.

## Change

**Package (`@cortege/ibp-domain`), scoring unchanged**
- `rules/common.ts`: `densityPerHa(pair)` extracted from the two density scorers (upper, lower and sum per hectare, the sum kept as one division so the v3.2 score reads the same float), `DENSITY_COUNT_KEYS` (the raw keys of C, D and E, now read by both scorers), `readDensityPerHa(factor, raw)`.
- Exports added to the index: `readFactorAGenusCount`, `readDensityPerHa`, `DENSITY_COUNT_KEYS` and the types `GenusCountOutcome`, `DensityPerHa`, `DensityFactor`.
- Tests in `rules/readers.test.ts`; the package stays at 100 percent (491 tests); the parity cases are untouched and green (package and `api/test/ibp-parity.spec.ts`, 100 tests).

**App**
- `app/factor-key-figure.ts` (pure): `computeFactorKeyFigure({ factor, fields, methodVersion, ibpCas, countedInFull, retainedScore })` returns `{ value, unitKey, subLabelKind, topScore, textual, pending }`. Where each figure comes from: A package `readFactorAGenusCount` on the genus list (cas only for v3.2, as the v3.0 scorer passes none); B the strata count field (strata chips and cover per stratum both write it); C and D `readDensityPerHa(...).upperPerHa` (bois morts de grosse dimension par hectare); E the same for très gros bois; shown only with both counts and a surface above 0, else null ("À calculer"); G the percent field (0 to 100, else null, "À estimer"); H the chosen label from `fr.factorInput.continuityOptions` (null: "À choisir"); I and J the type count field (the number ticked). `topScore` is `retainedScore.score === Math.max(...allowedScoresFor(factor))`, F's rule. Numbers are read through the form's own rule (`app/number-range.ts`, extracted from `useSurveyForm`).
- `FactorHeroCard` (from `DmhHeroCard`, same look: 44 pt tabular figure, one accessible element, "Maximum" pill) takes value, pending word, label, sub label, spoken label, top score, optional `textual` (H, title size) and test ids. `DmhHeroCard` stays as F's thin wrapper with `trees-per-ha-value`, `trees-top-score-trace` and "Arbres par hectare, N". `FactorKeyHero` dresses a figure with `fr.factorDetail.keyFigure`.
- `FactorIntro`: every factor now has a paragraph (testID `factor-intro`) ending with the inline glued link (testID `factor-help-link`). The slim 44 pt row is gone. Sentences are in `fr.factorDetail.intro` (imperative, one sentence each). A factor counted in full opens with its `countingMode` sentence instead, so `CountingModeCaption` (the stacked caption box, testID `counting-caption`) was deleted with its tests.
- `FactorDetailScreen`: order intro, hero card, doubt and note pills, inputs for A to E and G to J. The panel no longer forces itself open for a counted-in-full factor (it always has fields). `ibpCas` travels `FactorDetailRoute` to `FactorPager` to the page (optional prop, default null).
- Catalogue: `fr.factorDetail.intro` and `fr.factorDetail.keyFigure` (labels, sub labels, pending words, percent, spoken form). Labels and sub labels are the ones requested; no abbreviation, no em dash.
- CLAUDE.md: two sentences on the generic hero and the per-factor intro; the old "slim 44 pt row" mention was corrected.

## Verification

`npm run typecheck`, `npm --workspace mobile run lint`, `npm --workspace mobile run test:unit:coverage` (487 suites, 7699 tests, thresholds met, `src/navigation` at 100 percent), `npm --workspace @cortege/ibp-domain run test:coverage` (100 percent), `npm --workspace api run test:unit -- ibp-parity`, prettier on all touched `.ts` and `.tsx`.

## Not verified

No device or simulator check: I could not see any of these pages render. Unseen: the paragraph wrapping with the nested link on iOS and Android, the hero card with "Partielle" (H) at the title size next to its labels on a narrow phone, the long C, D and E labels ("gros bois morts sur pied par hectare") in the card's label column, and the visual weight of the new top over the unchanged glass input card.

## Deviations from Plan

1. **Intro wording is a rewrite, not the first help sentence.** The first sentence of every `factorHelp` text is a topic title ("Diversité des essences autochtones.", "Bois morts sur pied."), not an instruction. The sentences in `fr.factorDetail.intro` are imperative, follow the approved mockup for A, C, G and H, and use only facts present in the help texts (20 % threshold, grosses dimensions, surface décrite, bordure, récent, partiel ou ancien). Method-version differences stay in the help sheet.
2. **H label.** The brief gave the H sub label "ancienneté de l'état boisé" and a text figure; the label under the figure is "continuité boisée" (from the mockup).
3. **Pending words.** Beyond "À calculer" (C, D, E), an empty G reads "À estimer" and an empty H "À choisir"; A, B, I and J always show a number (0 when nothing is chosen).
4. **Extra package export** `DENSITY_COUNT_KEYS` so the app does not repeat the raw key names.
5. **Counting-mode caption removed rather than moved** into the hero sub label: its sentence now is the intro paragraph of a counted-in-full factor (B keeps the "d'après le couvert de chaque strate" sub label as requested).
6. `toFiniteNumberInRange` first went to `number-utils`, which broke `useSurveyForm.test` (it mocks that module), so it lives in `app/number-range.ts`. That left one intermediate commit (`0a4ff1bd` fixes it).
7. The first UI commit state: a `git mv` of `DmhHeroCard.tsx` was staged by an earlier step and went into commit `0a4ff1bd` (the rename), so `e7b841ec`..`0a4ff1bd` are not each buildable on their own; `e1a040d7` onward is.

## Known Stubs

None.

## Commits

- a750fd21 feat(32-29): expose the genus count and per-hectare density readers of the package
- e7b841ec feat(32-29): key figure of each factor page, from the form and the package
- 0a4ff1bd feat(32-29): form number rule in its own module so number-utils stays as it was
- e1a040d7 feat(32-29): generic hero card and a one-sentence intro on every factor page
- f70cf638 docs(32-29): generic hero card and per-factor intro in CLAUDE.md

## Self-Check: PASSED
