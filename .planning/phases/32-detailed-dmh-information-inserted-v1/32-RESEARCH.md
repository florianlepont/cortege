# Phase 32: Detailed DMH Information (INSERTED, V1) - Research

**Researched:** 2026-10-23
**Domain:** offline reference content (tree-related microhabitats) inside an Expo / React Native survey app, plus data-entry speed for factor F
**Confidence:** MEDIUM (code integration and typology crossing HIGH, verified against the real PDFs; licence status MEDIUM-LOW because no reuse grant was found and the WSL terms page was unreachable)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Source and licence
- **D-01 (blocker):** The WSL PDF is not in the repository and the assistant has not read it. The owner provides it outside the repository (like the CNPF PDFs; record its SHA-256 and retrieval date in `docs/references/README.md`). Planning reads the licence from the document and reports what is reusable. Nothing from it is embedded until the licence is read; in case of doubt, ask the owner.
- **D-02:** Fallback if the licence does not allow copying: short texts written by us, citing WSL and CNPF as sources (no copied wording). The plan must work under both outcomes.
- **D-03:** Sources, authors, licence and retrieval date are recorded in `docs/references/README.md` and shown in the app on the tool's pages.

#### Form of the tool
- **D-04:** Both: an info affordance on each DMH group of the F list opens that group's sheet, and a searchable catalogue of the 15 groups is reachable from the same F screen. Offline, embedded in the app (not downloaded).
- **D-05:** Navigation entries live in the survey stack (typed in `navigation/types.ts`), never in the map screens. Screen files respect the 400-line cap (`structure.test.ts`).

#### Content
- **D-06:** Short text plus illustrations (owner, corrected 2026-10-23). Per group: definition, how to identify it, frequent confusions, the WSL types attached to the group, and an image per group or type. Crossing IBP and WSL means each of the 15 IBP groups lists its WSL types. Images are embedded offline; their licence is checked like the text (D-01), and app size is budgeted in the plan. If the images are not reusable, fall back to text only (D-02) and flag it to the owner.
- **D-07:** All strings go through the typed `fr` catalogue (new module under `mobile/src/i18n/fr/`), no em dash (U+2014), abbreviations written out or explained (`AbbreviationInfo`). The group labels stay those of `factorInput.dmhGroupOptions`.

#### Faster recording
- **D-08:** Owner-chosen levers (2026-10-23): (a) +/- counters directly on the group row, (b) search and grouping of the 15 groups by form, (c) frequent or already ticked groups first. A timed baseline on a real survey comes first, so the plan can drop a lever that does not help. Hard constraints: the stored payload is unchanged, the capped score is unchanged (parity cases untouched), and the speed gain is measured on a real survey (timed before and after, protocol written in the plan).

### Claude's Discretion
- Details of the three speed levers (D-08) and which to keep after the timed baseline; the owner validates on the phone.
- Exact sheet layout, within the visual layer rules of CLAUDE.md.

### Deferred Ideas (OUT OF SCOPE)
- Photos attached by the observer to each DMH and photo recognition: V1.x, phase 34.

Also out of scope (CONTEXT domain): any change to recorded data (`F.dmh_groups`, `F.dmh_counts`, the IBP rules, the package, SQLite schema version 5), any API change, `mobile/src/app/survey-pdf/` (phase 33) and the map screens.
</user_constraints>

<phase_requirements>
## Phase Requirements

No requirement IDs exist yet for this phase (ROADMAP: "none new yet"). Proposed IDs, in the style of `.planning/REQUIREMENTS.md` (Epic C data entry, `REQ-DOC-`, `REQ-FT-` precedents from Phase 30). The planner should add them to REQUIREMENTS.md and the traceability table.

| ID (proposed) | Description | Research Support |
|----|-------------|------------------|
| `REQ-DOC-dmh-sources` | The sources, authors, licence status, retrieval date and SHA-256 of every document the DMH guide draws on are recorded in `docs/references/README.md` (and third-party media in `NOTICE.md`); the IBP-to-WSL crosswalk is written as a French spec (`docs/specs/dmh-guide-content-v1.md`) and validated in writing by the owner before any screen is built. | "Sources and licence" and "Typology crossing" sections; Phase 30 precedent `REQ-DOC-route-rules`. |
| `REQ-C-dmh-guide` | From the factor F screen the observer opens, offline, a sheet per DMH group (what counts for the IBP, how to recognise it, frequent confusions, the types of the WSL guide) and a searchable catalogue of the 15 groups; sources are shown on the pages. | Codebase integration map; sheet-route precedent (`surveyFactorHelp`, `surveyFinish`). |
| `REQ-C-dmh-illustrations` | Each group (or type) shows an embedded illustration, offline, only when its reuse is licensed in writing; otherwise the guide is text only and the owner is told. | Licence findings; offline packaging. |
| `REQ-C-dmh-fast-entry` | Entering factor F with many groups takes fewer taps and less time than before; the stored payload (`dmh_groups`, `dmh_counts`, `trees_per_ha`) and every score are unchanged (parity cases untouched). | Recording-speed section. |
| `REQ-FT-dmh-speed` | The speed gain is timed on a real survey, before and after, with the protocol of this research; the result is recorded. (Like `REQ-FT-route-test`, it can be closed in the field tests.) | Measurement protocol. |
</phase_requirements>

## Summary

The IBP's 15 DMH groups are exactly the 15 groups of the Larrieu et al. 2018 hierarchical typology (Ecological Indicators 84), and the WSL "Guide de poche des dendromicrohabitats" (Bütler, Lachat, Krumm, Kraus, Larrieu) is organised on the same hierarchy. The crossing is therefore a 1:1 match at group level and a nesting at type level: the 2024 WSL guide (2nd edition) describes 52 types in 17 groups and 7 forms; 43 of these 52 types sit inside the 15 IBP groups as the IBP v3.2 sheet (p. 12-13) lists them, 9 are outside the IBP's counting scope, and two WSL groups (Galles, Depots alluviaux) have no IBP group. The IBP sheet itself (p. 13) tells users to rely on the IBP thresholds, which "peuvent legerement differer" from the Guide's. This is the most important content finding: the guide must show the IBP threshold as the counting rule and never the WSL inventory threshold (they differ in at least 9 places, listed below).

On licence: the WSL guide carries only "© Institut federal de recherches WSL, 2024" in the PDF, the WSL publication pages state no licence, the WSL terms page was unreachable (HTTP 500/503), and photo credits name seven different people. Larrieu 2018 is an Elsevier article with no Creative Commons licence in Crossref. **No reuse grant for text or images was found, so the planner must assume D-02 (own texts, citing sources) as the baseline and treat images as conditional on written permission.** Larrieu is a co-author of both the WSL guide and the IBP v3.2, which makes him the natural contact for the owner to obtain written permission (a recommendation, not a verified channel).

On the code side, factor F today forces a two-step flow (tick a chip in a 15-chip list, then scroll to a separate counter block to count) and `FactorDetailScreen.tsx` is at exactly 400 lines, the structure gate's cap, so any change there starts with an extraction. The fastest safe design is a dedicated group list in 7 form sections (the 7 forms partition the 15 groups) with an info glyph, a tick and, in the counted-in-full mode only, a compact -/+ per row, plus one new sheet route `surveyDmhGuide` in the survey stack. No new npm dependency is needed.

**Primary recommendation:** Build the guide from our own French texts (D-02) over a typed data module keyed by `DmhGroupCode`, with the IBP v3.2 thresholds as the counting rule and the WSL types as identification help; ask WSL (through Larrieu) for written permission for images before Wave 4, and measure the F-entry baseline on the owner's iPhone before touching `DmhCountFields`.

## Project Constraints (from CLAUDE.md)

