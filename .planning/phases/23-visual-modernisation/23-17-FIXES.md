# 12.2-17 Fixes

## Glass layering and Créer un compte

Owner, batch 3 iPhone check of build 820afe4:

1. "connexion -> parfait mais tu as laissé un bord vert sur 'créer un compte' qui ne fait pas la même taille que le bouton. Faut le supprimer."
2. "il y a des items où on voit la couche plate d'en dessous dépasser de ta couche 'effet glass', par exemple la pastille du score 0/50 ou même le hero de l'accueil."

Three code commits: 3770759 (no border under a gradient), 558aa37 (circular corners on every layered surface), 37e3c18 (no outline over the native secondary button).

### What the screenshots show

Screenshots `images/3.webp` (Accueil hero) and `images/4.webp` (factor pager, "0 / 50" pill), 923 px wide (about 2.1 px per pt), converted to BMP and sampled pixel by pixel (sips plus a small Node reader in the scratchpad).

- **Hero card, right edge (row y = 500):** inside the card the gradient is `#395925`; the last 2 to 5 px before the cream are `#385728`, `#3C5730`, `#425A39`, `#44583D`, a greyer and darker band. 14 % white over the gradient's *left* colour `#1D3418` gives `#3D4F39`, which is that band. The right edge of the card shows the colour of its left edge.
- **Hero card, left edge:** the outer 2 px are `#586E49` / `#526D44`, lighter than the inside `#243E1C`: 14 % white over the lit colour of the right side.
- **Hero top right corner (zoomed 4x):** a dark rim follows the top edge and turns the corner outside the bright halo of the gradient: the dark bottom-left of the gradient showing along the top and right.
- **"0 / 50" pill:** at x = 850 the outermost row is `#384E2D` over a lit gradient of `#688C45` just inside; at the left end the outer pixels are `#556846`, about 14 % white over the flat fallback `#334E2B` or the opposite edge, not over the dark gradient next to them (`#253D1C`).
- **Glass card "Mes relevés récents", top left corner (zoomed 8x):** the grey hairline arc and the white inner highlight arc are not concentric: the fill and its outline do not share one corner shape.

So the "flat layer" is a 1 pt ring around each forest surface. Its colour belongs to the other side of the gradient, darker where the gradient is lit and lighter where it is dark. The glass cards also show a second, milder fault at the corners.

### Root cause 1: a border under a gradient (forest card, total pill, glass button fallback)

Evidence in React Native 0.86.3 (`node_modules/react-native`):

- `React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm` (`invalidateLayer`, background image block): `backgroundPositioningArea = _layoutMetrics.getPaddingFrame()` ("background-origin: padding-box") and `backgroundPaintingArea = self.layer.bounds` ("background-clip: border-box").
- `ReactCommon/react/renderer/graphics/BackgroundRepeat.h`: the default is `Repeat` on both axes.
- `React/Fabric/Utils/RCTBackgroundImageUtils.mm` (`createBackgroundImageLayerWithSize`): with repeat, a `CAReplicatorLayer` tiles the gradient, sized to the padding box, over the whole painting area.

The forest card clip, the "0 / 50" pill and the flat `GlassButton` each had `borderWidth: 1` with a translucent hairline on the same view as `experimental_backgroundImage`. The gradient was sized to the box *inside* the border and tiled into the 1 pt ring, so under the 14 % white hairline the ring showed the next tile: the bottom row of the gradient along the top edge, the left column along the right edge, the opposite corner in each corner. That is exactly what the pixels show. (CSS behaves the same; the web fixes it with `background-origin: border-box`, which RN does not offer.) For the glass button fallback the same tiling put the 16 % white top of the `sheen` reflection as a bright line along the bottom edge.

**Change (3770759):**

- No `borderWidth` on a view that carries a gradient. The hairline is an inset 1 pt box-shadow ring, `buildInsetRing(colour)` = `inset 0 0 0 1px colour` in `visual-tokens.ts`. With no border the padding box is the border box, so the gradient covers the whole view and nothing is tiled.
- `ForestCard`: the clip carries `boxShadow: forest.edge` (the ring plus the top highlight). The highlight is now a 2 pt band (`inset 0 2px 0`), so its inner point sits just inside the ring, where the old 1 pt highlight sat inside the old border. The shell keeps only the coloured outset shadow, no background, the same radius. The fallback colour stays only on the clipped gradient view (RESEARCH pitfall 2). There it has the same shape as the gradient: both are `CALayer.cornerRadius` layers of one view.
- Total pill (`FactorPager` `totalChip`): `boxShadow: forest.ring` instead of the border.
- `GlassButton` flat fallback: the ring is the first layer of `glassCta.shadow`; the top rim and lower shade are 2 pt bands for the same reason.
- `RESUME_LAYOUT` loses its `border` (the card is 2 pt shorter; `layout-budget.test.ts` numbers updated, the "nearby" section now starts at 501 instead of 503).

