---
phase: 23-visual-modernisation
plan: 23
subsystem: owner-final-confirmation
tags: [owner-check, checkpoint, approval, direction, charter, dark-mode, liquid-glass, tab-bar, theme, release-build, iphone]
requires: ["12.2-20", "12.2-21", "12.2-22"]
provides:
  - "Owner go for the whole of Phase 12.2 on the Release build 39b4f005 on the owner's iPhone, and approval of the direction text (ROADMAP criteria 1 and 4)"
  - "docs/design/direction-visuelle-12-2.md: 'Statut : approuvée par le propriétaire le 2026-10-08', with the earlier selection history kept"
  - "Charter section 13.10: 'Status: approved by the owner on 2026-10-08', open items reduced to what is really still open"
  - "Selected tab legible in both schemes: tabActiveTint token, DynamicColorIOS tint on the native bar"
  - "Dark Liquid Glass translucent and native (no underlay), with a glass ink for text on it; Explorer sheets as native Liquid Glass on iOS 26 in dark and light"
  - "Light or dark follows the system only: the in-app Apparence setting and theme_mode storage are removed"
affects: [12.3, 13]
tech-stack:
  added: []
  patterns:
    - "DynamicColorIOS for a tint drawn by a system bar, so UIKit resolves it with the bar's own trait collection"
    - "Glass ink (withGlassInk, GlassInkProvider): text on translucent glass takes brighter (dark) or deeper (light) secondary, strong and danger inks instead of a denser glass"
    - "Theme built from useColorScheme() alone, both themes built once so the context keeps its identity across system switches"
key-files:
  created:
    - ".planning/phases/23-visual-modernisation/23-23-FIXES.md (three fix rounds, root causes, contrast tables, device-only checks)"
    - "mobile/src/app/tab-tint.test.ts, mobile/src/app/glass-density.test.ts, mobile/src/app/glass-ink.test.ts"
  modified:
    - "docs/design/direction-visuelle-12-2.md (status line)"
    - "docs/design/charte-graphique-etats-sauvages-spec.md (13.1, 13.2 in the fix rounds; 13.10 status and open items)"
    - "mobile/src/app/visual-tokens.ts, theme-visual.ts, theme.ts"
    - "mobile/src/ui/GlassSurface.tsx, mobile/src/screens/public-map/ExplorerSheet.tsx"
    - "mobile/src/navigation/tabs/NativeRootTabs.tsx"
    - "mobile/src/screens/SettingsScreen.tsx (Apparence section removed)"
key-decisions:
  - "The direction text and charter section 13 are approved by the owner on 2026-10-08, after the phone confirmation of build 39b4f005"
  - "Light or dark follows the system only; no in-app theme setting (owner: 'Je veux que l'utilisateur ne puisse plus le paramétrer dans l'app')"
  - "Dark glass is translucent native Liquid Glass (tint 0.66 controls, 0.68 theme-text glass and sheets), not a dense fill; legibility comes from a glass ink"
  - "Explorer sheets are native Liquid Glass on iOS 26 in both schemes; blur plus 0.88 fill stays for older iOS and Android"
  - "Dark basemap colouring: not planned in any phase, and the owner declined a seed ('non laisse')"
requirements-completed: []
metrics:
  duration: owner check and three fix rounds, 2026-10-08
  tasks: 2
  files: 2
  completed: 2026-10-08
status: complete
---

# Phase 12.2 Plan 23: Final owner confirmation and approval of the direction text Summary

The owner confirmed the whole visual refresh on his iPhone and approved the direction text with "go" on the Release build 39b4f005 (2026-10-08). Before that, three fix rounds were needed. They made the selected tab readable in dark mode, made the dark glass translucent native Liquid Glass, turned the Explorer sheets into native glass in both schemes, and removed the in-app theme setting so the app follows the system appearance only. The approval marker is now written in the direction text and in charter section 13.10, both dated 2026-10-08.

