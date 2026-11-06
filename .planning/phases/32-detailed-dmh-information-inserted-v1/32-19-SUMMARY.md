---
phase: 32
plan: 19
subsystem: mobile-ui
tags: [redesign, guide-sheet, sheet-nav-bar, grouped-list, group-page]
status: complete
requires: [32-REDESIGN-BRIEF.md section B, owner decisions of 2026-10-28, 32-18a, 32-18c]
provides: [SheetNavBar, DmhCallout, DmhSourcesLinkRow, push transition, AppGroupedList medium and minHeight]
key-files:
  created:
    - mobile/src/ui/SheetNavBar.tsx
    - mobile/src/ui/SheetNavBar.test.tsx
    - mobile/src/screens/dmh-guide/DmhCallout.tsx
    - mobile/src/screens/dmh-guide/DmhSourcesLinkRow.tsx
    - mobile/src/screens/dmh-guide/dmh-guide.contrast.test.ts
  modified:
    - mobile/src/screens/dmh-guide/DmhGuideScreen.tsx
    - mobile/src/screens/dmh-guide/DmhGroupPage.tsx
    - mobile/src/screens/dmh-guide/DmhCatalogue.tsx
    - mobile/src/screens/dmh-guide/DmhSourcesPage.tsx
    - mobile/src/screens/dmh-guide/dmh-guide.styles.ts
    - mobile/src/ui/AppGroupedList.tsx
    - mobile/src/ui/DmhDrawing.tsx
    - mobile/test/react-native-reanimated.mock.ts
    - .planning/phases/32-detailed-dmh-information-inserted-v1/32-UI-SPEC.md
commits: [93686db1, 5b835696, f999f0d6, ddb79f93]
---

# Phase 32 Plan 19: guide sheet redesign (brief section B) Summary

The dendromicrohabitat guide sheet now reads as an iOS sheet: a restyled sticky bar, a push transition between its views, a calm group page with one tinted callout and the drawing plate on top, and the catalogue and sources pages on the shared grouped list. Content texts, data, payload, package, API and SQLite are untouched. I could not run the app: everything below is verified by unit tests, typecheck and lint only.

## What changed

- **B-C1 option B** `ui/SheetNavBar.tsx` (reusable): opaque `backgroundCanvas`, 52 high, `zIndex` 1, first child of the one `ScrollView` with `stickyHeaderIndices={[0]}` (structure from 17a kept). Centred `navTitle` on the catalogue; on the other views a plain back (`chevron-back-outline` 22 plus "Tous les groupes" in Sora-Medium 17, `visual.accentText`, 44 high). Close: 44 pt target around a 30 pt `GlassSurface` circle (`visual.sheet.close`, `closeHairline`, glyph `close-outline` 16 in `closeIcon`). A 1 pt `colors.divider` hairline appears only while scrolled (`onScroll` y > 0, `scrollEventThrottle` 16). testIDs `dmh-guide-header`, `dmh-back`, `dmh-close` kept; new `dmh-guide-header-hairline`.
- **Transition** the cross-fade is gone. The new view enters with a Reanimated `Keyframe` (24 pt translate plus fade, `brandMotion.durations.base`, `ReduceMotion.System`): from the trailing edge going forward, from the leading edge going back, nothing at opening. Focus on the title, announcements, scroll-to-top and the hardware back are unchanged.
- **B-C2 group page** top to bottom: the drawing plate (hero, B-I4 option 1), title block, definition as a 16 Jost lead paragraph (no card, no heading), the callout "Ce qui compte pour l'IBP" (radius 18, padding 16, `successBackground`, no border; leaf and title in `onSurface.success`; rule 17/22; method caption; where the content has a difference: hairline, then `dmh-difference` as one accessible sub-block, which replaces the `AppNotice`), then three 17 SemiBold headings on the canvas: recognise (plain text), confusions (`AppGroupedContainer`, `swap-horizontal-outline` rows, hairlines inset 46, no bullet dots) and types (up to two containers under grouped 13 headers, `checkmark-outline` in `ctaPrimary` for counted, `remove-circle-outline` in `textSecondary` for not counted; a11y labels, `dmh-types-counted` and `dmh-types-not-counted` kept). Foot: source line, then "Sources et licence" as a one-row group (`DmhSourcesLinkRow`, `dmh-sources-link`). No `AppCard` left on the page.
- **B-I4** the plate sits first, above the title: the drawing frame is capped at 136 pt so the plate is 168 pt (136 plus 2 x 16). `t.group.definitionTitle` is no longer drawn (kept in the catalogue; only a test asserts it is not drawn).
- **B-I1** `dmh-guide.styles.ts` rebuilt from tokens, no font literal: `brandTypography.sectionHeader.fontFamily` (headings), `brandDefaultFontFamily` (text), `brandTypography.heroBody.fontFamily` (links, back, list labels). Removed `headerSticky`, `headerRow`, `sheetTitle(Box)`, `backButton`, `backText`, `closeButton`, `block`, `blockTitle(Row)`, `subTitle`, `recogniseBlock`, `bullet*`, `typeRow`, `documentLine`, `row*`, `formSection`, `formHeader`, `catalogueFoot`, `rowsCard`. The file is 212 lines (was 221), the structure gate (no unused style key) passes.
- **B-I2 catalogue** one `AppGroupedList` with the seven forms as section titles (Sora 13), rows with `medium`, `labelLines: 3`, `minHeight: 56`, `accessibilityHint`, `testID dmh-catalogue-row-*`; in search mode one flat container with the form as the 13/18 `subtitle`. Empty state without a card (centred title, body, "Voir les 15 groupes" as a 44 high Sora-Medium accent text button). `SearchField` unchanged.
- **B-I3 sources page** lead on the canvas, one `AppGroupedContainer` per document (16 SemiBold title row, then a 12 caption over the 15 Jost value for authors, publisher, year, used for; each row is one accessible element reading "Auteurs : ..."), the precedence sentence in the same callout (no heading), the drawings, offline and consulted lines as meta footer. The `labelled` helper survives only as the accessibility label.
- **Shared primitives** `AppGroupedList` NavRow gets `medium` (Sora-Medium 15/21 label) and `minHeight` (default 48 unchanged); its section titles now carry `accessibilityRole="header"` (so Settings titles are headers too). `DmhDrawing` gets an optional `maxHeight` prop.
- **UI spec** `32-UI-SPEC.md` has a "Revision 2026-10-28" note and the changed Color rows (selection circle, counter ink and fill, callout, drawing ink and plate, sheet close, accent), Typography, the S1 anatomy (order, entry row, sections, row, stepper), S2 (bar, push, catalogue, empty state), S3 (rewritten), S4, S5, Accessibility, Motion rows.