### Root cause 2: `borderCurve: "continuous"` on layered surfaces

On iOS, `borderCurve` reaches only the layers RN shapes through `CALayer.cornerRadius`: `layer.cornerCurve` is set in `RCTViewComponentView.mm` for a Core Animation border (line 1089) and in `shapeLayerToMatchView` (line 1350, background colour and gradient layers). Every other layer uses circular arcs (`RCTPathCreateWithRoundedRect` in `React/Views/RCTBorderDrawing.m`, `CGPathAddArc`):

- outset box shadows, with their hole cut along the circular shape, and inset box shadows, with their mask (`React/Fabric/Utils/RCTBoxShadow.mm`);
- a translucent hairline on a view that does not clip, drawn as an image (`RCTAddContourEffectToLayer`);
- the overflow clip of a view that has a box shadow: RN moves the children into a container view (`styleWouldClipOverflowInk`) and sets only `cornerRadius` on its layer, never `cornerCurve`;
- the mask applied to `UIImageView` children.

So every glass card (translucent fill and hairline and `cardShadow`) and the forest card drew a squircle fill under a circular hairline, highlight and shadow cut-out. The corners did not agree, which is the non-concentric pair of arcs in the card corner.

**Change (558aa37):** `borderCurve: "continuous"` removed from the 17 style files that had it (cards, grouped lists, rows, tiles, photo tiles, wizard cards, the ripple layer); all layers of each surface now use the same circular radius. This departs from UI-SPEC line 177 ("`borderCurve: "continuous"` on iOS for cards and forest cards"): RN 0.86 cannot draw a continuous card with a hairline or a shadow without two corner shapes. Same class, found while checking: the press wave layer of a survey row is positioned inside the 1 pt hairline (Yoga measures absolute insets from inside the border, `AbsoluteLayout.cpp`) but had the outer radius 22; it now takes the inner radius 21 (`SURVEY_CARD_INNER_RADIUS`), concentric with the card's inner edge.

### Créer un compte

`NativeGlassButton.ios.tsx` wrapped the secondary SwiftUI `glass` button in a `View` with an absolutely filled 1 pt overlay (`glassCta.secondary.edge`, forest at 0.28), added in 12.2-14. The overlay followed the React host box, while the system draws its glass capsule at its own size inside the host, so the two outlines differed.

**Change (37e3c18):** the wrapper and the overlay are gone; the caller's style goes to the `Host` for both variants; the `edge` prop and the `glassCtaSecondary.*.edge` token are removed (nothing else used them). On Android and iOS before 26 the flat outlined pill stays: its outline is the `borderWidth` of the pressable itself, same box and radius, no gradient on it.

### Tests

- `src/__checks__/layers.test.ts` (new gate, TypeScript AST over `mobile/src`): no style object combines `experimental_backgroundImage` with a border width (`bordered-gradient`), and no style object sets `borderCurve` (`border-curve`). Fixture tests for both finders.
- `ForestCard.test.tsx`, for resume and hero: shell and clip resolve the same radius and no `borderCurve`; a caller style gives the shell no background and does not change the radius; neither layer has a border width or colour, the clip's shadow starts with the inset ring; the fallback colour sits on the clipped gradient view only, the shell has neither colour nor gradient; `forest.edge` = ring plus highlight.
- `FactorPager.test.tsx`: the pill's only shadow is `forest.ring` (an inset ring); no border width, colour or curve; fallback on the gradient view.
- `GlassButton.test.tsx`: the flat fallback has no border, its shadow starts with the ring of `cta.hairline`; the secondary fallback's outline is the one bordered node, on the button itself.
- `GlassButton.liquid.test.tsx`: the native secondary renders no `View` and no border; the caller's style is on the `Host`.
- `visual-tokens.test.ts`: `buildInsetRing`; the fallback's first shadow layer is the ring; the 2 pt rim; `forest.edge` and `forest.ring` are well-formed shadows; the secondary tokens are exactly `flat`, `hairline`, `ink`.
- `SurveyRow.test.tsx`: no `borderCurve`; the wave layer radius is the card radius minus its border. `AppCard`, `PhotoTile`, `photos.styles` tests no longer expect `continuous`.
- Gates: lint, typecheck, `test:coverage:mobile` (2662 tests, thresholds hold), ibp-domain suite, `format:check` (only the untracked `.claude/settings.local.json`).

