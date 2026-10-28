---
phase: 32
plan: 17b
status: complete
---

# Phase 32 Plan 17b: Guide entry on Accueil Summary

The dendromicrohabitat guide opens from the "Outils" section of Accueil, as a second row under "Identifier un arbre", on the same sheet as in factor F.

## What changed

- `screens/home/ToolsSection.tsx`: a local `ToolCard` renders both rows (40 pt icon tile, title, one-line body, chevron, glass card); the guide row uses `book-outline`, `testID="tool-dmh-guide"`, and calls the new `onOpenDmhGuide` prop. The two rows are `TOOL_ROW_GAP` (8 pt) apart.
- `screens/HomeScreen.tsx` passes `onOpenDmhGuide` through; `navigation/routes/HomeRoute.tsx` implements it as `navigation.navigate("surveyDmhGuide")` (no param: the catalogue).
- `navigation/stacks/HomeStack.tsx` registers `surveyDmhGuide` with `DmhGuideRoute` and `dmhGuideScreenOptions(theme)`, the same options as the survey stack. `navigation/types.ts`: `HomeStackParamList` gains `surveyDmhGuide`, `DmhGuideRouteProps` is the union of the two stacks.
- `i18n/fr/home.ts`: `fr.home.tools.guide` (title and body reuse the wording of the factor F entry, plus the accessibility label). No em dash, no abbreviation.
- `screens/home/layout-budget.ts`: `TOOL_ROW_COUNT`, `TOOL_ROW_GAP`; `toolsSectionHeight` counts both rows.

## Navigation

The guide is pushed in the Accueil stack itself, not through `navigate("surveys", ...)` like a survey detail. Reason: that mechanism lands in the Mes Relevés stack on top of its first screen, so closing the sheet would show the survey list, not Accueil. Registered in the Accueil stack, the sheet presents over Accueil and `goBack()` (the route's `onClose`, swipe down, tap outside) returns to it. Nothing is read from the network; the content is the bundled catalogue.

## Deviations

- The UI-SPEC (D-05) said the guide is "never registered in HomeStack". The owner request supersedes it; the route component and the sheet options are shared, so there is still one guide.
- Not updated here (other executors own them): CLAUDE.md Navigation paragraph and the UI-SPEC line above still say the guide is in the survey stack only.

## Cost: the Accueil height budget (owner decision needed)

The second row adds 64 pt before "Autour de vous". The 12.2-14 budget test is updated to the new measured values, not silently relaxed:

| Case | Before | Now |
|------|--------|-----|
| Draft, 3 recent surveys, 393 x 852 | at least 96 pt of the nearby section | 69 pt (header and 43 pt of map) |
| Same, 375 x 812 | at least 96 pt | 38 pt (header and 12 pt of map) |
| Two-line draft title, 393 x 852 / 375 x 812 | 96 / 74 pt | 41 / 10 pt |

If the owner wants the map peek back: put the two tools side by side as half-width tiles (reverses D-20d), or move "Outils" below "Autour de vous".

## Verification

Jest (src/screens/home, HomeScreen, src/navigation, src/__checks__, src/i18n) green; `src/navigation` at 100 percent statements, HomeStack and HomeRoute 100; `tsc --noEmit` clean; eslint and prettier clean on the touched files.

## Not verified on a device

I could not run the app. The owner should check on the iPhone: the row sits under "Identifier un arbre" and looks like it; tapping it opens the sheet over Accueil (grabber, 0.65 detent), searching and opening a group page work, close and swipe down return to Accueil with its scroll position; the tab bar stays; how much of the map shows at launch; the guide opened with no survey open words groups 6, 12, 15 for the method version left in the form state (v3.2 by default); Android shows a modal.