Task 1 is a `checkpoint:human-verify` task with `gate="blocking-human"`, never auto-approved (D-18). The orchestrator ran it with the owner, and the fix commits were made during that check. This executor ran Task 2 (the approval marker) after the owner's "go", plus the plan closure. Under D-11, the marker was held back until this closing plan.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Final owner confirmation on the phone and approval of the direction text (checkpoint, blocking-human) | fix rounds: e4927f7, dd56d30, 1f2d082, 2e7ea47, cfa11e7, be192d4, 39b4f00 |
| 2 | Record the owner's approval (direction text status line, charter 13.10) | the plan's closing docs commit (see the completion report) |

## Owner replies

These are the owner's verbatim replies (French), 2026-10-08, relayed by the orchestrator (threat T-12.2-43), in the order it gave them, with the build each one answered. No other reply is quoted. `23-23-FIXES.md` quotes some of them in a lightly normalised transcription. The text below is the orchestrator's verbatim relay.

1. On build fb6052c, for everything except the dark-mode points:

   > Tout le reste est ok

2. His dark-mode feedback, on the same build fb6052c:

   > En mode sombre, le tab de navigation sélectionné est peu lisible. Par ailleurs dans ton monde sombre notamment sur l'Explorer tous les boutons et les fenêtres avec avec les effets Liquid Glass vers leur transparence. Après le souci est aussi que la carte n'est pas encore colorisée pour le mode nuit, mais ça on le verra plus tard

3. On build dd56d30:

   > Mais sinon le mieux n'est pas de suivre le thème de l'OS plutôt que de pouvoir le bouger dans l'app ?

   > Mais c'était l'inverse je voulais dire que le verre en mode sombre n'était PAS assez transparent. Les panneaux du verre devraient être du verre natif et pas du flou d'ailleurs.

4. On the theme setting:

   > Je veux que l'utilisateur ne puisse plus le paramétrer dans l'app

5. On the dark basemap:

   > Dans quelle phase on colorise la map ?

   The orchestrator answered that no phase plans it today. The owner replied:

   > non laisse

   No seed was created.

6. Final approval, on build 39b4f005 (commits through 39b4f005 on branch `claude/phase-12-2-da5975`):

   > go

**Interpretation.** "go" confirms the result of the whole phase as seen in build 39b4f005 and approves the direction text. It does not cover the parcel colour by score on the owner's own survey, which needs an API deploy (see Caveats). Reply 1 ("Tout le reste est ok") and the final "go" are the only statements covering the other main screens, field ergonomics and Reduce Motion. There was no separate statement on each.

## Fix rounds (recorded in `23-23-FIXES.md`)

Root causes, contrast tables, tests and device-only checks for each round are in `23-23-FIXES.md`. All three rounds shipped in build 39b4f005, which the owner approved.

