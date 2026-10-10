---
phase: 29
slug: field-feedback-fixes-inserted
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-10
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> "decision D-0x" = CONTEXT decision. "DC-D-0x" = device check in `docs/user-tests/device-checks.md`. "SC-n" = ROADMAP success criterion n.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (`--runInBand`), mobile workspace |
| **Config file** | `mobile/jest.unit.config.js` |
| **Quick run command** | `cd mobile && npx jest -c jest.unit.config.js <path or pattern> --coverage=false` |
| **Full suite command** | `npm run test:unit` (CI: `npm --workspace mobile run test:unit:coverage`) |
| **Quality gates** | `npm run lint`, `npm run typecheck`, `npm run format:check` |
| **Estimated runtime** | quick ~3 s per file; full suite a few minutes |

---

## Sampling Rate

- **After every task commit:** targeted jest file(s) from the map below, `--coverage=false`
- **After every plan wave:** `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`
- **Before `/gsd-verify-work`:** `npm --workspace mobile run test:unit:coverage` green (100 % floors on `src/map/`, `src/recognition/`, `src/i18n/`, `src/navigation/`)
- **Max feedback latency:** 30 seconds for the targeted run

---

## Per-Task Verification Map

Task IDs are assigned by the planner; rows are keyed by requirement until then.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| D-01 | Local reader returns every own survey (draft and submitted) with score and parcel ids | sqlite unit | `npx jest -c jest.unit.config.js src/storage/surveys.map-sources.sqlite.test.ts` | ❌ W0 | ⬜ pending |
| D-01 | Builder: draft vs own split, dedup against API ids, skip when no position/score | unit | `... src/map/own-surveys.test.ts` | ❌ W0 | ⬜ pending |
| D-01 | Route merges both groups; own surveys open own detail, others open community page | unit | `... src/navigation/routes/routes.test.tsx -t PublicMapRoute` | ✅ extend | ⬜ pending |
| D-02 | "Hors connexion" badge when offline | unit | `... src/screens/public-map/ScoreLegend.test.tsx` | ✅ | ⬜ pending |
| D-03 | Offline copy and Retry on both community pages | unit | `... src/screens/community-survey src/ui/CenteredState.test.tsx` | ❌ W0 | ⬜ pending |
| D-04 | Registry entries, info sheet open/close, a11y label, 44 pt target | unit | `... src/ui/AbbreviationInfo.test.tsx` | ❌ W0 | ⬜ pending |
| D-05 | Gate fails on an unexplained abbreviation; real catalogue clean | unit | `... src/__checks__/abbreviations.test.ts` | ❌ W0 | ⬜ pending |
| D-06 | Latin, accent-insensitive sort; picker and PDF list sorted; no mutation of stored order | unit | `... src/app/genus-order.test.ts src/ui/FactorGenusListInput.test.tsx` | ❌ W0 | ⬜ pending |
| D-07 | Recognition modal keeps confidence order | unit | `... src/ui/GenusRecognitionModal.test.tsx` | ✅ add case | ⬜ pending |
| D-08 | Compact mode below the height threshold; map share under 50 % per listed device | unit | `... src/screens/parcel-selection/layout-budget.test.ts` | ❌ W0 | ⬜ pending |
| SC-7 | No temp file left after ok, unavailable and thrown paths; guard refuses foreign URIs | unit | `... src/recognition` | ❌ W0 (`temp-files.test.ts`) | ⬜ pending |
| Gates | No em dash, outline icons, 400-line cap, colour literals, motion | unit/lint | `... src/__checks__` and `npm run lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `mobile/src/map/own-surveys.test.ts` and `mobile/src/storage/surveys.map-sources.sqlite.test.ts`
- [ ] `mobile/src/ui/CenteredState.test.tsx`
- [ ] `mobile/src/__checks__/abbreviations.test.ts` and `mobile/src/ui/AbbreviationInfo.test.tsx`
- [ ] `mobile/src/app/genus-order.test.ts`
- [ ] `mobile/src/screens/parcel-selection/layout-budget.test.ts`
- [ ] `mobile/src/recognition/temp-files.test.ts`

Framework install: none (Jest already configured).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Model loads and recognises on two real Android phones (Release build) | SC-1, DC-D-01 | Needs physical phones | Install Release APK, take photos online and in airplane mode, confirm suggestions |
| Latency median and p95 vs 3 s, online and airplane mode | SC-7, DC-D-01 | Real hardware timing | Timing line via logcat, record in `docs/user-tests/device-checks.md` |
| No photo lingers after a recognition | SC-7, DC-D-03 | Device file system | Inspect app cache after recognitions on iPhone and Android |
| Offline community survey page centred, inside safe area | D-03 | Native large-title frame cannot run in Jest | iOS simulator and device, airplane mode, tap another member's survey |
| Parcel-selection map share on the smallest screen | D-08 | Real layout heights | iPhone SE 3 simulator, Android `wm size 1080x1920`/Pixel_8 |
| Offline own surveys after restart | D-01 | Real SQLite and map | Airplane mode, force quit, relaunch, Explorer |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
