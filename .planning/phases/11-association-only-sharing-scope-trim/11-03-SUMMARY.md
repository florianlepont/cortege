# Plan 02-03: Mobile — survey detail history/deltas, visibility toggle removed

**Wave:** 3
**Requirements:** REQ-B-survey-detail (build), REQ-C-versioning (build), REQ-X-visibility (client half)
**Status:** Done

## What changed

### Visibility toggle removed (criterion 2)

- `mobile/src/screens/survey-detail/DetailActions.tsx`: dropped the "Rendre public"/"Rendre privé" button and the `onToggleVisibility` prop; the panel now only offers delete (and retry/discard on a failed sync).
- `mobile/src/screens/survey-detail/DetailHeader.tsx`: dropped the public/private status chip.
- `mobile/src/screens/SurveyDetailScreen.tsx` / `mobile/src/navigation/routes/SurveyDetailRoute.tsx`: dropped `onToggleVisibility` from the prop chain. `actions.toggleVisibility` itself (`mobile/src/state/surveys-context.ts`, `useSurveySyncSurveyOperations.ts`) is untouched — per `11-CONTEXT.md` D-01 the column and its API endpoint stay dormant for a future privacy-choice milestone, only the UI control is gone.
- `mobile/src/i18n/fr/survey-detail.ts`: removed `header.visibilityPublic/visibilityPrivate` and `actions.setPrivate/setPublic`.

### Survey-detail history and deltas (criteria 5)

- New `mobile/src/screens/survey-detail/HistorySection.tsx`, rendered in `SummaryTab` between `FactorsSection` and `DetailActions`. It reuses the hook and delta helpers built in plan 02-02 (`useParcelSurveyHistory`, `computeIbpTotalDelta`, `computeFactorDeltas`) rather than duplicating anything:
  - Resolves the survey's parcel as `detail.parcel_ids[0] ?? detail.parcel_id`, since `GET /surveys/:id` is the only source `SurveyDetailScreen` already has for it.
  - Renders nothing without a resolvable parcel; a one-line notice ("Premier relevé soumis sur cette parcelle.") when this is the parcel's first submission.
  - Shows the total, stand/management and context deltas of this survey against the latest previous submitted version, plus a per-factor delta pill for every factor present on both sides (`FACTOR_KEYS` order).
  - Lists every other previous submitted survey on the parcel (year/version/total), oldest first.
  - The current survey is excluded from its own "previous versions" list by filtering on `survey_id`.
- New catalogue section `fr.surveyDetail.versionHistory` (`mobile/src/i18n/fr/survey-detail.ts`); row/delta formatting is shared with the Explorer map's `ParcelHistoryCard` via `fr.parcelHistory`.
- New styles in `mobile/src/screens/survey-detail/summary.styles.ts` (`historyPanel`, `historyRow*`, `historyDelta*`).

## Tests

- New `mobile/src/screens/survey-detail/HistorySection.test.tsx`: no parcel → renders nothing and never fetches; first-submission notice; deltas + factor pills + previous-entry row on a real history response; the current survey is excluded from its own history.
- New delta-arithmetic cases in `mobile/src/app/ibp-scoring.test.ts` for `computeIbpTotalDelta`/`computeFactorDeltas`.

## Verification

```
npm run typecheck               # clean (domain + mobile + api build)
npm run lint                    # clean, all three workspaces
npm --workspace mobile run test:unit   # 94 suites, 1273 tests passed
npm run format:check            # clean (after prettier --write on 3 new/changed files)
```

## Follow-on

Account deletion entry point (criterion 4), remaining UX-audit Lot 0 bugs (criterion 8) and the two documentation corrections (criterion 7) are separate plans.