### Checked, no change needed

| Element | Why it is fine |
| --- | --- |
| `AppButton` glow pill ("Reprendre") | Gradient and fallback on one view, no border, circular |
| `GlowBar`, `FactorBarsChart` bars | Gradient and fallback on one view, no border |
| `HaloPulse` behind the score card | Same box as the card (`absoluteFill` of `scoreWrap`) and same radius (`forestHero`); its shadow is cut out along the card, which is circular now |
| Recent surveys card plus inner clip | The clip already uses `card - border`, concentric |
| `GlassSurface` / `AppCard glass` | No caller passes a fill or a shadow; on iOS before 26 the clip and border are both `CALayer` (they agree); on iOS 26 there is no RN fill under the `GlassView` that could show, and the outline is removed |
| Wizard glass disc, pager round button, map card | One view each (fill and border, or fill and legacy shadow), circular |
| `FinishBar`, pager "Terminer le relevé", wizard CTA | `GlassButton`: fixed through the button itself |

### Only the phone can confirm

- The forest hero, the Mes relevés summary card, the score card and the "0 / 50" pill have no darker or lighter ring left, at the corners too, in light and dark.
- Circular corners on the glass cards and forest cards look right to the owner (the continuous curve of the UI-SPEC cannot be drawn consistently by RN 0.86 with hairlines and shadows).
- "Créer un compte" as a bare system glass button still reads as a button on the cream sheet (the reason the overlay was added in 12.2-14); if it does not, the answer is a tint or a fill on the SwiftUI button, never an overlay.
- The glass button fallback (Android, iOS before 26): hairline and rims as before, no bright line along the bottom.
- Android 9 and below (API 28 and lower, min SDK 24): RN draws inset box shadows only from API 29 (`MIN_INSET_BOX_SHADOW_SDK_VERSION`), so there the forest card, the pill and the fallback button have no hairline (the forest highlight was already inset before).

## Collapsing titles

Owner, batch 3 check: "De manière générale: quand je scroll, le titre disparaît. Or il me semble que sur iOS il y a un comportement qui fait que le titre passe en plus petit dans le header et centré non ?" He is right: that is the native large title of `UINavigationBar`. Our titles were text inside the page (`PageTitle`, the summary's `SummaryHeader`, the community page's title), so they scrolled away while the transparent header above stayed empty (its native title was hidden on purpose, `hiddenNativeTitle`, OA-21).

Code commits: 0d092ca (options and frame), 3ca9900 (Compte, Paramètres, Cartes hors ligne), bb7e45d (Mes Relevés), d6d6d5d (survey summary and its sub-pages), e72038b and 7327538 (community survey page), e980de4 (comment).

### Investigation (installed versions)

`@react-navigation/native-stack` 7.19.2, `react-native-screens` 4.26.2, `react-native-bottom-tabs` 1.4.0, React Native 0.86.3.

