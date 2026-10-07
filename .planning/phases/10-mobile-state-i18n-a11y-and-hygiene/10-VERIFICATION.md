---
phase: 10-mobile-state-i18n-a11y-and-hygiene
verified: 2026-10-06T21:50:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "`bcryptjs`, `@nestjs/schedule` and the unused tab library are removed"
    reason: "The tab library is not unused: the owner decided in 01.9-CONTEXT D-08 to keep both libraries (`react-native-bottom-tabs` and `@bottom-tabs/react-navigation` draw the native iOS bar, `@react-navigation/bottom-tabs` draws Android and the Expo Go fallback). `bcryptjs` and `@nestjs/schedule` were removed."
    accepted_by: "owner (01.9-CONTEXT D-08)"
    accepted_at: "2026-09-26T00:00:00Z"
human_verification: []
---

# Phase 01.9: Mobile state architecture, i18n, accessibility and hygiene Verification Report

**Phase Goal:** The app renders only what changed, reads in one language with proper accessibility, and the repository and its docs describe what is actually there.
**Verified:** 2026-10-06T21:50:00Z
**Status:** passed
**Re-verification:** No, initial verification. This report was written after the fact: the phase closed on 2026-09-27 (PR #159, closing PR #167) and the checks below run against the code on branch `claude/roadmap-seeds-16a6af` (main at `0fb6d2f`, after phases 02 to 12.1). Where later phases reshaped the code (the tab set, the survey form turned into a wizard, the search tab), the criterion is checked against the code as it is now. The structure gates still pass on today's tree, so the phase's rules have held.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Session, sync and surveys state come from memoised contexts; `useSurveySync` no longer returns a new ~60-key object each render; a status update no longer re-renders every mounted tab (before/after profile attached). | VERIFIED | `mobile/src/state/` holds the context modules (`session-context`, `status-context`, `sync-actions-context`, `surveys-context`, `survey-form-context`, `nearby-parcels-context`, `sync-status-context`, `autosave-status-context`) and `AppStateProvider.tsx`. `useSurveySync` is called in exactly one non-test place, `AppStateProvider.tsx:94`. `useSurveySync.ts` builds its result from `useMemo` slices and `useStableActions` action objects (lines 550 to 623). **Profile substitute (D-02):** the committed render-count harness `mobile/src/state/render-counts.test.tsx` pins the after numbers in `EXPECTED`; I ran it here with `contexts.test.tsx`, `useSurveyList.test.ts` and others: 6 suites, 91/91 passed. Before/after JSON files `10-render-counts-before.json` and `-after.json` are in the phase directory. VALIDATION.md "Render counts" records a status update going from 27 renders to 1, a keystroke 27 to 3, keystroke plus autosave 56 to 8, a one-survey refresh 28 to 5. This replaces the React DevTools screenshot with a stronger, regression-proof check; the roadmap wording ("React DevTools profile") is met by substitution, decided in D-02. |
| 2 | The survey list is a `FlatList` with memoised rows and stays fluid with 500 surveys; completion is precomputed at write time; no screen file exceeds 400 lines; the unused style keys are gone; navigation is typed (no `useNavigation() as any`). | VERIFIED | `mobile/src/screens/SurveyListScreen.tsx:145` renders a `FlatList`; `survey-list/SurveyRow.tsx:279` exports `SurveyRow = memo(...)`. `local_surveys.payload_completion` exists (`storage/db.ts:132 to 149`, written at `storage/surveys.ts:48` and `:441`, read at `:478` without parsing payloads). I ran `surveys.completion.sqlite.test.ts` (500 rows listed with no `JSON.parse`), `useSurveyList.test.ts` (structural sharing) and the render-counts suite: all pass. The phase's `survey-list-500.test.tsx` (FlatList window and one-row re-render, 10/10 in VALIDATION.md) no longer exists: it was deleted when the Mes Relevés redesign (OA-51 to OA-56, commit `e880728`) replaced the list screen. What still backs the claim today: `SurveyListScreen` keeps `initialNumToRender` and `windowSize={7}` on its `FlatList`, `render-counts.test.tsx` still counts the rows of a 20-survey list and pins them, and the no-parse storage and structural-sharing tests pass. There is no 500-row render test any more (see Anti-Patterns). Structure gates run here on today's tree: `unused-styles: 0`, `long-files: 0`, `status-ids: 0`, `literals: 0` (`node mobile/scripts/structure-report.js <gate> --max 0`, each exit 0). Largest non-test file under `screens/` and `navigation/`: `SurveyParcelSelectionScreen.tsx` at 390 lines. `grep "useNavigation() as"` over `mobile/src` and `grep "as any"` over `mobile/src/navigation` (non-test): 0. The style key count in the roadmap (158) was re-measured at 301 by the committed script; the criterion's intent (none unused) holds. |
| 3 | The map requests by bbox, clusters markers, memoises them and debounces region changes. | VERIFIED | API: `bbox` in `public-map-items-query.dto.ts:23` and `public-parcel-statuses-query.dto.ts:7`; `api/test/public-map-bbox.e2e-spec.ts` exists. Mobile client: `ibp-api.ts:228 to 236` adds `bbox=` to the request; `usePublicMapExplorer.ts` keys its cache on bbox and filters (lines 55 to 76). `public-map/useMapViewport.ts` uses `useDebouncedValue(region, VIEWPORT_DEBOUNCE_MS)` (line 102) and memoises bbox and zoom (lines 113 to 114). `public-map/useMapClusters.ts` uses `supercluster` and is called from `MapCanvas.tsx:75`; `SurveyMarker` and `ClusterMarker` are `memo(...)`. I ran `useMapViewport.test.ts` and `useMapClusters.test.ts`: pass. |
| 4 | Every user-facing string comes from a French catalogue, status messages carry no ids or technical text, and every `Pressable` in survey detail, survey form and map screens has an accessibility role and label. | VERIFIED | Catalogue `mobile/src/i18n/fr/` (35 modules plus `status/`), typed in `index.ts`. `structure-report.js literals` reports 0 literals outside `src/i18n` (baseline 635) and `status-ids` reports 0 (baseline 66); I ran both here. ESLint enforces it: `.eslintrc.json` bans literal `title/label/placeholder/accessibilityLabel/...` attributes (lines 68 to 104) and, for the three screen areas, flags any `Pressable` missing `accessibilityRole` or `accessibilityLabel` (lines 112 to 117, "phase 01.9 D-07"). `npm run lint` exits 0 here with the rules at error. A manual count in `survey-detail`, `survey-form`, `survey-wizard` and `public-map` shows every file with `<Pressable` also carries `accessibilityRole`. Status messages are catalogue-typed `StatusMessage` values (`CLAUDE.md` and `i18n/fr/status/`), raw detail goes to `logStatusDetail`. |
| 5 | The root `App.tsx`, root runtime dependencies and the Expo-flavoured root tsconfig are gone; `bcryptjs`, `@nestjs/schedule` and the unused tab library are removed and `@expo/ngrok` is a dev dependency, with native iOS and Android builds still passing. | VERIFIED (PASSED override for the tab library) | Repo root has no `App.tsx` and no `tsconfig.json` (`ls` fails on both). Root `package.json` has only `workspaces`, scripts, `overrides` and the single devDependency `react-test-renderer`; no `dependencies`. `bcryptjs` and `@nestjs/schedule` appear in no `package.json` and not in `package-lock.json`. `@expo/ngrok` is under `mobile/package.json` `devDependencies` (line 66). `api/src` has no `EmailService` and no SMTP settings (grep finds nothing); `infra/vps/check-env.sh` lists `SMTP_*` only as obsolete. **Tab library:** not removed, by owner decision D-08 (override above); `mobile/package.json` keeps `@bottom-tabs/react-navigation`, `@react-navigation/bottom-tabs` and `react-native-bottom-tabs`, all imported. **Native builds:** `ci.yml` has `native-android` (line 433) and `native-ios` (line 491), both in the `ci-ok` needs list; VALIDATION.md records the baseline before the cleanup (run 36239341355), after it (36244081522), the final head (36247034895) and the closing PR #167 (36304379789), all success with both native builds; the owner's Release build on an iPhone was approved on 2026-09-26. I did not run a native build here. |
| 6 | `CLAUDE.md` and the technical docs match the final state (versions, `/v1/sync`, `local_meta`, test conventions, CI steps, new modules); the audit report links each finding to the PR that closed it. | VERIFIED | `CLAUDE.md` describes the monorepo with the `ibp-domain` workspace, `POST /v1/sync` and `GET /v1/sync/changes`, `local_meta`, the `AppStateProvider` single assembler and its five contexts, the API module table (`reports`, `storage`, `config`, `debug`, `common`), CI jobs 1 to 11 including `native-android`/`native-ios`, and states "The API sends no email". Spot-checks against the code: the module list matches `ls api/src` (`auth common config database debug reports storage surveys users`), `useSurveySync` is called once in `AppStateProvider`, the file paths named in the Key files table exist. (CLAUDE.md has since been maintained by later phases, so some wording reflects them; no stale phase 01.9 fact was found.) `docs/audits/audit-2026-09-code-complet.md` has 0 remaining "en attente" rows and links ARCH-1 and T6 to PR #162, ARCH-4 and ARCH-7 to #159 and #156. The ARCH-8 row (line 450) points to "closing PR of plan 01.9-32" in prose instead of a link to #167 (see Anti-Patterns). |

**Score:** 6/6 truths verified (1 with an accepted override, 0 present but behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/src/state/` (`AppStateProvider.tsx`, context modules, `useLatestCallback.ts`, `render-counts.test.tsx`) | Single assembler and memoised contexts | VERIFIED | Wired once; render-counts suite passes |
| `mobile/src/hooks/useSurveySync.ts` and `survey-sync/` sub-hooks | Memoised slices | VERIFIED | `useMemo` and `useStableActions` |
| `mobile/src/i18n/fr/` | Typed French catalogue | VERIFIED | `literals: 0` |
| `mobile/src/navigation/` (`AppNavigation.tsx`, `stacks/`, `tabs/`, `routes/`, `types.ts`) | Split, typed navigation | VERIFIED | No `as any` or cast |
| `mobile/src/screens/SurveyListScreen.tsx`, `survey-list/SurveyRow.tsx` | `FlatList`, memo rows | VERIFIED | Lines 145 and 279 |
| `mobile/src/storage/db.ts`, `surveys.ts` (`payload_completion`) | Precomputed completion | VERIFIED | Migration and write sites present |
| `mobile/src/screens/public-map/` (`useMapViewport`, `useMapClusters`, markers) | Viewport loading, clusters, debounce | VERIFIED | Tests pass |
| `mobile/scripts/structure-report.js` | Four gates at zero | VERIFIED | All four report 0 |
| `api/src/surveys/dtos/public-map-items-query.dto.ts`, `api/test/public-map-bbox.e2e-spec.ts` | Optional `bbox` filter | VERIFIED | Present; E2E recorded green |
| `.github/workflows/ci.yml` native jobs | Android and iOS builds | VERIFIED | Present and gating `ci-ok` |
| `CLAUDE.md`, `docs/audits/audit-2026-09-code-complet.md` | Current docs, linked audit | VERIFIED | See truth 6 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AppStateProvider` | `useSurveySync` | single call (line 94) | WIRED | No other call site |
| `AppStateProvider` | five contexts | memoised slices | WIRED | `contexts.test.tsx` passes |
| Screens | contexts | `routes/*Route.tsx` | WIRED | Navigator tree carries no data |
| `PublicMapScreen` | `useMapViewport` then `loadPublicMap({ bbox })` | debounced region | WIRED | `PublicMapScreen.tsx:113`, `useMapViewport.ts:102 to 114` |
| `MapCanvas` | `useMapClusters` | `items`, `region` | WIRED | `MapCanvas.tsx:75` |
| ESLint config | a11y and literal rules | `no-restricted-syntax` | WIRED | Lint exit 0 at error level |
| `ci.yml` | `native-*` jobs | `ci-ok` needs | WIRED | Lines 719 to 749 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SurveyListScreen` | list items, completion | `local_surveys.payload_completion` read by `listLocalSurveys` | Yes (written at the four payload-write sites; SQLite test on 500 rows) | FLOWING |
| `PublicMapScreen` | map items | `usePublicMapExplorer` with `bbox` against `GET /v1/public/map-items` | Yes (`public-map-bbox.e2e-spec.ts`; owner saw Explorer open, empty in production until surveys were public) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Render counts pinned, contexts, completion, viewport, clusters, list sharing | `npm --workspace mobile run test:unit -- render-counts survey-list-500 surveys.completion useMapViewport useMapClusters useSurveyList contexts` | 6 suites, 91/91 passed | PASS |
| Structure and text gates | `node mobile/scripts/structure-report.js unused-styles\|long-files\|status-ids\|literals --max 0` | 0, 0, 0, 0 | PASS |
| Lint including D-06/D-07 rules | `npm run lint` | exit 0 | PASS |
| React spies and nav casts gone | `grep -rln "spyOn(React" mobile/src`; `grep -rn "useNavigation() as\|as any" mobile/src/navigation` | 0; 0 | PASS |
| Root leftovers gone | `ls App.tsx tsconfig.json` at the root | both missing | PASS |
| Native builds, API E2E (bbox), expo-doctor | not run | need CI, a database, or hours of native build | SKIP (recorded CI evidence, runs 36244081522, 36247034895, 36304379789) |

### Probe Execution

No probes are declared for this phase and `scripts/*/tests/probe-*.sh` does not exist. Step 7c: SKIPPED. `scripts/owner-check-simulation.mjs` was run by the plans (VALIDATION.md rows 20 and 21); not re-run here because it needs a running API.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REQ-AUD-mobile-state | 01.9-01 to 03, 08, 09, 18, 22 to 24, 28 | Memoised state, fast list, bbox map | SATISFIED | Truths 1, 2, 3 |
| REQ-AUD-i18n-a11y | 01.9-05, 11 to 17, 20, 21, 29 | Catalogue, roles and labels | SATISFIED | Truth 4 |
| REQ-AUD-hygiene | 01.9-04, 06, 10, 19, 30 to 32 | Dependencies, root, docs, audit links | SATISFIED | Truths 5, 6 |

No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `docs/audits/audit-2026-09-code-complet.md` | 450 | The ARCH-8 row links no PR number: "closing PR of plan 01.9-32 (see `10-VALIDATION.md`...)". The closing PR is #167 per VALIDATION.md. | Info | Criterion 6 asks for a link to the closing PR; the row is accurate but not a link. A one-line edit would fix it |
| `mobile/src/screens/survey-list/` | n/a | The 500-survey render test `survey-list-500.test.tsx` was deleted by the later list redesign, so "fluid with 500 surveys" is no longer asserted by a render test at that size | Warning | Structure (virtualised list, memoised rows, no-parse storage) and the 20-row render-count pin remain; a 500-row render test could be restored from commit history |
| Roadmap criterion 1 and 2 wording | n/a | "React DevTools profile" and "158 unused style keys" are met by substitution (render-count harness; script count 301 now 0) | Info | Decided in D-02 and D-04; the substitutes are committed and pinned |
| Roadmap criterion 5 wording | n/a | "unused tab library removed" is not literal: both libraries are kept (override, D-08) | Info | Owner decision |
| `.planning/phases/01.9*/10-CONTEXT.md` D-01 | n/a | Says the central hook is "called once in `App.tsx`"; it is called once in `AppStateProvider.tsx` | Info | Same guarantee; CLAUDE.md states the real location |

A grep for `TBD|FIXME|XXX` over `mobile/src/state`, `mobile/src/i18n`, `mobile/src/navigation` and `api/src/surveys` found nothing.

### Human Verification Required

None open. The one manual item (owner Release build on an iPhone: liquid-glass tab bar, search, offline cold start) was approved on 2026-09-26 and is recorded in VALIDATION.md "Owner device check". The tab set has changed in later phases (OA-series work), so that check is a record of the phase's state, not of today's UI.

### Gaps Summary

No blocking gaps. State comes from one assembler and memoised contexts, with render-count numbers pinned in a passing test; the list is a virtualised `FlatList` with memoised rows and write-time completion; the map loads by bbox with debounce, clustering and memoised markers; the four structure gates and the ESLint text and accessibility rules pass on today's tree; the root `App.tsx`, root tsconfig and root runtime dependencies are gone, with `bcryptjs`, `@nestjs/schedule` and the SMTP service removed and `@expo/ngrok` a dev dependency; CLAUDE.md matches the code, and the audit report links its findings. Not re-run here: native builds, the bbox E2E suite and `expo-doctor`, whose evidence is the recorded green CI runs and the owner's device approval. The loose ends are minor: the 500-survey render test was lost in a later redesign (warning), the ARCH-8 audit row lacks a PR link, and three criteria are met by documented substitution.

---

_Verified: 2026-10-06T21:50:00Z_
_Verifier: Claude (gsd-verifier)_