- Typed French catalogue only: all user text in `mobile/src/i18n/fr/` (new module registered in `fr/index.ts`); no em dash (U+2014) anywhere under `mobile/src` (`catalogue-dash.test.ts`); no user-facing literal outside `src/i18n` (`structure.test.ts`); abbreviations written out or registered (`abbreviations.test.ts`, allowlist is units, OK, PDF, GPS, IBP, "ex.").
- Files under `src/screens` and `src/navigation` are capped at 400 lines; no unused style key.
- Visual layer: colours only through `useBrandTheme()`; hex/`rgba(` only in the five token files; Ionicons outline glyphs only (`-outline`, `icons.test.ts`); motion through `brandMotion` with `ReduceMotion.System`, no React Native `Animated` outside the allowlist, haptics only through `ui/feedback.ts`; `ScreenFrame`, `AppCard variant="glass"`, no `borderWidth` on a gradient view, no `borderCurve`.
- Navigation: entries in the survey stack, typed in `navigation/types.ts`; screens mounted with `component={XRoute}`, memoised route components in `navigation/routes/`.
- State: never call `useSurveySync` elsewhere; read state through the context hooks.
- IBP rules live only in `@cortege/ibp-domain`; never re-implement a rule, threshold, allowed score set or code in `mobile`. The score never depends on the detail keys (`dmh_counts`). The package is not part of this phase.
- SQLite stays at version 5; no API change; do not touch `mobile/src/app/survey-pdf/` (phase 33) or the map screens.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check`.
- Memory notes: the owner forbids "—" in French text; the owner builds on a real iPhone (Release build from the main checkout, see `ios-device-build-recipe`), phone diagnostics go in a throwaway `diag/...` branch that is never merged; the owner merges fast, so open the PR only when the batch is complete.
- No `.claude/skills/` directory exists in this worktree.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Guide content (texts, crosswalk, thresholds) | Browser / Client (app bundle) | — | Offline-first; embedded in the JS bundle and assets, no network, no download (D-04). |
| Guide screens (sheet route, catalogue, search) | Browser / Client (survey stack) | — | Pure presentation; reads the survey's method version from the existing form context. |
| Group list with -/+ counters, ordering | Browser / Client (screen + `useSurveyForm`) | — | Writes the existing local draft keys only; sync, API and database unchanged. |
| IBP counting thresholds | Shared package (`@cortege/ibp-domain`) is the owner of scoring only | Client (display text) | The package holds the scoring rules; the guide only displays the sheet's wording in French. It must not encode a rule (CLAUDE.md). |
| Licence / attribution record | Docs (`docs/references/README.md`, `NOTICE.md`) | Client (sources line on the pages) | D-03. |
| API / Database / Sync | — | — | Explicitly unchanged. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` `Image` or `expo-image` | RN 0.86.3 / `expo-image ~57.0.5` (already in `mobile/package.json`) | Bundled illustrations | Already used (`WelcomeScreen` uses RN `Image` with `require`; `expo-image` is used in Home, community survey, attachment preview). `expo-image` is mocked to a null component in Jest. [VERIFIED: codebase grep] |
| `@react-navigation/native-stack` | `^7.19.2` (present) | Sheet route `surveyDmhGuide` | Same `presentation: "formSheet"` (iOS) / `"modal"` (Android) pattern as `surveyFactorHelp`, `surveyFinish`, `surveyRouteChoose`. [VERIFIED: `stack-options.ts`] |
| `@cortege/ibp-domain` | workspace | `DMH_GROUP_CODES`, `DmhGroupCode` | The guide data is keyed by these codes so a group can never go missing at compile time. [VERIFIED: `packages/ibp-domain/src/factor-details.ts`] |
| `foldSearchText` | `mobile/src/app/search-text.ts` | Accent-insensitive search over the 15 groups | Already tested against the server's `unaccent` fixture. [VERIFIED: codebase] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `AppCollapsibleSection` (`ui/`) | in repo | One collapsible section per form (7) | Grouping lever (b). It uses Reanimated layout transitions already gated by `ReduceMotion.System`. |
| `AppChoiceChip`, `AppPressable`, `RipplePressable`, `InfoSheet`, `ScreenFrame` | in repo | Rows, info glyph, sheet shell | Visual layer rules. |
| `AbbreviationInfo` pattern (20 pt glyph, 44 pt hit slop) | in repo | The per-row info affordance | Reuse `ABBREVIATION_INFO_ICON_SIZE` and the slop computation for the same look. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bundled `require` images | Download on demand | Rejected by D-04 (offline, embedded). |
| New image/zoom library | Plain `Image` | No pinch-zoom needed for ~200 px thumbnails; avoid a dependency. |
| A JSON asset parsed at runtime | Typed TS module + catalogue | JSON would hold French text outside `src/i18n` and escape the dash/abbreviation gates. Use TS modules. |

**Installation:** none. This phase adds no npm package.

**Version verification:** no new package, so no `npm view` is required. The versions above come from `mobile/package.json` [VERIFIED: file read 2026-10-23].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | No external package is installed by this phase. |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
The recommended design deliberately avoids new dependencies; if the planner adds one (for example an image zoom library), it must run the legitimacy gate first.

## Sources and Licence (D-01, D-02, D-03)

All facts below were checked in this session. PDFs were downloaded into the scratchpad (outside the repo) and read with `pdftotext`; nothing was pasted into the repo.

### Candidate documents

| # | Document | Publisher / licence found | Verified | Reusable in a free app? |
|---|----------|---------------------------|----------|--------------------------|
| W1 | **Bütler R., Lachat T., Krumm F., Kraus D., Larrieu L. (2024), "Guide de poche des dendromicrohabitats. Description et seuils de grandeur pour leur inventaire dans les forêts tempérées et méditerranéennes", 2e édition révisée, Birmensdorf: Institut fédéral de recherches sur la forêt, la neige et le paysage WSL, 64 p.** FR PDF: <https://www.dora.lib4ri.ch/wsl/dload/wsl:37831/PDF/> (short link in the PDF: wsl.ch/gp-dendromicrohabitats). SHA-256 of the file downloaded 2026-10-23: `cc5fb0450b4dcf6c79b16e173fa7f28d5464035801b756b24950ba88e42a7e68` (12,068,916 bytes; 64 pages; created 2024-09-19). | Imprint: "© Institut fédéral de recherches sur la forêt, la neige et le paysage WSL, 2024". No Creative Commons or other reuse licence appears in the PDF text or on the WSL publication page (page only links to "Conditions d'utilisation" and describes print ordering). Photo credits (p. 64): Loïc Duchamp, Pierre Henrioux, Daniel Kraus, Thibault Lachat, Laurent Larrieu, Thomas Reich, Rita Bütler (all others); drawings Lisa Apfelbacher, Céline Emberger, Daniel Kraus. | Yes (PDF + WSL page) | **Not established. Treat as all rights reserved.** Needs written permission from WSL, which must also cover the named photographers/illustrators. |
| W2 | Same guide, English edition: "Field Guide to Tree-related Microhabitats", 2nd ed. 2024, 64 p. <https://www.dora.lib4ri.ch/wsl/dload/wsl:36965/PDF/> (wsl.ch/fg-trems). SHA-256 `b4335f8dc93b4218aabe8bee91ee6336d2dca87e85e745f7c1a1ad8e232aa946`. | "© Swiss Federal Institute for Forest, Snow and Landscape Research WSL, 2024"; no licence. | Yes | Same as W1. |
| W3 | First edition (2020, 58-59 p., 47 types in 15 groups, exactly the IBP structure) and the WSL Notice pour le praticien 64 / WSL Fact Sheet 64 "Connaître, conserver et promouvoir les arbres-habitats" (2020, 12 p.). | Not read in this session (WSL page lists the 2020 edition; search found no licence). | Page only | Unknown. |
| W4 | **Larrieu L., Paillet Y., Winter S., Bütler R., Kraus D., Krumm F., Lachat T., Michel A.K., Regnery B., Vandekerkhove K. (2018), "Tree related microhabitats in temperate and Mediterranean European forests: A hierarchical typology for inventory standardization", Ecological Indicators 84: 194-207, DOI 10.1016/j.ecolind.2017.08.051.** | Elsevier. Crossref lists only the Elsevier TDM user licence and no Creative Commons licence; a university repository copy is "restricted, publisher holds copyright". | Crossref API | **No.** Source of the typology (cite it), not of copied text or figures. |
| W5 | Kraus D., Bütler R., Krumm F., Lachat T., Larrieu L., Mergner U., Paillet Y., Rydkvist T., Schuck A., Winter S. (2016), "Catalogue of tree microhabitats, Reference field list", Integrate+ Technical Paper, 16 p. | Not obtained: integrateplus.org did not respond; only a 4-page German magazine summary (Kraus & Schuck 2016, ANL, copyright ANL) was read. Authors list in the previous sentence is from training knowledge. | No | Unknown. Predecessor of W4; no need to use it. |
| C1 | **Gonin P., Larrieu L., Marty P., Baiges T., Corezzola S., Miozzo M., Palero N. (2026), IBP FR v3.2, CNPF, INRAE Dynafor, 02/02/26, 28 p.** (already in `docs/references/README.md`; SHA-256 re-checked 2026-10-23: `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`, matches). | Authors' copyright (CNPF, INRAE Dynafor); no open licence in the PDF text. p. 12-13 reproduces the typology with "illustrations tirées de Larrieu et al., 2018" and points users to the WSL videos and the Bütler et al. 2024 guide. p. 28: "Le logo IBP est une marque déposée... utilisation possible qu'en respectant la définition de l'IBP donnée par les auteurs." | Yes | Facts (group names, thresholds) are already transcribed in the app and spec with citation; do not copy the sheet's drawings; do not use the IBP logo. |