1. **The option.** `headerLargeTitleEnabled` (`headerLargeTitle` is now its deprecated alias, `useHeaderConfigProps.tsx`). `RNSScreenStackHeaderConfig.mm` then sets `prefersLargeTitles = YES` on the navigation bar and `largeTitleDisplayMode` Always on this screen's item, Never on the others, so a pushed page without a large title (the factor pager) gets the small bar. The collapse itself is done by UIKit.
2. **Which scroll view drives it.** UIKit, and react-native-screens for its iOS 26 scroll edge effect (`RNSScrollEdgeEffectApplicator`) and its scroll helpers (`RNSScrollViewFinder findScrollViewInFirstDescendantChainFrom:`), follow the *first subview* from the screen down until they meet a `UIScrollView`. Our `ScreenFrame` put `ScreenBackdrop` (an absolute fill view) as its first child, so that chain ended in the halo view: no collapse and no edge effect. Under the large title the frame now paints the same `theme.visual.backdrop` gradient on itself (a layer, not a subview), so the page's scroll view is the first subview. The native-stack wrappers before it (`DebugContainer`, the iOS 26 `SafeAreaView`) are single-child, and `ScreenStackHeaderConfig` is rendered after the content.
3. **Insets.** A React Native scroll view defaults to `contentInsetAdjustmentBehavior` "never" (`RCTScrollViewComponentView.mm`); react-native-screens only overrides it under its own (gamma) tabs host, not under react-native-bottom-tabs. So the first scroll view must say "automatic", which also makes iOS inset it below the header, large or collapsed. The header height also changes while the title collapses (native-stack debounces `onHeaderHeightChange` for large titles), so the frame's `useHeaderHeight()` padding would have doubled the inset and moved the page while scrolling: the large-title frame adds no padding and does not subscribe to the header height.
4. **Tab bar.** react-native-bottom-tabs is a SwiftUI `TabView`; the tab bar is part of the system safe area of the views inside it, so "automatic" also insets the content above it. The pages added the tab bar height themselves (`useAppBottomTabBarHeight`, `useTabBarClearance`) plus a manual `scrollIndicatorInsets`; under the large title they keep only their margins, otherwise the space under the last row would double. The floating bars positioned by React (Compte save bar, survey finish bar, factor pager) are unchanged; the survey summary still reserves the finish bar's part above the tab bar.
5. **Transparency and glass.** A large title makes the header translucent; `headerLargeStyle: { backgroundColor: "transparent" }` gives the large-title state a fully transparent appearance (`configureWithTransparentBackground`), so the halo stays continuous (D-19). On iOS 26 the bar keeps no blur: native-stack applies `scrollEdgeEffects` "automatic" (the soft Liquid Glass edge under the bar), and react-native-screens warns that blur plus edge effect overlap. Before iOS 26 the collapsed bar gets `systemChromeMaterial`, the classic look, so the small title never sits on bare content (`Platform.Version` check).
6. **Fonts.** Only family, size, weight and colour reach the native titles (no line height, no tracking). native-stack flattens its theme font `heavy` (weight 700) under `headerLargeTitleStyle`, and iOS (`RCTFont updateFont`) resolves a font name plus a weight by searching the family, which would draw Sora Bold: the weight "600" is given with `Sora-SemiBold`.
7. **Dynamic title.** `navigation.setOptions({ title })` updates the native title in place: the summary sets the survey's name (`useSurveyDetailHeader`), the community page sets the loaded name.
8. **Two side effects found while wiring it.** (a) `ScrollView.scrollTo({ y: 0 })` sets the raw content offset, which under automatic insets is not the top (the top rests at minus the inset): the D-25 "back to the top" on finish now returns to the resting offset (`useScrollTop`). (b) The large title is not a button, so the summary's "tap the name to rename it" (OA-95) cannot live there: on iOS renaming moves to the "…" menu.

### Per-screen decisions

| Screen | Route | iOS (native tab tree, Release) | Why | Android, Expo Go |
| --- | --- | --- | --- | --- |
| Mes Relevés | `surveysHome` | Native large title "Mes Relevés", "+" stays in the bar | FlatList is the first child | Own title bar with search and "+" (unchanged) |
| Compte | `accountHome` (three stacks) | Native large title "Compte", gear button stays in the bar | ScrollView first (through the keyboard view) | `PageTitle` (unchanged) |
| Paramètres | `settings` | Native large title "Paramètres" | ScrollView first | unchanged |
| Cartes hors ligne | `offlineAreas` | Native large title "Cartes hors ligne" | ScrollView first | unchanged |
| Survey summary | `surveyDetail` | Native large title = the survey's name (dynamic); the status line stays first in the page; "Renommer" in the "…" menu opens the system text prompt (same empty-name alert); Partager unchanged | ScrollView first; the floating finish bar and its padding kept | Name in the page, tap to rename (unchanged) |
| Contexte et parcelles, Score IBP, Historique | `surveyContext`, `surveyScore`, `surveyHistory` | Native large titles from the catalogue | ScrollView first (pull to refresh on Historique is the native one) | unchanged |
| Community survey | `communitySurvey` (Mes Relevés and Explorer stacks) | Native large title: "Relevé de la communauté" while loading, then the survey's name; author line and chips stay in the page | ScrollView first (the loading state has no scroll view: the large title simply stays large) | unchanged |
| Factor pager | `surveyFactorDetail` | Unchanged: its title row (factor name and the "0 / 50" pill) | Native collapse is impossible: a horizontal pager of ten vertical scroll views, UIKit follows one vertical scroll view in the first-subview chain. And the complaint does not apply: the title row sits above the pages, outside every scroll view, so it never scrolls away. Putting the name in the bar next to the pill would truncate "Milieux ouverts florifères" (OA-35 asked for shrinking, not an ellipsis) | unchanged |
| Accueil | `homeRoot` | Unchanged: greeting and avatar on the bar row (OA-85) | The greeting already lives in the native bar and never scrolls away. A large title adds about 52 pt and would cost the map peek the owner asked for (layout budget of 12.2-14 item 24: about 78 pt of map instead of 130 on 393 pt, about 47 instead of 99 on 375 pt, under the 96 pt target) | Own header (unchanged) |
| Search | `searchHome`, `surveySearch` | Unchanged | No native header; its search block is fixed above the list | unchanged |
| Wizard | `surveyForm` | Unchanged (header hidden on purpose) | | unchanged |
| Parcel map, Explorer | `surveyParcels`, `publicMapHome` | Unchanged | Full-screen maps | unchanged |

