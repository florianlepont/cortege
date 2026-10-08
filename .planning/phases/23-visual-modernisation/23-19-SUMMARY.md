---
phase: 23-visual-modernisation
plan: 19
subsystem: owner-acceptance-batch-4
tags: [owner-check, checkpoint, explorer, offline-download, edge-glow, parcel-colours, forest-card, accueil, dark-mode, release-build, iphone]
requires: ["12.2-18"]
provides:
  - "Owner go for batch 4 (Explorer) and its fix rounds, on the Release build 6b7f385 on the owner's iPhone"
  - "Explorer: a survey marker or a cluster row opens the survey directly (no intermediate card); the selected-survey card of plan 18 is removed"
  - "Download panel: 46 pt full-width button, no bounce when it fits, a progress bar with its done and failed outcomes, one panel height in every state, the native button no longer covering the estimate line"
  - "Download mode: a full-screen green pulse (no travelling light) drawn at the navigation layer, above the panel and the tab bar"
  - "Dark mode legibility of the map controls (mapControlGlass) and of the Explorer sheets (sheet fill, 44 pt glass close button)"
  - "Explorer parcels without a score in warm grey; a scored survey keeps its marker until a scored parcel shows it"
  - "API: a parcel registered by its IGN id (IDU) keeps its commune, section and number; migration 020 repairs existing rows (not deployed)"
  - "Accueil: 'Nouveau relevé' as a glass card of its own under the resume card"
  - "Forest cards (Accueil, Mes Relevés, survey detail score card): the owner-tuned mist and round5's diagonal flowing contours, soft text shields and a mask fading the lines behind text"
affects: [12.2-20, 12.2-21, 12.2-22, 12.2-23, 12.3]
tech-stack:
  added: []
  patterns:
    - "Screen-requested overlays drawn at the navigation layer: the screen renders a request component (DownloadEdgeGlow), DownloadEdgeGlowHost counts requests and draws EdgePulse over the whole tree, gated by useScreenVisible"
    - "GlassSurface surface prop: a near-opaque tinted glass for controls floating over a basemap that does not follow the app scheme (Liquid Glass tintColor on iOS 26, fill elsewhere)"
    - "GlassButton minHeight: an exact-height native host (no matchContents) so the SwiftUI capsule is the React Native box"
    - "Forest card backdrop: ForestAurora by default in ForestCard (mist discs, flowing lines through an SVG mask, radial text shields from measured text blocks); a motion gate caps animated hero layers at two per route"
    - "Worst-case contrast tests that stack every animated layer at its peak behind every text point (forest-aurora-tokens.test.ts, visual-tokens.test.ts)"
key-files:
  created:
    - ".planning/phases/23-visual-modernisation/23-19-FIXES.md (every fix round, root causes, device-only checks)"
    - ".planning/sketches/010-forest-card-motion/index.html (seven forest card motion directions)"
    - "mobile/src/screens/public-map/EdgePulse.tsx, mobile/src/navigation/download-edge-glow.tsx"
    - "mobile/src/screens/home/NewSurveyCard.tsx"
    - "mobile/src/ui/ForestAurora.tsx, mobile/src/app/forest-motion.ts, mobile/src/app/forest-aurora-shape.ts, mobile/src/app/forest-aurora-tokens.ts"
    - "mobile/src/map/maplibre/parcel-coverage.ts"
    - "api/migrations/020_parcel_idu_fields.sql"
  modified:
    - "mobile/src/screens/PublicMapScreen.tsx and mobile/src/screens/public-map/* (direct open, OfflineAreasSheet, DownloadStatusView, ExplorerSheet, SheetCloseButton, MapControls, MapChips, ScoreLegend)"
    - "mobile/src/hooks/useOfflineAreas.ts (downloadStatus)"
    - "mobile/src/ui/GlassSurface.tsx, GlassButton.tsx, ForestCard.tsx"
    - "mobile/src/screens/home/ResumeCard.tsx, HomeScreen.tsx; ListSummaryCard and ScoreCard (blocks and shields)"
    - "mobile/src/app/visual-tokens.ts, brand-tokens.ts"
    - "api/src/surveys/surveys-normalize.utils.ts (parseParcelIdentifier reads the IDU)"
