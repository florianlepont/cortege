# Batch 7 — Remediation sweep (criterion 5)

Criterion 5 (not a numbered `ROADMAP.md` success criterion, but the task's explicit scope) folds in
the remaining audit findings assigned to this phase: DS-05, DS-10, DS-11 (delivered in batch 1,
additively — see `18-01-SUMMARY.md`), DS-13, DET-03/DET-04, HOME-06, LIST-07 and ACC-02.

## DS-13 — safe-area-driven JS tab bar

- `navigation/tab-config.tsx`: the static `JS_TAB_BAR_STYLE` object becomes
  `buildJsTabBarStyle(insets: TabBarInsets = { bottom: 0 })` — a fixed content height (50) plus a
  platform-default `paddingTop` and `Math.max(insets.bottom, 10)` as `paddingBottom`, so the JS tab
  bar (Android / Expo Go) respects the device's actual home-indicator inset instead of a hardcoded
  guess.
- `navigation/tabs/JsRootTabs.tsx` (the one real component in the JS tab tree): calls
  `useSafeAreaInsets()` and threads it into `jsTabScreenOptions(props, insets)` and the surveys
  tab's inline `buildJsTabBarStyle(insets)`.
- `navigation.test.tsx`, `tabs.test.tsx`: added a `react-native-safe-area-context` mock (previously
  unmocked since nothing in this tree called it); a `.toBe(JS_TAB_BAR_STYLE)` reference-equality
  test became `.toEqual(...)` since the style is now computed fresh per call; a new test exercises
  the navigator-level `screenOptions` wrapper directly (needed for 100% function coverage on that
  file).

## HOME-06 / LIST-07 — Home avatar and failed-sync message threading

- `HomeScreen.tsx`: the avatar is now a `Pressable` wrapping `expo-image`'s `ExpoImage` (loaded via
  `resolveProfilePictureUri`, reused from `account/IdentityCard`, with a Bearer-token
  `Authorization` header) or the placeholder icon when there's no photo; tapping it calls the new
  `onNavigateToAccount` prop. `HomeRoute.tsx` supplies `accessToken`/`apiUrl` and navigates to
  `account` → `accountHome`.
- `HomeScreen.tsx`'s failed-sync alert now reads
  `formatSyncErrorForUser(alertSurvey.last_sync_error, alertSurvey.last_sync_error_code)`, matching
  the same code-aware formatting `SurveyRow`/`DetailActions` already use, instead of one generic
  fallback string. (LIST-07's other half — a "+N autres" link — is moot: Phase 7 already removed
  the card it would have lived on; see `18-CONTEXT.md`.)

## DET-03 / DET-04 — native "…" menu on survey detail

- New `ui/AppActionSheet.tsx` (+ test): a `Modal`-based action sheet (title, a list of
  `{ label, destructive?, onPress }` options, a cancel row) — options close the sheet before running
  their action, so no separate loading/double-submit guard is needed.
- `survey-detail/DetailHeader.tsx`: converted to `forwardRef` and exposes a `DetailHeaderHandle`
  (`{ startRename: () => void }`) so the screen-owned menu can trigger the existing rename form; the
  header now renders a discoverable "…" button (`onOpenMenu`) instead of making the whole title row
  a tap target with no visual affordance.
- `survey-detail/DetailActions.tsx`: rewritten down to just the sync-error notice — "Réessayer"
  is now the notice's own integrated action (`AppNotice`'s `action` prop) instead of a separate
  equal-weight button, and "Annuler la modification locale" stays a lesser-weight underlined link.
  Export and delete moved into the header's menu.
- `SurveyDetailScreen.tsx`: wires a `detailHeaderRef`, a `menuVisible` state, `handleSharePdf`
  (reusing `exportAndShareSurveyPdf`), and `menuOptions` (Renommer → `startRename()`, Partager →
  `handleSharePdf()`, Supprimer → `onDeleteSurvey`, destructive) into an `AppActionSheet`.
- `i18n/fr/survey-detail.ts`: new `menu: { rename, share, delete, cancel }`; `a11y.openMenu`
  replaces `a11y.renameSurvey`; `actions` trimmed to `{ retryNow, discardLocalChange, exportFailed,
  exportShareUnavailable }` (title/subtitle/deleteSurvey/exportPdf/exportingPdf removed — no longer
  rendered as standalone button labels).

### Deliberate scope decision

"Visibilité" is **not** in the menu. Phase 2 already removed the private/public visibility control
from the app entirely (survey visibility is fixed at submit time), and Phase 10 re-verified that
removal; adding it back to this menu would be net-new scope this phase doesn't own. See
`18-CONTEXT.md`.

## ACC-02 — logout warning (verified, not rebuilt)

Phase 1.2's `handleLogout` (D-03) already shows a destructive confirmation (`Alert.alert` with a
"Se déconnecter" / "Annuler" choice) before signing out and clearing local session state — this was
re-checked against the current `useAuth0Session`/`AccountScreen` code and found unchanged and
correct. No code change was needed; recorded here per the task's instruction to verify before
building anything new.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green at every
sub-batch; `npm run test:coverage:mobile` green at phase close (144 suites, 1623 tests, all
per-directory coverage ratchets met or improved).