**Fallback (scroll-driven collapsing title): not used.** No screen both loses its title on scroll and cannot take the native one: every page whose title scrolled away now has the native large title, and the two pages where native is impossible or costly (factor pager, Accueil) keep a title that never scrolls away. No Reanimated code was added; `motion.test.ts` is unchanged and green.

### What changed

- `navigation/large-title.ts` (new): `usesNativeLargeTitle()`, true only in the native iOS tab tree (`getNativeTabsAvailability().native`). The stacks (header options) and the routes (frame) read this one switch, so a page never gets the native title without the matching insets.
- `stacks/stack-options.ts`: `nativeLargeTitle(theme)` (large title on, transparent large state, no shadow, `Sora-SemiBold` 600 in `semanticColors.textStrong` for both titles, blur by iOS version) and `pageTitleOptions(theme)` (the large title in the native tree, `hiddenNativeTitle` elsewhere). Tokens `brandTypography.navLargeTitle` (28 pt, like Accueil's header title, between the 24 pt in-page title and the 34 pt iOS default so a survey name still fits a 375 pt phone) and `navTitle` (17 pt).
- `ui/ScreenFrame.tsx`: `largeTitle` prop (no header padding, halo on the frame itself, no `useHeaderHeight()` subscription); `ui/frame-large-title.ts` (new): the context, `useFrameLargeTitle()` and `useFrameInsetBehavior()` ("automatic" or "never").
- `ui/PageTitle.tsx` renders nothing under the large title; `SummaryHeader` keeps only the status line there; the community page drops its title text there. A title is never shown twice.
- `AccountStack.tsx`: the three account options are theme factories (`makeAccountHomeOptions(theme)`, `makeSettingsScreenOptions`, `makeOfflineAreasScreenOptions`), registered by the three stacks.
- `SurveysStack.tsx`: large title on `surveysHome` (native list header), `surveyDetail`, the three sub-pages and `communitySurvey`; `PublicMapStack.tsx`: `communitySurvey`. `SurveyListRoute` no longer sets `headerTitle: ""` or the left title item (both would hide the large title); `HeaderLeftTitle` is Accueil's only.
- Screens (`AccountScreen`, `SettingsScreen`, `OfflineAreasScreen`, `SurveyListScreen`, `SurveyDetailScreen`, `SurveyScoreScreen`, `SurveyHistoryScreen`, `SurveyContextScreen`, `CommunitySurveyScreen`): first scroll view "automatic" under the large title, no manual tab bar padding or indicator inset there; `useSubPageContentStyle` keeps only the margin and a floating bar's part above the tab bar.
- `useSurveyDetailHeader`: `largeTitle` sets the title to the survey's name; `onRename` adds "Renommer" (SF Symbol `pencil`) before "Supprimer". Catalogue: `fr.surveyDetail.menu.rename`.
- `survey-detail/useScrollTop.ts` (new): remembers the resting offset at the first drag and scrolls back there.
- `CommunitySurveyRoute`: a name from the API that is not a string leaves the stack's title (the render-count suite's fake API exposed it).

### Tests