key-decisions:
  - "A survey marker opens the survey at once; the intermediate card is gone. Back returns to the map, the marker stays highlighted, an 800 ms guard stops a double push"
  - "The download glow is a strong pulse only (owner: 'juste un pulse plus fort, pas le truc qui tourne'), drawn at the navigation layer so it covers the panel and the tab bar"
  - "Explorer parcels without a score are warm grey; green only means a high score. The parcel picker keeps its sage and moss"
  - "A scored survey keeps its marker until a drawn, scored parcel shows it, rather than colouring a parcel with a score the server does not attribute to it"
  - "The parcel layer threshold was not moved to MapLibre's real zoom: the derived zoom already switches about 0.9 levels earlier than real 15 (finding in 23-19-FIXES.md)"
  - "Server fix e7537b5 and migration 020 stay on this branch, no separate PR (owner: 'Non ba en testera ça une fois l'ensemble des lots développés')"
  - "Forest cards take the owner's live-tuned sketch values (spd=2 fogA=1.6 size=0.7 flowSpd=1 flowA=1) and round5.html's diagonal S curves; the lines fade behind text through an SVG mask so the text shields stay light"
  - "Accueil's filled progress segments are pale green #C8DDA0 instead of moss #89A33A, so they keep 3:1 over the moving mist"
requirements-completed: []
metrics:
  duration: owner check over 2 days (2026-10-07 to 2026-10-08)
  tasks: 1
  files: 0
  completed: 2026-10-08
status: complete
---

# Phase 12.2 Plan 19: Owner phone check, batch 4 Summary

The owner tested batch 4 (Explorer) on Release builds on their own iPhone, from d619a38 to 6b7f385, and said "go" after the last one. The rounds went well beyond the Explorer overlays of plan 18. Surveys now open directly from the map. The download panel was rebuilt, with a progress bar, and download mode got a full-screen pulse. Map controls and sheets were fixed for dark mode. Parcel colours changed, and a server bug that left a surveyed parcel without its score was fixed. Accueil got its own "Nouveau relevé" card. All three forest cards were given a new animated look, tuned live by the owner in a sketch.

This plan has no code of its own. It is one `checkpoint:human-verify` task with `gate="blocking-human"`, which is never auto-approved (D-18). The code lives in the fix commits listed below, and the full log is in `23-19-FIXES.md`. Requirement REQ-QA-visual-modernisation is not marked complete; it closes with the rest of the phase.

## Owner approval

These are the owner's verbatim replies in the chat (French), 2026-10-07 and 2026-10-08, as relayed by the orchestrator (threat T-12.2-38), in the order it gave them. Builds are named where the relay or `23-19-FIXES.md` records them. The orchestrator also relayed other remarks during the forest card rounds. They are recorded in `23-19-FIXES.md` and are not quoted here.

