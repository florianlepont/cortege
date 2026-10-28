# Phase 32 redesign brief: the F group list and the dendromicrohabitat guide sheet

The owner says these two screens feel "web". The code shows why: frames nested inside frames, one 17 pt SemiBold style used for six different roles, controls built as square chips, and paragraphs on cards. Three of the issues are also contrast failures in the tokens themselves.

I read the code, tokens, specs and four of the drawings (rendered to PNG). I did not see the screens running; the limits are listed at the end. No repository file was changed.

---

## What makes it feel "web"

**1. Frames.**
- **F page:** the `FactorDetailScreen` glass panel holds `DmhGroupList`. Inside it are a glass guide card, then an `AppCollapsibleSection` with its own 1 pt border, then a glass card, then the rows. That is three frames deep, and each section header also carries a bordered chip badge.
- **Guide:** each group page is five glass cards, one bordered `AppNotice` and a bare footer. The sources page is five more glass cards.

**2. Typography.**
- `dmh-guide.styles.ts` hardcodes `"Sora-SemiBold"` at 17 as a local `headline`. It is used for the sheet title, the back label, block titles, link text and the entry title. The stepper count is also 17 SemiBold, so most of what the eye lands on has the same weight.
- Everything else is Jost-Regular 15 (the guide's body styles) or 12 (meta). Jost is the charter's Futura stand-in for meta text (charter section 4). Used for whole paragraphs, it reads as editorial and web.
- The guide's section headers use `meta` (Jost 12). `AppGroupedList` uses `sectionHeader` (Sora 13). Same role, two looks.

**3. Controls.**
- The +/- are 48 pt squares, radius 18, with a translucent fill and a 1 pt border: web buttons.
- The checkbox is a 24 pt rounded square. Ticked, it is filled with `chip.activeBg`, which is `textPrimary`: near-black in light mode, near-white in dark. This is the black-and-white look the owner described.
- The view change in the sheet is a cross-fade, not a push.

**4. Contrast failures (WCAG 1.4.11), measured on the glass card over the canvas:**
- Unticked checkbox border `colors.divider`: **1.34:1** light, **1.15:1** dark. The minimum is 3:1.
- Row glyphs `colors.forest` in dark mode: **1.97:1** (`colors.forest` stays `#334E2B` in both schemes). This affects the +, - and the row's +, and `FactorCounterInput` has the same problem.
- Info glyph `semanticColors.accent` (moss) in light mode: **2.6:1**. Charter 13.4 already bans moss as a graphic on light surfaces.

**5. Drawings.** Stroke only, `textPrimary` ink, 4 to 7 units wide. At the roughly 310 pt render width that is 1.6 to 2.3 pt. There is no tile, and they use hatching and stippling. The result reads as a colouring book, not as part of the brand.

---

## A. The F group list

### Critical

**[A-C1] Take the list out of the panel card and remove the nested frames**
- **What:** Panel card, then collapsible border, then glass card, then rows. The guide entry is one more card, and each section has a chip badge.
- **Why:** HIG inset grouped lists have exactly one container level. Charter 13.2 makes cards glass, not stacked. This is the owner's complaint (1).
- **Suggestion:**
  - `FactorDetailScreen` renders `DmhGroupList` after the panel `AppCard`, for F only, straight on the `ScreenFrame` canvas.
    - The panel keeps `trees_per_ha`, the counting caption and, in full mode, the surface field of `DmhCountFields`. The surface field therefore moves above the list. Owner check: it sits next to the density field it feeds.
    - Mechanism: `fieldVariantsFor("F")` keeps `companion: "F"`, but `renderFactorField` no longer emits the list. `FactorDetailScreen` renders it after the card. The props stay the same.
  - Inside `DmhGroupList`:
    - Delete the `AppCard` wrapper of the guide entry and the per-section `AppCard`.
    - Use the new plain variant of `AppCollapsibleSection` (A-C2) as the only container.
- **Native opportunity:** UIKit inset grouped list look.
- **Mutualization:** reuse `AppGroupedList`'s container (A-I1).
- **Effort:** M

**[A-C2] Section headers: grouped-list headers, not bordered boxes**
- **What:** Today the header is an uppercase 12 pt meta title with letterspacing, a bordered status chip and a 14 pt chevron, all inside a 1 pt bordered box.
- **Why:** In HIG lists the section header sits outside the container and carries no chrome. Charter 13.4: chevrons are not accent.
- **Suggestion:** Add `variant?: "boxed" | "grouped"` to `AppCollapsibleSection`. `"boxed"` is the default, so Settings does not change.
  - **Root:** no border and no clipping.
  - **Header** (pressable, min height 44, padding 4 left and right):
    - Title in `brandTypography.sectionHeader` (Sora-SemiBold 13/18), `colors.textSecondary`, sentence case, no `textTransform`, no tracking.
    - Then the count `t.badge(...)` ("1 sur 4") as plain text in `brandTypography.meta`, `textSecondary`. No chip.
    - Then `chevron-forward-outline` 16 in `textSecondary`, rotated 0° when collapsed and 90° when open (the iOS disclosure convention). Keep the existing shared-value rotation with `ReduceMotion.System`.
    - Pressed state: opacity 0.6, as today.
  - **Body:** 8 below the header, no padding and no top border. The children are the container from A-I1.
  - **Spacing:** 16 between sections, the `AppGroupedList` compact rule.
  - **Keep:** `testID` `dmh-section-<form>`, `accessibilityState.expanded`, `sectionA11y`, `defaultExpanded` from `orderDmhRows`.
- **Native opportunity:** expandable list section with a trailing disclosure chevron (iOS 14 and later).
- **Mutualization:** one prop on an existing primitive. The header style is shared with `AppGroupedList`'s `sectionTitle`.
- **Effort:** S

**[A-C3] Selection control: native-style circle, contrast fixed**
- **What:** A rounded square with a hairline that fails contrast, filled near-black when ticked.
- **Why:** WCAG 1.4.11 (1.34:1 and 1.15:1). iOS multi-select lists use a leading circle in the tint colour.
- **Suggestion:** a 24 pt circle (radius 12).
  - **Unticked:** 1.5 pt border in `colors.inputBorder` (3.75:1 light, 3.5:1 dark, the token made for exactly this), transparent fill.
  - **Ticked:** fill `semanticColors.ctaPrimary` (forest in light, `#9BC26A` in dark), no border, `checkmark-outline` 16 in `semanticColors.onCtaPrimary`.
  - **Optional delight:** a scale from 0.85 to 1 on the check with `brandMotion` `springs.snappy` and `ReduceMotion.System`.
  - **Keep:** `feedback.selection()`.
- **Native opportunity:** UITableView multi-selection editing style. Ionicons has no filled circle-check in outline form, so the circle is drawn as a View.
- **Mutualization:** extract `ui/SelectionCircle.tsx`. `RadioCard` and the wizard radio can reuse the ring.
- **Effort:** S

**[A-C4] The +/- glyph and info glyph colours**
- **What:** `colors.forest` glyphs are 1.97:1 in dark. The info glyph in `semanticColors.accent` (moss) is 2.6:1 in light.
- **Why:** WCAG 1.4.11; charter 13.4 bans moss as a graphic on light.
- **Suggestion:**
  - Stepper and + glyphs: `semanticColors.ctaPrimary`.
  - Info glyph: `visual.accentText` (8.5:1 light, 9:1 dark).
  - Separate ticket: `FactorCounterInput`, `AbbreviationInfo` and `GlossaryInfo` have the same problems.
- **Native opportunity:** none.
- **Mutualization:** add these pairs to `app/visual-tokens.test.ts`.
- **Effort:** XS

### Improvement

**[A-I1] One shared grouped container**
- **What:** `AppGroupedList`'s `sectionBody` and `divider` are re-implemented in `dmh-group-list.styles` and `dmh-guide.styles`, slightly differently each time.
- **Why:** design system mutualization.
- **Suggestion:** export `AppGroupedContainer` from `ui/AppGroupedList.tsx`.
  - Takes `children: ReactNode[]` and `dividerInset?: number`.
  - Radius `brandRadius.card` 22, `glass.cardFill`, `glass.cardBorder`, `glass.cardShadow`, clipped.
  - 1 pt `colors.divider` hairlines between children. The hairline is decorative, so its contrast does not matter.
  - `AppGroupedList` itself uses it too.
  - F rows: inset 52 (16 padding + 24 circle + 12 gap), so hairlines start under the label as in iOS.
- **Native opportunity:** none.
- **Mutualization:** used by the F list, the catalogue, the group page and the sources page.
- **Effort:** S

**[A-I2] Row anatomy (`DmhGroupRow`)**
- **What:** The row needs a fixed, iOS-like structure.
- **Why:** HIG list rows; field use with gloves.
- **Suggestion:**
  - **Line 1** (min height 56, padding 16 left and 4 right):
    - Leading circle 24, gap 12.
    - Label in `brandTypography.heroBody` (Sora-Medium 15/21), `textPrimary`, wraps and never truncates.
    - Info button, 44 x 44 target, `information-circle-outline` 22 in `visual.accentText`.
    - Full mode, unticked only: 8 gap, then the add button (A-I3).
  - **Pressed state:** the whole check zone shows a `colors.surfaceSoft` background, the `AppGroupedList` `rowPressed` look. Use `disableScale` and no ripple.
  - **Line 2** (full mode, ticked or counted): 8 below line 1, indented to the label (`LINE2_INDENT` 36 stays).
    - Left: "Arbres" in `brandTypography.meta`, `textSecondary`.
    - Right: the count, then the stepper capsule (A-I3).
  - **Locked caption:** unchanged.
  - **Keep all testIDs:** `dmh-row-*`, `dmh-tick-*`, `dmh-info-*`, `dmh-add-*`, `dmh-stepper-*`, `dmh-locked-*`.
- **Native opportunity:** a trailing info button, as in the Wi-Fi list.
- **Mutualization:** none new.
- **Effort:** S

**[A-I3] Stepper: one capsule, iOS proportions, glove size kept**
- **What:** Three separate 48 pt squares (-, count, +), plus a lone 48 pt square + on unticked rows.
- **Why:** Owner complaint (3). UIStepper is a single segmented capsule. O-32-1 keeps 48 pt targets.
- **Suggestion:**
  - **Count:** plain text, not boxed, to the left of the capsule.
    - Pressable, min 44 x 48, right-aligned.
    - `brandTypeScale.title3` (20/25) with `brandTypography.screenTitle.fontFamily` (Sora-SemiBold), `textPrimary`.
    - Tap opens the inline numeric field as today. The field has the same metrics and a 2 pt bottom underline in `colors.inputBorder` while editing.
  - **Capsule:** 8 gap after the count. 112 x 48, `brandRadius.pill`, fill = the new token `visual.control.fill` (below).
    - Two 56 x 48 segments with `remove-outline` and `add-outline` at 22 in `semanticColors.ctaPrimary`.
    - Between them, a 1 pt x 24 pt centred divider in `colors.divider`.
    - Disabled "-" at 0: the glyph alone at `brandInteraction.disabledOpacity`.
    - Pressed segment: fill `colors.surfaceSoft` for that half only, no scale.
    - Keep `useHoldRepeat`, the single adjustable accessibility element and the bounds.
  - **Unticked "+"** (line 1): a 48 x 48 target holding a 36 pt circle in `visual.control.fill` with `add-outline` 20 in `ctaPrimary`. It reads as the same family as the capsule.
  - **Haptics:** `feedback.selection()` on each single tap of - or + (press in, not repeats). The current spec has none on the stepper, so the owner should confirm.
  - **New token `visual.control.fill`** (iOS "tertiary fill"), defined in `theme-visual.ts`:
    - light: alpha 0.07 of `textPrimary`;
    - dark: white at alpha 0.10.
    - It derives from existing inks, so it is no new hue, but per charter governance it needs the owner's ok in the PR.
    - Fallback with no new token: `colors.panelMuted`. That works in light but almost disappears in dark (`#17181B` on `#141517`), so I advise against it.
  - **Haptic on reaching 999:** none.
- **Native opportunity:** UIStepper look. The SwiftUI Stepper is rejected for the reasons the `Why custom:` comment already records (no typeable value, 32 pt targets). Keep that comment.
- **Mutualization:** apply the same capsule to `FactorCounterInput` later (S).
- **Effort:** M

**[A-I4] Heading, guide entry, summary**
- **What:** A heading, a helper line, a big guide card with a 40 pt tile and two text lines, then a summary line.
- **Why:** HIG navigation rows; brevity.
- **Suggestion:**
  - **Heading:** keep the 17/22 Sora-SemiBold (`brandTypeScale.headline` + `brandTypography.sectionHeader.fontFamily`), helper below it (15 `textSecondary`).
  - **Summary:** `dmh-summary` moves to the right end of the heading row, in `meta` style. If it wraps at 375 pt, put it under the helper instead.
  - **Guide entry:** an `AppGroupedContainer` holding one row.
    - `AppGroupedListIconTile name="book-outline"` (28 pt tile, existing).
    - Title `t.entry.title` in `brandTypography.input` (16 Sora-SemiBold, the `AppGroupedList` label).
    - Under it, `t.entry.caption` in `brandTypography.sectionBody` (14/20 Sora-Medium), `textSecondary`.
    - Trailing `chevron-forward-outline` 16 in `textSecondary`.
    - Min height 56. Keep `testID="dmh-guide-entry"`.
- **Native opportunity:** a Settings-style navigation row.
- **Mutualization:** if the subtitle is generalised, A-I1 and B-I2 share it.
- **Effort:** S

### Nice-to-have

**[A-N1] Collapse behaviour (owner taste)**
- **Option 1, recommended:** keep the collapse with the grouped headers of A-C2. This keeps `orderDmhRows` and its tests. Low risk.
- **Option 2:** no collapse at all, the seven sections always open as in Settings. The page is about 1,100 pt of scroll, and the `defaultExpanded` logic and tests go away.
- **Effort:** S

---

## B. The guide sheet

### Critical

**[B-C1] Navigation bar: native look, not a page row**
- **What:** Today the header is a 56 pt row inside the scroll view.
  - The left is either a 17 SemiBold title or "‹ Tous les groupes" in 17 SemiBold accent.
  - The right is a 44 pt filled circle with `close-outline`.
  - Views cross-fade.
- **Why:** In an HIG sheet the bar has a centred title, a plain-weight back label, a small round close button, and it pushes. Owner complaints (1) and (3).
- **Suggestion (owner or engineering decision):**
  - **Option A, recommended if a spike confirms it works in our react-native-screens formSheet:** a small native stack nested inside the sheet route.
    - Three screens: catalogue, group, sources.
    - Native header (`headerShown: true`, as `routeChooseScreenOptions` already does in a formSheet). Title in `brandTypography.navTitle`. Native back button with the swipe-back gesture. Close as a header item.
    - On the catalogue, `headerSearchBarOptions` gives the real UISearchController in place of `SearchField`.
    - This is still one sheet, so D-05 holds.
    - Risks: nested stack behaviour under the 0.65 detent and on Android, the "direct" back rules, and the focus and announcement code.
    - Effort: L
  - **Option B, safe:** keep the internal views and restyle the sticky bar.
    - **Bar:** 52 high, opaque `backgroundCanvas`. A bottom hairline in `colors.divider` appears only when the content has scrolled (read `onScroll` y > 0).
    - **Leading:** back with `chevron-back-outline` 22 + `t.sheet.back` in Sora-Medium 17 (`brandTypeScale.body` + `brandTypography.heroBody.fontFamily`), `visual.accentText`, min height 44.
    - **Centre:** `t.sheet.title` in `brandTypography.navTitle`, `textStrong`, on every view (on the catalogue it is the only title).
    - **Trailing close:** 44 pt target with a 30 pt visual circle. Fill `visual.sheet.close` through `GlassSurface` (the existing Explorer sheet close tokens), `closeHairline`, glyph `close-outline` 16 in `visual.sheet.closeIcon`.
    - **Transition:** forward is a 24 pt slide from the trailing edge plus a fade (`brandMotion.durations.base`, `ReduceMotion.System`); back is the reverse. This replaces the cross-fade.
    - **Keep:** `dmh-guide-header`, `dmh-back`, `dmh-close`.
    - Effort: M
  - In both options, keep the focus move and the announcement.
- **Native opportunity:** Option A is the native stack and search bar. Option B imitates them.
- **Mutualization:** Option B's bar becomes `ui/SheetNavBar.tsx`, reusable by `FactorHelpSheet`, `FinishSheet` and `ExportChoice`.

**[B-C2] Group page: from five cards to a calm hierarchy**
- **What:** Five glass cards, each with a 17 SemiBold title and a paragraph, plus a bordered notice. Same weight everywhere.
- **Why:** Owner complaint (2). HIG: one emphasised block, the rest as text and lists on the background.
- **Suggestion:** the new top-to-bottom order. Padding 24 left and right; gaps as noted.
  1. **Plate (drawing):** see B-C3 and the decision in B-I4.
  2. **Title block:** unchanged. `formCaption` (meta), then `pageTitle` (`screenTitle` 24/28), `titleRef`. 16 below.
  3. **Definition:** `content.definition` as a lead paragraph on the canvas, no card and no visible heading. `brandTypeScale.callout` 16/21, Jost-Regular, `textSecondary`. `t.group.definitionTitle` is no longer drawn; keep it only if a test requires it. 24 below.
  4. **Key fact callout, "Ce qui compte pour l'IBP":** the only tinted block on the page.
     - Container: radius `brandRadius.field` 18, padding 16. Fill `componentColors.statusChip.successBackground` (the existing `successSoft`). No border.
     - Top line: `leaf-outline` 18 + `t.group.ibpTitle` in `brandTypography.sectionHeader`, colour `onSurface.success`.
     - Rule text `rule.text` in `brandTypeScale.body` 17/22 (Jost-Regular), `textPrimary`. This is the one place body text is larger.
     - `versionNote` as meta.
     - **Difference merged in:** when `content.difference` exists, a 1 pt `colors.divider` hairline with 12 above and below, then `t.group.differenceTitle` in meta `textSecondary`, then `[differenceLead, difference]` in 15 Jost. This removes the separate `AppNotice`.
     - Keep testIDs `dmh-ibp-rule` and `dmh-difference`, the latter on the merged sub-block.
     - Contrast: the `onSurface.success` and `textPrimary` pairs on `successSoft` are already in the theme as AA. Confirm them in `visual-tokens.test.ts`.
  5. **"Comment le reconnaître":** the heading in `brandTypeScale.headline` + Sora-SemiBold, `textStrong`, on the canvas, 24 above and 8 below. Then `content.recognise` in 15/20 Jost-Regular `textPrimary`, no card. With B-I4 option 2, the plate sits here instead.
  6. **"Confusions fréquentes":** same heading, then an `AppGroupedContainer` with one row per confusion.
     - Row padding 12 vertical, 16 horizontal; leading `swap-horizontal-outline` 18 in `textSecondary`; text 15/20 Jost wrapping.
     - Hairlines inset 46.
     - Each row stays one accessible element. Delete the bullet dots.
  7. **"Types décrits par le guide de poche":** same heading.
     - Then up to two containers, each under a grouped header in `sectionHeader` 13 `textSecondary`: `t.group.typesCounted` and `t.group.typesNotCounted`.
     - Counted rows: leading `checkmark-outline` 18 in `ctaPrimary`.
     - Not-counted rows: leading `remove-circle-outline` 18 in `textSecondary`.
     - Name in 15 Jost. Keep the a11y labels and `dmh-types-counted` / `dmh-types-not-counted`.
     - Shape plus colour, never colour alone.
  8. **Foot:** `t.group.footer` in meta `textSecondary`, then 12 below an `AppGroupedContainer` with one navigation row: tile `document-text-outline`, label `t.sheet.sourcesLink`, chevron. Keep `testID="dmh-sources-link"`. This replaces the bare text link.
- **Native opportunity:** grouped list rows. The tinted callout is like Health highlights.
- **Mutualization:** `AppGroupedContainer`, `AppGroupedListIconTile`, plus a `GuideHeading` style in `dmh-guide.styles`.
- **Effort:** M
- **Copy:** no new copy.

**[B-C3] Drawing presentation: a plate, the brand ink, heavier lines**
- **What:** Thin `textPrimary` strokes straight on a glass card.
- **Why:** Owner complaint (4). Charter section 2: organic, high contrast, strongly branded.
- **Suggestion (rendering only, no data change):**
  - **Plate:** a View with radius `brandRadius.card` 22, fill `visual.glass.iconTile` (moss 18%, existing), padding 16. Drawing height max 200 at 0.65 detent (was 240). Aspect from `DMH_DRAWING_FRAME`.
  - **Ink:** `semanticColors.ctaPrimary` (forest in light, `#9BC26A` in dark). Measured on the plate: 7.3:1 light, 6.8:1 dark. Add both pairs to `visual-tokens.test.ts`.
  - **Width:** render each stroke at `width x DMH_DRAWING_RENDER_SCALE`, a constant of 1.5 in `DmhDrawing.tsx`. The data and `DMH_DRAWING_STROKE_RANGE` are untouched, so the gate still passes. At 310 pt this gives 2.3 to 3.5 pt.
  - Keep `accessibilityRole="image"`, the label and the `dmh-drawing` testID.
- **Native opportunity:** none.
- **Mutualization:** the plate becomes `DmhDrawing`'s own frame, so the catalogue thumbnails (B-N1) reuse it.
- **Effort:** S

### Improvement

**[B-I1] Fonts as tokens, and a two-level weight system**
- **What:** Literal `"Sora-SemiBold"` and `"Jost-Regular"` strings in `createDmhGuideStyles`. 17 SemiBold is used for links and back labels too.
- **Why:** Design system rule (roles live in `brand-tokens.ts`); HIG (links and back are regular weight).
- **Suggestion:**
  - Build from tokens:
    - headings and titles: `brandTypography.sectionHeader.fontFamily`;
    - body: `brandDefaultFontFamily` (Jost-Regular);
    - links and back: `brandTypography.heroBody.fontFamily` (Sora-Medium) at 17.
  - Final scale: 24 SemiBold (page title), 17 SemiBold (headings and bar title), 17 Medium (back label and links), 16 Jost (lead paragraph and callout body, see B-I4), 15 Jost (paragraphs and rows), 13 SemiBold (grouped headers), 12 Jost-SemiBold (captions).
  - Remove `bulletDot`, `block`, `rowsCard` and the other style keys that become unused; the structure test checks for unused keys.
- **Native opportunity:** none.
- **Mutualization:** yes, through the tokens.
- **Effort:** XS

**[B-I2] Catalogue on the shared grouped list**
- **What:** Today: meta 12 headers, glass cards, 15 Jost rows, a 16 chevron, a bare "Sources" text link, the empty state in a glass card, and a 22-radius bordered `SearchField`.
- **Why:** consistency with Settings and the summary page.
- **Suggestion:**
  - Render each form with `AppGroupedList` or `AppGroupedContainer`.
  - Header: `t.forms[form]` in the grouped `sectionHeader` style. Keep `AppSectionHeader` only for the header a11y role.
  - Rows: label in `heroBody` (Sora-Medium 15/21), up to 3 lines; in search mode the form caption is a 13/18 subtitle in `textSecondary`; chevron 16; min 56; pressed `surfaceSoft`.
  - Extend `AppGroupedList`'s `NavRow` with `subtitle?`, `labelLines?` (default 1, multiline keeps 2) and `testID?`, so `dmh-catalogue-row-*` survives.
  - Empty state: plain centred text with no card, using `CenteredState` if it fits, then the "Voir les 15 groupes" link as a 44-high text button in `accentText`.
  - "Sources et licence": a final one-row group, as on the group page.
  - Search field (Option B only):
    - Ask the owner whether the shared `SearchField` may take a `variant="compact"`: height 44, radius 12 (`badgeSm`), fill `visual.control.fill`, no border, `search-outline` 18 in `textSecondary`.
    - If not, keep it as is. The global search shares it.
- **Native opportunity:** UISearchBar look (or the real one, B-C1 option A).
- **Mutualization:** `AppGroupedList` extension.
- **Effort:** M

**[B-I3] Sources page as grouped content**
- **What:** Five glass cards with "Label : value" lines.
- **Suggestion:**
  - Title, then `t.lead` as a lead paragraph (no card).
  - One container per document:
    - first row: the title in 16 Sora-SemiBold;
    - then rows with the label as a 12 meta caption above the value in 15 Jost (authors, publisher, year, used for).
  - Then `t.precedence` in the same tinted callout as B-C2 item 4 (replacing `AppNotice`).
  - Then `t.drawings`, `t.offline` and `t.consulted` as meta footer lines, with no card.
  - The `labelled` helper goes away. If a test asserts "Auteurs : ..." as one string, keep it as the row's a11y label.
- **Native opportunity:** grouped key/value rows.
- **Mutualization:** reuses the B-C2 callout.
- **Effort:** S

**[B-I4] Where the drawing goes (owner taste)**
- **Option 1, recommended:** the plate at the top of the group page, above the title, at max 168 pt.
  - It identifies the group at a glance and breaks up the text.
  - Measured on 390 x 844 at 0.65 detent: bar 52 + plate 168 + 16 + title about 70 + rule callout about 130 = about 436 pt. That fits in the roughly 548 pt detent, so the rule still shows without scrolling, the S3 contract still holds, and the owner can confirm.
- **Option 2:** keep it in "Comment le reconnaître", as the spec has it.

**[B-I5] Drawing style itself (owner taste)**
- **Option 1, recommended, L effort:** a two-tone, simpler drawing set.
  - In each SVG, wrap the elements in `<g id="context">` (trunk, ground, bark marks) and `<g id="subject">` (the microhabitat).
  - `build-dmh-drawings.mjs` emits `role: "context" | "subject"` per element. This is not a colour, so the "no colour in the data" rule of S5 holds.
  - Render:
    - context strokes in `colors.textSecondary` at width x 1.25;
    - subject strokes in `ctaPrimary` at width x 1.6;
    - closed subject shapes (ellipse, circle) filled with `visual.glass.iconTile` at full opacity on the plate, or `colors.surfaceSoft` if the owner finds the moss fill too strong.
  - Simplify the sources:
    - drop the hatch lines inside cavities (dmh_01 has 13 of them; the tint fill replaces them);
    - cut the stipple of dmh_02 from about 110 dots to about 15;
    - set the minimum source width to 6 (no 4s);
    - keep the trunk outline open at the top and closed by a ground line at the bottom where there is one.
  - Update the gate (`__checks__/dmh-drawings.test.ts`) for the `role` key. The expert re-reads the 15 for accuracy (plan 32-09 procedure).
- **Option 2, XS beyond B-C3:** keep the current drawings and rely on B-C3 alone (plate, brand ink, x1.5). This is the fast win; Option 1 can follow later.

### Nice-to-have

**[B-N1] Catalogue thumbnails**
- **What:** each catalogue row could open with a 44 pt plate thumbnail of its drawing.
- **Prerequisite:** this needs `vectorEffect="non-scaling-stroke"` with about 1.5 pt strokes; at 44 pt a width-6 stroke becomes 0.3 pt.
- **Unverified:** I could not verify that react-native-svg honours that prop on both platforms. Spike it first.
- **Effort:** M

**[B-N2]** The checkmark scale-in on selection (A-C3) and a gentle push transition are the only motion added. Both go through `brandMotion` with `ReduceMotion.System`.

---

## Files to change

| Item | Files |
|---|---|
| A-C1 | `mobile/src/screens/FactorDetailScreen.tsx`, `mobile/src/screens/factor-detail/renderFactorField.tsx`, `mobile/src/screens/factor-detail/DmhGroupList.tsx`, `FactorDetailScreen.test.tsx`, `DmhGroupList.test.tsx` |
| A-C2 | `mobile/src/ui/AppCollapsibleSection.tsx` (+ test) |
| A-C3, A-I2 | `mobile/src/screens/factor-detail/DmhGroupRow.tsx`, `dmh-group-list.styles.ts`, new `mobile/src/ui/SelectionCircle.tsx` (+ tests) |
| A-C4, A-I3 | `mobile/src/ui/DmhCounterStepper.tsx`, `mobile/src/app/theme-visual.ts` (new `visual.control.fill`), `mobile/src/app/visual-tokens.test.ts`, `DmhCounterStepper.test.tsx` |
| A-I1, B-I2 | `mobile/src/ui/AppGroupedList.tsx` (+ test) |
| B-C1 | `mobile/src/screens/dmh-guide/DmhGuideScreen.tsx`, `dmh-guide.styles.ts`, optional new `mobile/src/ui/SheetNavBar.tsx`. Option A also needs `mobile/src/navigation/stacks/stack-options.ts`, `SurveysStack.tsx`, `HomeStack.tsx`, `navigation/routes/DmhGuideRoute.tsx`, `navigation/types.ts` |
| B-C2, B-I1, B-I3 | `mobile/src/screens/dmh-guide/DmhGroupPage.tsx`, `DmhSourcesPage.tsx`, `dmh-guide.styles.ts` (+ tests) |
| B-I2 | `mobile/src/screens/dmh-guide/DmhCatalogue.tsx`, optionally `mobile/src/screens/global-search/SearchField.tsx` |
| B-C3, B-I5 | `mobile/src/ui/DmhDrawing.tsx`, `visual-tokens.test.ts`; Option 1 also `mobile/scripts/build-dmh-drawings.mjs`, `mobile/src/app/dmh-guide/drawings.ts` (regenerated), `__checks__/dmh-drawings.test.ts`, the 15 SVGs |
| Spec sync | `.planning/phases/32-detailed-dmh-information-inserted-v1/32-UI-SPEC.md`: Color table (checkbox, ink, accent), S1.3, S3 and S5 |

**Constraints this brief respects:**
- All copy already exists in `fr`. The one visual drop is `t.group.definitionTitle`.
- No em dash, outline glyphs only, and the only new colour is the `visual.control.fill` token in a token file.
- Payload and data are unchanged; the drawing data only changes under B-I5 option 1.
- All files stay under 400 lines; `dmh-guide.styles.ts` gets smaller.

## Decisions for the owner

1. **Collapse (A-N1):** keep it with grouped headers (recommended), or always open.
2. **Sheet bar (B-C1):** native nested stack after a spike (recommended), or a restyled bar.
3. **Drawing place (B-I4):** hero plate at the top (recommended), or inside "Comment le reconnaître".
4. **Drawing style (B-I5):** two-tone and simplified (recommended, L), or the current drawings with plate and ink only (XS).
5. **New `visual.control.fill` token:** approve it (recommended), or use `panelMuted`, which is weak in dark.
6. **Stepper haptics:** a selection tick on each single tap (recommended), or none, as in the current spec.
7. **Field order:** the surface field moves above the list in full mode (A-C1).

## What I could not verify
- How the glass actually renders on the phone, the dark-mode look, and Sora vs Jost at these sizes.
- Whether a nested native stack behaves inside our formSheet with the 0.65 detent on iOS 26 and on Android (B-C1 option A needs a spike).
- `vectorEffect` support in react-native-svg (B-N1).
- The exact fit at the 0.65 detent of B-I4 option 1; I estimated it, I did not measure it.
- Contrast numbers are computed from the token values, approximating the glass fill as an alpha blend over the canvas (light card about `#F5F5EE`, dark about `#141517`), not measured on a device.
- I did not check `FactorCounterInput`'s dark-mode failure beyond its source; it uses the same `colors.forest` glyph.
- I saw 4 of the 15 drawings (dmh_01, 02, 10, 12) rendered to PNG; the rest I judged from their stroke widths.
- The working tree has uncommitted edits in `DmhGuideScreen.tsx`, `dmh-guide.styles.ts` and `app/dmh-guide/order.ts`. Re-read them before implementing.

Rendered drawing previews: `/private/tmp/claude-501/-Users-florian-Projects-cortege--claude-worktrees-roadmap-258008/67a605c0-bd6e-466c-a4da-99806dae7194/scratchpad/drw/`

---

## Owner decisions (2026-10-28)

1. **Collapse:** kept, with the grouped headers (A-N1 option 1).
2. **Sheet bar:** option B, the restyled safe bar (B-C1 option B).
3. **Drawing place:** hero plate at the top of the group page (B-I4 option 1).
4. **Drawing style:** plate, brand ink and x1.5 stroke only (B-I5 option 2); the drawing data is unchanged.
5. **New token `visual.control.fill`:** approved.
6. **Stepper haptics:** yes, a selection tick per single tap (not on hold repeats).
7. **Field order:** the surface field moves above the list in full mode.
8. **Home entry:** side by side half tiles next to the photo tool (the owner literally asked for "à côté de l'outil photo").
