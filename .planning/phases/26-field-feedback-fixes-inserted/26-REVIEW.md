---
phase: 26-field-feedback-fixes-inserted
reviewed: 2026-10-11T00:00:00Z
depth: standard
files_reviewed: 43
files_reviewed_list:
  - mobile/README-native.md
  - mobile/src/app/feature-flags.ts
  - mobile/src/app/genus-order.ts
  - mobile/src/app/survey-pdf/factor-fields.ts
  - mobile/src/hooks/useLocalSurveyMapData.ts
  - mobile/src/i18n/fr/abbreviations.ts
  - mobile/src/i18n/fr/account.ts
  - mobile/src/i18n/fr/community-survey.ts
  - mobile/src/i18n/fr/factor-detail.ts
  - mobile/src/i18n/fr/genus.ts
  - mobile/src/i18n/fr/ibp-method.ts
  - mobile/src/i18n/fr/index.ts
  - mobile/src/i18n/fr/labels.ts
  - mobile/src/i18n/fr/parcel-selection.ts
  - mobile/src/i18n/fr/public-map.ts
  - mobile/src/i18n/fr/survey-detail.ts
  - mobile/src/i18n/fr/survey-export.ts
  - mobile/src/i18n/fr/validation.ts
  - mobile/src/map/own-surveys.ts
  - mobile/src/navigation/routes/CommunityHistoryRoute.tsx
  - mobile/src/navigation/routes/CommunitySurveyRoute.tsx
  - mobile/src/navigation/routes/PublicMapRoute.tsx
  - mobile/src/recognition/genusClassifierModel.ts
  - mobile/src/recognition/temp-files.ts
  - mobile/src/recognition/timing.ts
  - mobile/src/screens/PublicMapScreen.tsx
  - mobile/src/screens/SurveyParcelSelectionScreen.tsx
  - mobile/src/screens/SurveyScoreScreen.tsx
  - mobile/src/screens/community-survey/CommunityHistoryScreen.tsx
  - mobile/src/screens/community-survey/CommunitySurveyScreen.tsx
  - mobile/src/screens/parcel-selection/ParcelSelectionCard.tsx
  - mobile/src/screens/parcel-selection/layout-budget.ts
  - mobile/src/screens/public-map/ClusterListSheet.tsx
  - mobile/src/screens/public-map/ScoreLegend.tsx
  - mobile/src/screens/survey-wizard/SurveyWizardScreen.tsx
  - mobile/src/screens/survey-wizard/wizard.styles.ts
  - mobile/src/storage/surveys.ts
  - mobile/src/storage/types.ts
  - mobile/src/ui/AbbreviationInfo.tsx
  - mobile/src/ui/CenteredState.tsx
  - mobile/src/ui/FactorGenusListInput.tsx
  - mobile/src/ui/GenusCameraView.tsx
  - mobile/src/ui/GenusRecognitionModal.tsx
findings:
  critical: 1
  warning: 2
  info: 5
  total: 8
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-10-11
**Depth:** standard
**Files Reviewed:** 43
**Status:** issues_found

## Summary

The phase is mostly clean. The recognition temp-file handling deletes only the two exact URIs it is given and covers every path (ok, unavailable, thrown, closed mid-run); the genus order never mutates stored arrays; the offline copy of the community pages is chosen from `useIsOffline`, not from the error; the parcel-selection continue button is disabled without a parcel in both card modes; the SQLite schema stays at 5; the new i18n threshold and BMg/BMm/TGB/GB rewrites keep their meaning (checked against the old text and the factor tables).

One real defect is on the main path of the Explorer's own markers (D-01): the draft test uses the wrong rule and a synced draft is drawn as a submitted survey. There are two edge-path warnings (a path guard that cannot protect the model copy, and a drifting date on own non-draft markers) and five minor items.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: A draft that has synced is drawn as a submitted survey (wrong marker, wrong list)

**File:** `mobile/src/map/own-surveys.ts:83` (also the `own` branch at `:95`)
**Issue:** `const isDraft = source.status === "draft"` reads the `local_surveys.status` column, but that column does not stay `"draft"` for a draft. `markSurveyQueueRowSynced` (`mobile/src/storage/sync.ts:78-82`) sets `status = CASE WHEN status = 'submitted' THEN status ELSE 'synced' END` once the upsert is acknowledged, and `resolveEffectiveSurveyStatus` (`mobile/src/app/survey-logic.ts:73-83`) maps the same way. So every draft that was pushed while online has `status = 'synced'` (or `'error'`) and falls into the `own` list: it gets the normal solid marker, a visible score as if finished, and is counted by the pill, instead of the dashed draft marker (D-01 "drafts keep the dashed marker"). Only a draft created offline and never synced (or a draft just pulled, which inserts `survey.status ?? "draft"`) is shown as a draft. The rest of the app uses the opposite rule: "not finished = `status !== "submitted"`" (`screens/HomeScreen.tsx:71`, `screens/home/ToolsSection.tsx:33`, `screens/survey-list/list-items.ts:27`, `screens/survey-detail/summary-state.ts:47,70`, `screens/survey-detail/useSurveyDetailData.ts:54`). The unit tests of this module use `status: "draft"` rows, so they cannot see it; `surveys.map-sources.sqlite.test.ts` only reads rows, it never runs a sync.
**Fix:**
```ts
// same rule as Home, the list and the detail screen
const isDraft = source.status !== "submitted"
```
and add a test row with `status: "synced"` (and one with `"error"`) expecting the dashed draft list.

## Warnings

### WR-01: `isDeletableTempPhoto` accepts the cache directory itself and any file in it, so it cannot protect the model copy