- `stacks/large-title-options.test.ts` (new): the options, the tokens, the dark scheme, the blur by iOS version (26, "26.1", 27, 18, "17.5", unknown, Android), `pageTitleOptions` and `usesNativeLargeTitle` on and off.
- `navigation.test.tsx`: `Platform.Version` mocked (26). Android and Expo Go on iOS keep `hiddenNativeTitle` on the seven pages and the factor pager, no large title; the native iOS tree gives Compte, Paramètres, Cartes hors ligne, Mes Relevés, the summary, the three sub-pages and the community page `nativeLargeTitle`, the halo header, no custom `headerTitle`, their catalogue title (the summary starts at ""); the gear button stays; the pager has no large title; the JS list has none.
- `routes.test.tsx`: in the native tree the eight framed routes of the table (Mes Relevés in its own test) draw a frame without header padding and without a halo child, with the gradient on the frame; elsewhere the D-19 frame (padding 44, halo child) as before. Mes Relevés sets only the "+" (no `headerTitle`, no left items). Community page: the loaded name becomes the title, the untitled label for a blank name, nothing while loading, nothing for a name that is not a string, nothing outside the native tree.
- `ScreenFrame.test.tsx`, `PageTitle.test.tsx`: large-title frame (no padding, ignores the header height, gradient on itself, the scroll view is its only child, context and "automatic" inside, dark scheme); `PageTitle` renders null under it.
- Screens: `AccountScreen`, `SettingsScreen`, `OfflineAreasScreen`, `SurveyListScreen`, `SurveyScoreScreen`, `SurveyHistoryScreen`, `SurveyContextScreen`, `CommunitySurveyScreen`: no in-page title under the large title, "automatic", margins only; outside it the old title, "never", tab bar padding and indicator inset. `SummaryHeader`: status line only, no tappable title. `SurveyDetailScreen`: large title and rename passed to the header hook, the prompt on the current name, trimmed save, empty name refused, D-25 back to the resting offset. `useSurveyDetailHeader.test.tsx` (new): title, menu order, no rename for a finished survey, Expo Go and Android unchanged (44 pt buttons). `useScrollTop.test.tsx` (new). `useSubPageContent.test.tsx`: margin only, a bar's part above the clearance.
- Gates: `npm run lint`, `npm run typecheck`, `npm run test:coverage:mobile` (237 suites, 2745 tests; thresholds hold, `src/navigation` 100 % statements, lines and functions, routes branches 98 %), the `ibp-domain` suite (230 tests), `npm run format:check` (only the untracked `.claude/settings.local.json`). `structure.test.ts` green (no file over 400 lines, no literal outside `src/i18n`). No dependency changed. No build, simulator or iPhone run.

### Only the phone can confirm

- On each listed page, light and dark: the title sits large under the bar at the top, shrinks into the small centred title as the page scrolls and grows back at the top; Sora SemiBold in forest (light) and the light text colour (dark); no band of colour at rest, the halo continuous behind the bar.
- iOS 26: the soft scroll edge effect under the collapsed bar keeps the small title readable over cards and photos; the back button, the gear, Partager and "…" read well over it.
- The last row of each page clears the floating tab bar by the system inset only (no doubled gap, nothing hidden), including Compte with the save bar and the summary with the finish bar; the first block starts right under the large title.
- Pull to refresh on Mes Relevés and Historique: the system spinner above the large title.
- Survey summary: a long survey name in the 28 pt large title on a 375 pt phone (UIKit truncates large titles to one line), "…" > Renommer prompt and its keyboard; the finish (D-25) scrolls back with the large title expanded and the score card's halo in view.
- Community page: the switch from "Relevé de la communauté" to the survey's name once loaded.
- Switching tabs between Accueil (greeting on the bar row) and Mes Relevés (large title under the bar): whether the owner wants Accueil to follow later at the cost of the map peek.
- Dynamic Type: the native titles use a fixed size (28 and 17 pt); VoiceOver reads the large title as the page's header.
- Compte with the keyboard open (the keyboard view and automatic insets together).
- Before iOS 26 (if a device is available): the collapsed bar shows the system material.

## Large titles on device

Owner, round 2 (build 699d1f3, iPhone, iOS 27.0.1): "non ça ne fonctionne pas, je te laisse tester sur le simulateur. D'ailleurs je pense qu'il doit y avoir un flou pour la lisibilité".

Code commits: 419e12a (root cause and blur), ffcbfb9 (material). Simulator: iPhone 18 Pro, iOS 27.0, Release build from the main checkout, the owner's account (signed in by the owner).

### Reproduced on 699d1f3

On Mes Relevés, the survey summary, Score IBP (light and dark): the large title is drawn at rest, then on scroll it stays where it is and the rows slide under it and through it. No collapse, no small title in the bar, no blur. Compte and Paramètres fit on the screen, so a swipe only bounces and they look unchanged afterwards. Screenshots `12.2-17-<screen>-<rest|scrolled>-before-<light|dark>.png` (surveys, summary, score, account, settings).

### Root cause (evidence)

A view-hierarchy dump of the running app (lldb, `recursiveDescription`, then `subviews` and `superview` asked directly):

```
RNSScreenView
  RNSScreenContentWrapper
    RNSSafeAreaViewComponentView
      RCTViewComponentView      tag 2794, page colour + gradient layers, NO subviews   <- the ScreenFrame
      RCTScrollViewComponentView                                                       <- the page's scroll view
      ExpoUI HostingView                                                               <- the floating button
```

