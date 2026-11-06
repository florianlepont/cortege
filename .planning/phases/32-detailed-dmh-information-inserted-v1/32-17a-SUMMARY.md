---
phase: 32
plan: 17a
subsystem: mobile guide sheet
status: complete
tags: [dmh-guide, sheet, sticky-header, owner-feedback]
key-files:
  modified:
    - mobile/src/screens/dmh-guide/DmhGuideScreen.tsx
    - mobile/src/screens/dmh-guide/dmh-guide.styles.ts
    - mobile/src/screens/dmh-guide/DmhGuideScreen.test.tsx
---

# Phase 32 Plan 17a: the guide sheet header stays at the top

Owner feedback on the phone: the close button of the guide sheet scrolled away with the content.

## Approach

Option 1: the header stays the first child of the one `ScrollView` and the scroll view gets `stickyHeaderIndices={[0]}`.

- A native stack header (option 2) is not available: both sheet routes use `headerShown: false` and a header outside the scroll view was drawn under the scrolled text inside the native iOS form sheet (the FactorHelpSheet finding). Keeping the header inside the scroll content avoids that quirk, and sticking it keeps it visible.
- The sticky wrapper (`headerSticky`, testID `dmh-guide-header`) has an opaque `backgroundColor` equal to the sheet surface (`backgroundCanvas`, the same as the route `contentStyle`) and `zIndex: 1`, so scrolled text never shows through.
- The side padding moved from the scroll content to the sticky header and to the body wrapper (the cross-fading `Animated.View`, style `body`), and the top padding to the header, so the opaque header spans the full width and no text is visible beside or above it. The visual layout at rest is unchanged (24 side padding, 16 top, 56 row, 16 gap).
- Unchanged: title ref and focus on the new view title, announcements, 44 pt targets, all testIDs (`dmh-close`, `dmh-back`, `dmh-guide-screen`), texts, data.

## Tests

`DmhGuideScreen.test.tsx`: the scroll view has `stickyHeaderIndices` `[0]`, the header is the first child and the body the second, close and title (or back) are inside the header and the catalogue is not, opaque background and zIndex present, same on a group page. Jest on `src/screens/dmh-guide`, `src/__checks__`, `src/navigation`: 32 suites, 562 tests pass. Typecheck, scoped ESLint and Prettier clean.

## Deviations

None.

## Residual risk (not seen on a device)

This was not run on an iPhone or an Android device. To check:
1. iOS form sheet at the 0.65 detent and at full height: scroll the catalogue, a group page and the sources page; the title or back control and the close button must stay at the top and no text may show above, beside or through them.
2. Dragging the sheet between detents and the keyboard (search field) still behave; no flicker of the header on a view change.
3. Android modal: same scroll check.
4. The header on a group page shows the back control and the close button with 44 pt targets.
