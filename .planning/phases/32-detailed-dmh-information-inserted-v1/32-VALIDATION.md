---
phase: 32
slug: detailed-dmh-information-inserted-v1
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-23
---

# Phase 32 - Validation Strategy

> Per-phase validation contract. Source of truth for the test map: the "Validation Architecture" section of `32-RESEARCH.md`; task IDs are filled in by the plans.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (react-test-renderer, @testing-library/react-native) |
| **Config file** | `mobile/jest.unit.config.js`; `packages/ibp-domain/jest.config.js` (parity, untouched) |
| **Quick run command** | `npm --workspace mobile run test:unit -- src/app/dmh-guide src/screens/dmh-guide src/screens/factor-detail src/__checks__` |
| **Full suite command** | `npm run test:unit` then `npm run lint`, `npm run typecheck`, `npm run format:check` |
| **Estimated runtime** | quick ~60 s, full ~5 min |

## Sampling Rate

- **After every task commit:** the quick run command for the touched folders
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green and `test:coverage:mobile` thresholds respected (`src/navigation` stays at 100 %)
- **Max feedback latency:** 120 seconds

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| REQ-C-dmh-guide | Guide data covers exactly the 15 groups, forms partition them, WSL type numbers unique, v3.0 overrides only for dmh_06, dmh_12, dmh_15 | unit | `npm --workspace mobile run test:unit -- src/app/dmh-guide` | ❌ W0 | ⬜ pending |
| REQ-C-dmh-guide | Search folds accents, matches label and keywords | unit | same | ❌ W0 | ⬜ pending |
| REQ-C-dmh-guide | Route opens catalogue or group page, registered with iOS form sheet / Android modal | unit | `... -- src/navigation` | extend | ⬜ pending |
| REQ-C-dmh-guide | Info glyph and guide entry call the open handler | unit | `... -- src/screens/factor-detail` | extend | ⬜ pending |
| REQ-DOC-dmh-sources | Catalogue passes dash and abbreviation gates; sources shown on pages | source gates | `... -- src/__checks__` | ✅ | ⬜ pending |
| REQ-DOC-dmh-sources | References README lists each document with SHA-256 and date; NOTICE lists assets | manual docs review | `git diff docs/references NOTICE.md` | ❌ | ⬜ pending |
| REQ-C-dmh-illustrations | Registry requires exist, credit per image, byte budget, zero images valid | source gate | `... -- src/__checks__/dmh-assets.test.ts` | ❌ W0 | ⬜ pending |
| REQ-C-dmh-fast-entry | Same action sequence gives the same payload as chips + counters; "+" ticks and counts 1; "-" floors at 0; ordering at mount only | unit | `... -- src/hooks/useSurveyForm.test.ts src/screens/factor-detail` | extend | ⬜ pending |
| REQ-C-dmh-fast-entry | Tap-count proxy S1/S2 below the old flow | unit | same | ❌ W0 | ⬜ pending |
| REQ-C-dmh-fast-entry | Scores unchanged | parity | `npm run test:unit` | ✅ | ⬜ pending |
| structure | 400-line cap, no unused style, no literals outside i18n | source gate | `... -- src/__checks__/structure.test.ts` | ✅ | ⬜ pending |

## Wave 0 Requirements

- [ ] `mobile/src/app/dmh-guide/` tests: structure, search, order
- [ ] `mobile/src/__checks__/dmh-assets.test.ts`
- [ ] `renderFactorField` extraction from `FactorDetailScreen.tsx` with existing tests green
- [ ] Tap-count fixture S1/S2 written against the OLD flow first (baseline number)

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Baseline and final timings on a real survey, 3 runs per scenario, medians recorded | REQ-FT-dmh-speed | Needs a human on a device | Owner iPhone Release build, protocol in `32-RESEARCH.md` "Recording-Speed Work" |
| Sheet reads well (detents, dark mode, credits, drawings) on iPhone and Android | REQ-C-dmh-guide | Visual | iOS simulator (verify first tap twice) and owner phone |
| Expert reading of all group texts and crosswalk | REQ-DOC-dmh-sources | Domain judgement | Owner plus a named expert sign off `docs/specs/dmh-guide-content-v1.md` before screens |

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
