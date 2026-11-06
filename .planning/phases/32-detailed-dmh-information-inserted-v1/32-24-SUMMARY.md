---
phase: 32
plan: 24
subsystem: factor-pager-header-and-f-field
tags: [dmh, factor-f, pager-header, read-only-value]
status: complete
key-files:
  created:
    - mobile/src/screens/survey-form/FactorPagerHeader.tsx
    - mobile/src/screens/factor-detail/ReadOnlyValueField.tsx
    - mobile/src/screens/factor-detail/ReadOnlyValueField.test.tsx
  modified:
    - mobile/src/screens/survey-form/FactorPager.tsx
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/DmhGroupList.tsx
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/screens/factor-detail/CountingModeStrip.tsx
    - mobile/src/i18n/fr/factor-pager.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - CLAUDE.md
    - docs/specs/ibp-form-spec.md
commits: [e224f094, 56063c44, 5e80f1dd, 39017024]
metrics:
  completed: 2026-10-29
---

# Phase 32 Plan 24: owner feedback on the capped counters

Four owner changes after trying the capped counters (2026-10-29). No payload, package, API or navigation change.

## What changed

1. **No second total.** The "Total : N arbres par hectare" line under the group list is gone (`dmh-total`, its style, `fr.factorDetail.dmhList.totalPerHa`, its tests). The total stays in the "Arbres par ha" field above the list.
2. **Class in the pager header, for A to J.** The pager already held `factorRetainedScores` from the package evaluation, so no plumbing and no route change was needed (`src/navigation` untouched). The title row now lives in `FactorPagerHeader`: title on the left; on the right a small neutral status pill "Classe 5" (`AppChoiceChip variant="status"`, tabular figures) then the existing forest total pill ("27 / 50", tabular figures). With a class the pair is one accessible element reading "Classe 5, total du relevé 27 sur 50" (`pager-score-group`); with no class only the total shows and keeps its own label as before. `pager-total` testID and `TOTAL_CHIP_HEIGHT` (re-exported from `FactorPager`) are kept. The class text drops the package's "S" ("S5" becomes "Classe 5"), as the owner's example reads. `FactorPager.tsx` went from 387 to 322 lines.
   The page's score line no longer prints the class (no duplicate): it reads "Score du facteur" and the points (`fr.factorDetail.scoreLabel`, replaces `scoreClass`), or the hint and "En attente" when no score.
3. **"Arbres par ha" is a value.** With the group counters on the page (capped and counted-in-full F) the field is rendered by the new `ReadOnlyValueField`: label, a quiet filled box with the figure, no `TextInput` at all, so nothing can take focus or the keyboard. One accessible element, role text, spoken "Arbres par hectare, N" (`dmhList.treesPerHaA11y`). The caption "Calculé d'après les groupes ci-dessous." now always shows under it. An older typed number is displayed until the first counter touch replaces it (unchanged logic). Empty field: shows "0" in the capped mode when nothing is counted; in the counted-in-full mode with counts but no surface yet it shows "À calculer". When the page has no counting entry (not the case in the app) the field stays a typed input.
4. **Top-class note.** When the evaluation retains F's highest class a note shows under the field (both modes): "À partir de 8 arbres par hectare, la classe est 5. Inutile de compter davantage." The trigger is `retainedScore.score === Math.max(...allowedScoresFor("F"))` (package export, no literal threshold in code). The "8" in the sentence is French copy; a unit test pins it to the package (`scoreTreeDensity(8)` is the top class, `7.99` is not).

## Verification

Ran and passed: `npm run typecheck`, `npm --workspace mobile run lint`, `npm --workspace mobile run test:unit:coverage` (481 suites, 7563 tests, thresholds met), prettier check on every touched `.ts`/`.tsx`. The package did not change, so its coverage run was not repeated. The `__checks__` gates (no em dash, abbreviations, motion, icons, structure 400-line cap) are part of the mobile run and pass. "DMH" appears only in `factor-pager.ts` (the title); the new strings say "dendromicrohabitats" or nothing.

## Deviations

- Not in the brief: tests for the new `ReadOnlyValueField` and the read-only branch of `renderFactorField` (coverage), and a doc edit of `docs/specs/ibp-form-spec.md` (F paragraph) besides the one sentence in CLAUDE.md.
- The required asterisk is dropped from the read-only label (nothing to fill in there).

## Known stubs

None.

## Risks and what to check on a device (not seen, I cannot run the app)

- **Dead end to decide (main risk).** F needs a stored `trees_per_ha`. The field cannot be typed any more and shows "0" while nothing is counted, but the "0" is display only: the stored value stays empty, so F reads as not filled (score line "En attente", F missing at finish) until a counter is touched. A forest with no dendromicrohabitat now needs "+" on a group, "-" back to 0, then untick (the sum 0 is written on the first touch). Suggested follow-up if the owner agrees: an explicit "Aucun groupe observé" action that stores 0, or storing 0 when the observer leaves F. I did not write data on page visit because that would mark F filled for a factor the observer never looked at.
- Pager header on a narrow phone (iPhone SE size) with the longest title "Milieux ouverts florifères" plus the class pill and the total: the title shrinks to 75 percent then truncates; check it reads well. Class pill height (about 26 pt) against the 36 pt total pill, vertical alignment, dark mode.
- VoiceOver: the header group reads "Classe 5, total du relevé 27 sur 50"; F's field reads "Arbres par hectare, N" and is not an editable field; the top-class note is read as a plain line.
- Counted-in-full F: the field is read-only too ("In both modes" read literally); with counts but no surface it says "À calculer".
- Wording: "Classe 5" (no "S"); the note's sentence is my adaptation of the owner's example.

## Self-Check: PASSED

Files created exist, the four commits are in `git log`.
