---
phase: 29-field-feedback-fixes-inserted
verified: 2026-10-11T00:00:00Z
status: human_needed
score: 5/7 success criteria verified (SC-2 to SC-6); SC-1 deferred, SC-7 code part verified and device part deferred; 11/11 decisions verified in code
behavior_unverified: 0
overrides_applied: 0
re_verification: false
gaps: []
deferred_human:
  - truth: "SC-1: genus recognition confirmed on at least two real Android phones"
    reason: "Owner decision 2026-10-11: no Android phone available; the Android testers run it later with a Release APK"
  - truth: "SC-7 device part: latency median and p95 against 3 s online and in airplane mode; empty Camera and ImageManipulator cache folders (DC-D-01 to DC-D-03)"
    reason: "Same deferral; protocol written in docs/user-tests/device-checks.md, section Recognition measurement"
human_verification:
  - test: "Recognition on two real Android phones (one low-end), Release APK built with EXPO_PUBLIC_GENUS_TIMING=true"
    expected: "Suggestions come back, median and p95 of totalMs and captureToSuggestionMs under 3 s online and in airplane mode; cache/Camera and cache/ImageManipulator empty after several recognitions"
    why_human: "Needs real hardware; the emulator is not representative (SC-1, SC-7, DC-D-01 to DC-D-03)"
  - test: "Full (non compact) parcel-selection card at 393 x 852"
    expected: "Card readable, map keeps its share, tab bar unchanged"
    why_human: "Not measured on a device; only the compact card (360 x 640 dp) was"
  - test: "IBP info glyph on the wizard method step and the Explorer legend, on Android"
    expected: "Glyph visible, 44 pt target, sheet opens and closes"
    why_human: "Checked on the emulator for the score page sheet only; the two glyph placements are verified by unit tests only"
---

# Phase 29: Field-feedback fixes - Verification Report

