# Plan 02-04: Mobile — account deletion entry point + UX audit Lot 0 (minus BUG-04)

**Wave:** 5 + 6 (merged: both are small, independent mobile-only fixes best reviewed together)
**Requirements:** REQ-A-delete-account (build), criterion 8 (BUG-03, BUG-05 through BUG-08, DS-01/02/14)
**Status:** Done

## What changed

### Account deletion (criterion 4)

The API path and most of the mobile plumbing already existed and were more complete than `REQUIREMENTS.md` assumed: `mobile/src/hooks/useSurveySync.ts` already had a full `handleDeleteAccount`/`performDeleteAccount` pair (confirmation alert with correct "anonymised, not deleted" copy in `mobile/src/i18n/fr/status/session.ts`, status messages, `AUTH_REQUIRED` handling, logout-and-purge on success), and `SettingsScreen.tsx` (reachable from the Compte tab via its settings icon) already called it through `sessionActions.handleDeleteAccount`. What was actually broken, and is BUG-05's real content:

- `SettingsScreen.tsx`'s own `confirmDeleteAccount` wrapped the call in a **second** `Alert.alert`, using `mobile/src/i18n/fr/settings.ts`'s copy — which said "y compris vos relevés" (including your surveys), contradicting the correct copy in the alert that fires right after it. Fixed: the local alert is gone; the button now calls `onDeleteAccount()` directly, so there is exactly one confirmation, with the correct copy.
- The "Zone 1 — Compte" danger-zone card was the **first** section of Settings. Moved to last, after sync and dev tools.
- `settingsFr.account.deleteWarning` (the persistent notice above the button) also said "toutes vos données... y compris vos relevés" — corrected to say the identity is deleted and submitted surveys are anonymised and retained, matching the API's actual behavior and the alert's copy. The now-unused `settingsFr.alerts.deleteAccount` block was removed.

### UX audit Lot 0 (criterion 8)

- **BUG-03** `mobile/src/app/survey-logic.ts`: `resolveSurveyUiStatus` now checks `sync_state === "failed"` before `status === "submitted"`, so a submitted-but-failed-to-sync survey reads its sync error, not a green "Soumis". `expired` still wins over a failed sync (terminal, unrelated state).
- **BUG-06** `mobile/src/navigation/AppNavigation.tsx`: the status bar is `dark-content` on both platforms — every tab screen has a light canvas/map background, so `light-content` was unreadable on iOS.
- **BUG-07** `mobile/src/navigation/tab-config.tsx` + new `mobile/assets/tabs/home.png`: Android's native tab bar no longer points Accueil at Mes Relevés' icon file. (Every icon in `assets/tabs/` is a 1x1 placeholder PNG pending real design assets, so `home.png` is a placeholder like the others — the fix is the code no longer aliasing two tabs to the same file.)
- **BUG-08** `mobile/src/screens/HomeScreen.tsx`: pull-to-refresh now tracks a real `refreshing` state around `onRefresh()`, instead of a hardcoded `refreshing={false}` (same pattern as `SurveyListScreen.tsx`).
- **DS-01** `mobile/src/app/brand-tokens.ts`: the "high" IBP score band now renders forest text on sage (5.03:1) instead of white on moss (2.85:1) — the audit's own suggested fix.
- **DS-02** `mobile/src/app/brand-tokens.ts` (`notice.warningText`/`dangerText`), `mobile/src/ui/AppButton.tsx` (`dangerSoft` label) and `mobile/src/components/cards/DraftCard.tsx` (`syncWarningText`): warning/danger text on their soft backgrounds measured ~2.9-4.2:1; switched to `textPrimary` (9-12.6:1), keeping the tone's color on the icon/border instead of the text, matching the audit's suggested approach.
- **DS-14** `mobile/src/app/brand-tokens.ts`: `inputBorder` darkened from `#D6D1C3` (1.34:1 on the field background, the audit's own measured figure) to `#807D75` (3.6:1), clearing the WCAG 3:1 non-text-contrast floor for a resting field/choice-chip border.
- **BUG-04 deferred** (decimal-comma numeric input) — lives in `mobile/src/hooks/useSurveyForm.ts`, the factor-entry form's core validation hook, which the parallel Phase 3 session (Field-Entry Ergonomics) is actively restructuring. Recorded in `11-CONTEXT.md` D-08 and left for Phase 3 or a fast-follow.

## Tests

- New `mobile/src/screens/SettingsScreen.test.tsx`: delete button calls `onDeleteAccount` with no extra local `Alert`; the danger zone renders last, not first; the notice text says "anonymis…", never "y compris vos relevés".
- New case in `mobile/src/app/survey-logic.test.ts` for the BUG-03 precedence (submitted+failed → sync_error/sync_blocked, expired still wins).
- New `mobile/src/navigation/tab-config.test.ts`: structural check that `ANDROID_TAB_ICONS.home` and `.surveys` require different asset paths (the Jest image mock resolves every `.png` to the same value, so this can't be asserted at runtime).
- New `mobile/src/screens/HomeScreen.test.tsx`: pull-to-refresh reflects the real in-flight state of `onRefresh`.
- Existing `IbpScoreBadge.test.tsx`, `SectorScoreCard.test.tsx`, `FactorsSection.test.tsx`, `DetailHeader.test.tsx`, `DraftCard.test.tsx` all reference the changed tokens dynamically (`ibpScoreTokens.colors.high.background`, etc.), so they needed no changes and still pass.

## Verification

```
npm run typecheck               # clean (domain + mobile + api build)
npm run lint                    # clean, all three workspaces
npm --workspace mobile run test:unit   # 97 suites, 1279 tests passed
npm run format:check            # clean (after prettier --write on 2 files)
```

## Follow-on

Two documentation corrections (criterion 7) remain: retagging US-A4 out of MVP scope in `docs/specs/epic-a-access-and-security.md`, and fixing `docs/specs/user-stories.md` §8's V2/deferred filing. Those, plus the phase-gate `11-VALIDATION.md` and `ROADMAP.md` update, are the last plan.
