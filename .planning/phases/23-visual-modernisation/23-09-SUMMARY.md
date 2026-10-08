---
phase: 23-visual-modernisation
plan: 09
subsystem: mobile-screens-account-settings
tags: [account, settings, grouped-list, glass, icon-tile, segment, variant-i]
requires: ["12.2-05", "12.2-07"]
provides:
  - "AppGroupedList as a glass card list with an optional 28 pt outline icon tile (AppGroupedListIconTile exported)"
  - "Compact Account screen: horizontal glass identity card (avatar 56 pt), icon tiles on every row"
  - "Compact Settings screen: glass segment theme picker, icon tiles on nav rows"
affects: [every screen using AppGroupedList: Account, Settings, OfflineAreas, SurveyDetail, SurveyContext, GenusTargetSheet, CommunitySurvey]
tech-stack:
  added: []
  patterns:
    - "Row icons are plain `icon` fields of the row descriptor; custom rows reuse the exported tile"
    - "Segment container with chip children: inactive chips are transparent, the active one keeps the AppChoiceChip inverted look"
key-files:
  created: []
  modified:
    - mobile/src/ui/AppGroupedList.tsx
    - mobile/src/ui/AppGroupedList.test.tsx
    - mobile/src/screens/AccountScreen.test.tsx
    - mobile/src/screens/account/IdentityCard.tsx
    - mobile/src/screens/account/IdentityCard.test.tsx
    - mobile/src/screens/account/ProfileRows.tsx
    - mobile/src/screens/account/AccountSettingsRows.tsx
    - mobile/src/screens/account/styles.ts
    - mobile/src/i18n/fr/account.ts
    - mobile/src/screens/SettingsScreen.tsx
    - mobile/src/screens/SettingsScreen.test.tsx
    - mobile/src/i18n/fr/settings.ts
key-decisions:
  - "Section header spacing is 24 above (16 list gap plus an 8 margin on the title) and 8 below, the UI-SPEC compact rule, instead of a bare 16 list gap"
  - "Profile fields (custom rows) get their icon through the exported AppGroupedListIconTile inside ProfileFieldRow, so all rows share one tile"
  - "Inactive segment chips are made transparent through the chip style prop; AppChoiceChip itself is unchanged"
requirements-completed: []
metrics:
  tasks: 3
  files: 12
  completed: 2026-10-07
status: complete
---

# Phase 12.2 Plan 09: Account and Settings (variant I) Summary

Account and Settings now follow variant I: grouped lists are glass cards with 28 pt moss icon tiles, the Account identity block is a compact horizontal glass card with a 56 pt avatar, the theme picker is a glass segment group, and the two em dash placeholders became "Non renseigné". Logout, delete-account, theme persistence and dev-tools gating are untouched.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Glass grouped list with optional icon tile | 3f5c3da |
| 2 | Compact Account screen | a0fd6a6 |
| 3 | Compact Settings screen with glass segment theme picker | 5f201aa |

## What was built

- **AppGroupedList**: `sectionBody` is the glass card (`glass.cardFill`, 1 pt `cardBorder`, `cardShadow`, radius 22, continuous curve, overflow hidden). Nav rows pad 12 by 16, gap 12, `ROW_MIN_HEIGHT = 48` kept. New `icon?: keyof typeof Ionicons.glyphMap` renders a 28 pt tile (radius 12, `glass.iconTile`) with a 20 pt glyph in `glass.iconTint` (terracotta when the row is destructive); the divider is inset under the label for rows with an icon. Section titles use `brandTypography.sectionHeader`. Legacy `brandSpacing` usage removed from the file.
- **Account**: `AVATAR_SIZE = 56`; `IdentityCard` is a horizontal glass card (avatar left, name in `screenTitle` and the e-mail in `footnote` right), the camera badge stays a `GlassSurface` (24 pt, glyph 14). Icons: firstName and lastName `person-outline`, displayName `at-outline`, email `mail-outline`, password `key-outline`, logout `log-out-outline`. Profile input rows are 48 pt with a 44 pt input. `email.empty` is "Non renseigné".
- **Settings**: the three chips sit in one segment `View` (`chip.fill`, `chip.border`, pill radius, padding 4, gap 4), each chip `flex: 1` with its own 44 pt `minHeight`; the active chip is the inverted neutral (dark filled, per UI-SPEC, not the sketch's white raised segment). Icons: `cloud-download-outline`, `information-circle-outline`, `leaf-outline`, `trash-outline`. `about.versionUnknown` is "Non renseigné". SettingsScreen is 264 lines.

## Open 12.1 findings absorbed (D-10)

None. `docs/user-tests/owner-acceptance.md` has no open entry about an Account or Settings element rewritten here (OA-69 to OA-82, OA-108 and OA-125 are closed).

## Verification

- `npm run lint`, `npm run typecheck` exit 0.
- `npm run test:coverage:mobile`: 194 suites, 2102 tests pass, thresholds met. ibp-domain suite: 230 pass.
- `npm run format:check` flags only the untracked local `.claude/settings.local.json` (ignored per instructions).
- Not re-run at root: the API unit suite (known unrelated local failure in `check-env-parity.spec.ts`, macOS bash 3.2).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Section header spacing from the plan did not match UI-SPEC**
- **Found during:** Task 2
- **Issue:** Task 1 asked for a list gap of 16 only, while Task 2 and the UI-SPEC density rule ask for header margin 24 top and 8 bottom.
- **Fix:** list gap 16, section title `marginTop` 8, title to body gap 8. The change to `AppGroupedList.tsx` was committed with Task 2 (a0fd6a6) because it was found while verifying Account.
- **Commit:** a0fd6a6

**2. [Rule 3 - Blocking] Maps section typed as plain strings**
- **Found during:** Task 3
- **Issue:** the conditional spread in `sections` widened `icon` to `string`, which `AppGroupedListRow` rejects.
- **Fix:** `satisfies AppGroupedListSection[]` on that array.
- **Commit:** 5f201aa

**3. [Process] TDD order**
- Implementation was written before its new tests inside each task (tests then run green); no separate RED commits. Each behaviour line of the plan has an assertion.

## Deferred Issues

- On device (not checkable in unit tests): look of the centred "Se déconnecter" and "Supprimer mon compte" rows with their leading tile (the label centres in the space right of the tile), the longest profile label "Nom d'affichage" next to its tile and input at large Dynamic Type, and the Account identity name at 24 pt next to the 56 pt avatar for long names (one line, truncated).
- The other screens that use AppGroupedList (OfflineAreas, SurveyDetail, SurveyContext, GenusTargetSheet, CommunitySurvey) now render glass cards with 24 above section titles; they get a visual check in their own batches.
- `npm run test:unit` at the root fails locally in the API suite `check-env-parity.spec.ts` (macOS bash 3.2), unrelated.

## Known Stubs

None.

## Threat Flags

None. T-12.2-16 mitigated: no logic change in the logout, delete-account or reset flows, their existing tests stay green and only styles and icon fields changed. T-12.2-17 mitigated: `ROW_MIN_HEIGHT` 48 asserted in `AppGroupedList.test.tsx`, chips keep 44 pt, the avatar button (56 pt) and the profile inputs (44 pt) stay above the minimum.

## Self-Check: PASSED

- FOUND: all 12 modified files; commits 3f5c3da, a0fd6a6, 5f201aa on the branch.