The large-title `ScreenFrame` was empty, and its React children were mounted beside it in the safe-area view. UIKit (and react-native-screens' `RNSScrollViewFinder`) follow `subviews[0]` from the screen down to find the scroll view that drives the large title. They stopped in the empty frame, found no scroll view, and the bar never collapsed or changed appearance.

Why: Fabric view flattening (`ViewShadowNode::initialize`, React Native 0.86). The frame sets `backgroundColor`, `experimental_backgroundImage` and `testID`, so it *forms a view*. But none of the stacking-context conditions hold (it is `collapsable` by default: no opacity, transform, zIndex, overflow hidden, events), so it does not *form a stacking context*, and its children are hoisted into the nearest ancestor that does. The unit tests (react-test-renderer) cannot see this: they render the React tree, not the native mounting.

The previous lead (react-native-screens never calls `setContentScrollView`, under the react-native-bottom-tabs SwiftUI host) was checked and is not the cause: with the frame fixed, UIKit finds the scroll view through the first-subview chain inside the SwiftUI tab host. Dump after the fix (Cartes hors ligne): `RNSSafeAreaView > frame > RCTScrollViewComponentView > RCTEnhancedScrollView`, `adjustedContentInset.top = 168` (the large-title bar), `contentOffset.y = -168` at rest.

### Changes

- `ui/ScreenFrame.tsx`: `collapsable={false}` on the large-title frame, so it stays a real native parent and the page's scroll view is the first view UIKit meets. The D-19 frame (Android, Expo Go) is unchanged: its first child is the halo and nothing tracks a scroll view there.
- `stacks/stack-options.ts` `nativeLargeTitle`: `headerBlurEffect` is now `systemMaterial` (`COLLAPSED_BAR_BLUR`) on every iOS version. react-native-screens puts the blur on the standard appearance and makes the scroll edge appearance fully transparent (`headerLargeStyle` transparent), so the bar is transparent over the halo at the top and blurred once content is under it. On iOS 26 and later `scrollEdgeEffects: { top: "hidden" }`: react-native-screens warns that blur and edge effect overlap; the bottom edge (tab bar) keeps the default.
- The first build used `systemChromeMaterial`. Seen on the simulator it is nearly opaque in light mode and reads as a white band, hence `systemMaterial` (ffcbfb9).

### What the screenshots show (build 1c51124)

- Mes Relevés, light and dark (`12.2-17-surveys-{rest,card-under-bar,scrolled}-after-{light,dark}.png`): at rest the large "Mes Relevés" under the bar with the "+", the halo continuous behind the bar, no colour band. Scrolling, the title shrinks into the small centred "Mes Relevés" in the bar. The bar is blurred: the green stats card under it is blurred and lightened (light) or darkened (dark), and the title stays readable.
- Survey summary (`12.2-17-summary-*-after-*`): the survey's name large under the back, Partager and "…" buttons; scrolled, the name sits small in the bar between those buttons, over the material. Back at the top, the name grows large again.
- Score IBP, Contexte et parcelles, Historique (`12.2-17-{score,context,history}-*-after-*`), light and dark: same collapse, the catalogue titles small in the bar.
- Community page "Futaie des Gaillardes" (`12.2-17-community-*-after-*`), light and dark: same.
- Compte and Paramètres (`acc-drag-*.png`, `set-drag-*.png`, `m-drag.png` in dark): captured during a drag, the large title shrinks and ends as the small "Compte" in the blurred bar, with the back and gear buttons.
- Cartes hors ligne: the collapse is *not* captured. The page fits on the screen. Maestro's iOS swipe holds the press for `duration` and then drags quickly, so the short bounce falls between screenshots; on this page none of the drag attempts landed in a frame. Evidence there is the hierarchy dump above (the scroll view is first and carries the large-title inset), the same frame and options as Paramètres, which was captured.

### Tests

- `ScreenFrame.test.tsx`: the large-title frame has `collapsable={false}`; the D-19 frame keeps the default.
- `large-title-options.test.ts`: `systemMaterial` on iOS 26, "26.1", 27, "27.0.1", 18, "17.5", unknown and Android; `scrollEdgeEffects { top: "hidden" }` on iOS 26 and later only; the large-title state stays transparent.
- `navigation.test.tsx`: `expectHaloHeader` (transparent, no shadow; blur `systemMaterial` under a large title, `none` otherwise) for the survey pages, Compte, Paramètres and Cartes hors ligne on iOS and Android.
- Gates: lint, typecheck, `test:coverage:mobile` (238 suites, 2760 tests; `src/navigation` 100 % statements, branches, functions and lines, routes branches 98 %, stacks 100 %), `ibp-domain` (230 tests), `format:check` (only the untracked `.claude/settings.local.json`). No dependency change, no prebuild.

### Only the phone can confirm

- The same collapse and blur on the iPhone (iOS 27.0.1), with finger drags on the short pages (Compte, Paramètres, Cartes hors ligne).
- Whether `systemMaterial` is the blur the owner wants: it blurs but is still fairly milky in light mode; `systemThinMaterial` would show more of the rows, at some cost to contrast.
- Pull to refresh on Mes Relevés and Historique under the transparent large title.
- Before iOS 26 (if a device is available): the blurred collapsed bar.

## Wizard native header

Owner: "Oui je préfère l'en-tête natif". Code commit: 1c51124.

### Changes

- `stacks/stack-options.ts` `wizardHeaderOptions(theme)` (used by `surveyForm` in `SurveysStack.tsx`): on iOS the stack's header is shown. It is the transparent halo header (D-19, no blur: the route's `ScreenFrame` starts the page below the bar, so no content passes under it), with no large title, the system back button (minimal, chevron only) and a title in Sora SemiBold 17 in the strong text colour. Android keeps `headerShown: false` and the wizard's own top bar. `wizardUsesNativeHeader()` is the single switch read by the stack and by the route.
- `SurveyWizardScreen` `nativeHeader` prop (passed by `SurveyFormRoute`): no glass back disc, no step label row and no status bar gap; the progress, question, method cards, name field, cas picker and floating "Continuer" are unchanged (44 pt rules untouched; the system back button is the system's).
- `survey-wizard/WizardNativeHeader.tsx` (new, renders nothing): `setOptions({ title })` with "Étape N sur 4". `usePreventRemove(step > 0)`: GO_BACK or POP (back button, edge swipe, `goBack`) returns to the previous question. react-native-screens cancels the native pop (`preventNativeDismiss`, `interactionControllerForAnimationController`). Any other removal (the parcel step's `navigation.reset` once the draft is created) is dispatched again and goes through, since React Navigation skips the routes it has already asked (`VISITED_ROUTE_KEYS`). On the first question back leaves the wizard, as the disc's "Fermer" did (there was no discard confirmation before, and there is none now).

### What the screenshots show (build 1c51124)

`12.2-17-wizard-step1-light.png`, `-step2-light.png`, `-step2-dark.png`, `-back-to-step1-dark.png`, `-step3-light.png`, `-left-light.png`, `m-wiz2.png`: the native bar with the system back chevron and "Étape 1 sur 4" centred, the four-segment progress right below, no disc. "Continuer" moves to step 2 ("Étape 2 sur 4", method cards) and step 3 ("Étape 3 sur 4", cas cards). The system back goes from step 3 to 2 to 1 with the answers kept (the name "Essai" still in the field), then from step 1 back to Mes Relevés.

### Side effect to clean up

Opening the wizard creates a local draft straight away (`useEditingDraft.handleOpenCreateSurvey` bootstraps `createLocalDraft`, then autosaves the answers; existing behaviour, not changed here). The simulator run therefore left a draft named "Essai" (7 Oct 2026, 16:54) in the owner's Mes Relevés (the total went from 20 to 21). Deleting surveys was outside this task's limits; the owner can delete it. The form also showed "Nom du site : champ obligatoire" before any input on step 1, a leftover error from the form state, not related to the header.

### Tests

- `WizardNativeHeader.test.tsx` (new): renders nothing; title set and updated; no prevention on the first question; GO_BACK and POP step back without dispatching; RESET is dispatched through.
- `SurveyWizardScreen.test.tsx`: under `nativeHeader`, no back button or step label of its own, the bridge gets "Étape 1 sur 4" then 2 and 3, `onStepBack` returns step by step without `onClose`, top padding 8 instead of the status bar gap, progress and Continuer kept; without it (Android) the top bar and its 47 + 8 padding as before.
- `navigation.test.tsx`: iOS wizard options (shown, title "", no large title, no custom title or left item, minimal back, title style, halo header without blur); Android keeps the header hidden. `routes.test.tsx`: `nativeHeader` false on Android, true on iOS.

### Only the phone can confirm

- The edge swipe from the left on steps 2 and 3 returns to the previous question rather than leaving (unit-tested and in the library code, not driven on the simulator so as not to open the wizard again).
- VoiceOver reads "Étape N sur 4" as the bar's title and "Retour" on the system back button.