1. Batch 4 first answer, on build d619a38 (the numbers are those of the plan's checklist):

   > 1. Ok / 2. Mon souci c'est que je vois encore ces pastilles, alors qu'on a dit qu'à un certain zoom on voyait les parcelles colorées en fonction de la note IBP / 3. Je comprends pas à quoi sert cet écran intermédiaire. Pourquoi un clic n'ouvre pas direct le relevé ? La touche retour fait revenir à la carte / 4. Ok / 5. Ok / 6. Ok, mais je trouve le bouton téléchargement un peu trop fin + on peut scroller dans la fenêtre donc c'est bizarre + je pense qu'en mode téléchargement, pour comprendre que c'est la zone qui est affichée qui va être téléchargée, il faudrait une animation où le bord de l'écran (et donc de la carte) s'illumine en vert, avec un pulse

2. Then, on the next builds of the round (build not recorded):

   > En dark mode les boutons de explorer sont difficiles à voir

   > Je trouve que l'effet pulsé en téléchargement n'est pas assez intense encore …

   > quand je zoom, je perds l'information de la parcelle avec un IBP

3. On Accueil's resume card:

   > C'est pas un peu bizarre ce bouton nouveau relevé intégré dans le héros de reprise ?

   then, on the proposal to make "Nouveau relevé" a big action of its own:

   > Non le gros bouton me va mais j'ai peur qu'un simple bouton ne fasse pas très intégré à cette belle interface ?

4. On the round of builds 7e99ef5 and ce5960f (the relay gave "ce5960f/7e99ef5"; `23-19-FIXES.md` calls the checks batch 4c and 4d):

   > Tout est ok, mais j'ai trois remarques

   > 1. L'effet est pas incroyable, et je m'attendais à avoir un truc qui fasse tout le tour de l'écran… mais ça s'intègre peut-être pas bien avec la fenêtre de téléchargement.

   > 2. La carte forêt : en vrai je m'attendais à un truc un peu dynamique comme les vagues sur l'écran de connexion. À voir ce que ça donnerait

   > 3. Le zoom explorer : quand je zoom sur Vincennes, à la fin il n'y a pas de parcelle au polygone colorée de la couleur du score, donc je ne comprends pas ce que tu as fait

5. On opening a separate PR now for the server fix e7537b5 and migration 020:

   > Non ba en testera ça une fois l'ensemble des lots développés

6. On the next build:

   > Pas de barre de progression du téléchargement / Bouton trop grand / L'animation est bof de la zone à télécharger. J'aurais préféré juste un pulse plus fort, pas le truc qui tourne / La carte forêt : ce n'est pas l'animation de l'écran de connexion … et les lignes vert clair rendent le tout illisible.

7. On build ce5960f (the download panel):

   > Bug d'affichage du bouton

8. On sketch 010 (`.planning/sketches/010-forest-card-motion/index.html`, seven directions A to G), his choice:

   > un mélange de A et F ?

9. On the forest card motion, before he tuned it live in the sketch:

   > Je ne la vois vraiment pas bouger, donc soit c'est parce qu'elle est trop lente soit c'est parce que il y a un problème de contraste entre les lumières

   His live-tuned settings in sketch 010 `round4.html`: `spd=2 fogA=1.6 size=0.7 flowSpd=1 flowA=1`.

10. On build 2188c10 (flowing contours over the whole card):

    > c'est presque parfait, mais l'orientation des lignes est passée de globalement diagonale à horizontale et c'est dommage

11. On sketch 010 `round5.html` (diagonal S curves):

    > ba c'est parfait, je veux exactement ça (donc potentiellement réduire le flou derrière les écritures)

12. Final approval, on build 6b7f385 (commits through 6b7f385 on branch `claude/phase-12-2-da5975`):

    > go

**Interpretation:** "go" is the go for batch 4 and for every fix round below, as seen in build 6b7f385. It does not cover the parcel colour by score on the owner's own survey. That depends on an API change that is not deployed (see Caveats).

**Questions of the plan, as answered:**

- Steps 1, 4 and 5 (map unchanged, cluster list, parcel history and sheets): "Ok".
- Step 2 (legend): "Ok". The legend gained a grey "Parcelle sans score" row later (c76d176). It was not asked about separately, and the final "go" covers it.
- Step 3 (selected survey card): replaced. The card is gone, and a tap opens the survey (4ad6111).
- Step 6 (download): rebuilt over three rounds (see the table below).
- Dark mode: the owner raised the map controls and the pulse. Both were fixed (d2ada59, 3b9e22c, e951c33).
- Reduce Motion: the owner made no explicit statement. Each new motion (pulse, mist, flowing light) has a still Reduce Motion form, pinned by unit tests.
- Sketch 009 glowing pill on the Explorer sheet card: moot, since the card was removed.
- D-13 (nothing drawn over the live map): the download pulse is drawn over the whole screen, map included, while the download panel is open. The owner asked for it ("le bord de l'écran (et donc de la carte) s'illumine en vert"). It is an edge glow with `pointerEvents="none"`, not a contour layer. No contour lines are drawn over the map.

## Corrections raised and fixes

Details, root causes, tests and device-only checks for each item are in `23-19-FIXES.md`. Every fix shipped in build 6b7f385, which the owner approved with "go".

| Owner feedback | Fix | Commit(s) |
|----------------|-----|-----------|
| Intermediate card: "Pourquoi un clic n'ouvre pas direct le relevé ?" | A marker or a cluster row opens the survey. Back returns to the map with the marker highlighted. 800 ms double-tap guard. `SelectedSurveyCard` removed | 4ad6111 |
| Download button "un peu trop fin", panel scrolls | Full-width button, `alwaysBounceVertical={false}` on the sheet | 01fd896 |
| Green pulsing screen edge in download mode | `EdgePulse` inset glow, focus-gated, still under Reduce Motion | 44472d2 |
| "je vois encore ces pastilles" at parcel zoom | Threshold not moved. The finding shows the derived zoom already switches about 0.9 levels before real 15 | 5ad5755 (finding) |
| Parcels green by default; "je perds l'information de la parcelle avec un IBP" | Warm grey for unscored parcels. A scored survey keeps its marker until a scored parcel shows it | c76d176, 058f9ec, ecbef55 |
| Root cause of the missing score (found while checking the above) | `parseParcelIdentifier` reads the IGN IDU. Migration 020 repairs placeholder rows | e7537b5 |
| "En dark mode les boutons de explorer sont difficiles à voir" | `mapControlGlass` for every overlay floating on a map, 24 pt glyphs | d2ada59 |
| Near invisible sheet text in dark mode (seen in the same screenshot) | Sheet fill over the blur, 44 pt glass close circle, danger colour for the size warning | 3b9e22c |
| "l'effet pulsé ... pas assez intense encore" | Three-layer inset glow in saturated greens, stronger pulse | e951c33 |
| "Nouveau relevé" inside the resume hero; fear that a plain button would not fit | Resume card only resumes. `NewSurveyCard` is a glass card with a moss "+" disc, helper and chevron | 5695eee |
| "un truc qui fasse tout le tour de l'écran" | Glow moved to the navigation layer (`DownloadEdgeGlowHost`), over the panel and the tab bar, following the display corners | 2ba0677 |
| Forest card "dynamique comme les vagues" | Waves (2d35a96), then ripples (75595d0), both replaced below | 2d35a96, 75595d0 |
| "Pas de barre de progression du téléchargement" | `downloadStatus` in `useOfflineAreas`, `DownloadStatusView` with bar, percentage, tiles, done and failed | c257d4e, 57e262f |
| "Bouton trop grand" | 46 pt panel button (`button.minHeightPanel`) | 59398d6 |
| "juste un pulse plus fort, pas le truc qui tourne" | Travelling light removed. Stronger beat plus a deep halo, text still 4.5:1 under it | deb5105 |
| "les lignes vert clair rendent le tout illisible" | Wave lines removed (75595d0), then the aurora below | 75595d0 |
| "Bug d'affichage du bouton" (button over the estimate line) | Exact-height native host for `GlassButton` with `minHeight`. Panel body floor measured from the tallest status | 3b84499 |
| Sketch 010 choice "un mélange de A et F" | `ForestAurora` (aurora discs, tracing contours) | 9342e1d (sketch), 86fe30b |
| Further forest card rounds (continuous motion, every forest card, owner-tuned values, whole card coverage) | Random paths, then the owner's tuned mist and flowing light on all three forest cards; motion budget gate; tile units in the body tint | 0b135fb, 70074b7, 4346813, 2441195, 7b52a01, fe6bc47 |
| "l'orientation des lignes est passée de globalement diagonale à horizontale" | round5's four diagonal S curves | dfb05af |
| "réduire le flou derrière les écritures" | SVG mask restored (12 % of the lines behind text), lighter shields | 95f5ed5 |

Docs commits of this plan: 5ad5755, a8353d8, 4427d41, ef41e6b, 7e99ef5, ce5960f, 66d8562, 9342e1d, 201eb87, a835424, 1a5496c, 2188c10, 7353734, 6b7f385.

## Deviations from Plan

The plan itself had none. It is a single checkpoint, and the owner's corrections were handled as its resume-signal describes: fixed in the files that own them, gates green, rebuilt, presented again until "go". The scope of the corrections went beyond the Explorer:

- **API change in a visual phase.** e7537b5 changes `api/src/surveys/surveys-normalize.utils.ts` and adds migration `020_parcel_idu_fields.sql`. It is a real bug fix: a surveyed parcel came back "not studied" on the IGN WFS path. It was found while answering the owner's parcel colour remark. `@cortege/ibp-domain` was not touched.
- **Accueil and forest cards.** Accueil and the forest cards belong to batches 1 and 2. The owner asked for these changes during this check.
- **Plan 18 superseded in part.** `SelectedSurveyCard` and its outlined summary were removed (direct open). The md download button became a 46 pt full-width one.
- **Filled progress segments recoloured.** Accueil's filled segments went from moss #89A33A to pale green #C8DDA0 (`forestAurora.progressDone`). The moss is only 3.25:1 on the bare card, so any visible glow behind it would drop it under 3:1.
- **No dependency changed.** No new package was added. The edge glow, the mist and the flowing light use react-native-svg and Reanimated, which were already installed.

## Caveats (honest limits of the "go")

1. **Parcel colour by score awaits the API deploy.** Fix e7537b5 and migration 020 are only on this branch. They are not in `origin/main` (checked) and not on any remote branch. The API is deployed pull-based from `main`, so production still stores IDU parcels as `00000 / AA / 0000`. On the owner's phone, his Vincennes survey's parcel therefore still comes back unscored at parcel zoom, and only the kept ochre marker shows the survey. This is the behaviour behind his third remark of round 4. The owner chose to test it once all lots are developed (reply 5). It cannot be confirmed on his phone before the merge and the deploy.
2. **Migration 020 e2e specs were not run locally.** No Postgres container ran on this machine. CI's `e2e` job runs `migration-020-parcel-idu-fields.e2e-spec.ts` and the updated `migration-019` spec.
3. **Confirmed only by the owner's "go".** Two items were never checked separately on a device:
   - The forest cards' SVG mask (95f5ed5): if a line showed at full strength behind text, the mask would not be applied.
   - The 46 pt native button overlap fix (3b84499): Jest cannot show native drawing, and its root cause is the most likely one, not a proven one.

   The owner made no further remark after build 6b7f385. There is no screenshot evidence in the repository.
4. **Corsican parcel ids stay unmatched.** IDUs starting with `2A` / `2B` are parsed to digits only on the WFS side (`2A004` becomes `00204`), and `lookupParcelById` only reads digit communes. This is unchanged and out of scope.
5. **Contrast margins at the worst case are thin.** The contrast tests stack every disc at its peak with the dash of light right behind the text. Under that worst case, the lowest ratios after 95f5ed5 are:
   - Accueil filled segments: 3.03:1 (target 3:1)
   - Mes Relevés accent figure: 4.56:1
   - score card "/50": 4.57:1
   - tile labels and units: 4.69:1
   - factors line: 4.81:1

   All of them pass, with very little margin. Any retune of the mist or the shields must re-run `forest-aurora-tokens.test.ts`.
6. **Token file sizes.**
   - `mobile/src/app/visual-tokens.ts` is 352 lines. It reached 396 during the rounds, and the forest aurora tokens then moved to `mobile/src/app/forest-aurora-tokens.ts` (73 lines).
   - `mobile/src/app/brand-tokens.ts` is 479 lines, 7 more this plan (`parcelUnscored`, `button.minHeightPanel`).
   - The 400-line structure gate only covers `src/screens` and `src/navigation`, so neither file fails it. Splitting `brand-tokens.ts` is a candidate for the 12.3 audit.
7. **Small phone layout.** On a 375 x 812 phone with a draft whose name wraps to two lines, only 74 pt of "Autour de vous" shows at launch, under the 96 pt target. The test records this case. The owner was not asked about it explicitly.
8. **Parcel zoom threshold.** The owner's "option C" (follow MapLibre's real zoom) was not implemented, because the finding shows it would show the polygons later, not earlier. Options (a) and (b) got no recorded decision. Option (c), keeping the markers until the statuses arrive, is effectively covered by 058f9ec.
9. **Simulator screenshots of the first presentation.** The plan asks for these (map with legend, selected card, cluster list, light and dark) to be listed. They lived in an earlier session scratchpad and their paths are not recorded in the repository. The selected card they showed no longer exists.

