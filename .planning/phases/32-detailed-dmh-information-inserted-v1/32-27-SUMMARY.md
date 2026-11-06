---
phase: 32
plan: 27
subsystem: factor-pages-top-of-page
tags: [factor-f, help-link, doubt-note-pills, hero-card, intro-paragraph]
status: complete
key-files:
  created:
    - mobile/src/screens/factor-detail/FactorIntro.tsx
    - mobile/src/screens/factor-detail/FactorIntro.test.tsx
    - mobile/src/screens/factor-detail/DmhHeroCard.tsx
    - mobile/src/screens/factor-detail/DmhHeroCard.test.tsx
  modified:
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/DoubtNoteStrip.tsx
    - mobile/src/screens/factor-detail/DmhGroupList.tsx
    - mobile/src/screens/factor-detail/dmh-group-list.styles.ts
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/screens/factor-detail.styles.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - CLAUDE.md
    - docs/specs/ibp-form-spec.md
    - docs/specs/epic-c-ibp-survey-data-entry.md
commits: [5f1fa991, 0960ce1a, 51f72964, 2a646a27, 1bed1195, e603392d]
metrics:
  completed: 2026-10-29
---

# Phase 32 Plan 27: top of the factor pages after the owner's mockup choice

Owner decisions of 2026-10-29 ("Proposition 1" of `maquettes2.html`). No payload, scoring, package, API, navigation or SQLite change.

## What changed

1. **"Aide au relevé".** `helpLink`, `helpTitle` (sheet title) and the accessibility label are now "Aide au relevé"; every "Que relever" in code, tests and comments is renamed (historical docs `owner-acceptance.md` and the 2026-09 audit keep the old name, they are records). The bottom link is gone. New `FactorIntro`: for factor F the link ends the intro paragraph as an inline nested `Text` link (Ionicons `information-circle-outline`, "Aide au relevé", `chevron-forward-outline`, accent text token, role `link`); for A to E and G to J it is a slim row (`AppPressable`, 44 pt, same glyph, accent token, role `button`), testID `factor-help-link` in both.
2. **F intro paragraph.** One paragraph on the canvas, no card, `fr.factorDetail.dmhList.intro` in three parts so only the cap is semibold. Capped: "Comptez les arbres vivants porteurs de dendromicrohabitats : **au plus 2 par groupe et par hectare**. Touchez l'icône i d'un groupe pour apprendre à le reconnaître, même sans réseau." Counted in full: "... groupe par groupe. Pour le score, l'app garde **au plus 2 arbres par hectare et par groupe**. Touchez ...". It replaces the list's heading, helper and group summary line. In counted-in-full mode the caption stays in the input card with the surface field; `countingMode.F` no longer repeats the cap (the paragraph carries it) and now says the trees are counted on the described surface and the per-hectare figure is derived.
3. **Hero card.** `DmhHeroCard` (read-only, `AppGroupedContainer`, one container level): 44 pt Sora-SemiBold figure, tabular, `semanticColors.textStrong` (forest in light, primary ink in dark); to its right "arbres par hectare" and "somme des groupes comptés" (counted in full "calculé d'après la surface décrite"); a quiet "Maximum" pill with a check on the right at F's top score (replaces the small trace; toast untouched). One spoken element "Arbres par hectare, N", hint "Score maximal atteint" at the top. testIDs `trees-per-ha-value` and `trees-top-score-trace` kept. While counted in full without a surface the figure slot reads "À calculer" at 22 pt (a 44 pt phrase would not fit).
4. **Doubt and note pills (A to J).** `DoubtNoteStrip` keeps its name, props, testIDs (`factor-strip-X`, `factor-doubt-switch`, `factor-note-link`, `factor-note-field`) and commit logic (400 ms typing pause, blur, unmount flush, never closes on blur). Two 36 pt glass pills (hit slop 4 pt above and below, so 44 pt targets) in one row: "Douteux" (`flag-outline`, role `switch` with `checked`, same hint, selection tick kept; on: `warningSoft` fill, `notice.warningBorder`, `onSurface.warning` ink in both schemes) and "Note" (`create-outline`; with a note "Note : <one line>" ellipsised, line breaks collapsed; open: `chevron-up-outline`, accent border). The field opens under the row with the same `NoteField` (300 characters, counter, visibility helper, autofocus). The visible "Ajouter / Modifier / Fermer la note" strings and the separate preview (`factor-note-preview`) are removed; the A11y variants of those strings are the pill's accessibility label. No "(facultatif)" anywhere.
5. **Order.** F: header, intro + link, hero, pills, (counted in full: input card with caption and surface), sections, none row. Others: header, help row, pills, field panel.

Keyboard: the pills are now at the top of the page, so the opened note field sits in the upper part of the screen where the keyboard never reaches; the page ScrollView already has `automaticallyAdjustKeyboardInsets` and the pager hides its bar while the keyboard is up. No scroll-into-view code was added (`NoteField.onFocus` exists but nothing needs it).

## Verification

Passed: `npm run typecheck`, `npm --workspace mobile run lint`, `npm --workspace mobile run test:unit:coverage` (484 suites, 7629 tests, exit 0, thresholds met, `src/navigation` 100 percent, the four new or rewritten files 100 percent), prettier check on every touched `.ts`/`.tsx` (`npm run format:check` only flags `.claude/settings.local.json`, not mine). `__checks__` gates (no em dash, abbreviations, motion, icons, 400-line cap) are part of the run. "DMH" does not appear in any new string.

## Deviations

- The F group summary line ("2 groupes cochés", "3 groupes, 14 arbres") is not in the mockup and was part of the heading block the owner asked to replace: removed, with its catalogue strings. The section badges still give ticks per form and the rows give the counts. Say so if the owner wants the counted-in-full tree total back.
- `companionLabels.dmh_groups`, `countingMode.dmhTitle`/`dmhHelper`, `dmhList.infoHelper`/`cappedHelper`/`sumLabel`/`summary*` removed (unused). `HELP_LINK_MIN_HEIGHT` moved from `factor-detail.styles.ts` to `FactorIntro.tsx`.
- The doubt pill keeps role `switch` (state `checked`) rather than a `button` with `selected`, so the screen-reader behaviour is as before.
- The `fix` commit for an unused import was made after `51f72964` (an eslint error that slipped through a piped command); a prettier-only commit followed.

## Known stubs

None.

## What I could not see (no device)

Everything visual. The owner should check on the iPhone, light and dark:
- F top: the paragraph wraps cleanly with the inline "Aide au relevé" link at the end (the link is the height of a text line, not 44 pt: nested `Text` takes no hit slop), the hero card figure at 44 pt next to its label (hugging, not far apart), the "Maximum" pill when the top score is reached (and the toast as before), "À calculer" in counted-in-full mode before a surface is set.
- The two pills: size and spacing, the warning-soft "Douteux" state in both schemes, a long note ellipsised in its pill, the field opening under the row with the keyboard up and the counter visible, closing by the pill.
- A, C and H as examples of the slim help row: its vertical rhythm with the pills (44 pt row, then the pills).
- VoiceOver: help link announced as link (F) or button (others), hero read as one element, doubt pill as a switch.

## Risks

- Inline link target smaller than 44 pt on F.
- The glass pill fill and hairline on the canvas are the card tokens: they may look faint in light mode.
- The sum summary removal (above).

## Self-Check: PASSED

Created files exist, commits are in `git log`.
