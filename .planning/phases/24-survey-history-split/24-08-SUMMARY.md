---
phase: 24-survey-history-split
plan: 08
subsystem: mobile-survey-detail
tags: [typescript, react-native, react-native-svg, reanimated, parcel-history]
requires:
  - phase: 24-survey-history-split
    provides: plan 24-04 (buildTrend, TrendSummary, TrendInputPoint), plan 24-05 (fr.parcelHistory.page.trend.*)
provides:
  - TrendCurve (SVG curve with cut runs, dashed links, points, labels, one reveal) and TREND_REVEAL_MODE
  - TrendCard (hero forest card, motion off: trend title, curve, mixed-method notice)
affects: [24-10, 24-12]
tech-stack:
  added: []
  patterns: ["one exported render switch (TREND_REVEAL_MODE) like NUMERAL_RENDER_MODE", "per-run child component so a hook count never follows data"]
key-files:
  created:
    - mobile/src/screens/survey-detail/TrendCurve.tsx
    - mobile/src/screens/survey-detail/TrendCurve.test.tsx
    - mobile/src/screens/survey-detail/TrendCard.tsx
    - mobile/src/screens/survey-detail/TrendCard.test.tsx
  modified: []
key-decisions:
  - "TREND_REVEAL_MODE defaults to \"clip\" (the UI-SPEC wipe): the simulator spike showed the animated clip rectangle repainting on iOS"
  - "Both reveal modes stay implemented and tested; the owner phone check (24-12) confirms the reveal on the device, fallback is the one-line change to \"dash\""
  - "The title's nested Texts each spread brandTypography.screenTitle: AppText puts the default font first, which would otherwise replace the inherited Sora face"
requirements-completed: []
status: complete
duration: 40min
completed: 2026-10-09
---

# Phase 24 Plan 08: Trend card and curve Summary

The parcel history trend card is built from plain data: a hero forest card (aurora off) whose title states the trend, a react-native-svg curve of the totals cut between methods, and a one-line notice when v3.0 and v3.2 surveys are mixed. REQ-C-history-split is deliberately left unchecked (the owner closes it after the phone check in plan 24-12). The page assembly that mounts these two components is plan 24-10.

## Spike outcome (Task 1 step 0, clip-rect reveal)

What was run: a throwaway `mobile/App.tsx` (restored with `git checkout -- mobile/App.tsx` afterwards, never committed) drew two copies of a 5-point curve, one under a `ClipPath` whose `Rect` width is a Reanimated `useAnimatedProps` (`width: 311 * progress`), one with the `strokeDashoffset` technique. The progress ran as a looping 3 s timing (spike only). Metro served the bundle to the existing Debug simulator build `Cortege.app` (built 2026-09-29) installed on the **iPhone 18 Pro, iOS 27.0 simulator**. Screenshots were taken with `xcrun simctl io booted screenshot` in a burst, 0.5 s apart.

Result: the clip wipe repainted. Three frames show three different clip widths over the same curve (first frame: clip at about a quarter of the line, second: complete, fourth: cut right after the middle point), while the dash copy drew in the same way. Decision rule applied: the wipe visibly repaints on iOS, so `TREND_REVEAL_MODE = "clip"`.

Screenshots (session scratchpad, not in the repo):
`/private/tmp/claude-501/-Users-florian-Projects-cortege--claude-worktrees-cortege-ios-search-tab-badge-48a27d/8678e4bc-ad53-4c6d-aac5-41f15670d32a/scratchpad/` files `spike-boot.png` (about 25 percent), `spike-2.png` (complete), `spike-4.png` (about 55 percent), plus `spike-1.png`, `spike-3.png`, `spike-5.png` (taken, not individually inspected).

Limits of this check, stated plainly:
- iOS simulator only, not a physical iPhone, and not Android (react-native-svg clip paths with animated props are unverified there; the owner phone check in 24-12 is where it is confirmed).
- Debug build with a looping spike animation, not the real component at a real mount; the real `TrendCurve` was not run in a simulator (no page mounts it yet, that is plan 24-10).
- The `mcp__Claude_Code_iOS_Simulator__control` tool was not available; `xcrun simctl` was used directly. Screenshots were read visually; there was no pixel-level comparison.
- Fallback if the phone check shows a problem: set `TREND_REVEAL_MODE = "dash"` in `TrendCurve.tsx` (both modes are tested).

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | TrendCurve with the reveal switch | 275ee5e0 |
| 2 | TrendCard | 36df6933 |