| Owner feedback | Fix | Commit(s) |
|----------------|-----|-----------|
| "le tab de navigation sélectionné est peu lisible" (dark) | New `tabActiveTint` token (forest in light, light moss `#D2E8A8` in dark). The native bar's tint is one `DynamicColorIOS`, resolved by UIKit with the bar's own appearance. Selected icon and label at 5:1 or more over the white plan. D-08 kept (system bar glass untouched) | e4927f7 (docs dd56d30) |
| "les effets Liquid Glass vers leur transparence" (first read as too transparent) | Denser dark glass: tint 0.92 and an underlay behind the `GlassView`, sheets at 0.96. **Superseded by the next row**, because the owner meant the opposite | e4927f7 (docs dd56d30) |
| "le verre en mode sombre n'était PAS assez transparent. Les panneaux du verre devraient être du verre natif et pas du flou" | Underlay removed. Dark controls at tint 0.66, theme-text glass and sheets at 0.68 (`darkGlassTint`). Text on dark glass takes the glass ink (`withGlassInk`, `GlassInkProvider`). In dark on iOS 26 the Explorer sheets are native Liquid Glass (`GlassSurface`, top corners only). Each tint is the lowest that keeps 4.5:1 over the white plan, and the next step down fails (tested) | 1f2d082 (docs 2e7ea47) |
| "le mieux n'est pas de suivre le thème de l'OS", then "Je veux que l'utilisateur ne puisse plus le paramétrer dans l'app" | `BrandThemeProvider` builds the theme from `useColorScheme()` only and follows system changes live. The Paramètres Apparence section, `theme_mode` storage, `setMode` and their catalogue entries are removed. There is no `Appearance.setColorScheme`, so UIKit and the JS theme cannot disagree. `app.json` keeps `userInterfaceStyle: "automatic"`. The earlier investigation into syncing the in-app theme to UIKit became moot | cfa11e7 (docs 39b4f00) |
| "Les panneaux du verre devraient être du verre natif" (also for light) | The light Explorer sheets on iOS 26 are native Liquid Glass too (`lightGlassTint` 0.68 warm paper, `glassInkLight`). The sheet handle and the download bar got deeper tones. Blur plus 0.88 fill stays for older iOS and Android | be192d4 (docs 39b4f00) |
| "la carte n'est pas encore colorisée pour le mode nuit, mais ça on le verra plus tard"; "Dans quelle phase on colorise la map ?" / "non laisse" | Not changed. The basemap, markers and clustering are untouched. No phase plans it, and no seed was created | none |

Gates at the last code commit, from `23-23-FIXES.md`: lint and typecheck clean; `test:coverage:mobile` 256 suites, 3080 tests; ibp-domain 9 suites, 230 tests. The format check flags only the untracked `.claude/settings.local.json`.

## Approval marker (Task 2)

- `docs/design/direction-visuelle-12-2.md`, line 3: "Statut : approuvée par le propriétaire le 2026-10-08, après la confirmation sur téléphone de la version 39b4f005 (variante I de la maquette `.planning/sketches/008-visual-direction/index.html`, appliquée en phase 12.2)." The earlier selection history is kept on line 5, starting with "Historique :" (chosen 2026-10-07, aligned 2026-10-07, corrected at the four phone checks and during the final confirmation). The body of the text is otherwise unchanged from what the owner approved.
- `docs/design/charte-graphique-etats-sauvages-spec.md`, section 13.10, line 554: "Status: approved by the owner on 2026-10-08, after the phone confirmation of build 39b4f005 (plan 12.2-23)."
- **Same date in both: 2026-10-08.**
- 13.10's open-items list now holds only what is still open (see Caveats). Field ergonomics was dropped from that list: the owner gave no separate answer, but it falls under "Tout le reste est ok" and "go". The unanswered questions are grouped under one line: "Asked during the phase, not answered, carried to Phase 12.3 or later".

## Caveats (honest limits of the "go")

1. **The dark basemap is not coloured.** MapLibre styles stay light in dark mode. No phase plans it, and the owner declined a seed ("non laisse").
2. **Parcel colour by score awaits the API deploy.** Fix e7537b5 and migration `020_parcel_idu_fields.sql` are only on this branch. They are not in the local `origin/main` ref (checked; not fetched today). Production keeps IDU parcels as placeholders until the merge and the pull-based deploy. Until then, the owner's Vincennes parcel cannot show its score colour on his phone.
3. **The iOS tab bar and search button glass are drawn by the system** and cannot be made denser without replacing the system Liquid Glass bar, which D-08 forbids. Only the selected tint was changed.
4. **Migration 020 e2e not run locally** (no Postgres container on this machine). CI's `e2e` job runs it.
5. **The Explorer sheet drag still runs on the JS thread** (`PanResponder`): candidate for Phase 12.3.
6. **Compte loading spinner contrast in dark**: Phase 12.3.
7. **Corsican parcel ids** (`2A`, `2B`) stay unmatched (unchanged, out of scope).
8. **Android device pass**: Phase 13 (D-17, ROADMAP Phase 13 line, charter 13.9).
9. **Older owner questions, not answered, carried to 12.3 or later.** No answer is assumed for any of these:
   - the form pager title stays fixed (no native collapse);
   - the sketch 009 elements: glowing pill on the wizard's next button and the counters' plus, completion ring in the header;
   - `GenusTargetSheet` native glass button and `CasPicker` glass treatment;
   - the wizard edge swipe on a device;
   - the hard clip line under transparent headers on scroll.