### What could not be verified
- The WSL "Terms and conditions" / "Conditions d'utilisation" page (HTTP 500 and 503 on every fetch); WSL's institutional reuse policy is therefore unknown.
- The DORA repository record (a JavaScript application; metadata not retrievable), which may carry a licence field.
- Whether the PDF the owner will supply is W1, W2 or the 2020 edition. **The first Wave 0 task is to compare the owner's file SHA-256 with the two above.** The 2020 edition has 47 types (matching the IBP exactly); the 2024 edition has 52 types and 17 groups. The crosswalk below is for 2024 and must be re-checked if the owner's file is another edition.
- Whether WSL grants permission, and under which attribution wording.
- The Integrate+ 2016 catalogue licence.
- An existing free-licence photo set for TreMs: a Wikimedia Commons search (2026-10-23) found no systematic set.

### Recommendation on reuse (the plan must work under both outcomes)
1. **Baseline (D-02): write our own short French texts**, informed by the guide's definitions, citing sources, copying no wording and no image. Facts (type names, numeric thresholds) are not copyrightable expression but are still attributed. This is what the plan must assume until written permission exists.
2. **Ask WSL for written permission** for (a) short adapted texts and (b) the images (named photographers/illustrators included), for a free app of the association Etats Sauvages, with the attribution wording they require. Owner action. Suggested channel: the authors; Larrieu is also an IBP FR v3.2 author (verified: IBP p. 28 reference), which fits the V3 "partnership with CNPF and INRAE" direction in REQUIREMENTS.md [ASSUMED that this channel is appropriate].
3. If permission covers images only partly, use only the covered ones; the `Image` slot must be optional per group/type so the sheet reads well with or without it.
4. **Attribution wording to prepare** (final wording is WSL's to dictate): "Description : Bütler R., Lachat T., Krumm F., Kraus D., Larrieu L. (2024), Guide de poche des dendromicrohabitats, 2e édition, Institut fédéral de recherches sur la forêt, la neige et le paysage, Birmensdorf. Typologie : Larrieu et al. (2018), Ecological Indicators 84. Seuils de comptage : IBP FR v3.2, Centre national de la propriété forestière et INRAE Dynafor (2026)." Write the three institutions out in full (see Pitfall 4: the abbreviation gate).
5. Repo hygiene: this repository is public and "source-available, not open source" (`LICENSE`, `NOTICE.md`). Third-party images committed to a public repo are redistribution. Add a section "Third-party media (DMH guide)" to `NOTICE.md` naming the folder, the rightsholder and the permission; **exclude the folder from `scripts/stamp-asset-copyright.py`**, which stamps "Copyright (c) Association Etats Sauvages. All rights reserved" into every PNG/JPEG under the path it is given (the script is run by hand and is not in CI; `mobile/package.json` runs it only on `assets/herbier-transparent`).

## Typology Crossing (success criterion 2)

### Structure (verified from W1 and C1)
- IBP: 15 groups `dmh_01..dmh_15`, same list for v3.0 and v3.2 (comparison doc F-7). App labels: `factorInput.dmhGroupOptions` ("1. Loges de pic" ... "15. Coulées de sève et de résine"), shared by both methods and unchanged (D-07).
- WSL 2024: 7 forms, 17 groups, 52 numbered types. The group order of the WSL table of contents is the IBP order; the WSL guide adds two groups the IBP does not use: **Galles** (type 31) and **Dépôts alluviaux** (type 50).
- The 7 forms partition the 15 IBP groups: Cavités (1-4), Blessures et bois apparent (5-6), Bois mort dans le houppier (7), Excroissances (8-9), Sporophores de champignons et myxomycètes (10-11), Structures épiphytiques, épixyliques ou parasites (12-14), Exsudats (15). [VERIFIED: W1 p. 10-11 and table of contents]

### Crosswalk table (WSL type numbers are those of the 2024 guide)

| IBP group | Form | WSL types inside the IBP group | WSL types outside IBP | IBP v3.2 counting rule (p. 3, p. 12-13) | Where the WSL guide's threshold differs |
|-----------|------|-------------------------------|------------------------|-------------------------------------------|------------------------------------------|
| dmh_01 Loges de pic | Cavités | 1 petite (ø < 4 cm), 2 moyenne (4-7), 3 grande (> 10), 4 flûte de pic | — | the four types; flûte = at least 3 loges in a line, ø > 3 cm | none found |
| dmh_02 Cavités à terreau | Cavités | 5 de pied, 6 de tronc, 7 semi-ouverte, 8-9 ouverte vers le haut (cheminée, avec/sans contact au sol), 10 branche creuse | — | ø > 10 cm, or > 30 cm if semi-open or open | none found |
| dmh_03 Orifices et galeries d'insectes | Cavités | 11 | — | ø > 2 cm | WSL also accepts many smaller orifices over 300 cm2 |
| dmh_04 Concavités | Cavités | 12 dendrotelme, 13 trou de nourrissage de pic, 14 concavité à fond dur de tronc, 15 concavité racinaire | — | ø > 10 cm and depth > 10 cm | dendrotelme: WSL ø > 15 cm |
| dmh_05 Aubier apparent | Blessures et bois apparent | 16 bois sans écorce, 17 blessure due au feu, 18-19 écorce décollée (abri, poche) | — | surface > 600 cm2 (bare wood, fire); écorce décollée: gap > 1 cm, width and height > 10 cm | bois sans écorce: WSL > 300 cm2 |
| dmh_06 Aubier et bois de coeur apparents | Blessures et bois apparent | 20 cime brisée, 21 bris de charpentière, 22 fente, 23 fente causée par la foudre, 24 fente à l'insertion d'une fourche | 25 entailles de castor | cime brisée ø > 20 cm; bris > 300 cm2; fente width > 1 cm, depth > 10 cm, length > 30 cm | fourche: WSL length only; v3.2 wording change F-3 |
| dmh_07 Bois mort dans le houppier | Bois mort dans le houppier | 26 branches mortes, 27 cime morte, 28 vestige de charpentière brisée | — | branches or top: ø > 20 cm and L > 50 cm, or ø > 3 cm and more than 20 % of the crown dead | WSL: branch ø > 10 cm, or ø > 3 cm and > 10 % of the crown; cime morte > 10 cm |
| dmh_08 Agglomérations de gourmands ou de rameaux | Excroissances | 29 balai de sorcière, 30 gourmands ou brogne | — | balai > 50 cm; brogne > 5 gourmands | none found |
| dmh_09 Loupes et chancres | Excroissances | 32 loupe, 33 chancre | (31 galles: WSL group without IBP group) | ø > 20 cm | none found |
| dmh_10 Champignons pérennes | Sporophores | 34 polypore pérenne | — | ø > 5 cm | none found |
| dmh_11 Champignons éphémères | Sporophores | 35 polypore annuel, 36 agaricale charnue | 37 corticoïdes, 38 pyrénomycète, 39 myxomycète | ø > 5 cm or more than 10 | none found for 35-36 |
| dmh_12 Plantes et lichens épiphytiques ou parasites | Structures épiphytiques | 40 bryophyte, 41 lichen foliacé ou fruticuleux, 42 lierre ou liane, 43 fougère, 44 gui | — | more than 20 % of the trunk for at least one of mosses, lichens, ivy or lianas; ferns > 5 fronds (v3.2); mistletoe 10 balls ø > 20 cm | WSL: > 10 % of the trunk |
| dmh_13 Nids | Structures épiphytiques | 45 nid de vertébré | 46 nid d'invertébré | only a large vertebrate nest, ø > 50 cm | WSL: ø > 10 cm |
| dmh_14 Microsols | Structures épiphytiques | 49 microsol du houppier | 47 microsol d'écorce, 48 microsol d'entre-écorce | crown microsoil, at any height in the tree | WSL describes three microsoil types |
| dmh_15 Coulées de sève et de résine | Exsudats | 51 coulée de sève, 52 coulée de résine | — | flow > 20 cm; active sap, fresh or old resin (v3.2) | WSL: > 10 cm |
| (no IBP group) | — | — | 31 galles, 50 dépôts d'argile ou de limon | not counted | — |

Sources: IBP FR v3.2 p. 3 and p. 12-13 (text extraction, PDF SHA matches the repo's record) and W1 pp. 10-64. [VERIFIED: pdftotext of both PDFs, 2026-10-23.] The type-to-group nesting is read from the guide's table of contents and page headings; counts: 43 types inside IBP groups plus 9 outside = 52. Confidence: HIGH for group level, MEDIUM-HIGH for type level (the IBP sheet shows types as drawings with captions; the captions were extracted as text, not checked visually). **Validation owner: the owner plus a domain expert (Larrieu is an IBP author).** The WSL numbering belongs to the 2024 edition and must not be exposed to the observer as a stable identifier.

### v3.0 versus v3.2 for factor F
The 15 groups and their labels are the same (comparison doc F-7). Only the wording of three groups changes, so the content data needs an optional `v3_0` text override for exactly these (the survey's method comes from `useSurveyFormState().state.ibpMethodVersion`, `null` = v3.0):
- dmh_06 (F-3): v3.0 counts a limb break with diameter over 20 cm or area over 300 cm2; v3.2 only the area over 300 cm2; a cut branch is group 6 when flush with the trunk and over 300 cm2, group 7 when the stub is over 50 cm long, over 20 cm in diameter and fully dead.
- dmh_12 (F-1): v3.2 adds ferns (more than 5 fronds); the 20 % threshold applies to at least one of the types.
- dmh_15 (F-2): v3.0 active sap flow over 20 cm; v3.2 sap or resin, fresh or old, over 20 cm.
- Also outside the 15-group list: the v3.0 PDFs are no longer online, so v3.0 wording can only be cited from the comparison doc and the 2021 sheet recorded there.

## Architecture Patterns

### System Architecture Diagram

```
Observer on factor F page (FactorDetailScreen, inside FactorPager)
        |
        |-- ticks / counts a group ------------------------------+
        |                                                         v
        |                                          DmhGroupList (7 form sections, 15 rows)
        |                                           row = tick + label + info glyph + (uncapped only) compact -/+
        |                                                         |
        |                                      field.selection.onChange (dmh_groups)    existing keys,
        |                                      entry.setDmhCount (dmh_counts, trees_per_ha)  unchanged payload
        |                                                         |
        |                                                  useSurveyForm -> draft -> SQLite -> sync (untouched)
        |
        |-- taps info glyph on a row ---------------+
        |-- taps "Guide des dendromicrohabitats" ---+
        v                                           v
navigation.navigate("surveyDmhGuide", { group? }) --> DmhGuideRoute (formSheet iOS / modal Android)
                                                          |
                          useSurveyFormState().state.ibpMethodVersion  (v3.0 vs v3.2 wording)
                                                          |
                     +------------------------------------+--------------------------+
                     v                                                               v
          catalogue mode (search box + forms)                           group mode (one DmhGroup page)
          foldSearchText over label + keywords                          IBP rule | how to recognise | confusions
                     |                                                  WSL types (name, counted by IBP?, image?)
                     v                                                  sources line (D-03)
          app/dmh-guide/*  (pure structure: codes, forms, type numbers, order, search)
          i18n/fr/dmh-guide.ts (all French text, keyed by DmhGroupCode)
          assets/dmh/*  (optional, only if licensed; require() registry)
```

### Recommended Project Structure
```
mobile/src/
├── app/dmh-guide/
│   ├── structure.ts         # DMH_FORMS (7), form of each group, WSL type numbers per group, countedByIbp flags; no French text
│   ├── order.ts             # pure: order rows (ticked or counted first, then form order), no live reordering
│   ├── search.ts            # pure: foldSearchText match on label + catalogue keywords
│   ├── images.ts            # static require() registry, optional per type (only if licensed)
│   └── *.test.ts
├── i18n/fr/dmh-guide.ts     # texts keyed by DmhGroupCode; v3_0 overrides for dmh_06, dmh_12, dmh_15; sources and licence lines
├── navigation/routes/DmhGuideRoute.tsx   # memoised route, reads the method version
├── navigation/stacks/stack-options.ts    # + dmhGuideScreenOptions (copy of factorHelpScreenOptions)
├── screens/dmh-guide/       # DmhGuideScreen, DmhGroupPage, DmhCatalogue, styles (each <= 400 lines)
├── screens/factor-detail/   # DmhGroupList.tsx (rows), renderFactorField.tsx (extracted from FactorDetailScreen)
└── ui/                      # DmhCounterStepper (compact -/+), only if FactorCounterInput cannot be reused
docs/specs/dmh-guide-content-v1.md        # French spec: crosswalk, texts, validated by the owner (Phase 30 precedent)
```

### Pattern 1: Structure in `app/`, text in the catalogue
**What:** `app/dmh-guide/structure.ts` is `Record<DmhGroupCode, GroupStructure>` (form id, WSL type numbers, flags); `i18n/fr/dmh-guide.ts` is `Record<DmhGroupCode, GroupText>`. A screen joins them by code; the group label always comes from `selectionLabel("F", code)` so `dmhGroupOptions` stays the single source (D-07).
**Why:** the structure gate flags French literals with a `label:`/`title:` property outside `src/i18n`, and the dash and abbreviation gates only scan the catalogue. Keeping text in the catalogue makes all gates apply automatically.
**Example:**
```typescript
// Source: pattern of packages/ibp-domain/src/factor-details.ts + mobile/src/app/factor-selections.ts
import { DMH_GROUP_CODES, type DmhGroupCode } from "@cortege/ibp-domain"

export const DMH_FORM_IDS = [
  "cavities", "wounds", "crown_deadwood", "growths", "fruiting_bodies", "epiphytic", "exudates",
] as const
export type DmhFormId = (typeof DMH_FORM_IDS)[number]

export type GroupStructure = {
  form: DmhFormId
  /** Types of the 2024 WSL guide inside this IBP group (numbers are edition-specific). */
  wslTypes: readonly number[]
  /** Types the WSL guide describes for this group but the IBP does not count. */
  wslTypesOutsideIbp: readonly number[]
}

export const DMH_GUIDE_STRUCTURE: Record<DmhGroupCode, GroupStructure> = {
  dmh_01: { form: "cavities", wslTypes: [1, 2, 3, 4], wslTypesOutsideIbp: [] },
  // ... exhaustive: the Record type makes a missing code a compile error
} as Record<DmhGroupCode, GroupStructure>
```

### Pattern 2: One sheet route with internal master-detail
**What:** register `surveyDmhGuide: { group?: DmhGroupCode }` with `dmhGuideScreenOptions(theme)` (same as `factorHelpScreenOptions`: `headerShown: false`, `presentation: Platform.OS === "ios" ? "formSheet" : "modal"`, `sheetAllowedDetents: [0.5, 1]` or `[0.65, 1]`, grabber). Param `group` opens directly on a group page (info glyph); no param opens the searchable catalogue; a back control inside the sheet moves between them with local state.
**Why:** avoids stacking a form sheet over a form sheet on iOS, which was not tested in this repo [ASSUMED: needs a device check]. The route is a memoised component in `navigation/routes/` reading only `useSurveyFormState`.
**Precedents:** `surveyFactorHelp` (`FactorHelpRoute`, `FactorHelpSheet`), `surveyFinish` (`FinishSheetRoute`), `surveyRouteChoose`. Note `routeChooseScreenOptions` keeps a solid header and its own "Annuler"; the help sheet has none and draws its own title row inside the one scroll view (the finding "header outside the scroll view was drawn under the scrolled text" is in the `FactorHelpSheet` comment).

### Pattern 3: Replace the F companion chips with a row list
**What:** for factor F only, `renderCompanion` renders `DmhGroupList` instead of `FactorChipsInput`. Each row: a tick toggle over the full row (44 pt minimum, `brandInteraction.hitTarget.min`), the label, a separate info glyph button (its own press target, like `RadioCard`'s `titleAccessory` outside the card press), and, only when F is counted in full (`uncappedEntry` present), a compact -/+ with the count. Sections: the 7 forms as `AppCollapsibleSection`, open by default for forms that hold a ticked or counted group.
**Why:** `FactorChipsInput` is generic (B, I, J, H share it) and a chip cannot carry a separate info button. Keep `FactorChipsInput` for the other factors untouched.

### Anti-Patterns to Avoid
- **Showing the WSL inventory threshold as the rule to follow.** The IBP threshold wins (IBP p. 13 says so); the WSL value can be shown only as a labelled "le guide suisse retient" aside, or omitted. Showing both unlabelled would make observers count differently from the IBP sheet.
- **Re-implementing a rule in `mobile`.** The guide displays the sheet's wording; it computes nothing and does not touch `dmhDensityPerHa` or the cap.
- **Live reordering while the observer taps** (lever c): rows jumping under the finger cause mis-taps. Order once when the list mounts or when the sheet closes.
- **Putting guide text in `app/`** (`{ label: "..." }` literals): fails `structure.test.ts`.

## Codebase Integration Map (read from the code, 2026-10-23)

### Factor F today
- `FactorDetailScreen.tsx` (**exactly 400 lines**, the cap of `structure.test.ts` is "over 400"): `fieldVariantsFor("F")` returns `[{ kind: "numeric", companion: "F" }]`. `renderFactorField` renders `trees_per_ha` as an `AppField` and, through `renderCompanion`, a `FactorChipsInput` (15 `AppChoiceChip` in a wrapping row, 44 pt, haptic) with options from `selectionOptionsFor("F", methodVersion, selected)` and label `fr.factorDetail.companionLabels.dmh_groups`.
- When the route counts F in full (`uncappedFactors.includes("F")` and `uncappedEntry` set), `UncappedFieldBlock` renders `DmhCountFields` right after the numeric field and chips: title, helper, one `FactorCounterInput` per **ticked or counted** group (56 pt -/+ buttons, long-press repeat at 120 ms with acceleration, tap on the number opens a text field), then the surface field. The rows are derived from `field.selection.selected` plus counts above zero.
- Data flow: tick -> `field.selection.onChange` -> `setFactorF({dmh_groups})` in `useSurveyForm` (line ~659); count -> `entry.setDmhCount` -> `storeDmhCount` (in `useUncappedEntry`, returns the derived trees per hectare) -> `writeTreesPerHa` -> `setFactorF({trees_per_ha})` (line ~516). Payload assembly at `useSurveyForm` lines ~316-317 writes `dmh_groups` and `dmh_counts` only beside `trees_per_ha`. `DmhCountFields` itself never writes `dmh_groups`: a count for an unticked group is impossible from the UI because its row only exists once ticked.
- `FactorPager` mounts only the active page; each page is a vertical `ScrollView` with `keyboardShouldPersistTaps="handled"`, so a long F page scrolls inside a horizontal pager (gesture conflicts are not an issue for taps).
- Tests to extend: `FactorDetailScreen.test.tsx` (mocks `DmhCountFields`, line 130), `DmhCountFields.test.tsx`, `useSurveyForm.test.ts`, `useUncappedEntry.test.ts`, `FactorPager.test.tsx`, `FactorDetailRoute.test.tsx`.

### Navigation
- `navigation/types.ts`: `SurveysStackParamList` already holds `surveyFactorHelp: { help; hints }`, `surveyFinish`, `surveyRouteChoose`. Add `surveyDmhGuide: { group?: DmhGroupCode }` and its `NativeStackScreenProps` alias next to the others (`FactorHelpRouteProps` pattern, with `navigation/routes/FactorHelpRoute.tsx`).
- `stacks/SurveysStack.tsx`: add one `SurveysStack.Screen name="surveyDmhGuide" options={dmhGuideScreenOptions(theme)} component={DmhGuideRoute}`; `stack-options.ts` hosts the options factories.
- `FactorDetailRoute.tsx` already owns `handleOpenHelp` calling `navigation.navigate("surveyFactorHelp", ...)`; add `handleOpenDmhGuide(group?)` the same way and pass it down `FactorPager` -> `FactorDetailScreen` as `onOpenDmhGuide`. This adds props to three files; keep each under the cap.
- Coverage ratchet: `./src/navigation/` requires 100 % statements and lines, 98 % branches in `jest.unit.config.js` (only enforced with `--coverage`, but new route code must be fully tested). Update `routes.test.tsx` / `navigation.test.tsx` for the new screen.
- Never register the route in `PublicMapStack`, `HomeStack` or map code (D-05). A survey can only be edited inside the survey stack, so one registration is enough.

### Catalogue and gates (`mobile/src/__checks__/`)
| Gate | What it enforces | What the new code needs |
|------|------------------|--------------------------|
| `catalogue-dash.test.ts` | no U+2014 in any string, template or JSX text of `mobile/src` | write French with commas, colons, parentheses. |
| `abbreviations.test.ts` | scans the whole `fr` catalogue; any run of 2+ capitals, mixed short form (`BMg`), capital+digits (`A4`, `S0`) or slash pair is a finding unless in `POLICY`; `findUnusedTerms` fails for a policy key no string uses; the explained set must equal `fr.abbreviations.terms` keys exactly | **Avoid** `WSL`, `CNPF`, `INRAE`, `DMH`, `FR` (as in "IBP FR"), `A4`, `A5`, `DM`: write institutions in full; "IBP" and "cm", "ha" are allowed; "cm2" is safe, "cm²" too. Adding an acronym means editing `POLICY`, `fr.abbreviations.terms` and the exact-set assertion: avoid. |
| `structure.test.ts` | no unused `StyleSheet` key; files in `src/screens` and `src/navigation` over 400 lines; user-facing literals (JSX text, `label`/`title`... props, alerts, statuses) outside `src/i18n` | all text in `fr`; split screens; remove unused style keys. `FactorDetailScreen.tsx` has zero headroom. |
| `icons.test.ts` | every Ionicons glyph ends with `-outline` | `information-circle-outline`, `chevron-down-outline`, `search-outline`, `close-outline`, `leaf-outline`, `add-outline`, `remove-outline`, `image-outline`. |
| `motion.test.ts` | `ReduceMotion.System` wherever `entering/exiting/layout` are used; haptics only via `ui/feedback.ts`; no native-driver-off; `Animated` only in the allowlist | reuse `AppCollapsibleSection`, `EntranceView`; no custom Animated. |
| `fonts.test.ts` | font files named after PostScript names | no new font. |
| `layers.test.ts` | no `borderWidth` on a gradient view, no `borderCurve` | use existing cards. |
| ESLint hex gate | `#xxxxxx` / `rgba(` only in five token files | colours via `useBrandTheme()`; images are not coloured by code. |
| `dmhGroupOptions` | labels stay "1. Loges de pic" ... | take group names from `selectionLabel("F", code)`. |

### Existing precedents to read before coding
`mobile/src/screens/FactorHelpSheet.tsx` (sheet content), `mobile/src/ui/InfoSheet.tsx` and `AbbreviationInfo.tsx` (the glyph + hit slop), `RadioCard.tsx` (`titleAccessory` kept outside the card press), `mobile/src/hooks/useGlobalSearch.ts` and `app/search-text.ts` (folding), `mobile/src/screens/route-guide/` (glossary and spec-first workflow), `docs/specs/route-choice-rules-v1.md` (spec validated by the owner before screens).

## Offline Content Packaging (task 4)

- **Text:** TypeScript catalogue module. About 15 groups x 4 short fields plus about 43 type names: well under 60 KB of source. No asset needed.
- **Images:** `require()` of files under `mobile/assets/dmh/` (new folder, outside `herbier/`, `animals/`, which belong to the association). Metro bundles them as assets (`assetBundlePatterns: ["**/*"]` in `app.json`); precedent is `WelcomeScreen` (`require("../../assets/animals/MESANGE.png")`) and the herbier plates (JPEG, about 150-190 KB each, 3.7 MB for the folder). Path literals must be static (Metro), so use one registry file `app/dmh-guide/images.ts` with a literal `require` per image, typed `Partial<Record<TypeKey, ImageSourcePropType>>`.
- **Jest:** the moduleNameMapper already maps `png|jpg|jpeg|gif|webp|ttf` to `test/image.mock.ts` (returns `1`), so no mock work; `expo-image` renders null in tests, so tests assert on props (`source`, `accessibilityLabel`) through probes as the existing tests do. Add a `__checks__` gate that reads the folder with `fs`: every file referenced by the registry exists, every image has a credit string in the catalogue, total bytes under the budget.
- **Format and size:** the images embedded in the WSL PDF are small (for example 182 x 232 px photos and 216 x 254 px drawings at 150 ppi on pp. 12-14, 15-100 KB each as CMYK/JPEG), because the PDF is a layout export. They are only good for thumbnails (about 100-130 pt wide at 2x). Higher resolution needs originals from WSL (the guide lists "Annexe 3: Photos des dendromicrohabitats" as supplementary material, location not verified). If permission is granted, ask for the originals.
- **Budget (proposal, [ASSUMED] pending owner agreement):** at most one image per type inside an IBP group (43) plus optional drawings; each converted to sRGB (not CMYK) JPEG or WebP at 600 px on the long side, at most 80 KB, **total at most 3 MB** (about 18 % of the current 17 MB of `mobile/assets`, which includes 7.9 MB of models). Gate it by test. Show images in the group page and not in the catalogue list.
- **Accessibility:** `accessibilityLabel` from the catalogue (the type name), `accessible` images only on group pages; a credit line under or at the end of the page.
- **Colour space:** the PDF photos are CMYK JPEG; convert before bundling (`jimp` is already a devDependency and `mobile/scripts/remove-white-bg.mjs` is the precedent for an asset script).

## Recording-Speed Work (task 5, D-08)

### Interaction cost today (from the code)
Counted-in-full mode (the "many DMH" case), per ticked group: 1 tap on the chip (chips are above), a scroll down to the counter block, N taps on "+" (56 pt buttons, or long press to repeat, or tap the number and type), and a scroll back up for the next chip. Rows exist only for ticked groups, so adding a group means scrolling up. With G groups and T trees: about G + T taps plus about 2G scroll gestures, plus the surface field. Each "+" tap runs `countFromText -> setDmhCount -> writeTreesPerHa -> setFactorF`, which re-renders the form context (a separate performance point to profile, not assumed slow).
Capped mode: one numeric field for the total plus optional chips; there is no per-group count, so the observer's cost is mental arithmetic and typing; chips are optional records.

### The three levers
- **(a) -/+ on the group row.** Only possible in the counted-in-full mode, because capped mode has no `dmh_counts` and D-08 forbids changing stored data. First "+" on an unticked group must also add the code to `dmh_groups` (both keys already exist; no payload change). Saves the tick tap and the scroll between lists. Needs a new form action (for example `bumpDmhGroup(code, delta)`) that updates `dmh_groups` and calls `setDmhCount` in one batch, tested in `useSurveyForm.test.ts`. A compact stepper is needed because `FactorCounterInput` is a 56 pt button row inside a bordered shell (about 110-130 pt per group, 15 groups would be 1800 pt). Keep tap targets at least 44 pt (`brandInteraction.hitTarget.min`); the 56 pt size exists for gloves, so ask the owner whether 44-48 pt is acceptable in the field.
- **(b) Grouping by form + search.** Seven `AppCollapsibleSection`s halve the scrolling for a typical survey that touches 3-4 forms. Search over 15 items has little value on the F page itself (a screen holds about 10 rows); it matters more in the guide catalogue (find "pic", "lierre", "gui" by common name) through `foldSearchText` over label + keywords. Recommend: grouping on the F list, search in the guide catalogue only; drop F-list search unless the baseline shows scrolling dominates.
- **(c) Frequent or already ticked first.** "Already ticked or counted first" is free and data-driven. "Frequent first" needs a source: the WSL guide gives a frequency word per type (rare to fréquent) for natural and managed forests, but local frequencies differ (W1 p. 7) and a positional parse of the PDF could not confirm which line is natural versus managed, so do not hard-code a frequency order. Recommend: order = ticked or counted first, then the IBP order; optionally "most used in the observer's own previous surveys" later (needs reading past drafts: out of scope here). Reorder only on mount (see Anti-Patterns).

### Constraints that must hold (add as tests)
- Payload equality: for a fixed sequence of user actions, the draft payload written with the new list equals the payload written with the old chips + counters (same `dmh_groups` order as `selectionOptionsFor`, same `dmh_counts`, same `trees_per_ha`). Order of `dmh_groups` must remain in option order (`FactorChipsInput.toggle` returns "in option order").
- Parity cases: `packages/ibp-domain` is untouched; `IBP_PARITY_CASES` (`MAT-F-UNC-*`) must still pass in package, API adapter and mobile adapter (`npm run test:unit`).
- A count above zero never disappears from view (existing rule: "a counted group keeps its row").

### Measurement protocol (success criterion 3)
Goal: show a lower median time and fewer touches for entering F on a real survey, before and after, same phone, same build type.
1. **Scenarios** (fixed before measuring, from the owner's real survey): S1 "few": 3 groups, 5 trees; S2 "many": the owner's real survey tally (expected 8-10 groups, 15-25 trees); both in the counted-in-full mode (the mode with per-group counts), plus S3 capped for non-regression (not slower). Record each as a list "group, trees" written on paper beforehand so reading time is excluded.
2. **Baseline (Wave 0, before any change to F):** current `main` Release build on the owner's iPhone (recipe: `ios-device-build-recipe`; Release so the native tab bar matches). Three runs per scenario, alternating order, new draft each time, surface prefilled.
3. **Time:** start = the first touch on the F page; stop = the last count shown and the surface entered. Measure from the phone's built-in screen recording, read frame by frame (no code needed), and cross-check with a throwaway instrumented build on a `diag/dmh-timing` branch (never merged, per the repo's phone-diagnostics convention) that logs `Date.now()` at F mount and at each tick/count change and counts `onTouchStart` events at the pager root, and counts scroll gestures. Instrumentation strings would violate the literal gate, so keep them out of `main`.
4. **Metrics:** median of 3 for (i) seconds, (ii) touches, (iii) vertical scroll gestures, (iv) mis-taps (counts corrected by "-"). Report per scenario.
5. **After:** the same protocol on the final build. Proposed pass rule [ASSUMED, owner to confirm]: S2 median time at least 25 % lower and touches lower; S1 and S3 not slower. If a lever shows no gain in the baseline-based estimate, drop it (D-08).
6. **Automated proxy (runs in CI, deterministic):** a unit test replays S1/S2 through the old component pair and the new list with `react-test-renderer` and counts the presses needed (`onPress` calls), asserting new <= old. It does not measure time, it proves tap-count and guards regressions.
7. **Where:** at a desk with the real tally is acceptable for the criterion; one run in the field with real trees is better evidence of glove use and sunlight, schedule it with the field tests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accent-insensitive search | a new normaliser | `foldSearchText` / `normalizeSearchQuery` in `app/search-text.ts` | Already tested on the accent fixture shared with the server. |
| Sheet presentation | a custom modal/bottom sheet | `presentation: "formSheet"` / `"modal"` stack options (copy `factorHelpScreenOptions`) | Native grabber, detents, swipe; device-verified pattern. |
| Collapsible sections | custom accordion animation | `ui/AppCollapsibleSection` | Reduced-motion gated already. |
| Info glyph + 44 pt hit target | a new icon button | `ABBREVIATION_INFO_ICON_SIZE`, `brandInteraction.hitTarget.min`, `AppPressable` | Same look and `motion`/`icons` gates. |
| Tree density / cap | any computation in the guide | `dmhDensityPerHa` via `useUncappedEntry` | CLAUDE.md: never re-implement a rule. |
| Group codes and labels | a second list of 15 groups | `DMH_GROUP_CODES` + `selectionLabel("F", code)` | One source (D-07); compile-time completeness. |
| Licence text | paraphrasing a licence | quote the owner's/WSL's written permission verbatim in `NOTICE.md` | Avoids a wrong legal summary. |

**Key insight:** the cost of this phase is content validity (a wrong threshold misleads a surveyor and changes scores in the field), not UI code. Keep one source of truth for every code, label and number.

## Common Pitfalls

### Pitfall 1: WSL thresholds shown as the rule
**What goes wrong:** the observer counts trees with the guide's 10 % lichen cover or 10 cm nest, while the IBP needs 20 % and 50 cm; scores drift between observers.
**Why:** the IBP deliberately uses its own thresholds (IBP p. 13). **How to avoid:** the "Ce qui compte pour l'IBP" block is mandatory on every group page and comes from IBP v3.2; WSL values appear only as labelled context. **Warning signs:** a number in the catalogue that is not in the IBP column of the crosswalk.

### Pitfall 2: Wrong method wording (v3.0 versus v3.2)
**What goes wrong:** a v3.0 survey reads "fougères" or "résine" which v3.0 does not count. **How to avoid:** `v3_0` overrides for dmh_06, dmh_12, dmh_15, selected by the survey's method (null = v3.0).

### Pitfall 3: `FactorDetailScreen.tsx` is at the 400-line cap
**What goes wrong:** adding one prop pushes it to 401 and `structure.test.ts` fails. **How to avoid:** Wave 0 extracts `renderCompanion`, `renderFactorField` and `legacyCountOf` into `screens/factor-detail/renderFactorField.tsx` (no behaviour change, tests unchanged), then add the F list there.

### Pitfall 4: The abbreviation gate rejects acronyms and codes
**What goes wrong:** "WSL", "CNPF", "INRAE", "FR", "A4", "DM" in a catalogue string fail `abbreviations.test.ts`; adding them to `POLICY` also needs `fr.abbreviations.terms` and the exact-set assertion, and `findUnusedTerms` fails if unused. **How to avoid:** write institutions in full and say "environ 25 cm sur 25 cm" for 600 cm2; never write a type code; the strings never contain snake_case (`dmh_05`).

### Pitfall 5: Live reordering and jumpy rows
Rows that move when ticked make the next "+" land on the wrong group. Order once at mount (and when the sheet closes).

### Pitfall 6: A third-party folder inherits "Association Etats Sauvages" copyright
`scripts/stamp-asset-copyright.py mobile/assets` stamps every image it finds. Run it on specific folders only, never on `mobile/assets/dmh/`, and document the folder in `NOTICE.md` as third-party.

### Pitfall 7: Photo rights are not WSL's alone
Seven named photographers/illustrators are credited. A permission from WSL must say it covers them (or the app uses only images WSL can license), else use text only.

### Pitfall 8: Re-render cost of the draft form on every "+"
Each tap rewrites the F field in the form context. Rows must be memoised on (code, count, ticked) so one tap re-renders one row; check on the phone with S2.

### Pitfall 9: Sheet over sheet
Opening the guide from a state where another sheet is up (finish, help) is not expected, but a group page opened from the catalogue inside the same sheet must not push a second form sheet (see Pattern 2).

## Code Examples

### Sheet options (copy of the help sheet)
```typescript
// Source: mobile/src/navigation/stacks/stack-options.ts (factorHelpScreenOptions)
export function dmhGuideScreenOptions(theme: BrandTheme): NativeStackNavigationOptions {
  return {
    headerShown: false,
    presentation: Platform.OS === "ios" ? "formSheet" : "modal",
    sheetAllowedDetents: [0.65, 1],
    sheetGrabberVisible: true,
    contentStyle: { backgroundColor: theme.semanticColors.backgroundCanvas },
  }
}
```

### Route type and call
```typescript
// Source: mobile/src/navigation/types.ts pattern (surveyFactorHelp)
surveyDmhGuide: { group?: DmhGroupCode }
// FactorDetailRoute
const handleOpenDmhGuide = useCallback(
  (group?: DmhGroupCode) => navigation.navigate("surveyDmhGuide", { group }),
  [navigation],
)
```

### Search over the groups
```typescript
// Source: mobile/src/app/search-text.ts (foldSearchText)
export function filterGroups(query: string, codes: readonly DmhGroupCode[]): DmhGroupCode[] {
  const wanted = foldSearchText(query).trim()
  if (wanted === "") return [...codes]
  return codes.filter((code) =>
    foldSearchText(`${selectionLabel("F", code)} ${fr.dmhGuide.groups[code].keywords}`).includes(wanted),
  )
}
```

### Draft French content (DRAFT, to validate; no em dash, no acronym)
```typescript
// Source: IBP FR v3.2 p. 3 and p. 12-13 for the rule; wording ours (D-02). Draft for owner/expert review.
dmh_05: {
  keywords: "bois nu, ecorce tombee, brulure, ecorce decollee",
  ibpRule:
    "Compte pour l'IBP : bois sans écorce ou blessure de feu sur plus de 600 cm2 (environ 25 cm sur 25 cm), ou écorce décollée avec un jour de plus de 1 cm et plus de 10 cm de large et de haut.",
  recognise:
    "Du bois clair est visible parce que l'écorce est tombée ou a été arrachée. Une écorce décollée forme un abri sous elle ou une poche ouverte vers le haut.",
  confusions:
    "Une simple éraflure de l'écorce ne compte pas. Un bois dégagé par un éclatement du tronc va dans le groupe 6.",
},
dmh_12: {
  keywords: "mousse, lichen, lierre, liane, fougere, gui",
  ibpRule:
    "Compte pour l'IBP : mousses, lichens ou lierre et lianes sur plus de 20 % du tronc (un seul de ces types suffit), fougères avec plus de 5 frondes, gui avec 10 boules de plus de 20 cm de diamètre.",
  v3_0: { ibpRule: "Version 3.0 : ... sans les fougères ..." }, // draft: exact v3.0 wording from ibp-version-comparison F-1
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WSL Notice / guide 2020: 47 types, 15 groups, 7 forms | WSL guide 2nd edition 2024: 52 types, 17 groups, 7 forms (adds Galles and Dépôts alluviaux groups and 3 more types) | 2024 | The IBP sheet cites Bütler et al. 2024; type numbers differ between editions. |
| IBP FR v3.0 (2021/2022) | IBP FR v3.2 (02/02/2026): ferns in group 12, resin in group 15, group 6 wording | 2026 | Method-aware wording for three groups. |
| Chips then counters (Phase 25.1 / 30) | Row list with per-row counter (this phase) | Phase 32 | Fewer taps and scrolls in counted-in-full mode. |

**Deprecated/outdated:** the IBP v3.0 PDFs are no longer online; cite the comparison doc.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The WSL guide, its photos and drawings are all rights reserved because no licence was found (absence of evidence; terms page unreachable). | Sources and Licence | If WSL actually publishes a CC licence, text and images could be reused with attribution and Wave 4 gets simpler; if stricter, nothing changes. |
| A2 | Larrieu (co-author of both WSL guide and IBP v3.2) is an appropriate contact to obtain WSL permission. | Sources and Licence | Wrong channel only delays the request. |
| A3 | Proposed attribution wording and the "institutions written in full" approach. | Sources | WSL may dictate wording. |
| A4 | App-size budget of at most 3 MB, images at most 80 KB, 600 px. | Offline Packaging | Owner may accept more or less; originals may be larger. |
| A5 | Pass rule "S2 median time at least 25 % lower". | Measurement | Owner may want another threshold; the criterion only says "quicker". |
| A6 | Sheet-over-sheet is problematic on iOS; one route with internal master-detail is safer. | Pattern 2 | Two routes might work fine; verify on device. |
| A7 | 44-48 pt compact steppers are acceptable in the field (the current counter uses 56 pt "glove-sized" buttons). | Levers | Gloves/cold hands may need larger targets; ask the owner. |
| A8 | Lever (a) applies only to the counted-in-full mode. | Levers | If the owner wants it in capped mode too, a new stored field would be needed, which D-08 forbids. |
| A9 | The draft French wording of dmh_05 and dmh_12 and the "frequent confusions" content are ours and unvalidated; the WSL guide has no "confusions" section. | Code Examples | Wrong confusions mislead; needs an expert reading. |
| A10 | Type-level nesting is correct as extracted from text captions of IBP p. 12-13. | Typology Crossing | A type placed in the wrong group; validate visually. |

## Open Questions

1. **Which edition of the WSL PDF will the owner supply, and does its SHA-256 match W1/W2?**
   - Known: W1 (FR 2024) and W2 (EN 2024) hashes above; 2020 edition not read.
   - Unclear: owner's file. Recommendation: Wave 0 compares the hash and records it in `docs/references/README.md`; if it is the 2020 edition, rebuild the crosswalk (47 types, no Galles/Dépôts alluviaux).
2. **Does WSL permit reuse of text and images in the app?**
   - Known: © WSL only; seven credited creators. Recommendation: owner requests written permission (scope: texts adapted, images, free app, attribution wording, photographers included). Until then ship text only (D-02).
3. **Who validates the crosswalk and the texts (identification wording, confusions)?**
   - Recommendation: owner signs the spec `docs/specs/dmh-guide-content-v1.md` (Phase 30 precedent) after a domain expert reading (Larrieu or a CNPF/Etats Sauvages forester). Mark as a blocking checkpoint before screens.
4. **Which WSL values may be shown beside the IBP rule?** Recommendation: none by default (IBP only), WSL types listed by name for identification.
5. **Is -/+ in the capped mode wanted?** Recommendation: no (payload constraint), counted-in-full only.
6. **Stepper size in the field.** Recommendation: test 44 and 56 pt with the owner on S2.
7. **What happens when "-" reaches 0?** Recommendation: the group stays ticked with count 0 (explicit record that it was looked at); unticking is a separate tap on the row. Owner to confirm.
8. **App-size budget and image conversion workflow.** Recommendation: 3 MB, JPEG/WebP 600 px, script like `remove-white-bg.mjs`; originals requested from WSL.

## Runtime State Inventory

Not a rename/refactor/migration phase: omitted. For the record, no stored data, service config, OS registration, secret or build artifact carries a changed name; the payload keys (`dmh_groups`, `dmh_counts`) and SQLite version 5 are unchanged.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | tests, lint, typecheck | yes | Node 22.22.3 | — |
| `pdftotext` / `pdfinfo` / `pdfimages` (Poppler) | extracting content and image sizes from the WSL PDF (authoring aid, not a runtime dependency) | yes (`/opt/homebrew/bin`) | — | read the PDF by hand |
| `jimp` | converting images | yes (devDependency) | ^1.6.1 | `sips` on macOS |
| iPhone + Release build chain | baseline and final timing | owner machine (per memory `ios-device-build-recipe`; Xcode 27.1 pitfalls recorded there) | — | iOS simulator for tap counts only |
| Internet during planning | licence request | yes | — | — |

**Missing dependencies with no fallback:** the owner's PDF and WSL's written answer (human inputs).
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest (`react-test-renderer`, `@testing-library/react-native` present) |
| Config file | `mobile/jest.unit.config.js` (image mock, expo mocks, `@cortege/ibp-domain` mapped to source); `packages/ibp-domain/jest.config.js` |
| Quick run command | `npm --workspace mobile run test:unit -- src/app/dmh-guide src/screens/dmh-guide src/screens/factor-detail src/__checks__` |
| Full suite command | `npm run test:unit` (then `npm run lint`, `npm run typecheck`, `npm run format:check`) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-C-dmh-guide | Structure covers exactly `DMH_GROUP_CODES`; every group has all text fields; labels equal `dmhGroupOptions`; forms partition the 15 groups; WSL type numbers are unique across groups, in 1..52, and the "outside IBP" set is exactly {25, 31, 37, 38, 39, 46, 47, 48, 50}; `v3_0` overrides exist only for dmh_06, dmh_12, dmh_15 | unit | `npm --workspace mobile run test:unit -- src/app/dmh-guide` | ❌ Wave 0 |
| REQ-C-dmh-guide | Search folds accents and matches label and keywords; empty query returns all 15 | unit | same | ❌ |
| REQ-C-dmh-guide | `DmhGuideRoute` opens the catalogue without a param and a group page with one; method version selects the v3.0 text; the sheet is registered with the right options (iOS formSheet, Android modal) | unit | `... -- src/navigation` | ❌ (extend `routes.test.tsx`, `navigation.test.tsx`) |
| REQ-C-dmh-guide | Each row's info glyph calls `onOpenDmhGuide(code)`; the "Guide" entry calls it without a code | unit | `... -- src/screens/factor-detail` | ❌ |
| REQ-DOC-dmh-sources | Sources line is shown on the guide pages; catalogue has no dash and no unregistered abbreviation | source gates | `... -- src/__checks__` | ✅ (gates exist; new module is scanned automatically) |
| REQ-DOC-dmh-sources | `docs/references/README.md` lists each document with SHA-256 and retrieval date; `NOTICE.md` lists `mobile/assets/dmh/` if present | manual review (docs) | `git diff docs/references NOTICE.md` | ❌ |
| REQ-C-dmh-illustrations | Every registry `require` exists on disk, every image has a credit string, total bytes <= budget; no image when licence not cleared (registry empty is valid) | source gate | `... -- src/__checks__/dmh-assets.test.ts` | ❌ Wave 0 |
| REQ-C-dmh-fast-entry | Same action sequence yields the same draft payload with the new list as with chips + counters (`dmh_groups` in option order, `dmh_counts`, `trees_per_ha`) | unit | `... -- src/hooks/useSurveyForm.test.ts src/screens/factor-detail` | extend |
| REQ-C-dmh-fast-entry | First "+" on an unticked group ticks it and stores count 1; "-" never goes below 0; a counted group keeps its row; rows are ordered once at mount | unit | same | ❌ |
| REQ-C-dmh-fast-entry | Presses needed for scenarios S1 and S2 are fewer than the old flow (tap-count proxy) | unit | same | ❌ |
| REQ-C-dmh-fast-entry | Scores unchanged | parity | `npm run test:unit` (package, API adapter, mobile adapter parity) | ✅ untouched |
| `structure` | `FactorDetailScreen.tsx` and every new screen/route file <= 400 lines; no unused style key; no literal outside `src/i18n` | source gate | `... -- src/__checks__/structure.test.ts` | ✅ |
| REQ-FT-dmh-speed | Baseline and final timings on a real survey, three runs per scenario, medians recorded in a phase document | device (manual) | owner iPhone Release build, protocol above | ❌ (checkpoint) |
| REQ-C-dmh-guide / illustrations | Sheet reads well on iPhone (detents, scrolling, dark mode, images, credits) and on Android (modal); first tap after launch is lost on the simulator (memory), so verify twice | device (manual) | iOS 27 simulator + owner phone | ❌ (checkpoint) |

### Sampling Rate
- **Per task commit:** the quick run command for the touched folders.
- **Per wave merge:** `npm run test:unit`, `npm run lint`, `npm run typecheck`, `npm run format:check`.
- **Phase gate:** full suite green, `test:coverage:mobile` thresholds respected for `./src/navigation/` (100 % statements/lines), then `/gsd-verify-work` with the owner's device checks.

### Wave 0 Gaps
- [ ] `mobile/src/app/dmh-guide/structure.test.ts`, `search.test.ts`, `order.test.ts`: coverage of the crosswalk invariants above.
- [ ] `mobile/src/__checks__/dmh-assets.test.ts`: image existence, credits, byte budget (valid with zero images).
- [ ] Extraction of `renderFactorField.tsx` out of `FactorDetailScreen.tsx` (headroom for the new props) with the existing tests still green.
- [ ] Interaction-cost fixture S1/S2 (tap-count proxy) written against the OLD flow first, to record the baseline number.
- [ ] Throwaway `diag/dmh-timing` instrumented baseline build and owner timing session (human).
- [ ] Framework install: none needed.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (absent = enabled). The phase has no network call, no auth, no new stored data and no new input sent anywhere.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — (guide is read-only static content) |
| V5 Input Validation | yes (small) | search text stays local and is only folded and compared; counts keep `Number.isInteger(count) && count >= 0` from `useUncappedEntry`; stepper clamps at 0 and 999 (`FactorCounterInput` bounds). |
| V6 Cryptography | no | — |
| V12 Files / resources | yes (small) | bundled assets only, no remote image URL; the app must not fetch WSL images at runtime. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Misleading threshold in guide text changes survey results (integrity of data) | Tampering (of data quality) | IBP wording from the cited sheet, expert validation, tests that tie content to the crosswalk. |
| Copyright infringement through embedded third-party images | n/a (legal) | Written permission before embedding; `NOTICE.md` entry; text-only fallback. |
| Remote image or link in the sheet | Information disclosure | none: no `Linking.openURL`, no remote `uri`. If a "source" link is wanted, put the URL as plain text. |

## Sources

### Primary (HIGH confidence, read in this session)
- WSL, Bütler et al. 2024, *Guide de poche des dendromicrohabitats*, 2e éd., FR PDF (SHA-256 `cc5fb045...`) and EN PDF (`b4335f8d...`): imprint, tables of contents, forms and group definitions, all 52 type headings, size-limit lines, photo credits. <https://www.dora.lib4ri.ch/wsl/dload/wsl:37831/PDF/>, <https://www.dora.lib4ri.ch/wsl/dload/wsl:36965/PDF/>
- WSL publication pages: <https://wsl.ch/en/publications/guide-de-poche-des-dendromicrohabitats-2e-edition>, <https://www.wsl.ch/en/publications/guida-da-campo-ai-dendromicrohabitat/>, <https://www.wsl.ch/fr/publications/guide-de-poche-des-dendromicrohabitats-2e-edition/> (no licence stated).
- CNPF, IBP FR v3.2 (02/02/2026), pp. 3, 12-13, 28: <https://www.cnpf.fr/sites/socle/files/2026-04/IBP_FR_v3_2_260202.pdf> (SHA-256 re-verified equal to `docs/references/README.md`).
- Crossref API record of DOI 10.1016/j.ecolind.2017.08.051 (Larrieu et al. 2018): only Elsevier TDM licence.
- The repository: `mobile/src/screens/FactorDetailScreen.tsx`, `screens/factor-detail/DmhCountFields.tsx`, `UncappedFieldBlock.tsx`, `hooks/useUncappedEntry.ts`, `hooks/useSurveyForm.ts`, `app/factor-selections.ts`, `ui/FactorChipsInput.tsx`, `ui/FactorCounterInput.tsx`, `ui/AbbreviationInfo.tsx`, `ui/InfoSheet.tsx`, `navigation/types.ts`, `stacks/SurveysStack.tsx`, `stacks/stack-options.ts`, `routes/FactorHelpRoute.tsx`, `routes/FinishSheetRoute.tsx`, `src/__checks__/*.test.ts`, `jest.unit.config.js`, `NOTICE.md`, `LICENSE`, `scripts/stamp-asset-copyright.py`, `docs/technical/ibp-version-comparison-v3.0-v3.2.md`, `docs/specs/ibp-form-spec.md`.

### Secondary (MEDIUM confidence)
- Web search summaries on the 2020 edition (58-59 p., 47 types, 15 groups, 7 forms), WSL Fact Sheet 64, the Integrate+ catalogue and a 2022 data paper (licence CC BY 4.0 applies to the data paper, not to the catalogue): <https://www.waldwissen.net/en/forest-ecology/nature-conservation/know-protect-and-promote-habitat-trees>, <https://hal.inrae.fr/hal-03906647>, <https://agris.fao.org/search/en/providers/122652/records/64776102a3fd11e4303bc859>.
- Martin et al. 2022, Frontiers in Forests and Global Change 5:818474 (typology figure by C. Emberger; licence line not seen).

### Tertiary (LOW confidence, marked for validation)
- The e-TreMs application (Emberger, Larrieu) is cited as an illustration source in a Waldwissen article; its availability, licence and developers were not established.
- Co-occurrence of TreMs for simplified monitoring (Ecological Indicators 2021, HAL hal-03237154): a possible expert-backed basis for a "frequent groups first" ordering; not read.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new; all pieces exist in the repo.
- Architecture: HIGH for integration points (read the code), MEDIUM for sheet behaviour on device (needs a check).
- Typology crossing: HIGH at group level, MEDIUM-HIGH at type level; expert validation required.
- Licence: MEDIUM-LOW, because absence of a licence was established but WSL's terms page and the DORA record could not be read.
- Pitfalls: HIGH for gates (read the test sources), MEDIUM for UX items.

**Research date:** 2026-10-23
**Valid until:** 2026-11-22 (licence answer from WSL or the owner's PDF can change the plan at any time; code facts hold until the F screen files change)