**Phase Goal:** The problems reported by the Android testers are gone: photo recognition of genera works on Android (model loads, PR #272), the small-screen map stays readable, abbreviations are explained and genera are easy to find.
**Status:** human_needed. Nothing failed in code. The only open items are the owner-deferred real-Android-phone measurements and three device checks not yet done.
**Re-verification:** No, initial verification.

Evidence base: files read in the worktree (HEAD 5cc44891), plus `npm run lint` (0 problems), `npm run typecheck` (0 errors) and `npm --workspace mobile run test:unit` (325 suites, 4362 tests, all passing; same as the stated gate state). `format:check` reports only the untracked-local `.claude/settings.local.json`, unrelated to the phase. No probes are declared by the phase. No TBD/FIXME/XXX marker in the 77 files changed since the merge base.

## Success criteria

| SC | Verdict | Evidence |
|----|---------|----------|
| 1 Android recognition works, confirmed on 2+ real phones | DEFERRED (human). Code part (model load, PR #272) verified in code and on the emulator | `genusClassifierModel.ts` `loadModel` copies the asset with `Asset.downloadAsync()` and loads from `localUri`; the owner's emulator check (Release, 5 suggestions) is recorded in device-checks D-01. Real-phone confirmation not done |
| 2 Parcel message smaller than the map on small screens | VERIFIED in code and on a device (emulator) | `layout-budget.ts` (threshold 700 divided by font scale, `parcelMapShare` asserted at least 0.5 for the SE and the 360 x 640 dp Android); `ParcelSelectionCard.tsx` compact variant wired in `SurveyParcelSelectionScreen.tsx` (`isCompactParcelCard(height, fontScale)`). Emulator: card about 148 dp, about 60 % of the map visible. Full card at 393 x 852 not device-checked |
| 3 Every abbreviation written out or explained, checked against the inventory | VERIFIED in code; partly on a device | `__checks__/abbreviations.test.ts` scans the whole `fr` catalogue through the TS parser and asserts the real scan equals `[]` (ratchet removed), plus no unused registry term. `fr.abbreviations.terms`, `ui/AbbreviationInfo.tsx` wired on the Score page, the wizard method step and the Explorer legend (`ScoreLegend` `infoTerm="IBP"`). Raw region codes replaced by names in `ClusterListSheet.tsx`. Emulator: IBP info sheet and region names seen. Wizard and legend glyphs on Android not device-checked |
| 4 Genus list sorted alphabetically everywhere shown | VERIFIED in code | `app/genus-order.ts` (Latin key, accent-insensitive `Intl.Collator("fr", base)`, copy sorted, package constant untouched). Used by `FactorGenusListInput.tsx` (`ORDERED_GENUS_CODES`, labels `fr.genus.latinLabel`) and the PDF `survey-pdf/factor-fields.ts`. No other genus list is rendered (stored order untouched). Recognition suggestions keep confidence order by D-07. Latin chips seen on the emulator |
| 5 Offline community survey: centred message with retry | VERIFIED in code and on devices | `ui/CenteredState.tsx` (scroll view with frame-aware insets, icon, message, retry directly below in a non-stretching wrapper, fixed button height after 2c54366b). `CommunitySurveyScreen` and `CommunityHistoryScreen` show it when `offline` (from `useIsOffline()` at the routes); catalogue `communitySurvey.offline` "Ce relevé nécessite une connexion.". Emulator: button 237 x 88 px (785 before). iPhone: repaired (F-1 verified) |
| 6 Offline: own surveys (draft or submitted) drawn from local data, narrowed by D-01 and D-09 | VERIFIED in code and on a device (iPhone) | `storage/surveys.ts` `listLocalSurveyMapSources`; `map/own-surveys.ts` `ownSurveyMapItems` (drafts = status other than submitted, per fix CR-01; position from the in-memory server position else the centre of the cached parcel geometry; unlocated skipped; API ids deduplicated); `hooks/useLocalSurveyMapData.ts`; `PublicMapRoute.tsx` merges `draftItems` and `ownItems` and routes local ids to the owner's `surveyDetail`; `own-drafts.ts` removed. No SQLite schema change. iPhone 15 Pro: own surveys appear after airplane mode, force quit and relaunch (F-2). Android not testable (finding F-3, out of scope) |
| 7 Two temp files deleted explicitly; latency measured on real Android phones | Code part VERIFIED; device part DEFERRED (human) | `recognition/temp-files.ts` (`isDeletableTempPhoto` refuses anything outside `cache/Camera/<file>` and `cache/ImageManipulator/<file>`, `..`, `%2e`, directories, the model copy; fix WR-01 verified); resized JPEG deleted in a `finally` after the base64 read (`genusClassifierModel.ts`); camera capture deleted in a `finally` in `GenusRecognitionModal.handlePhoto`; `recognition/timing.ts` plus `EXPO_PUBLIC_GENUS_TIMING` flag (`feature-flags.ts`, `README-native.md`); unit tests cover success and failure paths. Median/p95 and empty-folder checks (DC-D-01 to DC-D-03) deferred; protocol in `docs/user-tests/device-checks.md` |

## Decisions D-01 to D-11

| D | Verdict | Evidence |
|---|---------|----------|
| D-01 own surveys offline, other members online only | Verified in code, iPhone | `own-surveys.ts`, `PublicMapRoute.tsx`; no API marker cache, `SCHEMA_VERSION` unchanged |
| D-02 no stale marking | Verified in code | No marking added; the existing "Hors connexion" badge is the only signal |
| D-03 centred message plus retry | Verified in code, emulator, iPhone | `CenteredState`, community screens |
| D-04 written out or info icon, one catalogue entry each | Verified in code, partly emulator | `fr.abbreviations`, `AbbreviationInfo` |
| D-05 automated inventory plus gate | Verified in code | `abbreviations.test.ts`, real scan equals `[]` |
| D-06 Latin, accent-insensitive order | Verified in code | `genus-order.ts`, picker, PDF |
| D-07 recognition keeps confidence order | Verified in code | `GenusRecognitionModal` maps `step.suggestions` unsorted; test pins the order |
| D-08 compact parcel card, threshold from measurements | Verified in code, emulator | `layout-budget.ts`, `ParcelSelectionCard.tsx` |
| D-09 position from cached parcel centre, local only | Verified in code, iPhone | `cachedParcelCentre`, `useLocalSurveyMapData`; no API change |
| D-10 Latin chips | Verified in code, emulator | `fr.genus.latinLabel` in `FactorGenusListInput.tsx` |
| D-11 allowlist and IBP policy | Verified in code | `POLICY` in the gate (ha, cm, m, km, Mo, Ko, OK, PDF, GPS, "ex."); IBP defined in onboarding, auth-gate, survey-export and explained on three headers |

## Review fixes (29-REVIEW.md)

- CR-01 (synced draft drawn as normal marker): fixed. `isDraft = source.status !== "submitted"` in `own-surveys.ts`, test updated in 1b71bd7a.
- WR-01 (temp deletion too broad): fixed. `isDeletableTempPhoto` now requires one of the two sub-directories plus a file name and refuses `..` and `%2e`; tests in be34ebdf.
- WR-02 (marker date moved at each sync): partly fixed. A submitted own survey uses `detail.submitted_at` when the detail is in memory (agrees with the API marker); with no detail in memory (offline after a restart) it still falls back to the row's `updated_at`, the last-sync date, which the code comment documents. Warning only, not a goal blocker.
- Open Info items from the review, not goal-blocking: IN-01 empty place label in the cluster list row, IN-02 recognition cards show the French name only while the chips are Latin first (D-07 only concerns order), IN-03 `handleDone` rejection, IN-04 CC0/CC BY long forms, IN-05 unrelated README-native.md reflow.

## Anti-patterns

None blocking. No debt markers, no stubs, all new artifacts are wired and used (checked `CenteredState`, `AbbreviationInfo`, `ParcelSelectionCard`, `useLocalSurveyMapData`, `genus-order`, `temp-files`, `timing`). `own-drafts.ts` was removed with no remaining import.

## Not covered by this phase (recorded elsewhere)

Android offline area download (F-3), the online/offline indicator reliability, the AppPressable root fix, `check-env-parity` on macOS bash 3.2.

## Gaps

None. Status is `human_needed` because of the deferred Android real-phone items and the three device checks listed in the frontmatter.

---

_Verified: 2026-10-11_
_Verifier: Claude (gsd-verifier)_
