---
phase: 24-survey-history-split
plan: 06
subsystem: mobile-survey-detail
tags: [typescript, react-native, navigation, header-menu]
requires:
  - phase: 24-survey-history-split
    provides: plan 24-03, the surveyJournal route and fr.surveyDetail.menu.journal
provides:
  - "Journal du relevé" entry in the owner's summary "…" menu (iOS native menu and Android / Expo Go sheet)
  - SurveyDetailScreenProps.onOpenJournal and the stable route callback navigating to surveyJournal
affects: [24-07, 24-11, 24-12]
tech-stack:
  added: []
  patterns: ["menu entry added only to the owner's header hook, so another member's page cannot expose it"]
key-files:
  created: []
  modified:
    - mobile/src/screens/survey-detail/useSurveyDetailHeader.tsx
    - mobile/src/screens/survey-detail/useSurveyDetailHeader.test.tsx
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/navigation/routes/SurveyDetailRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/screens/SurveyDetailScreen.tsx
    - mobile/src/screens/SurveyDetailScreen.test.tsx
key-decisions:
  - "D-05: nothing moved. Partager stays its own visible header button (OA-48) and Supprimer keeps its destructive native confirmation; the phase adds one entry only, in the order Renommer, Journal du relevé, Supprimer"
  - "The Android header stays two 44 pt buttons (share, then the menu button); the journal entry lives in the AppActionSheet, which has no icons"
requirements-completed: []
status: complete
duration: 15min
completed: 2026-10-09
---

# Phase 24 Plan 06: Journal du relevé menu entry Summary

The owner's survey summary now offers "Journal du relevé" in its "…" menu on every platform: native iOS menu item (SF Symbol `clock.arrow.circlepath`) between "Renommer" and "Supprimer", and the first option of the Android / Expo Go action sheet before "Supprimer". It opens the `surveyJournal` page from plan 24-03. REQ-C-history-split is deliberately left unchecked (the owner closes it after the phone check in plan 24-12).

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Route callback, screen prop and the Android / Expo Go sheet option | e1624d75 |
| 2 | Journal action in the iOS header menu | 3f462ab4 |

## What changed

- `screen-props.ts`: `onOpenJournal: () => void` on `SurveyDetailScreenProps`.
- `SurveyDetailRoute.tsx`: `onOpenJournal = useLatestCallback(() => navigation.navigate("surveyJournal"))`, passed to the screen (stable, so the native header items do not churn).
- `SurveyDetailScreen.tsx` (319 lines, under the 400 cap): destructures `onOpenJournal`, passes it to `useSurveyDetailHeader`, and the `AppActionSheet` options are `[Journal du relevé, Supprimer (destructive)]`.
- `useSurveyDetailHeader.tsx`: new `onOpenJournal` param, iOS menu item inserted after the rename item and before the destructive delete, added to the `useLayoutEffect` deps; doc comments updated. Android branch untouched.
- Tests: route assertion `onOpenJournal` -> `navigate("surveyJournal")`; sheet options for a draft and a synced survey (order, journal not destructive, delete destructive and last, each press calls the right callback); header menu labels [rename, journal, delete] / [journal, delete] (finished survey and Expo Go), icon name and non-destructive flag on the journal item, delete still last and destructive; the screen passes `onOpenJournal` to the header hook; Android test unchanged (still exactly two 44 pt buttons).

## D-05 decision

Decided by reading the code (UI-SPEC flag 2, RESEARCH R3): export and delete are already where D-05 wants them (visible "Partager" button, destructive "Supprimer" in the menu with `confirmDeleteSurvey`). Nothing is moved or duplicated.

## Threat model

- T-24-06: the entry is added only inside `useSurveyDetailHeader`, called only by the owner's `SurveyDetailScreen`. The community page does not use it (source tests for that arrive in plan 24-11).
- T-24-11: "Supprimer" stays last and destructive; tests assert order and that the journal option is not destructive.

## Deviations from Plan

None - plan executed exactly as written. Prettier reformatted one long doc-comment line in `useSurveyDetailHeader.tsx` (formatting only).

## Verification (real runs)

- Task 1: `cd mobile && npx jest --config jest.unit.config.js src/screens/SurveyDetailScreen.test.tsx src/navigation/routes/routes.test.tsx src/__checks__/structure.test.ts`: 3 suites, 120 tests passed; `npx tsc --noEmit` clean; the grep acceptance checks hold (`navigate("surveyJournal")`, `label: menuText.journal`, `onOpenJournal: () => void`, `"onOpenJournal"` in routes.test, SurveyDetailScreen.tsx = 319 lines).
- Task 2: `useSurveyDetailHeader.test.tsx` and `SurveyDetailScreen.test.tsx`: 2 suites, 25 tests passed; `fr.surveyDetail.menu.journal` appears 3 times in the header test; `clock.arrow.circlepath` and `menuText.journal` present in the hook.
- `npm run test:coverage:mobile`: exit 0, 259 suites / 3254 tests passed, `mobile/src/navigation` at 100/100/100/100.
- `npm run lint`: exit 0. `npm run typecheck`: exit 0. `npm run format:check`: only warns on the git-ignored `.claude/settings.local.json` (known, ignored).
- `npm run test:unit` exit 1 because of the API suite `api/test/check-env-parity.spec.ts` (34 failures in `check-env.sh agrees with the API production check`, shell script status 2 versus the expected code). This plan changed only files under `mobile/src`, so it is unrelated; I did not investigate or fix it (out of scope). The ibp-domain package tests (230) and all mobile tests passed.
- API e2e not run: `api/.env.test` does not exist locally; nothing in this plan touches the API.
- Not verified on a device: the iOS native menu item and the sheet are covered by unit tests only; the phone check is plan 24-12.

## Known Stubs

None.

## Self-Check: PASSED

- Commits e1624d75 and 3f462ab4 exist; the seven listed files are modified in them.
