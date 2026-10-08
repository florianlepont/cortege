---
phase: 09-shared-ibp-domain-package-and-test-completeness
plan: 11
subsystem: mobile-ibp-display
tags: [ibp-domain, bands, home, public-map, i18n, component-tests]
requires: [01.8-04, 01.8-07]
provides:
  - "IbpScoreBadge and SectorScoreCard read the total out of 50, coloured by totalBand + bandTone"
  - "getIbpScoreColors(score) (ui/IbpScoreBadge.tsx): the one mapping from a /50 total to a token colour pair"
  - "hasMixedMethodVersions(parcels) (hooks/useNearbyParcels.ts) and the home 'méthodes v3.0 et v3.2 mêlées' line"
  - "surveyMethodLabel / surveyPlaceLabel (screens/public-map/SelectedSurveyCard.tsx): 'IBP v3.x' and 'Cas N' or region"
  - "Public map region filter hint 'filtre les relevés v3.0 uniquement'"
affects: [01.8-12, 01.8-13, 01.8-14]
tech-stack:
  added: []
  patterns:
    - "Score colours come from the package's band (totalBand → bandTone → ibpScoreTokens.colors[tone]); no cut-off numbers in the app"
    - "Absent method fields read as v3.0 (resolveMethodVersion), so every display works before the API fills them (01.8-12)"
key-files:
  created:
    - mobile/src/ui/IbpScoreBadge.test.tsx
    - mobile/src/screens/home/SectorScoreCard.test.tsx
  modified:
    - mobile/src/app/brand-tokens.ts
    - mobile/src/ui/IbpScoreBadge.tsx
    - mobile/src/screens/home/SectorScoreCard.tsx
    - mobile/src/screens/HomeScreen.tsx
    - mobile/src/hooks/useNearbyParcels.ts
    - mobile/src/hooks/useNearbyParcels.test.ts
    - mobile/src/i18n/fr/components.ts
    - mobile/src/i18n/fr/home.ts
    - mobile/src/i18n/fr/public-map.ts
    - mobile/src/screens/public-map/SelectedSurveyCard.tsx
    - mobile/src/screens/public-map/ClusterListSheet.tsx
    - mobile/src/screens/public-map/MapControls.tsx
    - mobile/src/screens/public-map/markers.test.tsx
decisions:
  - "ibpScoreTokens keeps only colours, keyed by ScoreTone (low terracotta, mid ochre, high moss) plus empty; the /10 cut-offs 7 and 5 are gone"
  - "hasMixedMethodVersions counts only scored parcels (those the sector average uses); an unsupported version string is ignored rather than counted as a third method"
  - "The selected map card shows the method on its own line and puts 'Cas N' in the meta line where the region code was; an unknown version shows no method line"
  - "The mixed-methods line reuses the sectorMeta style, so home/styles.ts (not in this plan) is unchanged"
metrics:
  duration: "~35 min"
  completed: 2026-09-26
---

# Phase 01.8 Plan 11: /50 totals on home, nearby badge and public map Summary

Home sector card, nearby-parcel badge and public map now show IBP totals out of 50, coloured from `@cortege/ibp-domain`'s `totalBand` (10/20/30/40) through `bandTone`; the home card flags a v3.0/v3.2 mixed average, and the map card shows each survey's method version and, for v3.2, "Cas N" instead of the region code.

## What was done

**Task 1 (b51434a RED, 4788634 GREEN)**
- `brand-tokens.ts`: `ibpScoreTokens.thresholds` removed; `colors` keyed by `ScoreTone` (`low`/`mid`/`high`) plus `empty`.
- `IbpScoreBadge`: exported `getIbpScoreColors(score)` = `ibpScoreTokens.colors[bandTone(totalBand(score))]`; denominator "/50".
- `SectorScoreCard`: "x / 50", 10 dots of 5 points (`round(score / 5)`), dot colour from the same helper, optional `mixedMethods` prop showing `fr.home.sector.mixedMethods`.
- `hasMixedMethodVersions(parcels)` in `useNearbyParcels.ts`, called in `HomeScreen`; the nearby context and AppStateProvider are untouched (01.8-10's files).
- Tests: badge 42 → "42" "/50" high, 25 mid, 5 low, 7 and 15 low (old /10 cut-offs gone), 20 mid / 30 high boundaries, null/undefined empty; sector card 23.4 → "23.4 / 50", 5 mid dots, 42 → 8 high, 7 → 1 low, 50 → all filled, mixed line only when asked; helper: empty/untagged → false, untagged + v3.2 → true, explicit v3.0 + untagged → false, unscored v3.2 ignored, all v3.2 → false.

**Task 2 (96facf2 RED, 27dc5a6 GREEN)**
- `public-map.ts`: `selected.title`, `clusterList.row`, `a11y.surveyMarker`, `a11y.clusterListItem` read "IBP n/50"; new `method.v3_0`/`method.v3_2`, `cas(n)`, `filters.regionHint`. Parameters stay scores, counts, dates and region/cas codes (T-01.9-50 / T-01.8-31).
- `SelectedSurveyCard`: method line + `surveyPlaceLabel` in the meta line; `ClusterListSheet` uses the same place label for its row text and a11y label; `MapControls` renders the region hint under the region field (existing `filtersMeta` + `filterFieldFull` styles).
- `SurveyMarker.tsx` needed no code change: its label comes from the catalogue, now "/50" (tested).
- Tests in `markers.test.tsx`: marker/cluster/title texts contain "IBP 12/50"; v3.2 + cas 3 card shows "IBP v3.2" and "Cas 3" (never "unknown" or the id); untagged and explicit v3.0 items show "IBP v3.0" and the region; cluster rows labelled with "Cas 2" / "ARA" and "/50", no ids; region hint rendered.

D-03 "survey list": the list shows no total (`grep ibp_total mobile/src/screens/survey-list` → 0), nothing to change.

## Verification

- `npm --workspace mobile run test:unit:coverage`: 86 suites, 1177 tests passed (includes `state/render-counts.test.tsx`); coverage floors not lowered (All files 77.12 / 59.68 / 76.13 / 77.68).
- Plan greps: no `thresholds` in brand-tokens, badge or sector card; `grep -c "/50\|/ 50"` components.ts + home.ts = 2; `totalBand(` in IbpScoreBadge.tsx; `hasMixedMethodVersions` in HomeScreen.tsx.
- Structure gates: literals, unused-styles, long-files, status-ids all 0.
- `npm run lint` (0 warnings, both workspaces with `--max-warnings 0`), `npm run typecheck`, `npm run format:check`: clean.

## Deviations from Plan

None - plan executed as written. `SurveyMarker.tsx` is in `files_modified` but needed no edit (the catalogue change covers it).

## Known Stubs

None. `ibp_method_version`, `ibp_cas` and `latest_ibp_method_version` are not yet sent by the API (01.8-12); until then every survey reads as v3.0, which is correct for existing data.

## Self-Check: PASSED

- Files exist: mobile/src/ui/IbpScoreBadge.test.tsx, mobile/src/screens/home/SectorScoreCard.test.tsx
- Commits exist: b51434a, 4788634, 96facf2, 27dc5a6
