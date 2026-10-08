# 12.2-10 fixes after the owner's batch 1 check (Accueil, Compte, Paramètres)

Owner reply, after the Release build on the iPhone: the resume button sits too close to the progress bar, the headers are not transparent (colour change), the slide-up entrance is not visible. A later message added: the "REPRENDRE" badge is useless. Four commits, one per correction.

## 1. Tag pill removed (cd34e2f)

- **Found:** the forest card showed a "REPRENDRE" or "COMMENCER" pill above the title. The title and the glow button already say what the card is.
- **Changed:** `ResumeCard.tsx` no longer renders the pill and its two styles. The catalogue entries `fr.home.hero.eyebrow` and `resumeEyebrow` were used nowhere else, so they are deleted. Card keeps title, secondary line, glow button, ten segments (same testIDs) and the new-survey link.
- **Tested:** `ResumeCard.test.tsx` drops the tag assertions and checks the tag texts are absent in both states, and that the two catalogue keys are gone.
- **Device only:** how the card reads without the pill (it is shorter by the pill height and its 4 pt gap).

## 2. Progress separated from the button (6921e91)

- **Found:** the progress row sat 12 pt under the row holding the title block and the glow button.
- **Changed:** `progressRow.marginTop` is now `brandSpacing4.lg` (24 pt), on the 4 grid. The card stays compact because step 1 gave back more height than this adds. The new-survey link keeps its 44 pt target.
- **Tested:** `ResumeCard.test.tsx` pins the gap at 16 pt or more and a multiple of 4.
- **Device only:** whether 24 reads as two blocks without making the card feel loose. If it is too much, `lg` to a 20 literal is a one-line change, but it would leave the token scale.

## 3. Transparent Accueil header (a87144d)

- **Found:** `HomeRoute` set `headerStyle: { backgroundColor: theme.colors.canvas }` on the native iOS header. The header is `headerTransparent`, but an explicit opaque background paints a canvas band over the `ScreenBackdrop` halo, which is drawn in the screen content and already extends behind the header (absolute fill on the root view). That band is the seam.
- **Changed:** new `backdropHeader` in `stack-options.ts` (transparent, no blur, no shadow, `backgroundColor: "transparent"`, the same recipe the parcel map screen already uses), spread into `HomeRoute`'s `setOptions`. The content was already inset by `useHeaderHeight()` and the scroll view clips at its top edge, so nothing scrolls under the title, and the refresh spinner position is unchanged.
- **Scope decision:** `ScreenBackdrop` is drawn on Accueil only. Compte, Paramètres, Mes Relevés and the other pushed pages draw a flat canvas, so their opaque page-colour header is the same colour as the page: no seam there. Making those headers transparent would let their content slide under the title, which is the OA-94 regression, so they keep `pageColourHeader` (RESEARCH Pitfall 3 and UI-SPEC). If the owner wants the halo on Compte or Paramètres, the same helper plus a content inset is the way, as a separate change. Android and Expo Go: Accueil hides the native header and draws its own greeting over the backdrop, no band.
- **Tested:** `routes.test.tsx` (native tab tree case) asserts the transparent, no blur, no shadow options. The existing `navigation.test.tsx` assertions on the stacks' page-colour header are unchanged and pass.
- **Device only:** light and dark seam check on Accueil, the glass header buttons over the halo, the scroll edge behaviour on iOS 26.

## 4. Visible slide-up entrance (bcfdfe9)

- **Found (cause):** the entrance was a Reanimated `entering` builder, which only runs when the view mounts. Accueil mounts at launch, under the splash and, until the session is restored, under the sign-in overlay (`App.tsx` keeps the navigation tree mounted beneath its overlays). The 240 ms fade, with a 40 to 120 ms stagger, was over before the screen was visible, and it never replayed. The motion was also small (default offset, 240 ms). Reduce Motion is not the cause (the owner has it off): the hook was only a no-op under it.
- **Changed:**
  - `ui/useFocusEntrance.ts` and `ui/EntranceView.tsx`: opacity and a 20 pt slide up from a shared value, 360 ms (`durations.slow`) ease-out, 40 ms stagger capped at 8, `ReduceMotion.System` on the timing and a `useReducedMotion()` branch that shows the section at once. It starts when `useScreenVisible()` turns true (focused in its navigator and not covered) and replays at each focus. After a blur the sections rewind to hidden 600 ms later, so a push to Compte does not blank Accueil while it slides away.
  - `ui/screen-cover-context.ts`, `ui/useScreenVisible.ts`: `AppShell` in `App.tsx` provides `covered` (auth gate, owner conflict, profile setup, welcome, onboarding), so a screen can tell nobody sees it yet.
  - `HomeScreen` uses `EntranceView` for its four sections (alert notice, resume card, tools, nearby), indexes shifting when the alert notice appears without replaying the others. `brandMotion.sectionEntranceTravel = 20` is the one new token.
  - `useEntrance` (first mount only, `index < 8`) is untouched for virtualised list rows (RESEARCH Pitfall 6); `motion.test.ts` stays green because there is no `entering` prop left on Accueil.
- **Tested:** `useFocusEntrance.test.tsx` (delay and duration, stagger cap, nothing under an overlay then plays when it lifts, replay on focus and rewind after blur, no replay when the index shifts, Reduce Motion shows at once with no animation, initial hidden state 20 pt down), `EntranceView`, `HomeScreen.test.tsx` (stagger indexes with and without the alert), `contexts.test.tsx` (App tells the tree about each overlay, welcome included).
- **Behaviour to know:** coming back from Compte or Paramètres to Accueil (a pop) also replays the entrance, since the screen regains focus. Calm at 360 ms, but say so if it feels like too much; restricting it to tab changes would need the tab-level focus.
- **Device only:** that the motion now reads as calm and visible on cold start, tab return and after the sign-in overlay lifts; the native splash fade overlapping the first section; any flicker on the first frame after a focus replay.

## Gates

`npm run lint`, `npm run typecheck`, `npm run test:coverage:mobile` (195 suites, 2114 tests, thresholds held), the ibp-domain suite (230 tests) and `npm run format:check` (only the untracked local `.claude/settings.local.json` is flagged) pass. No dependency changed, no build or simulator run.