## What changed

- `TrendCurve.tsx` (241 lines): props `points`, `accessibilityLabel`, `revealMode = TREND_REVEAL_MODE`. Wrapper `testID="trend-curve"`, height 128, nothing drawn before `onLayout`. Geometry from `buildTrend(points, width)`, memoised on the width. Solid accent runs (width 3, round), dashed sage links (`"4 4"`, width 2), points (radius 4, current one radius 6 with a ring), values in `ringValue` font 12 at `y - 12`, years in `meta` font 12 at y 120 (`?` when unknown). One accessible image; the `Svg` is hidden from assistive tech. Reveal: one `withDelay(120, withTiming(1, emphasis, decelerate, ReduceMotion.System))`, started once per mount (ref guard), only when visible (`useScreenVisible()`) and measured; progress starts at 1 under Reduce Motion and nothing is scheduled. "clip": a `G` clipped by an animated `Rect` (id `trend-clip-` plus `useId()` stripped to `[A-Za-z0-9_-]`). "dash": a `RunPath` child per run (own `useAnimatedProps` with `strokeDashoffset`), the links, points and labels in a group with animated opacity. No loop, no layout animation.
- `TrendCard.tsx` (98 lines): `<ForestCard variant="hero" motion={false}>`, padding 16, title (screenTitle 24/28, cap `brandFontScaleCaps.title`, 2 lines) in two nested parts (`forest.title`, `forest.titleAccent`), the curve 12 below with the label `page.trend.a11y(points)` plus `a11yMixed` when mixed, and a notice row (8 below, `information-circle-outline` 16, Label 13 in `forest.body`, 2 lines). Renders nothing for kind "none".

## Verification actually run

| Check | Result |
|-------|--------|
| `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/TrendCurve.test.tsx src/__checks__/motion.test.ts src/__checks__/fonts.test.ts src/__checks__/layers.test.ts src/__checks__/structure.test.ts` | 5 suites, 89 tests passed |
| `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/TrendCard.test.tsx src/screens/survey-detail/TrendCurve.test.tsx src/__checks__` | 8 suites, 115 tests passed (TrendCurve 26 tests, TrendCard 13 tests) |
| Full mobile unit suite (`cd mobile && npx jest --config jest.unit.config.js`) | 263 suites, 3312 tests passed |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run format:check` | only the warning on git-ignored `.claude/settings.local.json`; `prettier --check` on the four new files: clean |
| `npm run test:unit` | exit 1: domain 9 suites / 230 tests passed; API 36 of 37 suites passed, the only failing suite is `test/check-env-parity.spec.ts` (34 tests, pre-existing, environment related, also fails on main, unrelated to this phase). The script stops after the API failure, so the mobile suite was run separately (line above) |
| Task 1 greps (`export const TREND_REVEAL_MODE`, `buildTrend(`, `ReduceMotion.System`, `useScreenVisible()`, `testID="trend-curve"`) | all present; quoted hex or `rgba(` count in `TrendCurve.tsx`: 0 |
| Task 2 greps (`<ForestCard variant="hero" motion={false}`, `information-circle-outline`, `page.trend.a11y`) | all present |

### Not run

- API e2e: not applicable (mobile-only plan; `api/.env.test` does not exist locally in any case).
- No check on a physical device or on Android; the real components were not run in a simulator (see the spike limits).

## Deviations from Plan

- **Test dependency on the Reanimated mock, no production deviation.** The mock's `withTiming` ignores its options, so the test reads the arguments of the call through the spy (`duration`, `reduceMotion`), and the first-frame values (`width * 0`, dash offset equal to the length, opacity 0) through the mock's synchronous `useAnimatedProps`. A running animation is not exercised by Jest.
- **TDD ordering:** the test files and the components were written in the same pass per task and committed together (one `feat` commit per task), not as separate `test(...)` and `feat(...)` commits.

None of the deviation rules 1 to 3 applied.

## Known Stubs

None.

## Threat Flags

None. T-24-08: the curve only renders `buildTrend` output (finite, clamped) and the integer totals; T-24-13: one timing per mount behind a ref guard and `useScreenVisible()`, no `withRepeat`, enforced by `motion.test.ts` (passes).

## Self-Check: PASSED

Commits `275ee5e0` and `36df6933` exist; `TrendCurve.tsx`, `TrendCurve.test.tsx`, `TrendCard.tsx`, `TrendCard.test.tsx` exist; `git status` shows `mobile/App.tsx` unchanged (spike edit removed).
