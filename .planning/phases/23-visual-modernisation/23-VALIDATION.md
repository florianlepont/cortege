---
phase: 12.2
slug: visual-modernisation-inserted
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-07
---

# Phase 12.2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `23-RESEARCH.md` "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + ts-jest; `@testing-library/react-native` 14; no jsdom; no snapshot tests in the repo (assert on props, tree and pure functions) |
| **Config file** | `mobile/jest.unit.config.js` (mocks in `mobile/test/`, coverage ratchet per directory) |
| **Quick run command** | `cd mobile && npx jest --runInBand --config jest.unit.config.js src/ui src/app` (plus the touched screen directory) and `npm run lint` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` |
| **Estimated runtime** | quick ~60 s, full ~5 min |

---

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green and CI green (including `native-ios` and `native-android`, triggered by the font and `mobile/assets/**`)
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

Plan-level map; the planner refines it to task ids.

| Req / Criterion | Behaviour | Test Type | Automated Command | File Exists |
|-----------------|-----------|-----------|-------------------|-------------|
| SC1 | direction text approved (`docs/design/direction-visuelle-12-2.md` status flips, charter section added) | manual + grep | `grep -n "approuvée" docs/design/direction-visuelle-12-2.md` | ✅ doc / manual |
| SC2 tokens | every new colour pair meets its ratio in light and dark | unit | `npx jest ... src/app/visual-tokens.test.ts` | ❌ W0 |
| SC2 builders | gradient and shadow strings valid, fallback `backgroundColor` set | unit | `npx jest ... src/ui/ForestCard.test.tsx src/app/visual-tokens.test.ts` | ❌ W0 |
| SC2 contours | deterministic, two groups, 11 closed subpaths | unit | `npx jest ... src/app/contour-paths.test.ts` | ❌ W0 |
| SC2 score tone | ring and bar tones equal `bandTone(totalBand(n))` | unit | `npx jest ... src/ui/ScoreRing.test.tsx src/app/ibp-display.test.ts` | ❌ W0 |
| SC2 ergonomics | interactive primitives keep `minHeight >= 44`; bars carry no handlers; form size tokens untouched | unit | `npx jest ... src/ui` | ✅ partly |
| SC2 structure | no unused style key, no file over 400 lines, no literal outside i18n | gate | `npx jest ... src/__checks__/structure.test.ts` | ✅ |
| SC2 colour rule | no hex or rgba literal outside token files | lint | `npm run lint` | ❌ W0 (rule repaired) |
| SC2 font | `Sora-Light` PostScript name and `app.json` entry match | unit | `npx jest ... src/__checks__/fonts.test.ts` | ✅ |
| SC3 reduced motion | rings and bars at final value, drift and entering not started when `useReducedMotion()` is true | unit | `npx jest ... src/ui/ContourLines.test.tsx src/ui/ScoreRing.test.tsx src/ui/useEntrance.test.ts` | ❌ W0 |
| SC3 consistency | no `LayoutAnimation`, no `useNativeDriver: false`, every `entering/exiting/layout` carries `.reduceMotion(...)` | gate | `npx jest ... src/__checks__/motion.test.ts` | ❌ W0 |
| SC3 tab trees | `shouldHideTabBar` and tab options unchanged in behaviour | unit | `npx jest ... src/navigation` | ✅ update |
| SC4 | owner confirms on phone, per batch and final | manual | iOS device Release build, light and dark, Reduce Motion on and off | manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `mobile/test/react-native-reanimated.mock.ts` — add `useAnimatedProps`, `useDerivedValue`, `withDelay`, `withSequence`, `useAnimatedReaction`, `interpolateColor`, `runOnJS`, `FadeInDown`, and a reduced-motion toggle
- [ ] `mobile/.eslintrc.json` — restore the colour selectors in the later overrides, exclude the new token files, tokenise the six existing literals
- [ ] `mobile/src/app/visual-tokens.ts`, `theme-visual.ts`, `ibp-display.ts`, `contour-paths.ts` with their tests
- [ ] `mobile/assets/fonts/Sora-Light.ttf` + `app.json` entry + `brandTypography.numeral` role
- [ ] `mobile/src/__checks__/motion.test.ts` (consistency gate)
- [ ] Tests for each new `ui/` primitive

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Look and feel of each batch, light and dark | REQ-QA-visual-modernisation (SC2, SC4) | rendering of coloured shadows, SVG gradient text, halo seam and drift cost only shows on a device | Build Release on the owner's iPhone (recipe in memory), open Accueil, Compte, Paramètres (batch 1), Mes Relevés, survey detail (batch 2), form (batch 3), Explorer (batch 4); toggle dark mode; check contrast in sunlight |
| Reduced motion | SC3 | system setting | Settings > Accessibility > Motion > Reduce Motion on: no drift, rings and bars at final value |
| Android look | SC2 | no emulator available here | graceful fallbacks by design; device pass in Phase 13 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