## Deviations from the brief

1. **`DmhDrawing` was edited (the "wrap it" path was not workable).** The brief wants a hero plate of at most 168 pt. The plate's frame is 4:3 and full width, so it is about 230 pt tall at 342 pt wide; a wrapper cannot shrink it without cropping, and a narrower centred plate would not be the hero plate the owner chose. I added one optional prop, `maxHeight` (default 200, so every existing call is unchanged), and the group page passes 136. The R1c plate, ink and stroke scale are untouched.
2. **The bar title is drawn only on the catalogue, not on every view.** The brief says "t.sheet.title on every view". At 375 pt the back control (about 178 pt with "Tous les groupes"), the title (about 165 pt) and the close (44) need about 390 pt in 343 pt, so the title would truncate. On group and sources views the back control takes its place (as before 19; the group's own title is on the page and announced). Easy to change if the owner prefers a truncated title.
3. **Push transition is enter-only.** The old view unmounts at once and the new one slides and fades in (no outgoing animation), so there is no overlap of two pages in the scroll content. The brief's "back is the reverse" is done as entering from the leading edge.
4. **NavRow rows are 56 high through a new `minHeight` row prop and use a new `medium` face**, instead of the shared 48 pt, 16 SemiBold row, so the catalogue keeps the brief's 56 pt rows and the F list's Sora-Medium 15 labels. The "Sources et licence" row uses the default NavRow look (16 SemiBold, 48 pt), as the F guide entry does.
5. **Section titles of `AppGroupedList` are headers for assistive technology** (shared change, needed for the catalogue's header test and good for Settings).
6. **The reanimated Jest mock gained a `Keyframe` class** (`mobile/test/react-native-reanimated.mock.ts`).
7. **`SearchField` compact variant not done** (the brief made it conditional on being trivial; the global search shares the component).
8. The hairline under the bar and the callout divider are 1 pt, not `hairlineWidth`, like the other hairlines of the grouped container.

## Verification

- Jest: `src/screens/dmh-guide`, `src/ui`, `src/__checks__`, `src/navigation` green; then `npm --workspace mobile run test:unit`: 479 suites, 7499 tests passed (includes the structure, motion, icons, catalogue-dash and abbreviations gates). `src/navigation` was not touched, its coverage is unchanged.
- New tests: `SheetNavBar.test.tsx`, hairline and push direction tests in `DmhGuideScreen.test.tsx`, callout/confusion/type/foot tests in `DmhGroupPage.test.tsx`, grouped-document and callout tests in `DmhSourcesPage.test.tsx`, row and empty-state tests in `DmhCatalogue.test.tsx`, `medium`/`minHeight`/header-role tests in `AppGroupedList.test.tsx`, `maxHeight` in `DmhDrawing.test.tsx`, and `dmh-guide.contrast.test.ts` (callout heading, text and captions on the success-soft fill, at least 4.5:1 in both schemes).
- `tsc --noEmit` (mobile) clean; ESLint on `src/screens/dmh-guide`, `src/ui` and the mock clean; Prettier clean on every touched file.

## Not seen on a device

I could not run the app. The owner should check on an iPhone (iOS 26 and an older one if available) and an Android phone, in light and dark:

- The sticky bar in the form sheet at the 0.65 detent and full height: nothing shows above, beside or through it while scrolling; the hairline appears only after the first scroll and goes away at the top (including during a rubber-band bounce).
- The close circle: on iOS 26 it is real Liquid Glass over an opaque canvas bar (it may look faint); on Android it is a flat 8% fill with a hairline. Say if it needs a denser fill.
- The push: forward and back, the view change feels like a push rather than a flash (the old page vanishes at once); no flicker; instant with Reduce Motion on.
- The group page at the 0.65 detent on a 390 x 844 phone: the plate (168) is on top, and the rule callout is visible without scrolling (my estimate is about 436 pt of 548; not measured). Check a group with a difference (3, 4, 5, 6) where the callout is taller.
- The plate: the drawing reads at 136 pt high with the 1.5 stroke scale (drawing is smaller than before: about 181 pt wide), centred in the full-width moss plate.
- Callout colours: the success-soft fill and the green heading in light and in dark.
- Catalogue: 56 pt rows with Sora-Medium labels (up to three lines), seven grouped headers, the search results with the form as a subtitle, the empty state, and the keyboard with `automaticallyAdjustKeyboardInsets`.
- VoiceOver: the bar's back and close, the focus move to the new title on each view, confusion rows read as one element, type rows read "... Compté par l'IBP".

## Known stubs

None.

## Self-Check: PASSED

Commits 93686db1, 5b835696, f999f0d6 and ddb79f93 exist; the created files exist; the full mobile unit suite, typecheck, lint and format pass.