10. **The flat contrast model of the glass.** `UIGlassEffect` treats `tintColor` as a tint of its material, not a fill. The tested ratios come from a flat model, and only the phone shows the real result. The owner's "go" on 39b4f005 is the device confirmation. If a surface later reads too light or too dense, the only levers are `mapControlGlass.dark.tint`, `darkGlassTint` and `lightGlassTint`.
11. **Simulator screenshots.** The plan asks for the seven main screens in both schemes to be listed here. The orchestrator handled the checkpoint, and this executor has no record of their paths. They are not in the repository.

## Main checkout

Read-only check when this SUMMARY was written (`git --no-optional-locks`, nothing changed):
- `~/Projects/cortege` is on `refs/heads/main` at `0fb6d2f48202799b751e14ee9ef60ba97d197604`, the same baseline as 12.2-17 and 12.2-19.
- `status --porcelain` shows only the same 5 untracked entries as before: `.codex/`, the 01.1 phase folder, `.tmp-audit/`, `AGENTS.md` and `docs/audits/screenshots-2026-09-28/`.

## Deviations from Plan

**1. Status sentence wording.** The plan's sentence is kept word for word up to the date. Two additions were asked by the orchestrator: the build it approved ("après la confirmation sur téléphone de la version 39b4f005"), and the earlier selection history, kept on its own "Historique" line. The charter line also names the build. The plan's grep checks still pass.

**2. Charter 13.10 open items rewritten.** This was asked by the orchestrator. Three items were added: the dark basemap, the system-drawn tab bar and search glass, and the unanswered questions grouped as "not answered, carried to Phase 12.3 or later". The field ergonomics confirmation was removed (see above). The other items stayed.

**3. Scope of the fix rounds.** The checkpoint's corrections went past visual tokens. They removed a user setting (Paramètres Apparence, `theme_mode` storage and its catalogue entries) at the owner's explicit request. No SQLite migration: an old `theme_mode` row in `local_meta` is ignored. No dependency was added.

No code was changed by this closing work. Only the two design docs and the planning files changed.

## Verification

- Task 2 automated check: `grep -q "^Statut : approuvée par le propriétaire le 20"` (direction text) and `grep -q "approved by the owner on 20"` (charter) both exit 0. The direction text has 0 em dashes, and charter section 13.10 has none.
- Gates on the final tree, re-run before the closing commit:
  - `npm run lint` and `npm run typecheck`: exit 0.
  - `npm run test:coverage:mobile`: 256 suites, 3080 tests passed, thresholds hold (exit 0).
  - `npm run format:check`: only the untracked `.claude/settings.local.json` is flagged (ignored as instructed).
- Requirement REQ-QA-visual-modernisation is left unchecked in `REQUIREMENTS.md`. It closes with the phase verification, which the orchestrator runs next. Earlier plan closures in this phase did the same.

## Known Stubs

None.

## Threat Flags

None. T-12.2-43: the "go" was quoted verbatim with its date and build, and the marker was written only after it. T-12.2-44: the main checkout was checked read-only and is unchanged.

## Self-Check: PASSED

- FOUND: `docs/design/direction-visuelle-12-2.md` (line 3 marker), `docs/design/charte-graphique-etats-sauvages-spec.md` (line 554 marker), `23-23-FIXES.md`.
- FOUND in the git log of `claude/phase-12-2-da5975`: e4927f7, dd56d30, 1f2d082, 2e7ea47, cfa11e7, be192d4, 39b4f00, fb6052c.