## Sketch files

`.planning/sketches/010-forest-card-motion/index.html` is committed (9342e1d). `round2.html` to `round5.html` stay **untracked**. They are not committed by this closing commit, which carries only the SUMMARY, STATE and ROADMAP. The sketch convention in this repository commits each sketch's `index.html` (and the README where there is one). Later working files were left untracked, like the `png/` folders of sketches 008 and 009. Sketch 010 is also not listed in `MANIFEST.md`.

`23-19-FIXES.md` and the code comments cite `round4.html` (the owner's tuned values) and `round5.html` (the reference for the S curves). To keep those references resolvable in git, commit those two files, with a MANIFEST row, as a separate docs commit. That is left to the owner or the orchestrator.

## Main checkout

The device builds ran from the main checkout `~/Projects/cortege`, briefly put on the pinned commit, with the owner's standing consent. State observed (read only) when this SUMMARY was written:

- `HEAD` = `0fb6d2f48202799b751e14ee9ef60ba97d197604` on `main`, the same baseline as 12.2-17.
- `git status --porcelain` holds the same 5 untracked entries (`.codex/`, the 01.1 phase folder, `.tmp-audit/`, `AGENTS.md`, `docs/audits/screenshots-2026-09-28/`).

Nothing was committed or pushed in the main checkout.

## Open items for the final confirmation (plan 12.2-23)

Questions carried from 12.2-17 that are still unanswered:

1. Form pager title: it stays fixed above the pages (no native collapse). Asked, never explicitly answered.
2. Sketch 009 elements: the glowing pill on the wizard's next button and on the counters' plus button, and the completion ring in the header.
3. Field ergonomics: confirm that nothing in the form is smaller, denser or harder to tap.
4. `GenusTargetSheet` ("Commencer un relevé", in an RN `Modal`): should it get the native glass button? Should `CasPicker` get the glass treatment?
5. Wizard edge swipe from the left on steps 2 and 3: unit-tested, never driven on a device.
6. The hard clip line under transparent headers when a page scrolls: clean as is, or a soft fade later.

Added by this plan:

7. Parcel colour by score on the owner's Vincennes survey, once e7537b5 and migration 020 are merged and deployed (owner: test once all lots are developed).
8. Reduce Motion pass over the new motions (download pulse, mist, flowing light): no explicit owner statement.
9. Android (D-17, Phase 13 pass):
   - the inset `boxShadow` glow at the navigation layer
   - the forest card SVG mask
   - the flat map control and sheet fills
   - smoothness of the three gradients and six animated paths per forest card on an older phone
10. Small phone with a two-line draft name: 74 pt of "Autour de vous" at launch.

## Verification

- Gates recorded after the last code commit (95f5ed5, in `23-19-FIXES.md`): lint, typecheck, `test:coverage:mobile` (251 suites, 2968 tests), the ibp-domain suite (230 tests) and format check pass. The format check flags only the untracked `.claude/settings.local.json`. They were not re-run for this docs-only closing commit.
- The owner's final "go" is quoted above (build 6b7f385).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `23-19-FIXES.md`, `api/migrations/020_parcel_idu_fields.sql`, `.planning/sketches/010-forest-card-motion/index.html`, `mobile/src/app/forest-aurora-tokens.ts`.
- FOUND in the git log of `claude/phase-12-2-da5975`: 4ad6111, 01fd896, 44472d2, 5ad5755, c76d176, e7537b5, 058f9ec, ecbef55, a8353d8, d2ada59, 3b9e22c, e951c33, 4427d41, 5695eee, ef41e6b, 2ba0677, 2d35a96, 7e99ef5, deb5105, 59398d6, c257d4e, 75595d0, 57e262f, ce5960f, 3b84499, 66d8562, 9342e1d, 86fe30b, 201eb87, 0b135fb, 70074b7, 4346813, a835424, 2441195, 7b52a01, 1a5496c, fe6bc47, 2188c10, dfb05af, 7353734, 95f5ed5, 6b7f385.
- No code file is changed by the closing commit.
