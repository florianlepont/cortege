---
phase: 32
plan: 28
subsystem: factor-pages-top-of-page
tags: [factor-f, help-link, no-break-space]
status: complete
key-files:
  modified:
    - mobile/src/screens/factor-detail/FactorIntro.tsx
    - mobile/src/screens/factor-detail/FactorIntro.test.tsx
metrics:
  completed: 2026-10-29
---

# Phase 32 Plan 28: the factor help link never splits

Owner screenshot feedback: on the factor F page the inline link "ⓘ Aide au relevé ›" broke across two lines, with the chevron alone on the next line.

## Change

- `FactorIntro.tsx`: the label shown is `fr.factorDetail.helpLink` with its spaces replaced by U+00A0 (`GLUED_LINK_LABEL`). In the inline link, the spaces between the information glyph, the words and the chevron are U+00A0 too, so the link either fits at the end of the line or moves to the next line as one unit. The space before the link stays a normal space (a no-break space there would drag the last word of the paragraph along). Same Ionicons glyphs and text styles as before.
- The slim help row of factors A to E and G to J is a flex row sized to its content, so it can wrap only on a very narrow screen; its label uses the same glued string at no cost.
- The accessibility label stays `fr.factorDetail.helpLink` ("Aide au relevé", normal spaces). The catalogue string is unchanged.
- Tests: the rendered link text is exactly glyph, U+00A0, "Aide au relevé" with U+00A0, U+00A0, chevron, with no regular space; the label keeps normal spaces; the slim row label is glued too.

## Verification

Jest on `src/screens/factor-detail`, `FactorDetailScreen.test.tsx`, `src/__checks__` and `src/i18n` (492 tests pass, including the catalogue dash gate), typecheck, scoped ESLint and Prettier clean.

## Not verified

No device or simulator check: the wrapping itself (that iOS and Android honour U+00A0 between the nested glyph spans) was not seen on screen. To be confirmed by the owner on the factor F page.

## Deviations

None.