**File:** `mobile/src/recognition/temp-files.ts:14-18`
**Issue:** The header says only exact recognition URIs may be deleted and that the model copy (`Asset.downloadAsync()`, in the same cache directory) must survive, but the guard is only `uri.startsWith(cacheDirectory) && !uri.includes("..")`. `deleteTempPhoto(FileSystem.cacheDirectory)` (the bare directory URI, which passes both checks) would, with `idempotent: true`, delete the whole cache directory including the model; the model copy's own URI passes too. Today the two callers (`GenusRecognitionModal.tsx:99`, `genusClassifierModel.ts:119`) pass only URIs returned by `expo-camera` / `expo-image-manipulator`, so this is latent, but a guard that is the only line of defence of an explicit requirement (SC-7, "no directory sweep") should enforce it. A percent-encoded `%2e%2e` also bypasses the `..` check (not reachable today, same cause).
**Fix:** Require one of the two known sub-directories and a file name:
```ts
const TEMP_PHOTO_DIRS = ["Camera/", "ImageManipulator/"]
export function isDeletableTempPhoto(uri: string | null | undefined): uri is string {
  const cache = FileSystem.cacheDirectory
  if (!cache || !uri || !uri.startsWith(cache) || uri.endsWith("/")) return false
  const rest = uri.slice(cache.length)
  return TEMP_PHOTO_DIRS.some((dir) => rest.startsWith(dir)) && !/\.\.|%2e/i.test(rest)
}
```
(update `temp-files.test.ts` to pin that the model copy and the bare cache URI are refused).

### WR-02: Own non-draft markers carry the last-sync date, not the submission date

**File:** `mobile/src/map/own-surveys.ts:90`
**Issue:** `survey_date` for a non-draft is `source.updated_at.slice(0, 10)`. `updated_at` is rewritten with `now` on every sync acknowledgement (`storage/sync.ts:87`) and on every pull (`:322`), so the date shown in the cluster list row, its accessibility label and the marker sheet moves each time the phone syncs, and is the UTC date of the sync. The API item it replaces carries `submitted_at.slice(0, 10)` (`api/src/surveys/public-map.utils.ts:62-64`). The same survey therefore shows two different dates depending on whether the API copy or the local copy won (online vs offline).
**Fix:** Use a stable date: for a pulled/submitted survey take the date of the cached detail when the phone has it (`input.surveyDetails[source.id]?.submitted_at ?? created_at`), else `created_at`. At minimum fall back to `created_at` rather than `updated_at`.

## Info

### IN-01: `surveyPlaceLabel` can return an empty string, leaving an empty meta line and an a11y label ending in ", "

**File:** `mobile/src/screens/public-map/ClusterListSheet.tsx:22-28,44-51`
**Issue:** An unknown code (or a v3.2 survey whose `ibp_cas` is not valid, or an own survey with `region_version` unset giving `region_code: ""`) now returns `""`. The row renders an empty `Text` and `t.a11y.clusterListItem` produces `"Relevé, IBP 30/50, 2026-09-01, "`. The long region name ("Régions atlantique, continentale et alpine") is also cut by `numberOfLines={1}`.
**Fix:** Do not render the status line when empty and build the a11y label without the trailing separator (`[..., place].filter(Boolean).join(", ")`).

### IN-02: Recognition results show the French name only, while the chips and the PDF are Latin-first

**File:** `mobile/src/ui/GenusRecognitionModal.tsx:198`
**Issue:** D-10 moved the picker chips and the PDF to `fr.genus.latinLabel(code)` ("Abies (Sapin)"), but the suggestion cards still use `fr.genus.displayName[...]`. The surveyor sees "Sapin" in the suggestions and "Abies (Sapin)" right after in the list. Suggestion order (confidence) is correctly left unsorted.
**Fix:** `{fr.genus.latinLabel(suggestion.genus)}`.

### IN-03: `handleDone` swallows no rejection and does not re-check the selection requirement

**File:** `mobile/src/screens/SurveyParcelSelectionScreen.tsx:168-173`
**Issue:** `void onSave().finally(() => setSaving(false))` leaves an unhandled rejection if `onSave` rejects (the inline code it replaced did the same). The wizard rule "no continue without a parcel" is enforced only by the button's `disabled` prop (`ParcelSelectionCard.tsx:56`), not in the handler.
**Fix:** `if (saving || (wizard && !hasParcelSelection)) return` and `void onSave().catch(() => undefined).finally(...)` (or surface the error through the existing status path).

### IN-04: Abbreviation long forms lose information

**File:** `mobile/src/i18n/fr/abbreviations.ts:43-52`, `mobile/src/i18n/fr/survey-export.ts:39-41,145`
**Issue:** `CC0` and `CC BY` both expand to just "Creative Commons" (the "Zero" / "Attribution" meaning is only in the explanation). The PDF's `commune` label "code officiel géographique" is less recognisable than "code INSEE" for the CNPF readers who look the code up, and the map source line dropped the "(c)" while the in-app legend keeps it.
**Fix:** Use "Creative Commons Zéro" and "Creative Commons Attribution", "Commune (code officiel géographique, INSEE)", and restore "©" in `map.source` if the Géoplateforme attribution terms ask for it.

### IN-05: Unrelated Prettier reflow of `mobile/README-native.md`

**File:** `mobile/README-native.md:68,77-84,121-126`
**Issue:** The formatter pass de-indented the continuation lines of two list items (inline code spans broken across lines at column 0, e.g. "android --clean`, then ...") and re-aligned a table; this is noise in a phase diff and makes the rendered list item read worse. The new "Genus recognition timing" section is fine.
**Fix:** Revert the unrelated hunks (or add the file to `.prettierignore`).

---

_Reviewed: 2026-10-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
