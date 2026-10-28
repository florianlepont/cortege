---
phase: 32-detailed-dmh-information-inserted-v1
plan: 12
subsystem: mobile-ui
tags: [dmh, guide, group-page, sources-page, drawings-gate]
requires: ["32-04", "32-10"]
provides:
  - createDmhGuideStyles(theme), shared with plan 32-13
  - DmhGroupPage (code, methodVersion, onOpenSources, titleRef)
  - DmhSourcesPage (titleRef)
  - gate "every drawing has an alt sentence"
affects: [32-13, 32-14]
key-files:
  created:
    - mobile/src/screens/dmh-guide/dmh-guide.styles.ts
    - mobile/src/screens/dmh-guide/DmhGroupPage.tsx
    - mobile/src/screens/dmh-guide/DmhGroupPage.test.tsx
    - mobile/src/screens/dmh-guide/DmhSourcesPage.tsx
    - mobile/src/screens/dmh-guide/DmhSourcesPage.test.tsx
  modified:
    - mobile/src/__checks__/dmh-drawings.test.ts
requirements-completed: [REQ-C-dmh-guide, REQ-C-dmh-illustrations, REQ-DOC-dmh-sources]
metrics:
  tasks: 2
  completed: 2026-10-27
status: complete
---

# Phase 32 Plan 12: Group page and sources page Summary

The two leaf views of the guide sheet: a group page that puts the IBP counting rule first and shows the group's own static drawing at the head of "Comment le reconnaître", and a plain-text sources and licence page; the drawings gate now also requires an alt sentence per drawing.

## Tasks and commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Guide styles and DmhGroupPage | `dbdc375d` |
| 2 | DmhSourcesPage and the alt-sentence gate | `298a8f78` |

## What was built

- `DmhGroupPage`: reads `dmhGroupContent(code, methodVersion)`. Blocks in UI-SPEC S3 order: title block (form caption and label, one accessible header, `titleRef` on it), definition, "Ce qui compte pour l'IBP" (testID `dmh-ibp-rule`, `leaf-outline` hidden from assistive tech, the version caption only when `versionNote` is set), "Comment le reconnaître" (`DmhDrawing` with `drawingFor(code)` labelled by `illustrationAlt`, then the text; no slot without data), confusions (one element per bullet), types (counted list; not-counted list with sub-titles only when both exist), the difference notice (`AppNotice` info inside a `dmh-difference` wrapper, only where the content has one) and the footer with the `dmh-sources-link` button.
- `DmhSourcesPage`: title, lead, three document cards with the four labelled lines, precedence `AppNotice`, the drawings sentence (shown when `DMH_DRAWINGS` has at least one entry), then the offline and consultation lines. No pressable, no address, no opener.
- `createDmhGuideStyles`: sheet, header row, back and close targets (44), page and block spacing, bullets, type rows, footer and link, catalogue row and search row keys for plan 32-13.
- Gate: `dmh-drawings.test.ts` test "every drawing has an alt sentence": for each `DMH_DRAWINGS` key the catalogue `illustrationAlt` is a non-empty sentence ending with a full stop and with no group code.

## Verification

- `npm --workspace mobile run test:unit -- src/screens/dmh-guide src/__checks__/dmh-drawings.test.ts`: 3 suites, 38 tests pass (group page 12, sources page 6).
- `src/__checks__`: all gates pass except `structure.test.ts` "no user-facing literal outside src/i18n", which fails on `mobile/src/screens/factor-detail/DmhGroupList.tsx:104` (plan 32-11's file, a template literal in an accessibilityLabel). Not mine, not fixed here. My own first version tripped the same rule on the difference notice message and was fixed with a `join`.
- `npm run typecheck` (mobile): no error in my files; it reports 3 errors in `src/screens/factor-detail/DmhGroupRow.test.tsx` (plan 32-11, `ElementType` compared to `"Ionicons"`), left alone.
- `npx eslint src/screens/dmh-guide src/__checks__` clean; `npx prettier --check "mobile/src/screens/dmh-guide/*" mobile/src/__checks__/dmh-drawings.test.ts` clean.
- Acceptance greps: `dmhGroupContent(` 1, `drawingFor(code)` 1, no `Linking|openURL|https?://` in the sources page; files well under 400 lines (161, 182, about 80).

## Deviations from Plan

**1. [Rule 1 - Bug] Colour token.** The plan names `colors.textMuted` for the bullet dot, which does not exist in the theme; used `colors.textSecondary` (the same muted role).

**2. Sources link role.** The link is a button, not `accessibilityRole="link"` (it navigates inside the sheet, nothing opens externally).

**3. Header refs.** `titleRef` (a `View` ref per the plan) sits on an accessible header `View` wrapping the form caption and the title, so VoiceOver reads them as one header and focus can land on it.

**4. Difference notice message.** The lead and the difference sentence are one string joined with a space, so the notice is read as a whole (UI-SPEC accessibility); the notice sits in a `dmh-difference` wrapper because `AppNotice` takes no testID.

## Owner decisions applied

D-06 and D-11 (static drawing at the head of the recognise block), O-32-7 (difference notice, content-driven), O-32-9 (own-words sources), O-32-2 (official form name on the group page). No answer differed from a default.

## Known Stubs

None. The views are not registered or wired anywhere on purpose (plans 32-13 and 32-14).

## Threat Flags

None. T-32-29 (no address or opener: grep and test), T-32-30 (rule first, difference only in the labelled notice: order test) and T-32-31 (drawing by group code through `drawingFor(code)`, alt sentence gate) are mitigated.

## Self-Check: PASSED

Files exist under `mobile/src/screens/dmh-guide/` and `mobile/src/__checks__/dmh-drawings.test.ts`; commits `dbdc375d` and `298a8f78` are in `git log`.
