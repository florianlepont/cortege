---
phase: 32
plan: 26
subsystem: factor-f-page-pager-header-hold-repeat
tags: [dmh, factor-f, pager-header, toast, hold-repeat]
status: complete
key-files:
  created:
    - mobile/src/screens/survey-form/MaxScoreToast.tsx
    - mobile/src/screens/survey-form/MaxScoreToast.test.tsx
    - mobile/src/screens/factor-detail/top-score-toast.test.tsx
  modified:
    - mobile/src/ui/useHoldRepeat.ts
    - mobile/src/ui/DmhCounterStepper.tsx
    - mobile/src/ui/FactorCounterInput.tsx
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/DmhGroupList.tsx
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/screens/survey-form/FactorPager.tsx
    - mobile/src/screens/survey-form/FactorPagerHeader.tsx
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/factor-pager.ts
    - CLAUDE.md
    - docs/specs/ibp-form-spec.md
  deleted:
    - mobile/src/screens/factor-detail/ReadOnlyValueField.tsx (and its test)
commits: [4144d4c1, bfd36bd9, b2a0d611]
metrics:
  completed: 2026-10-29
---

# Phase 32 Plan 26: owner feedback on the capped counters, round 2

Owner feedback of 2026-10-29 plus the coordinator's decisions on the mockups (variant B header, inline sum, toast). No payload, package, API, navigation or SQLite change.

## What changed

