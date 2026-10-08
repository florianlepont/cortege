---
phase: 23-visual-modernisation
plan: 08
subsystem: mobile-screens-home
tags: [home, accueil, resume-card, forest-card, backdrop, glass, score-ring, entrance, variant-i]
requires: ["12.2-04", "12.2-05", "12.2-06", "12.2-07"]
provides:
  - "ResumeCard: compact forest resume / start card of Accueil (home/ResumeCard.tsx)"
  - "Accueil restyled to variant I: backdrop halo, screenTitle greeting, glass tool card, sector ScoreRing, accent section action, staggered entrances, compact 4-grid spacing"
affects: [later 12.2 screen batches reuse the same backdrop, entrance and glass patterns]
tech-stack:
  added: []
  patterns:
    - "Root View carries canvas plus ScreenBackdrop; the ScrollView above it is transparent"
    - "useEntrance index counts the sections actually shown (alert notice first when present)"
key-files:
  created:
    - mobile/src/screens/home/ResumeCard.tsx
    - mobile/src/screens/home/ResumeCard.test.tsx
  modified:
    - mobile/src/screens/HomeScreen.tsx
    - mobile/src/screens/HomeScreen.test.tsx
    - mobile/src/screens/home/styles.ts
    - mobile/src/screens/home/ToolsSection.tsx
    - mobile/src/screens/home/ToolsSection.test.tsx
    - mobile/src/screens/home/NearbyMapCard.tsx
    - mobile/src/screens/home/NearbyMapCard.test.tsx
key-decisions:
  - "Entrance indices are sequential over the sections shown (0 for the alert notice when present, then resume card, tools, nearby) so there is no stagger gap when no alert is displayed"
  - "The resume card uses AppButton size md (44 pt) for the glow pill so the pill fits beside the two text lines"
  - "No open 12.1 finding concerns Accueil, so nothing was absorbed (D-10)"
metrics:
  tasks: 2
  files: 9
  completed: 2026-10-07
status: complete
---

# Phase 12.2 Plan 08: Accueil (variant I) Summary

Accueil now follows variant I: a compact forest resume card extracted to `home/ResumeCard.tsx` (tag, title, secondary line, glow pill, ten progress segments, new-survey link), a backdrop halo, a glass tool card, a ScoreRing in the sector badge of the live nearby map, and staggered first-mount entrances, with sync status line, alerts and actions unchanged.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Extract the forest resume card | 2a07f25 |
| 2 | Backdrop, glass tool card, sector ring, compact spacing and entrances | 95e7ac1 |

## What was built

- **ResumeCard**: `ForestCard variant="resume"` (contours, drift on, `testID="home-resume-card"`), padding `brandSpacing4.md`. Left column: tag pill (`forest.tagFill`, `tagBorder`, `tagText`, `heroEyebrow`), title (`screenTitle`, `forest.title`, 2 lines), secondary line (`brandTypeScale.subhead`, `forest.body`). Right: `AppButton variant="glow"` (`play-outline` or `add-outline`). With a draft: ten segments with the unchanged testIDs (done `forest.glowFallback`, todo `forest.tagFill`) and the new-survey link (`minHeight` 44). All text from `fr.home.hero`, no new string.
- **HomeScreen** (371 to 338 lines): hero block replaced by `<ResumeCard>`; `ScreenBackdrop` first child of the root `View` (`styles.screen` carries canvas, `styles.scroll` is transparent); greeting uses `screenTitle`; `useEntrance()` wraps the alert notice, resume card, tools and nearby sections in `Animated.View`; nearby trailing link colour is `theme.visual.accentText`; page inset 16, blocks 16 apart, sections 24 top, header 8 below.
- **ToolsSection**: identify card is glass (`glass.cardFill`, `cardBorder` hairline, `cardShadow`, radius 22, padding 16, `minHeight` 44), icon tile radius `badgeSm`, margins on the 4-grid.
- **NearbyMapCard**: sector badge gains a `ScoreRing` (rounded mean) in an accessibility-hidden wrapper, texts unchanged; still a live `ParcelMap`, no `ContourLines`.
- **styles.ts**: hero and progress style keys removed (structure gate), `screen`/`scroll` split, `block` added.

## Verification

- `npx jest` for `src/screens/home`, `src/screens/HomeScreen.test.tsx`, `src/__checks__` pass; HOME-02 assertions (texts, testIDs, labels, handlers) unchanged and green.
- `npm run lint` and `npm run typecheck` exit 0.
- `npm run test:coverage:mobile`: 194 suites, 2091 tests pass, exit 0. ibp-domain suite 230 pass.
- `npm run format:check` flags only `.claude/settings.local.json` (local file, ignored per instructions).
- Not re-run at root: the API unit suite (known unrelated local failure in `check-env-parity.spec.ts`, macOS bash 3.2).
- HomeScreen.tsx is 338 lines (limit 400).

## Open 12.1 findings absorbed (D-10)

None. `docs/user-tests/owner-acceptance.md` has no open entry (status other than Closed) about an Accueil element rewritten here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing test mocks lacked the new dependencies**
- **Found during:** Task 1 and 2
- **Issue:** `HomeScreen.test.tsx` loads the real `ForestCard` (needs a navigator context through `ContourLines`) and `NearbyMapCard.test.tsx` mocked `react-native` without `View`.
- **Fix:** mocked `ForestCard` and `ScreenBackdrop` as host components in the HomeScreen test, added `View` and a mocked `ScoreRing` to the NearbyMapCard test. Assertions on existing behaviour untouched.
- **Files modified:** mobile/src/screens/HomeScreen.test.tsx, mobile/src/screens/home/NearbyMapCard.test.tsx
- **Commits:** 2a07f25, 95e7ac1

**2. [Process] TDD order**
- The implementation was written before its new tests inside each task (tests then run green); no separate RED commits. Each new behaviour line of the plan has an assertion.

## Deferred Issues

- On device (not checkable in unit tests): the glow pill beside the title in the "start a survey" state (label "Démarrer un relevé" is the longest), contour drift cost on Home, dark halo against the native iOS header, ring legibility on the dark glass of the sector badge (its existing texts use forest green regardless of scheme, pre-existing).
- `npm run test:unit` at the root fails locally in the API suite `check-env-parity.spec.ts` (macOS bash 3.2), unrelated.
- `npm run format:check` flags `.claude/settings.local.json`, a local harness file.

## Known Stubs

None.

## Threat Flags

None. T-12.2-14 mitigated (sector ring wrapper hidden from accessibility and asserted in the NearbyMapCard test; contours and backdrop hidden by their primitives). T-12.2-15 mitigated (`useEntrance` returns nothing under Reduce Motion; the only animated contour instance on Home is the resume card's, focus-gated by `ContourLines`; no contours over the live map, asserted).

## Self-Check: PASSED

Files exist: ResumeCard.tsx and test; HomeScreen.tsx, styles.ts, ToolsSection.tsx, NearbyMapCard.tsx modified. Commits 2a07f25 and 95e7ac1 are on the branch.