1. **F page as one grouped list.** "Arbres par hectare : N" is a plain line at the top of the list (label then value, side by side, left aligned, tabular figures, no box, no caption, spoken "Arbres par hectare, N", testID `trees-per-ha-value`). `ReadOnlyValueField`, `DerivedFromGroupsCaption` and `TopClassNote` are gone. Capped F no longer draws an input card (nothing is left for it); counted in full the card keeps its caption and the surface field. The page order is: heading and helper, sum line, group count summary, seven sections, then the "Aucun arbre porteur de dendromicrohabitats" row (`dmh-none-row`) in its own container, same behaviour and locked caption.
2. **Maximum.** A toast `dmh-max-toast` (`MaxScoreToast`, floating above the pager's bottom bar, outside the scroll content): "Score maximal atteint : inutile de compter davantage." It shows each time F's retained score goes from below the top to the top while F is on screen (not on mount or on arriving at a page already at the top, not while counting above it, again after a drop and a new crossing), with the success haptic (`feedback.notify.success`) and `AccessibilityInfo.announceForAccessibility`, goes after 4 s (`MAX_SCORE_TOAST_MS`) or on a tap or when the score falls back, `FadeInDown`/`FadeOutDown` with `ReduceMotion.System`. A quiet check and "maximum" stay beside the figure (`trees-top-score-trace`). The green note block is removed from the page flow.
3. **Root cause of the missing note (item 3).** I reproduced the phone flow with the real `useSurveyForm` feeding the real `FactorPager` and `FactorDetailScreen` (no hand-built retained score), pressing the real stepper on 4 and 5 groups. The evaluation was right: the form retains score 5 from a sum of 8 and the 32-24 note rendered at 8 and 10. So the logic did not fail; the note was a footnote-sized secondary line inside the input card at the top of the page, while the observer presses the counters in the sections further down, with the note scrolled out of sight. (Only on-device confirmation can prove that was what the owner saw.) Fix: the information now floats where the eye is, the pager header's score (always on screen) changes too, and the sum keeps a trace. The test `top-score-toast.test.tsx` pins the evaluation (8 gives 5, 7.99 does not) and the flow.
4. **-/+ sensitivity (item 4).** `useHoldRepeat` now returns `begin` / `end` / `tap`. Final constants: `HOLD_REPEAT_DELAY_MS` 600, `HOLD_REPEAT_INTERVAL_MS` 200 (5 per second), `HOLD_REPEAT_FAST_INTERVAL_MS` 100 (10 per second) after `HOLD_ACCELERATE_AFTER_MS` 2000 more; always one step at a time (the old x2 and x5 multipliers are gone). A quick tap is made by Pressable `onPress`, which React Native sends only on release inside the target: a slide out, a cancelled press or a scroll gesture ends in `onPressOut` alone, so it steps nothing and clears the timer. The `onPress` after a released hold is ignored for 250 ms (a screen reader's double tap, which sends `onPress` with no press in, still counts). Haptic: the selection tick on a tap and on the first step of a hold, none on repeats. The likeliest "ultra sensitive everywhere" cause besides the old step-on-touch-down: `FactorCounterInput` had `hitSlop` 44 on 56 pt buttons (they overlapped each other and the value); removed. Only two components use the engine (grep: no other counter, no other `setInterval` repeat in the app).
5. **"(facultatif)"** removed from `companionLabels.dmh_groups` and `companionLabels.evidence` (the only two; B, I and J labels never had it).
6. **Header score (variant B, all factors A to J).** `FactorPagerHeader`: one capsule, 40 pt (`TOTAL_CHIP_HEIGHT` 36 to 40), one outer radius with overflow clipped, no gap. Left half forest (gradient over its fallback, white "5 / 5", caption "Facteur"), right half card (`visual.glass.cardFill`, hairline, "27 / 50", caption "Total"), tabular figures, title shrinks first. The maximum is `Math.max(...allowedScoresFor(factor))` (the package has no per-factor `IBP_MAX`; it holds stand, context and total only). One a11y element "Score du facteur 5 sur 5, total du relevé 27 sur 50"; with no score only the total half shows with its own label. The page's "Score du facteur" line, `fr.factorDetail.scoreLabel/scorePoints/pending/scoreHint` and the `scoreLine*` styles are removed. The word "classe" no longer appears in the pager.

## Verification

Ran and passed: `npm run typecheck`, `npm --workspace mobile run lint`, `npm --workspace mobile run test:unit:coverage` (482 suites, 7613 tests, exit 0, thresholds met, `useHoldRepeat.ts` and `FactorPagerHeader.tsx` at 100 percent), prettier check on every touched `.ts` and `.tsx`. The `__checks__` gates (no em dash, abbreviations, motion, icons, 400-line cap) are part of that run. `src/navigation` was not touched. "DMH" appears only in `factor-pager.ts` (the title) and in testIDs.

New tests: `useHoldRepeat.test.ts` (tap = 1 step, 500 ms hold = 0 steps, hold steps at 600 then every 200, 100 after 2 s, release not a tap, cancel and unmount leave no timer), stepper and counter tests (cancelled press steps nothing, no hit slop), `MaxScoreToast.test.tsx` (crossing logic and dismissal on fake timers), `top-score-toast.test.tsx` (real flow), `DmhGroupList.test.tsx` (sum line, trace), `FactorPager.test.tsx` (capsule).

## Deviations

- `test/react-native-reanimated.mock.ts` gained `FadeOutDown` (the toast's exit).
- Docs edited: CLAUDE.md F paragraph and `docs/specs/ibp-form-spec.md` capped-count paragraph (they described the box, the class text and the none row above the list).
- The branch is `claude/practical-bhaskara-39c526`, not `worktree-agent-*`; commits were made here as instructed.

## Known stubs

None.

## What I could not see (no device)

Everything visual. The owner should check on the iPhone: the F page without the card (sum line close to its label, the "maximum" trace, the none row at the end); the toast above the bottom bar after the 8th tree (height over the bar, not hiding the last rows too long, tap to close, haptic, VoiceOver announcement); the header capsule on a narrow phone with "Milieux ouverts florifères" (title shrinks, capsule stays), light and dark, the forest and card halves joining cleanly; the -/+ feel: a tap is one step, a deliberate hold starts after 0.6 s, a scroll that starts on a button does nothing; counted in full, nothing was changed except the sum line and the missing card.

## Risks

- Whether the missing note was really position (not provable here); if the owner still misses the information, the toast is the safety net.
- The 250 ms window after a hold release and the 600 ms delay are my values; if a quick double tap feels slow, the delay is one constant.
- The toast shows only for F; other factors need no equivalent.

## Self-Check: PASSED

Created files exist, the three commits are in `git log`.
