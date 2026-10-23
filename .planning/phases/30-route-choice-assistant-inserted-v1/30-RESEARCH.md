# Phase 30: Route Choice Assistant (INSERTED, V1) - Research

**Researched:** 2026-10-13
**Domain:** CNPF survey-method rules (route and counting mode) turned into a guided, offline, French-language choice step, a recorded "route used", and the data and display plumbing around it (domain package, API, mobile, PDF)
**Confidence:** HIGH on the CNPF rules (two primary documents read page by page) and on the code map (read and grepped in this worktree); MEDIUM on the design recommendations (sections 4, 6 and Open Questions); LOW only where marked `[ASSUMED]`

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** "Parcours et méthode" means the CNPF survey method (v3.2 p. 18) and the counting mode. IBP version (v3.0/v3.2) and cas 1 to 4 keep their existing choice at survey creation; the guide does not change them.
- **D-02:** The guide covers every method of the CNPF text: parcours en plein, parcours partiel (par bande ou placette, with complementary observation in the non-sampled zone), échantillonnage typologique (placettes of 1 ha, even 0.5 ha), échantillonnage systématique (placettes under 1/3 ha), and both counting modes (relevé plafonné, relevé déplafonné). Rules cite the CNPF page. Source facts already read: parcours en plein is the simplest, suited to small stands (< 5 ha); others otherwise; effort 15-20 min/ha per person, above 25-30 min/ha in difficult terrain; plafonné is the fastest and used in most cases, déplafonné is for placette groups and studies.
- **D-03:** Group calculation is in scope: IBP computed over the data of all placettes of a group as if one survey, with caps on counts from the group's total surface Sg (C, D: BMg max 3 x Sg, BMm max 1 x Sg; E: TGB max 5 x Sg, GB max 1 x Sg; F: max 2 x Sg per dmh group, 8 x Sg total). The calculation lives only in `@cortege/ibp-domain` (parity cases added, coverage threshold 100% kept); never re-implemented in api or mobile.
- **D-04:** The group calculation is a late lot of the phase, behind a decision point: the written spec defines the group model and calculation first; if the spec shows it is too large, it is detailed in a Phase 30.1 instead of squeezed in. The spec and the guide do not wait for it.
- **D-05:** Detailed questionnaire (not three short questions): surface (prefilled from the cadastre, correctable), stand homogeneity, routine survey versus study or inventory, relief and visibility, the observer's experience, available time. Every question carries a plain French explanation; the suggestion and its reasons are shown with it. Planner: keep it light to fill (short answers, progressive disclosure) despite the length.
- **D-06:** The guide is a skippable step in survey creation, after the parcel choice. A button changes the suggestion; the observer may choose the route directly. Creation stays possible offline. Keep creation short (SEED-007).
- **D-07:** The mode adapts the form: plafonné keeps the current entry; déplafonné adds the cover fields it needs (A and B as percentage of cover, no count stop such as 5 TGB/ha). This is required by the group calculation. The form and payload of Phase 27 are finished, so no parallel owner conflicts there, but check Phase 29 (running elsewhere) for shared files before editing.
- **D-08:** Recorded with the survey: method and counting mode; evaluated surface (the sheet's "zone de relevé IBP"); complementary observation in the non-sampled zone (yes or no, plus total evaluated surface for a partial route); the answers that led to the choice (the reason).
- **D-09:** Shown as plain text in the survey detail and in the PDF (new block near "Conditions du relevé"). No impact on the plafonné score. Read-only after submit, like `ibp_method_version`. Payload keys follow the `survey_note` / `weather` pattern (nullable migration on the API, JSON payload on mobile, no SQLite migration if possible); sync wire type owned by the package. Next migration number must be checked against Phase 29 before writing.
- **D-10:** The written spec (`docs/specs/`, French, one test case per rule, each rule citing the CNPF page) is read and validated by the owner in writing, with the date recorded, before any plan builds a screen (criterion 1). Criterion 4 (a tester who does not know the method completes the choice unaided, recorded) is a final plan with the owner's tester.

### Claude's Discretion
- Wording of the plain French explanations (to be reviewed by the owner), question order, visual treatment of the questionnaire (existing design system).

### Deferred Ideas (OUT OF SCOPE)
- Drawing and displaying the route trace on the parcel map: Phase 31.
- Compass and GPS route tracing with out-of-zone alert: V2.
- Group calculation, if the spec shows it too large: Phase 30.1.
</user_constraints>

<phase_requirements>
## Phase Requirements

No requirement IDs were provided for this phase (ROADMAP: "none new yet, to be traced when the phase is planned"). **The IDs below are PROPOSED by this research**, in the `REQ-{epic}-{slug}` shape of `.planning/REQUIREMENTS.md`, for the planner to trace. They are not yet in REQUIREMENTS.md; the owner asked that STATE.md, ROADMAP.md and REQUIREMENTS.md be touched at the end of planning only.

| Proposed ID | Description | Research Support |
|-------------|-------------|------------------|
| REQ-DOC-route-rules | The CNPF route and counting rules are written in `docs/specs/` (French), one test case per rule, each citing its CNPF page, and validated by the owner in writing with the date recorded before any screen is built (ROADMAP criterion 1, D-10) | Sections 1, 2 and Open Questions (draft rule table R-01..R-21, ambiguity list G-1..G-11, owner decisions O-01..O-16) |
| REQ-C-route-guide | A skippable, offline guided step after the parcel choice asks the questionnaire, suggests method and counting mode, explains each in plain French, lets the observer change the suggestion or choose directly (criterion 2, D-05, D-06) | Sections 1, 5.3, 7 (`recommendRoute` in the package, catalogue reasons, wizard hook point) |
| REQ-C-route-record | The route used (method, counting mode and the factors lifted, evaluated surface, complement, group name, answers) is recorded with the survey, synced, read-only after submit (criterion 3, D-08, D-09) | Section 4 (record shape), section 5 (migration 024, DTO, sync, storage) |
| REQ-C-route-display | The route used is shown as plain text in the survey detail and in the PDF, replacing the hard-coded "Relevé plafonné, aucun facteur déplafonné" line (criterion 3, D-09) | Section 5.3 (`identity.ts:121-122`, new route block, Contexte page) |
| REQ-C-uncapped-entry | In déplafonné mode the form adds the detail fields B per-stratum cover % and F per-dmh-group counts; plafonné entry and scores are unchanged (D-07, D-09) | Section 3 |
| REQ-FT-route-test | A tester who does not know the method completes the route choice unaided, in a recorded test whose report is in `docs/user-tests/` (criterion 4, D-10) | Section 7.4 and plan 30-15 in section 6 |
| REQ-C-route-group (candidate, Phase 30.1 if D-04 splits) | The IBP of a group of placettes is computed by pooling their raw data, in the package only (D-03) | Section 2 |
</phase_requirements>

## Summary

**The CNPF text is far more precise than the phase brief assumed.** The v3.2 PDF pages 18-19 are only a summary; they point to the full document "Méthodes de relevé de l'IBP" (Gonin and Larrieu, 09/09/25, 28 pages), which CNPF now publishes at `https://www.cnpf.fr/sites/socle/files/2026-04/IBP_met_fr_250909.pdf` (downloaded and read for this research, SHA-256 `3954746756b770f338055310973ada871ea5bdd768cb6be1ce60581a7a87d7f2`; the repo README still says the older 2022 methods document is offline). It contains a real decision table (its Tableau 1, p. 4) with numeric thresholds (1 ha, 5 ha, 10-20 ha, 40 ha, visibility 10-15 m, 10-20 % sampled fraction, band widths, placette radii), the default counting mode of each method (Tableau 2, p. 5), the group-of-placettes computation factor by factor (Tableau 5, p. 9), the per-factor plafonné versus déplafonné differences (Tableau 7, p. 17) and the special déplafonné cases (chapter 8, p. 23-24). So criterion 1's spec can encode most rules deterministically; only a handful of judgement points need an owner decision (Open Questions). **The planner must add this second document to `docs/references/README.md` (URL, SHA, retrieval date) as the primary source of the spec; the PDF itself must not be copied into the repo (`docs/references/*.pdf` is gitignored).**

**The app is already half-way to "déplafonné".** The form already asks A's native cover as a percentage (`native_cover_percent`), C/D/E counts are plain uncapped integers with a surface, G is a percentage and I/J are uncapped type counts. For a *single* survey, plafonné and déplafonné give the same score by construction (the caps are stop-counting shortcuts); what déplafonné really adds is **data**: B cover per stratum and F counts per dmh group (the only two places where the package and the form need new inputs), plus uncapped counting guidance. The CNPF sheet's "Facteurs déplafonnés" field is **per factor**, and chapter 8 lists which factors may be lifted for which purpose, so the recorded counting mode should be a mode plus a list of lifted factors, not a bare flag.

**Everything the record needs follows the Phase 27 pattern.** One nullable `jsonb` column (migration 024, the next free number; no branch has a 024 and the only other pushed branch, `origin/29-login-stabilization`, touches no `api/` or `packages/` file), a nested class-validator DTO whose keys the package owns, a read-only-after-submit deep-equal compare, the same two SQL write sites plus the fast path (positional parameters shift from `$28` for the CAS token to `$29`), a `survey_route` key in the local payload (no SQLite migration, schema stays at 5), a draft-only storage patch function, and a pull copy. The rule logic (`recommendRoute`, the déplafonné scorers, the record validators) lives in `@cortege/ibp-domain` as pure, text-free functions returning reason **codes**; the French sentences live in the mobile catalogue.

**Primary recommendation:** Gate on the owner-validated spec (`docs/specs/route-choice-rules-v1.md`, built from the CNPF methods document Tableau 1, 2, 5, 7 and chapter 8, with the owner decisions O-01..O-16 resolved in writing), then build in this order: package (rules, record validators, B and F déplafonné scoring, parity cases) and API column in parallel, then mobile storage and catalogue, then the guide screens, the déplafonné fields, the detail page and the PDF block, then the recorded tester test. **Split the group calculation to Phase 30.1** (section 2.5): the spec still defines it fully (D-04), and Phase 30 records the `group_name` and each placette's surface so no data is lost, but the pooled calculation, the typologique mean and dispersion, and their screens are about as large as all the rest of the phase together.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route-choice rules (`recommendRoute`, thresholds, reason codes) | Shared domain package (`@cortege/ibp-domain`) | Mobile adapter (pure pass-through) | CLAUDE.md: method rules live once, in the package; works offline because the package runs on the phone; the API never re-derives it |
| Plain-French reasons, questions, explanations | Mobile French catalogue (`mobile/src/i18n/fr/`) | - | All user text is catalogue-only (structure gate); the package stays text-free (no i18n dependency) |
| Cadastre surface prefill | Mobile (pure helper over the already loaded parcel geometry) | - | The selection screen holds the GeoJSON in memory; offline-capable; `parcels.area_m2` exists in the DB but is never filled (verified) |
| Route record: shape, enumerations, limits, canonical form | Shared domain package | API DTO and mobile storage consume the same constants | Same split as `conditions.ts` (limits and helpers owned by the package) |
| Route record: persistence and read-only after submit | API (`surveys` table jsonb column, deep-equal compare) | Mobile SQLite payload JSON (draft-only write) | Migration 023 pattern; server is the authority on submitted surveys |
| Sync of the record | API `/v1/sync` and `/v1/sync/changes` | Mobile `useSurveySyncNetwork` (unchanged) | The payload travels inside the existing upsert; no new endpoint |
| Déplafonné scoring of B and F | Shared domain package | Mobile live preview via `ibp-scoring.ts` adapter | Scoring rule, so package only; parity fixture runs in package, API adapter, mobile adapter |
| Guide screens, déplafonné form fields | Mobile (screens, hooks, navigation) | - | UI |
| Display in survey detail and PDF | Mobile (Contexte page, `survey-pdf/`) | - | PDF is generated on device |
| Group pooled calculation (30.1 candidate) | Shared domain package | Mobile screens (offline, computed on device from local surveys) | Table 5 of the CNPF methods document is a pure computation over raw data |
| Route trace and map display | Phase 31 (out of scope) | - | Split decided 2026-10-13 |

## Project Constraints (from CLAUDE.md)

Treated with the authority of locked decisions. Directives that bind this phase:

- **IBP rules only in `@cortege/ibp-domain`.** Never re-implement a rule, allowed score set or factor-key list in `api` or `mobile`. Package has no runtime dependency; do not add a `prepare` script; Metro, Jest and `tsc` read `src`, Node reads `dist` (`npm run build:domain`). Coverage thresholds stay 100 % (statements, branches, functions, lines).
- **Parity fixture** runs three times (package, `api/test/ibp-parity.spec.ts`, `mobile/src/app/ibp-parity.test.ts`); a rule change updates the fixture and `docs/technical/ibp-validation-matrix-v2.md` together.
- **Payload pattern of Phase 27:** survey-level fields as nullable API columns plus local `payload_json` keys, no SQLite migration (schema stays at version 5), read-only after submit, notes of retained submitted surveys survive account deletion (D-24).
- **Catalogue only:** every user-facing string from `fr` (typed French catalogue); no em dash (U+2014) in any string, template or JSX text under `mobile/src` (gate `catalogue-dash.test.ts`); abbreviations gate (allowlist: units, OK, PDF, GPS, IBP, "ex."; `BMg`, `BMm`, `TGB`, `GB` are "written-out" terms whose long form must occur in the same catalogue file; everything else spelled out or via `AbbreviationInfo`).
- **400-line cap** on files under `src/screens` and `src/navigation` (`structure.test.ts`).
- **Visual layer:** colours only through `useBrandTheme()`; hex and `rgba(` literals only in the five token files; Ionicons outline glyphs only (`-outline`); motion through `brandMotion` with `ReduceMotion.System`; haptics only through `ui/feedback.ts`; `GlassButton` for the big call to action.
- **Single sync assembler:** never call `useSurveySync` elsewhere; new survey actions go through `draftPatcher` and `AppStateProvider` (`updateSurveyNote` at `mobile/src/state/AppStateProvider.tsx:265` is the precedent).
- **Before committing:** `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check`; API e2e needs local PostgreSQL (`ibp_test`).
- Prettier: double quotes, no semicolons, trailing commas, 100 columns. ESLint: unused vars are errors (prefix `_`), `no-explicit-any` warns, `no-require-imports` errors.
- Prod is test data (memory note): no care for installed clients beyond not crashing, no two-step migrations.

## Standard Stack

### Core
No new runtime package is needed anywhere. The phase uses what the repo already has.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@cortege/ibp-domain` (workspace) | 0.1.0 | route rules, record types and validators, déplafonné scoring, parity fixture | CLAUDE.md: the only home of IBP rules |
| NestJS + `class-validator` + `class-transformer` | existing | nested `SurveyRouteDto` (same as `SurveyWeatherDto`) | Phase 27 precedent, `@ValidateNested` + `@Type` |
| `pg` raw SQL | existing | migration 024 and the three write sites | no ORM in the project |
| Expo SQLite (existing `payload_json`) | schema stays 5 | local `survey_route` payload key | D-09, Phase 27 precedent |
| React Navigation native-stack | existing | one new screen in the survey stack | `SurveysStack.tsx` |
| `expo-print`, `expo-sharing` | existing | PDF route block | `survey-pdf/` |
| Jest 29 + ts-jest, Supertest | existing | all tests | CLAUDE.md |

### Supporting
| Item | Purpose | When to Use |
|------|---------|-------------|
| Small pure helper `ringsAreaHa` (new, ~20 lines, spherical-excess formula) | surface of the selected parcels from their loaded GeoJSON rings | prefill of the surface question; **do not add a geometry dependency** (no `@turf/*` in `mobile/package.json`, `package.json` or `api/package.json`, verified); the value is an editable estimate, not a legal contenance, so a 1 % error is acceptable `[ASSUMED]` |
| `parcelPolygonsFrom(parcels, ids)` in `mobile/src/app/survey-pdf/map-projection.ts:160` (existing, imported by `map/own-surveys.ts:7`) | gives the rings the helper needs | used by `cachedParcelCentre` (`own-surveys.ts:42`); rings of a MultiPolygon may include holes, so the helper must treat a ring's orientation or accept a small error `[ASSUMED]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| One jsonb column `survey_route` | 6 separate columns | The record is small, nested and will grow (Phase 31 trace reference, 30.1 group); one jsonb mirrors `weather` and one deep-equal compare covers it. Columns would add 6 positional SQL parameters in 3 write sites |
| Route inside `factors.route` (no migration) | - | Rejected by D-09 (nullable migration, `survey_note`/`weather` pattern) and semantically wrong: `factors` is scored |
| Route rules in the mobile app | - | Forbidden by CLAUDE.md (rules only in the package) and would not be testable at the 100 % bar |

**Installation:** none. **Version verification:** nothing to verify on a registry; baseline run in this worktree on 2026-10-13: `npm --workspace @cortege/ibp-domain run test:coverage` gives 10 suites, 269 tests, 100 % statements, branches, functions, lines `[VERIFIED: ran in worktree]`.

## Package Legitimacy Audit

No external package is installed or recommended by this phase, so there is nothing to run `gsd-tools query package-legitimacy check` on.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | - | - | - | - | - | - |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Source Material (what was read, and how to cite it)

| Short name | Document | Retrieved | Notes |
|------------|----------|-----------|-------|
| **S** | IBP FR v3.2, definition and survey sheets, 02/02/26, 28 pp. (`IBP_FR_v3_2_260202.pdf`), SHA-256 `f130b3d6...d854bd001`, identical to `docs/references/README.md` | scratchpad copy, pages 1-4, 18-24 read as images and text layer | p. 18-19 summary of survey instructions; p. 20-21 survey sheet |
| **M** | CNPF "Méthodes de relevé de l'Indice de Biodiversité Potentielle (IBP)", Gonin and Larrieu, 09/09/25, 28 pp. (`IBP_met_fr_250909.pdf`), SHA-256 `3954746756b770f338055310973ada871ea5bdd768cb6be1ce60581a7a87d7f2`, URL `https://www.cnpf.fr/sites/socle/files/2026-04/IBP_met_fr_250909.pdf` | 2026-10-13, downloaded to the session scratchpad, read in full (text layer, pages 4-5 also as images) | Page numbers below are the document's own footers ("Méthodes de relevé IBP (09/09/25) - p. N") |

Page map of **M**: Tableau 1 (choice) p. 4; Tableau 2 (comparison, default counting mode per method) p. 5; parcours en plein p. 6; parcours partiel p. 7-8 (Tableau 3 p. 8); Tableaux 4 and 5 (thresholds for any surface, group calculation) p. 9; échantillonnage typologique p. 10-12; échantillonnage systématique p. 13-14; field practice, band widths, plafonnement p. 15-17 (Tableau 7 and field duration p. 17); observer skills and precision p. 19-20; forest or massif p. 21-22; special cases and studies p. 23-24; box-plot annex p. 27.

**Discrepancies between the two documents (record in the spec, do not hide):**
- Learning time for a beginner: S p. 19 says half a day; M p. 17 and p. 19 say one day.
- Plein surface limit: S p. 18 and M p. 6 say < 5 ha; M Tableau 2 (p. 5) says "petite: < dizaine d'ha". Use 5 ha (stated three times, and Tableau 1 uses 1 ha and 5 ha).
- Band half-width: S p. 18 says 10-20 m each side; M p. 15 says 10-25 m by visibility class; the 2021 v3 sheet said 10-15 m (comparison doc GS-3, `docs/technical/ibp-version-comparison-v3.0-v3.2.md:341`).
- M Tableaux 4, 5, 7 are explicitly labelled "IBP v3.0"; the thresholds of C, D, E scores differ between v3.0 and v3.2 (the package already handles that per version, `rules/v3-0.ts` and `rules/v3-2.ts`).
- The v3.2 sheet's "Méthode" box (S p. 20) lists only "parcours en plein", "échantillonnage typologique" and "parcours partiel par bande ou placette"; the systematic method has its own sheet (M p. 13: its sheet "est différente ... car les relevés sont déplafonnés").

## 1. Route-choice rules and the draft decision table

### 1.1 What the CNPF text says (facts, each tagged by kind)

Kind: **T** = explicit CNPF threshold or mapping (deterministic); **J** = CNPF says "depends" or gives a range (owner decision); **H** = app heuristic not in the CNPF text (owner decision).

| # | Fact | Source | Kind |
|---|------|--------|------|
| F1 | The IBP is recorded per stand (peuplement) or stand type, never over a whole forest; a forest with several stands is surveyed stand by stand; the mean of stand scores is not representative | M p. 4 (first line), p. 21; S p. 18 footnote 1 and p. 22 intro ("définir au préalable des zones homogènes et d'en connaître la surface") | T |
| F2 | Stand ≤ 1 ha: parcours en plein (below 0.5 ha the IBP is "moins pertinent") | M p. 4 Tableau 1 | T |
| F3 | Exhaustive and global diagnosis (edges included), stand 1 to 5 ha, "relever l'IBP sur au moins 1 ha": parcours **partiel** if observation is difficult (visibility < 10-15 m, hard to walk through, rough relief) **or** if the stand is homogeneous (chestnut coppice, young stand, plantation) and easy to observe; parcours **en plein** otherwise (heterogeneous and easy to observe) | M p. 4 Tableau 1 | T |
| F4 | Exhaustive diagnosis, stand 5 ha to 10-20 ha ("seuil de surface fonction de l'hétérogénéité"): parcours partiel | M p. 4 Tableau 1 | T (the 10-20 ha bound is J) |
| F5 | Exhaustive diagnosis, stand > 10-20 ha: three listed options with no preference: subdivide the stand into sub-units and survey each (back to the previous cases); consider échantillonnage typologique; survey without subdividing (parcours partiel) | M p. 4 Tableau 1 | J |
| F6 | Rapid, non-exhaustive diagnosis (no edges): échantillonnage typologique | M p. 4 Tableau 1 Cas 1, Cas 2 | T |
| F7 | Property with a systematic inventory (dendrometric, typological) already planned: échantillonnage systématique. Without it: typologique for a rapid diagnosis per stand type; exhaustive diagnosis of stand types goes back to Cas 1 | M p. 4 Tableau 1 Cas 2 | T |
| F8 | Study on a massif or territory: typologique with a sampling plan adapted to the study | M p. 4 Tableau 1 Cas 3 | T |
| F9 | Parcours en plein: the whole stand is walked in regularly spaced strips ("transects"), GPS in trace mode, no double counting between neighbours; suited to stands under 5 ha; beyond that a partial route or typologique sampling is faster | S p. 18; M p. 6 | T |
| F10 | Parcours partiel: sampled area at least 1 ha and 10 % (very homogeneous, pure plantation) to 20 % (heterogeneous, mixed irregular high forest) of the evaluated area; above 50 % described it is possible but less effective than a full walk; strips 20-50 m wide, or placettes of 1 ha, 0.5 ha, even 0.33 ha | M p. 7 | T |
| F11 | Partial by **strip** suits heterogeneous, difficult or narrow (< 100 m wide) stands and rough relief; partial by **placette** suits homogeneous, easy-to-walk stands wide enough for a large circle | M p. 8 Tableau 3 ("En résumé") | T |
| F12 | Complementary quick observation in the non-sampled zone, for four factors only (A genera, G edges, I aquatic, J rocky): optional but improves precision; edges crossing the sampled zone are excluded; edge width fixed at 2 m; the edge percentage is relative to the total evaluated surface | M p. 8; S p. 20-21 footnotes 2 and 3 | T |
| F13 | Typologique: several placettes of 1 ha (0.5 ha possible; below 0.5 ha pool 3 x 0.33 ha), judgement plan, edges not sampled, no complementary survey; stand type < 40 ha: sampled area ≥ 1 ha and 10-20 % of the type; > 40 ha: at least 5 to 8 placettes of 1 ha; a score per placette, then mean and dispersion; a stand-type typology is mandatory beforehand | M p. 10-12 | T |
| F14 | Systématique: circular placettes of 0.20 ha (0.33 ha if the sampling rate would be < 10 %), one per ha on a grid (or aligned with another systematic inventory); sampling 10-30 %; IBP computed per stand type by pooling; group of at least 1 ha (5 x 0.20 ha or 3 x 0.33 ha), below 1 ha "analyser avec plus de prudence" | M p. 13-14 | T |
| F15 | **Default counting mode per method** (Tableau 2): plein = plafonné; partiel = plafonné if one continuous sheet, déplafonné if one sheet per placette; typologique = plafonné; systématique = déplafonné | M p. 5 | T |
| F16 | Plafonné: stop counting a factor as soon as its final threshold is reached; requires the survey surface to know the thresholds. Déplafonné: count everything, note A and B as cover percentages; only a few cases need it: IBP over a group of placettes, studies, special stands | S p. 18; M p. 2, p. 16 | T |
| F17 | **Déplafonné can be per factor**: the sheet has a "Facteurs déplafonnés" field and footnote 1 says to name them; chapter 8: mature stands lift A, C, D, E, F; stands with factors always at maximum lift a chosen subset of A, C, D, E, F, I, J; stands with minimum scores lift C, D, E; studies lift all or part of A, B, C, D, E, F, G, I, J. Lifting is longer, so choose factors by objective | S p. 20-21 (sheet and footnote 1); M p. 23-24 | T |
| F18 | Field effort: 15-20 min per ha per person (25-30 in difficult relief or stand: heterogeneity, low visibility, hard to penetrate); for an operator used to the IBP; beginners need half a day to one day to learn the documents, then longer surveys; déplafonné takes longer; add preparation and data processing | S p. 19; M p. 3, p. 17 | T (numbers) |
| F19 | Method choice depends on: other diagnostics planned, surface and characteristics, objective and precision, means available (duration, equipment, skills); parcours en plein is the simplest, needs little equipment and no complex calculation | M p. 4 | J |
| F20 | Linear stands (width < 15 m) use densities per km instead of per ha for C, D, E, F and a special G rule | S p. 6 (Compléments) | T, but **not supported by the app** |
| F21 | Season matters (A, B, C affected by leaf presence) and observer skill matters (beginners are less precise); no rule ties either to the route | M p. 19-20 | informational |

### 1.2 Draft decision table (to become the spec)

Each row is one rule with an id `R-nn`, one test case in the package, and a CNPF page. Priority is top to bottom within a step. Inputs are the questionnaire answers (section 1.4). "Reason code" is what the package returns; the French sentence is a catalogue entry (draft wording in 1.5).

**Step 0, preconditions and warnings (no method change)**

| Rule | Condition | Result | Source | Kind |
|------|-----------|--------|--------|------|
| R-01 | surface unknown or ≤ 0 | no suggestion; ask the surface (mandatory: plafonné thresholds and densities need it) | S p. 18, p. 22; M p. 2 | T |
| R-02 | surface < 0.5 ha | keep the suggestion, add warning `small_stand` ("IBP moins pertinent") | M p. 4 | T |
| R-03 | stand narrower than 15 m (linear: hedge, riparian strip) | warning `linear_stand_unsupported`; the app scores per hectare only | S p. 6 | T, owner decision O-10 |

**Step 1, purpose (first question) selects the family**

| Rule | Purpose answer | Result | Source | Kind |
|------|----------------|--------|--------|------|
| R-04 | systematic inventory already planned in this forest | **systématique**, counting déplafonné (all counting factors), reason `systematic_planned`; note the group model | M p. 4 Cas 2, p. 5, p. 13 | T |
| R-05 | rapid diagnosis without the edges, or a study across a large area | **typologique**, counting plafonné (unless purpose is "study", then R-12) | M p. 4 Cas 1, 3 | T |
| R-06 | describe this stand fully (default) | go to step 2 | M p. 4 | T |

**Step 2, exhaustive diagnosis, by stand surface S (ha), homogeneity H, observation difficulty D (visibility < 10-15 m, hard to walk through, or rough relief)**

| Rule | Condition | Method | Counting | Source | Kind |
|------|-----------|--------|----------|--------|------|
| R-07 | S ≤ 1 | en plein | plafonné | M p. 4 | T |
| R-08 | 1 < S ≤ 5 and D | partiel | plafonné | M p. 4 | T |
| R-09 | 1 < S ≤ 5 and not D and H homogeneous | partiel | plafonné | M p. 4 | T |
| R-10 | 1 < S ≤ 5 and not D and H heterogeneous | en plein | plafonné | M p. 4; S p. 18 | T |
| R-11 | 5 < S ≤ T (T = 10 ha heterogeneous, 20 ha homogeneous) | partiel | plafonné | M p. 4 | T; the 10/20 mapping is **J/H, O-02** |
| R-11b | S > T | present the three CNPF options (subdivide, typologique, partiel without subdividing) with reasons; pre-select one | per option | M p. 4 | **J, O-03** |

**Step 3, partial parameters (when method is partiel)**

| Rule | Condition | Result | Source | Kind |
|------|-----------|--------|--------|------|
| R-12a | H heterogeneous, or D, or stand narrower than 100 m | partiel **par bande**; advise strips of 20-50 m (10-25 m each side by visibility class) | M p. 7-8, p. 15 | T |
| R-12b | otherwise | partiel **par placette**, placettes of 1 ha preferred (radius 56.4 m), 0.5 ha or 0.33 ha possible | M p. 7-8 | T |
| R-13 | partiel | advise sampled area ≥ 1 ha and 10 % (homogeneous) to 20 % (heterogeneous) of S; if the observer enters a sampled area above 50 % of S, warning `partial_over_half` ("un parcours en plein serait plus simple") | M p. 7 | T |
| R-14 | partiel | complementary observation recommended for A, G, I, J (optional, default yes); record `done` and the total evaluated surface | M p. 8; S p. 20 | T |
| R-15 | partiel par placette with several placettes | default one continuous sheet (single survey, sampled area = sum of the placettes, plafonné on that total). One sheet per placette (déplafonné, group) is the alternative: **group model, 30.1 candidate** | M p. 7 | T |

**Step 4, counting mode and lifted factors**

| Rule | Condition | Result | Source | Kind |
|------|-----------|--------|--------|------|
| R-16 | default per method | plein plafonné; partiel (one sheet) plafonné; partiel (sheet per placette) déplafonné; typologique plafonné; systématique déplafonné | M p. 5 | T |
| R-17 | purpose "study" (or any detailed need) | déplafonné; lifted factors by preset: **study** A, B, C, D, E, F, G, I, J; **mature stand** A, C, D, E, F; **factors always maximal** a chosen subset of A, C, D, E, F, I, J; **minimum scores** C, D, E; keep BMm ≤ 1 per ha and GB ≤ 1 per ha unless the study needs them (the "plafonner" sub-rules of M p. 23-24) | M p. 23-24; S p. 21 fn 1 | T for the presets; offering them as presets is **O-01** |
| R-18 | any déplafonné | add "plus long" notice and the longer-duration note | S p. 19; M p. 17 | T |

**Step 5, duration advice (not a method rule)**

| Rule | Condition | Result | Source | Kind |
|------|-----------|--------|--------|------|
| R-19 | sampled area A_s known | estimate = A_s x 15-20 min per person (x 25-30 if D or heterogeneous with poor visibility); add "plus long" if déplafonné or beginner; show as advice | S p. 19; M p. 17 | T for the numbers, **H** for turning "poor visibility" into the 25-30 band |
| R-20 | available time given and < estimate | advisory only: show the gap and say a partial route reduces the walked area (never silently changes the method) | not in CNPF | **H, O-04** |
| R-21 | experience beginner | advisory only: "le parcours en plein est le plus simple et demande peu de calculs" and the learning-time note; never changes the method | M p. 4 item 4, S p. 19 | J/**H, O-04** |

The ids above are a starting point for the spec; the spec numbers them once and the package fixture `ROUTE_RULE_CASES` uses the same ids (one case per rule, boundary cases at 0.5, 1, 5, 10, 20 and 40 ha).

### 1.3 Where the CNPF text gives no threshold (owner decisions, see Open Questions)

1. Where exactly the 10-20 ha bound sits and how heterogeneity moves it (O-02). Proposal `[ASSUMED]`: 10 ha heterogeneous, 20 ha homogeneous, by analogy with the 20 % / 10 % sampling rule of M p. 7 (heterogeneous stands need more sampling and a lower subdivision threshold).
2. Which of the three options above T to pre-select (O-03). Proposal: pre-select "subdiviser" because the CNPF principle is "l'IBP doit être décrit séparément par peuplement", offer the two others one tap away.
3. Whether observer experience or available time may change the method (O-04). CNPF gives durations and a learning curve but no rule. Proposal: advisory only.
4. What counts as "difficult observation" beyond the stated visibility < 10-15 m, "hard to walk through", "rough relief" (the questionnaire turns it into one yes/no question with those three examples).
5. What "homogeneous" means quantitatively (the text gives examples: chestnut coppice, young stand, plantation; and the opposite: mixed irregular high forest).
6. How many placettes are enough for typologique below 40 ha ("au moins 1 ha et 10-20 %" gives a surface, not a count) and for the continuous partial route.
7. Whether "rapid diagnosis" and "study" should be separate answers (M treats them in Cas 1 and Cas 3).

### 1.4 The questionnaire (inputs of `recommendRoute`)

D-05 asks for six themes. Mapped to CNPF inputs, with progressive disclosure so a routine survey asks at most four taps:

| Question (draft) | Values | Always asked? | Feeds |
|------------------|--------|---------------|-------|
| Pourquoi ce relevé ? | describe the whole stand (default) / rapid diagnosis without edges / study or whole massif / a systematic inventory is already planned | yes | R-04, R-05, R-06, R-17 |
| Surface du peuplement (ha) | number, prefilled from the selected parcels, correctable | yes (prefilled) | R-01, R-02, R-07..R-11b, R-13, R-19 |
| Le peuplement est-il homogène ? | homogeneous (plantation, coppice, young stand) / heterogeneous (mixed or irregular high forest) | only when S > 1 and purpose is "whole stand" or typologique | R-09, R-10, R-11, R-12a |
| Est-il difficile à observer ? | yes (poor visibility under 10-15 m, hard to walk through, or rough relief) / no | only when 1 < S ≤ 5, or partial | R-08, R-12a, R-19 |
| Le peuplement fait-il moins de 100 m de large ? | yes / no | only for partial | R-12a |
| Votre expérience de l'IBP | used to it / beginner | optional, collapsed | R-21, R-19 |
| Temps disponible (heures) | number, optional | optional, collapsed | R-20 |
| Plusieurs placettes, une fiche chacune ? | one continuous sheet (default) / one sheet per placette | only for partial by placette | R-15 |

### 1.5 Draft plain-French reasons (to be reviewed by the owner)

Codes returned by the package; sentences below are drafts for the catalogue, each fits one short line, no em dash, nothing abbreviated except units.

| Reason code | Draft sentence |
|-------------|----------------|
| `whole_stand_small` | "Votre peuplement fait un hectare ou moins : le plus simple est de le parcourir en entier." |
| `partial_hard_to_observe` | "Le peuplement est difficile à observer : décrire seulement une partie, en bandes ou en placettes, vous fera gagner du temps." |
| `partial_homogeneous` | "Le peuplement est homogène : une partie bien choisie le représente, inutile de le parcourir en entier." |
| `whole_stand_heterogeneous` | "Le peuplement est varié et facile à parcourir : il vaut mieux le parcourir en entier pour ne rien manquer." |
| `partial_medium_stand` | "Entre 5 hectares et quelques dizaines d'hectares, la méthode recommandée est de décrire seulement une partie du peuplement." |
| `typological_rapid` | "Vous voulez un diagnostic rapide, sans les bordures : on relève plusieurs placettes de 1 hectare réparties dans le type de peuplement." |
| `systematic_planned` | "Un inventaire par échantillonnage est déjà prévu : on relève de petites placettes aux mêmes endroits, puis on regroupe leurs données." |
| `capped_default` | "Relevé plafonné : on arrête de compter un élément dès que son score est certain. C'est le plus rapide." |
| `uncapped_group` | "Relevé déplafonné : on compte tout, car les données de plusieurs placettes seront regroupées." |
| `uncapped_study` | "Relevé déplafonné : on compte tout pour les facteurs choisis, ce qui demande plus de temps." |
| `warn_small_stand` | "Sous 0,5 hectare, l'IBP est moins pertinent." |
| `warn_partial_over_half` | "Au-delà de la moitié du peuplement, parcourir en entier serait plus simple." |

## 2. Group of placettes (Q2)

### 2.1 What the CNPF text requires (M Tableau 5, p. 9; M p. 14, p. 16; S p. 18)

A **group of placettes** is a set of placettes in the same stand or stand type, each surveyed by parcours en plein on its own sheet ("fiche"), carrying a group name on the sheet (S p. 20 "Nom groupe de relevés si plusieurs placettes"). A placette joins a group **before** the survey (group surface Sg known, caps possible) or **after** (e.g. systematic placettes classified at the end of the inventory; Sg known only then). The IBP is computed on the **pooled raw data as if one survey**, not by averaging placette scores. It requires déplafonné entry (otherwise counts are under-estimated). Per factor (M Tableau 5, with surface of a placette s_i and Sg = sum of s_i):

| Factor | Data needed per placette | Pooling rule (M Tableau 5) | Ties to the package today |
|--------|--------------------------|----------------------------|---------------------------|
| A | genus list; native cover % | union of the genera of all placettes (and the complementary survey); cover = mean of the placettes' covers **weighted by surface** (footnote 1); then the normal A thresholds and cover cap | `readFactorAGenusCount` takes a list, `native_cover_percent` exists (`rules/common.ts:94`, `:124`) |
| B | cover % of each of the 5 strata | per stratum, surface-weighted mean cover; then strata at ≥ 20 % counted; then the B thresholds | **new input** (per-stratum cover) |
| C, D | BMg count, BMm count | each category: sum of counts of all placettes ÷ Sg = density per ha, then the version's C/D thresholds | `readDensityPair` already takes counts and `surface_ha` (`rules/common.ts:208`): pooled call with `surface_ha = Sg` |
| E | TGB count, GB count | same: sums ÷ Sg | same |
| F | count of trees per dmh group | per group: sum ÷ Sg, **capped at 2 per ha per group**, then summed over groups, then F thresholds | **new input** (counts per group code); today `scoreFactorF` caps `dmh_group_counts` at 2 but never divides by a surface (`rules/common.ts:150`) |
| G | open area (clearings, edges at 2 m width, thin stand) | sum of the open areas over all placettes ÷ Sg, plus, for a complementary survey, the % of the edges not crossing the placettes relative to the stand surface | app stores G as a % of the sampled surface; surface-weighted mean of the percentages is equivalent when each % is relative to its own placette |
| H | the H score | identical scores: that score; otherwise score 1 if the maximum is 1, else 2 (written for v3.0 era scoring) | v3.2 allows 0, 2, 5 only |
| I | aquatic types | union of the types found on the placettes and in the complementary survey | `type_count` and `types` |
| J | rocky types | union of the types found; a type counts only above 20 m² cumulated (S p. 4) | `type_count` and `types`, no areas stored |

Caps when Sg is known beforehand (S p. 18, M p. 16): C/D BMg ≤ 3 x Sg, BMm ≤ 1 x Sg; E TGB ≤ 5 x Sg, GB ≤ 1 x Sg; F ≤ 2 x Sg per group and ≤ 8 x Sg in total. **These caps never change a score** (they stop counting once the maximum score is certain), except the F per-group cap which is a true scoring rule already in the package; so the pooled calculation can ignore the stop-caps and apply thresholds to pooled densities.

Border placettes (small placettes with measured radius) count items on the limit as half for C, E, F, count a new genus for A, and so on (M p. 17): an **entry** rule, no calculation impact.

### 2.2 The typologique aggregation (a different one)

Typologique does **not** pool: a score per placette (placettes of at least 0.5 ha), then the **mean** and the **dispersion** of the stand-and-management scores within a stand type, the dispersion being the gap between the adjacent values of a box plot, classed very low < 10 %, low 10-19 %, medium 20-39 %, high 40-49 %, very high ≥ 50 % (M p. 10-12, p. 27). "Valeurs adjacentes" is not defined numerically (which quartile method). This is a second aggregator needing a stand-type name (the typology is "indispensable", M p. 10).

### 2.3 Ambiguities found (every one needs a spec line or an owner decision)

| # | Ambiguity | Why it matters | Proposed handling |
|---|-----------|----------------|-------------------|
| G-1 | Tables 4, 5, 7 are labelled "IBP v3.0". Table 5's H rule uses score 1, which no longer exists (v3.2 and the app's v3.0 allow only 0, 2, 5; BUG-2 in `scales.ts`) | what is H when placettes differ (0 and 5)? | identical: that score; otherwise 2 `[ASSUMED]`, owner confirms |
| G-2 | J: "type counted only if cumulated area > 20 m²" versus Table 5 "faire la liste complète des types" | the app stores no areas per type | count the union of types each already qualifying in its own placette; flag as a conservative reading `[ASSUMED]` |
| G-3 | A's weighted cover when a complementary survey exists | the sheet adds only genera for the complement | complement adds genera, never cover |
| G-4 | Surface-weighting when placettes differ in size (sub-placettes, border placettes) | A and B means | always weight by surface (equal sizes reduce to the plain mean) |
| G-5 | Group members must share the version and the cas, otherwise thresholds and stratum heights differ | pooled scoring needs one rule set | refuse or warn when `ibp_method_version`, `ibp_cas`, `ibp_cas3_scale` differ `[ASSUMED]` (not in CNPF) |
| G-6 | Minimum group size 1 ha: "analysés avec plus de prudence" below | block or warn? | warn, never block (M p. 14) |
| G-7 | Which survey carries the group result? CNPF works with a spreadsheet; no per-placette "official" score; a placette below 0.5 ha has no meaningful own score (M p. 7) | product model | the group result is a derived view over its member surveys, never written into a survey's `scores` |
| G-8 | A placette joins a group **after** the inventory (M p. 14), but the route record is **read-only after submit** (D-09) | the group name could not be set late | either `group_name` stays editable after submit (an exception to D-09), or grouping lives in a separate local table. **Owner decision O-08** |
| G-9 | Typologique needs a stand-type name per placette and a box-plot definition ("valeurs adjacentes") | second aggregator | defer with the group lot; spec records the quartile method as an owner question |
| G-10 | `group_name` is free text: D-24 pattern (retained submitted surveys keep their texts, a name could name a person) | privacy | cap at 60 characters, closed charset not required; owner accepts the same risk as D-24 or the guide offers generic suggestions |
| G-11 | Complementary survey inside a group: its edge percentage is relative to the stand surface, which is not Sg | G pooled | out of the first group lot `[ASSUMED]` |

**Verdict on Q2:** with Table 5 the text is precise enough to implement the pooled calculation **without inventing rules** for A, B, C, D, E, F, G, I; the open points are H, J and the model questions (G-1, G-2, G-5, G-7, G-8). It can therefore be written in the spec in full, and implemented without invention except those flagged lines.

### 2.4 Honest size estimate of the group lot

| Part | Work | Size |
|------|------|------|
| Domain | `groups.ts`: pool N placette inputs (surfaces, genera, covers, counts, per-group counts) into one synthetic factor set with `surface_ha = Sg`, run the version's scorers; H and J rules; version/cas consistency check; typologique mean and dispersion; ~15-20 new parity cases (`MAT-GRP-*`, both versions) in the three suites; coverage stays 100 % | 2 plans |
| API | nothing mandatory if the group result is a device-side derived view (`group_name` already in the route jsonb); a group endpoint only if other members must see the group | 0 plans (1 if shared) |
| Sync | none | 0 |
| Mobile UI | create the next placette of a group from a survey, list a group's members, pooled result screen with warnings (min 1 ha, mixed cas, missing déplafonné data), Sg declared before or computed after, group in survey list and detail, group PDF page, delete/submit semantics of members (each survey submits alone) | 3-4 plans |
| Docs/spec/tests | matrix v2 rows, validation, a recorded check with real placette data | 1 plan |
| **Total** | | **6-8 plans**, about the size of the rest of Phase 30 (about 12-14 plans) |

### 2.5 Recommendation on the D-04 decision point

**Split the group calculation to Phase 30.1.** Reasons: (1) it is as large as everything else in the phase; (2) it depends on the déplafonné entry and the route record being fielded first, which Phase 30 delivers; (3) the open model questions G-5, G-7, G-8 need real field use to settle; (4) nothing is lost by waiting: Phase 30 records `group_name`, each placette's zone surface and its déplafonné data (B per-stratum cover, F per-group counts), and the pooled calculation is a pure function over recorded data, so 30.1 needs no data migration; (5) typologique statistics (G-9) are a second aggregator that belongs with it.

**What stays in Phase 30:** the spec defines the group model and Table 5 completely (D-04 keeps that); the guide recommends typologique and systématique and explains them; the record stores `group_name` and the surface; the déplafonné fields exist; the UI states plainly that the group result is "à calculer avec la feuille de calcul du CNPF" until 30.1 (wording: owner decision O-06).

**Go/no-go criteria for the owner at the spec gate** (override to keep it in Phase 30 only if all hold): the owner resolves G-1, G-2, G-5, G-7, G-8 in writing; accepts the session budget of 6-8 extra plans; has real placette data to verify against.

## 3. Déplafonné entry (Q3)

### 3.1 Field by field on the v3.2 sheet (S p. 20-21, M Tableau 7 p. 17, chapter 8 p. 23-24)

| Factor | Plafonné entry | Déplafonné entry | What the app does today | Change needed |
|--------|----------------|------------------|-------------------------|---------------|
| A | genera (max 5 counted, 3 in cas 3); native cover **below or at/above 50 %** | genera all, cover as a **percentage** (studies: even exotic genera and species names) | genus list of the 34 CNPF classes; `native_cover_percent` 0-100, **required** (`useSurveyForm.ts:479-497`, scored by `readANativeCover`) | none for the score; the app already behaves "déplafonné" for the cover; exotic genera and species names are out of scope (list of 34 classes) |
| B | count of strata (those ≥ 20 % of the sampled surface) | **cover % of each of the 5 strata** (h sl, tb, b, i, h) | `strata_count` integer plus optional `strata` code list (`useSurveyForm.ts:499-512`); scorer reads the count only (`rules/common.ts:141`) | **new input** `strata_cover` (five 0-100 values); count derived as the number ≥ 20 |
| C, D | BMg ≤ 3/ha, BMm ≤ 1/ha counted | all counted (maturity case: BMm still ≤ 1/ha) | integer counts and a per-factor `surface_ha` (`useSurveyForm.ts:513-590`) | none numerically; hints and "no stop" wording change; **the three `surface_ha` fields duplicate the one sheet-level "zone de relevé IBP" surface**: prefill them from the route surface |
| E | TGB ≤ 5/ha, GB ≤ 1/ha | all TGB and GB (study: TTGB > 97.5 cm optional) | same shape | same |
| F | ≤ 2 trees/ha per dmh group, total ≤ 8/ha | all dmh trees counted per group | a single `trees_per_ha` number plus a code list `dmh_groups` of **groups present** (`useSurveyForm.ts:591-607`, `factor-selections.ts:19-25`); the package also reads an array `dmh_group_counts` capped at 2 each, **not divided by a surface** | **new input** counts per dmh group code (`dmh_01..dmh_15`) plus the surface; package derives per-group density, caps at 2/ha, sums |
| G | % of open area (no cap on the input) | % without the 5 % cap (study) | percentage 0-100 | none |
| H | - | - | class score 0/2/5 | none |
| I, J | max 2 types counted | all types observed | `type_count` integer plus `types` list | none numerically; wording |

**Net:** two new inputs only (B per-stratum cover, F per-group counts), both *detail* inputs that never change a plafonné score (D-09). They follow the phase 25.1 rule: "a detail array goes out only with its scored key" (`useSurveyForm.ts:257-258`, `factor-selections.ts:6-11`). When present, the package derives the B count and the F density from them so there is a single source of truth; the form also writes the derived `strata_count` / `trees_per_ha` so every existing reader (list, PDF `factor-fields.ts`, detail) keeps working `[ASSUMED design]`.

### 3.2 Does the guide apply to v3.0 surveys?

**Yes, recommended** (O-09). The CNPF route rules do not mention the IBP version; M's own thresholds in Tableaux 4, 5 and 7 are labelled v3.0, so the route guidance was written for both. The comparison doc (`docs/technical/ibp-version-comparison-v3.0-v3.2.md:341`, GS-3) records only a wording change (strip half-width 10-15 m in the 2021 sheet versus 10-20 m). The package scorers already dispatch per version, A cover and B are scored identically in both, so déplafonné B and F work for either. The v3.0 sheets and the 2022 methods document are no longer published (README), which is why the spec cites M and S for both. Risk: M Tableau 7 and 5 numbers are v3.0 labelled while v3.2 scoring differs for C, D, E score 1; pooled data goes through the survey's own version scorer, so no rule is duplicated.

### 3.3 Files that must change for déplafonné entry

| Where | Change |
|-------|--------|
| `packages/ibp-domain/src/rules/common.ts:141` `scoreFactorB`, `:150` `scoreFactorF` | read `strata_cover` / per-group counts when present; keep today's inputs working |
| `packages/ibp-domain/src/parity/cases.ts` (752 lines), `docs/technical/ibp-validation-matrix-v2.md` | new cases `MAT-B-xx@both`, `MAT-F-xx@both`, boundary 19/20 % per stratum, F cap per group with a surface |
| `mobile/src/app/constants.ts:72-74` (`DEFAULT_SURVEY_FORM`), `mobile/src/hooks/useSurveyForm.ts` (735 lines: state, `buildFactorsPayload` 243-317, `applyDraftToForm` 332-437, `factorSections` 477-668) | form state, payload and sections for the new inputs; reset and load. File is a hook (no 400-line cap) but already large: put the new sub-state in a new `useUncappedEntry` hook like `useFactorAnnotations` |
| `mobile/src/i18n/fr/validation.ts`, `factor-detail.ts`, `labels.ts`, `ibp-method.ts` | field labels and hints for déplafonné; hints "En protocole détaillé, le comptage est plafonné à 2 arbres/ha par groupe" (`labels.ts:71`) must become mode-aware |
| `mobile/src/screens/FactorDetailScreen.tsx`, `screens/factor-detail/` | render the extra fields only when the route says déplafonné for that factor |
| `mobile/src/app/survey-pdf/factor-fields.ts` | print B per-stratum cover and F per-group counts for a déplafonné survey (optional, section 5.3) |
| `mobile/src/storage/utils.ts:24` (`isFilledValue`), `computePayloadCompletion` | regression test: completion and factors-filled unchanged when only detail keys are added (Pitfall 10 of phase 27) |

## 4. Recorded data shape (proposal for the spec's "Données enregistrées")

```ts
// packages/ibp-domain/src/route.ts  (new, text-free; constants are the single source for the
// API DTO enums and the mobile catalogue keys)
export const ROUTE_METHODS = ["full", "partial_strip", "partial_plot", "typological", "systematic"] as const
export const COUNTING_MODES = ["capped", "uncapped"] as const
export const UNCAPPABLE_FACTORS = ["A", "B", "C", "D", "E", "F", "G", "I", "J"] as const // G: no cap on input, kept for studies (M p. 24)

export type SurveyRoute = {
  version: 1
  method: RouteMethod
  counting: CountingMode
  /** The sheet's "Facteurs déplafonnés". Empty or absent when counting is "capped". */
  uncapped_factors?: FactorKey[]
  /** The sheet's "zone de relevé IBP, surface (ha)": the sampled area. Required. */
  zone_surface_ha: number
  /** Partial routes only: the sheet's "relevé complémentaire dans la zone non échantillonnée". */
  complement?: { done: boolean; total_surface_ha?: number }
  /** The sheet's "Nom groupe de relevés si plusieurs placettes". At most 60 characters. */
  group_name?: string
  /** What led to the choice: closed values only, never free text. */
  guide?: {
    chosen_by: "guide" | "observer"            // observer = chose directly, guide skipped or overridden
    suggested?: { method: RouteMethod; counting: CountingMode }
    answers?: {
      purpose: "whole_stand" | "rapid_diagnosis" | "study" | "systematic_planned"
      surface_ha: number
      homogeneity?: "homogeneous" | "heterogeneous"
      hard_to_observe?: boolean
      narrow_stand?: boolean
      experience?: "regular" | "beginner"
      minutes_available?: number
    }
  }
}
```

Design notes for the spec:
- **Route-less survey is valid** (guide skipped, or any survey created before this phase): the key is absent, nothing is invented.
- Method values: the sheet has "plein / typologique / partiel par bande ou placette" (S p. 20); `systematic` is added because M p. 13 gives it its own sheet (O-16).
- One jsonb object, versioned (`version: 1`), canonical on the phone (numbers rounded to 2 decimals, sorted factor list, trimmed group name) so a replay compares equal (Pitfall 4). Size check on the server (suggest `octet_length(survey_route::text) <= 4096`).
- **No free text except `group_name`** (so account deletion needs nothing, D-24 pattern; G-10).
- Room for Phase 31: unknown keys are tolerated on read; the DTO is whitelisted (undeclared nested keys are stripped on `/sync`, Pitfall 3), so Phase 31 extends the DTO with a trace reference (a separate store for geometry is preferable to growing this jsonb; out of scope here). `zone_surface_ha` and `method` are exactly what Phase 31 needs to know how to draw bands or placettes.

## 5. Codebase integration map (Q4)

All paths relative to the repository root; line numbers verified in this worktree on 2026-10-13.

### 5.1 Shared package `packages/ibp-domain`

| Item | Evidence | Plan for the phase |
|------|----------|--------------------|
| `evaluateIbp` iterates `FACTOR_KEYS` only; `factors.annotations` is invisible to scorers | `src/evaluate.ts:145-255`, loop at `:172`, `isMissing` at `:81` | route lives **outside** `factors`, so no scorer sees it |
| Density scorers take counts and `surface_ha` | `src/rules/common.ts:208-218` (`readDensityPair`), `v3-2.ts:21-34`, `v3-0.ts` | pooling later feeds them `surface_ha = Sg` |
| `scoreFactorB` reads `strata_count` only; `scoreFactorF` reads `trees_per_ha` or an array `dmh_group_counts` | `src/rules/common.ts:141`, `:150-180` | extend for `strata_cover` and keyed counts + surface (section 3) |
| Wire types | `src/contract/survey.ts:49-70` (`SurveyUpsertPayload`), `:72-85` (`SurveyPatchPayload`, **left unchanged**), `:87-111` (`SurveyDetail`); `src/contract/sync.ts:56-80` (`SyncChangeSurvey`); `src/contract/public-map.ts:73-94` (`CommunitySurveyDetail`) | add `survey_route?: SurveyRoute \| null` to the first, third, fourth; PATCH deliberately untouched (Pitfall 8) |
| Package entry exports | `src/index.ts` (78 lines) | add the route constants, helpers, `recommendRoute`, types |
| Pattern to copy | `src/conditions.ts` (limits, `normalize...`, `...Issues(value)` validator for the DTO) | new `src/route.ts` and `src/route-guide.ts` with the same style |
| Parity fixture | `src/parity/cases.ts` (752 lines, exported through `index.ts`), `src/parity.test.ts`; matrix `docs/technical/ibp-validation-matrix-v2.md` (sections 171-186 hold the phase 27 `MAT-ANN-*` rows) | add `MAT-B-*`, `MAT-F-*` déplafonné cases; a **separate** exported fixture `ROUTE_RULE_CASES` for the decision table (not parity cases: they are not scoring) |
| Coverage | `jest.config.js` thresholds 100 %, `collectCoverageFrom` excludes `contract/**` and `index.ts` | new files must be fully covered; keep type-only files under `contract/` |

### 5.2 API `api/`

| Item | Evidence | Plan |
|------|----------|------|
| Next migration number | `api/migrations/` ends at `023_survey_note_weather.sql`; **no remote branch contains `024` to `029`** (all remote branches scanned); `origin/29-login-stabilization` changes only `mobile/App.tsx`, `mobile/src/hooks/useAuth0Session.ts`, `mobile/src/hooks/useSurveySync.ts` (+2 lines), `mobile/src/screens/AuthGateScreen.tsx`, `mobile/package.json`, `mobile/jest.unit.config.js`, `package-lock.json`, assets, mocks, one doc | **024_survey_route.sql**; re-run `git ls-tree` over remote branches right before writing it; other local worktrees (not scanned) may hold unpushed work |
| Migration pattern | `api/migrations/023_survey_note_weather.sql`: nullable column `ADD COLUMN IF NOT EXISTS`, `CHECK ... NOT VALID` then `VALIDATE`, guarded by `DO $$` blocks, one transaction, no backfill | `survey_route JSONB` plus `chk_surveys_survey_route_object` (`jsonb_typeof = 'object'`) and `chk_surveys_survey_route_size` (`octet_length <= 4096`) |
| DTO | `api/src/surveys/dtos/survey-upsert.dto.ts:97-103` (`survey_note`, `weather` with `@ValidateNested` and `@Type`), nested `dtos/survey-weather.dto.ts` declares every key (whitelist strips undeclared nested keys on `/sync`) | `SurveyRouteDto` (+ nested `guide`, `answers`, `complement` DTOs); enums from the package constants |
| Row type, repository | `api/src/surveys/surveys.types.ts:60-63`; `surveys.repository.ts:165-167` (type), `:208-245` (`fastWriteValues`: `$26` note, `$27` weather, `$28` CAS token), `:262-325` (create and update atomic SQL) | add `$28 survey_route`, CAS token becomes `$29`; pinned in `api/test/surveys-upsert-fast-path.spec.ts` (Pitfall 9) |
| Service | `surveys.service.ts:78-81` (`weatherParameter`), `:145-146`, `:211-212` (fast path inputs), `:361-395` (locked insert `$1..$24`), `:529-557` (locked update `$1..$21`), `:992-1026` (`getSurveyById` projection) | same three sites; the restricted UPDATE for submitted surveys must **not** gain the column |
| Read-only after submit | `surveys-normalize.utils.ts:160` (`SubmittedReadOnlyField`), `:198-199` (list), `:276-288` (cases `survey_note`, `weather` with `jsonDeepEqual` at `:111`); `classifySameVersionContent` after `:330` | add `"survey_route"` to the union, the list and a `jsonDeepEqual` case |
| Changes feed | `surveys-sync.service.ts:352-370` (select `s.survey_note, s.weather`, map to null) | add the column and `survey_route: row.survey_route ?? null` |
| Community and history reads | `community-surveys.service.ts:36-37, 90-91, 156-157`; `parcels.service.ts:88, 105, 115` | optional (O-15): add the route read-only to `CommunitySurveyDetail` so a reader sees how comparable a score is |
| Tests to extend | `api/test/survey-upsert.dto.spec.ts`, `surveys-normalize.utils.spec.ts`, `surveys-upsert-fast-path.spec.ts`, `surveys-sync.service.spec.ts`; e2e `migration-023-survey-note-weather.e2e-spec.ts` and `surveys-note-weather.e2e-spec.ts` as templates for `migration-024-survey-route.e2e-spec.ts` and `surveys-route.e2e-spec.ts`; `surveys-same-version`, `sync-installed-app-compat` | see Validation Architecture |
| Docs | `docs/technical/api-contract-v1.md`, `data-contract-v1.md`, `sync-conflict-resolution-v1.md`, `docs/specs/ibp-form-spec.md` (all mention `survey_note`) | add the field |

### 5.3 Mobile `mobile/`

**Creation flow (where the skippable step goes).**
- Wizard: `mobile/src/screens/survey-wizard/SurveyWizardScreen.tsx:31-35` (`TOTAL_STEPS = 4`: name, method, context, then the parcel map as its own screen), `:106-113` (`goNext` ends with `onOpenParcels`). The wizard's first question is titled "Quelle méthode IBP ?" (`i18n/fr/survey-form.ts:22-28`): **vocabulary collision with the CNPF "méthode de relevé"** (section 7.2).
- Route: `mobile/src/navigation/routes/SurveyFormRoute.tsx` opens `surveyParcels` (`mode: "wizard"`).
- Parcel step: `mobile/src/navigation/routes/ParcelSelectionRoute.tsx:30-56`: `onSave(weatherPoint)` calls `actions.createDraft()` (`:39`), stores the weather point, then `navigation.reset({ index: 1, routes: [surveysHome, surveyDetail] })` (`:41-45`) and **after** the reset `surveyActions.openSurvey(createdId)` (`:49`). `SurveyParcelSelectionScreen.tsx:179` computes the point with `cachedParcelCentre(parcelStatuses, selectedParcelIds)` (`mobile/src/map/own-surveys.ts:42`).
- **Hook point:** after `createDraft()` returns `createdId`, navigate to a new `surveyRouteGuide` screen (stack `SurveysStack.tsx`, param type in `navigation/types.ts:23-45`) carrying `{ surveyId, surfaceHa }`, instead of resetting at once; the guide's finish and skip both end with the existing reset-and-`openSurvey` sequence. The draft already exists, so the guide writes its record with a storage patch (like `patchLocalSurveyConditions`), independent of the form state. The surface is computed in the selection screen from the same parcel statuses as the weather point and passed as a second `onSave` argument (null when geometry is not loaded; the observer types it). The `beforeRemove` reset listener on the summary screen (`SurveysStack.tsx` `surveyDetail` listeners, `closeSelectionUnlessReset`) must still keep the selection (wizard reset-flow test: `navigation/wizard-reset-flow.test.tsx`).
- Progress: the wizard's progress bar and "Étape X sur 4" are driven by `TOTAL_STEPS`; the guide is an optional step after the map: decide between "Étape 5 sur 5 (facultatif)" and an unnumbered screen (UI-SPEC decision).
- Shared SEED-007 note: offline creation currently stops at the parcel map when no geometry is cached; the surface prefill is then null and the observer types it (the guide must work with no surface prefill).

**Surface.** `parcels.area_m2` exists (`api/migrations/008_parcels_and_versioning.sql:9`, `api/src/surveys/surveys.types.ts:110`) but **no code ever writes it** (grep: only the column and a SELECT). The selection screen holds each parcel's GeoJSON (`PublicParcelStatusItem.geometry`, `packages/ibp-domain/src/contract/public-map.ts:25-33`); `parcelPolygonsFrom` (`app/survey-pdf/map-projection.ts:160`) returns the rings. Compute hectares on the phone from those rings (new `mobile/src/map/parcel-area.ts`, pure). Whether the IGN WFS or API Carto features carry a `contenance` property was not verifiable here `[ASSUMED: not relied upon]`. A cadastral parcel is not a stand: the prefill is a proposal ("surface des parcelles choisies"), correctable.

**Local storage and sync.**
- Payload type: `mobile/src/storage/types.ts:111-141` (`SurveyQueuePayload`, `ConditionsPatch`); add `survey_route?: SurveyRoute | null` and a `RoutePatch`.
- Draft-only patch: `mobile/src/storage/surveys.ts:524-600` `patchLocalSurveyConditions` re-reads inside the transaction, returns null for a non-draft, bumps `sync_version`, rewrites the queued upsert; write `patchLocalSurveyRoute` the same way (do not overload `ConditionsPatch`: different semantics, same helper `writeDraftPayload`).
- Form autosave keeps unknown payload keys because `updateLocalDraft` spreads the stored payload (`surveys.ts:~470-485`), the same guarantee as `weather` (Pitfall 5); **but `factors` is replaced wholesale**, so the new B and F detail keys must be part of the form state.
- Pull: `mobile/src/storage/sync.ts:441-466` `buildSurveyPayloadFromRemote`: copy `survey_route: survey.survey_route ?? undefined`.
- SQLite schema stays at version 5 (`mobile/src/storage/db.ts:27` `SCHEMA_VERSION = 5`). `payload_completion` and `payload_factors_filled` must not move (route is not a factor).
- Action path: `mobile/src/hooks/useSurveyDraftPatcher.ts:260-310` (`handleUpdateSurveyNote`, `handleUpdateSurveyWeather`), exposed by `mobile/src/state/AppStateProvider.tsx:265` (`updateSurveyNote`) through `useStableActions` and `surveys-context`; add `handleUpdateSurveyRoute` and `updateSurveyRoute`. Nothing touches `useSurveySync.ts` (the only file also changed by the 29 branch).

**Display.**
- Detail: `mobile/src/screens/SurveyContextScreen.tsx` (135 lines) is "Contexte" (method, cas, dated weather); add a read-only `RouteSection` (and for a draft an "Modifier le parcours" entry reopening the guide). Reader hook modelled on `screens/survey-detail/conditions/useSurveyConditions.ts` (reads the local draft by `survey.id` and `updated_at`). The summary row `rowsText.contextValue({ method, cas })` in `screens/survey-detail/summary-rows.ts:28-37` can carry the short route label. Sub-pages are registered in `navigation/stacks/SurveysStack.tsx:128-172`.
- PDF: `mobile/src/app/survey-pdf/identity.ts:121-122` hard-codes `textRow(t.identity.surveyMode, t.identity.cappedMode)` with the comment "The app only knows the capped survey mode"; the text is `i18n/fr/survey-export.ts:44` ("Relevé plafonné, aucun facteur déplafonné"). **This claim becomes data-driven.** Block order is set in `survey-pdf/build-html.ts:23-51` (identity, conditions, scores, chart, factors, map, trend, photos): add `route-section.ts` (same shape as `conditions-section.ts`: pure, `escapeHtml`, estimated height for `paginate.ts`) right after the conditions block, with its CSS in `collectCss`. Data comes from `assemble-export-data.ts:128-150` (`loadDraftParts`, reads the local draft) and the `SurveyExportData` type (`survey-pdf/types.ts:148`). Page budget: blocks are unsplittable, `PDF_PAGE_BLOCK_HEIGHT = 840`, `PDF_PAGE_FILL_FACTOR = 0.9` (`export-settings.ts:17-20`); phase 27 recorded 4-6 pages for its maximal fixture, so re-measure with the new block and record the figure there (Pitfall 13).
- Draft versus submitted PDF: the draft banner and watermark exist; the route block prints for both; read-only after submit applies to the data only.

**Catalogue and gates.** `mobile/src/i18n/fr/index.ts` assembles one module per area (each plan fills its own file): create `fr/route-guide.ts` (questions, explanations, reasons, glossary) and extend `survey-detail.ts`, `survey-export.ts`, `validation.ts`. A catalogue test renders every function leaf (comment in `ibp-method.ts:5-6`), so keep per-case texts static strings. Terms `BMg`, `BMm`, `TGB`, `GB` are registered `written-out` terms; reuse `fr.abbreviations.terms` via `AbbreviationInfo` (`ui/AbbreviationInfo.tsx`). `dmh` and `Sg` are not caught by the capitals-only candidate regex but **must not appear**: write "dendromicrohabitats" and "surface totale du groupe" (phase rule: abbreviations written out). `placette` is a normal French word and needs an explanation, not an abbreviation entry.

**UI primitives to reuse.** The wizard's choice cards (`survey-wizard/wizard.styles.ts` `choiceCard`, `radio`), `CasPicker` (`ui/CasPicker.tsx`, a one-question picker with captions, the closest analogue), `AppChoiceChip`, `AppCollapsibleSection` (progressive disclosure), `AppField`, `AppGroupedList`, `AppNotice`, `GlassButton` (big call to action), `AbbreviationInfo`. `ScreenFrame` and `PageTitle` for the page shell.

## Architecture Patterns

### System Architecture Diagram

```
 Observer (offline OK)
        |
        v
  [Wizard: name -> IBP method -> cas] -> [Parcel map, select parcels]
                                               |  onSave(weatherPoint, surfaceHa)
                                               v
                      createDraft()  ---> local_surveys (payload_json, draft)
                                               |
                                               v
                       [Route guide screen]  (skippable)
        questionnaire answers ---> recommendRoute()  (@cortege/ibp-domain, pure)
                 ^                       |  { method, counting, reasons[codes], warnings[], estimate }
                 |                       v
        fr.routeGuide catalogue <--- reason codes -> plain French sentences
                                         |
                       observer accepts / changes suggestion / chooses directly / skips
                                         |
                                         v
                  patchLocalSurveyRoute(surveyId, SurveyRoute)  (draft only, re-reads status in a tx)
                                         |
              +--------------------------+--------------------------+
              v                          v                          v
   payload_json.survey_route    sync_queue upsert           form: counting mode "uncapped"
   (SQLite, schema stays 5)     (POST /v1/sync)             adds B strata cover, F group counts
                                         |                          |
                                         v                          v
                      API: SurveyRouteDto -> surveys.survey_route    package scorers (B, F derive)
                      (jsonb, migration 024, read-only after         parity cases x3
                       submit via jsonDeepEqual)
                                         |
              GET /sync/changes <--------+--> mobile pull copies survey_route
                                         |
                       +-----------------+-----------------+
                       v                                   v
        Survey detail "Contexte": RouteSection      PDF: route-section block
        (read-only text; draft: edit -> guide)      (replaces hard-coded "plafonné" row)

   Phase 31 later: reads method + zone_surface_ha to draw bands/placettes (not built here)
   Phase 30.1 (if split): pooled group calculation over recorded placette surveys (pure, package)
```

### Recommended Project Structure
```
packages/ibp-domain/src/
├── route.ts               # constants, SurveyRoute type, canonical form, surveyRouteIssues (DTO), read helper
├── route-guide.ts         # recommendRoute(answers) -> codes, no text; thresholds as named constants
├── route.test.ts          # validators, canonical form
├── route-guide.test.ts    # one test per rule id R-nn from ROUTE_RULE_CASES
├── route-cases.ts         # ROUTE_RULE_CASES (the decision table as data), exported via index.ts
└── rules/                 # B strata_cover, F keyed counts (parity cases in parity/cases.ts)

api/
├── migrations/024_survey_route.sql
├── src/surveys/dtos/survey-route.dto.ts   # nested DTOs
└── test/  migration-024-survey-route.e2e-spec.ts, surveys-route.e2e-spec.ts (+ unit spec edits)

mobile/src/
├── map/parcel-area.ts                      # ringsAreaHa (pure)
├── storage/                                # patchLocalSurveyRoute, types, pull copy
├── hooks/useSurveyRoute.ts                 # reader (like useSurveyConditions), + useUncappedEntry.ts
├── screens/route-guide/                    # RouteGuideScreen (<=400 lines), QuestionCard, SuggestionCard, ...
├── navigation/routes/RouteGuideRoute.tsx   # memo route component, reads only the contexts it needs
├── screens/survey-detail/route/            # RouteSection (read-only), edit entry
├── app/survey-pdf/route-section.ts         # PDF block
└── i18n/fr/route-guide.ts                  # all text
docs/specs/route-choice-rules-v1.md         # the owner-validated spec (French)
docs/user-tests/route-choice-assistant.md   # the recorded tester test report
```

### Pattern 1: the package returns codes, the app speaks French
`recommendRoute` returns `reasons: RouteReasonCode[]`; the mobile catalogue maps each code to one static sentence. A catalogue test asserts every code has text, no em dash, no forbidden abbreviation. The package never imports a string.

### Pattern 2: draft-only storage patch, status re-read inside the transaction
Copy `patchLocalSurveyConditions` (`mobile/src/storage/surveys.ts:524-600`): returns null for a missing or non-draft survey, bumps `sync_version`, requeues the upsert, never fires on a submitted survey. This is what makes "read-only after submit" hold on the phone.

### Pattern 3: nested DTO with every key declared and package-owned enums
`survey-weather.dto.ts` is the template: declare every nested key (the whitelist strips the rest on `/sync`), take limits and enums from the package, add `@Type(() => SurveyRouteDto)` and `@ValidateNested()` on the parent field, test both `POST /v1/surveys` and `POST /v1/sync` entry points (Pitfall 2 of phase 27).

### Pattern 4: deep-equal compare for read-only after submit
Add the field to `getChangedSubmittedReadOnlyFields` with `jsonDeepEqual` (key order never matters because jsonb reorders keys). An absent or null body value is never a change.

### Anti-Patterns to Avoid
- **Re-implementing a rule in mobile** (for instance "if surface < 5 then plein" inside a screen): forbidden; screens only render `recommendRoute` output.
- **Storing the route in `factors`** or putting any meta key inside a factor entry: a factor object without its scored key is a blocking invalid input (phase 27 Pitfall 1).
- **A free-text "reason" field**: use closed answers (D-24 and privacy).
- **Deleting déplafonné data when the mode is switched back**: never filter a selection on a mode switch (same rule as the phase 25.1 selections); only hide the fields.
- **Letting the guide block creation**: it is skippable and offline; a failed read of anything must leave the survey creatable (SEED-007).
- **Calling "Méthode IBP" the route**: see 7.2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route rules and thresholds | inline `if` chains in screens, or a rules copy in `api` | `recommendRoute` + `ROUTE_RULE_CASES` in `@cortege/ibp-domain` | CLAUDE.md; testable at 100 %; one place to change |
| B strata derivation and F per-group cap | arithmetic in the form hook | package scorers (`strata_cover`, keyed counts) | scoring rule; parity cases run three times |
| Nested payload validation | manual `if` checks | class-validator nested DTO + package `surveyRouteIssues` | Phase 27 pattern, whitelist behaviour documented in its research |
| Read-only after submit | ad-hoc status checks in new code | `getChangedSubmittedReadOnlyFields` list and `patchLocalSurveyRoute` | existing contract with replay safety |
| Plain-French sentences | strings in screens or in the package | `fr.routeGuide` catalogue | structure gate forbids user text outside `src/i18n` |
| Explaining an abbreviation | a new info sheet | `AbbreviationInfo` with `fr.abbreviations.terms` | existing component and gate |
| PDF pagination | manual page splits | `paginate.ts` blocks with an estimated height | unsplittable block model already measured per platform |
| Polygon area | a geometry dependency, or the unfilled `parcels.area_m2` | ~20-line pure spherical-area helper with a test on a known rectangle | no `@turf/*` in the repo; editable estimate |
| Pooled group IBP (30.1) | per-screen arithmetic or spreadsheet logic in mobile | a package function over raw placette data | D-03 |

**Key insight:** the value of this phase is in the *rules and wording*, not the plumbing. Every plumbing task has a Phase 27 twin; reuse the twin so the owner's time goes to the spec, the wording and the tester test.

## Common Pitfalls

### Pitfall 1: "plafonné" already means two things in the app
**What goes wrong:** the catalogue says "Score plafonné à 2" for the native-cover cap on factor A (`ibp-method.ts:36`, `labels.ts:32`, `survey-export.ts:90`) and now "relevé plafonné" for the counting mode. A tester reads one as the other.
**How to avoid:** in the guide call the mode "Comptage : complet ou arrêté dès que le score est sûr" (draft), keep "plafonné" only inside the explanation of the CNPF word; never reuse "plafonné" in a score line. The tester test checks the confusion directly.
**Warning signs:** a tester says "mon score est plafonné donc j'ai choisi plafonné".

### Pitfall 2: "Méthode IBP" versus "méthode de relevé"
**What goes wrong:** the wizard already asks "Quelle méthode IBP ?" (v3.2 or v3.0), the PDF has a "Méthode IBP" row and a "Critères de diagnostic" block; CNPF's sheet field "Méthode" is the route.
**How to avoid:** the seminar cards say "parcours": use "Parcours" for the route everywhere, "Comptage" for the mode, keep "Méthode IBP" for the version. D-01 already separates them; the catalogue must too.

### Pitfall 3: the false 409 from normalisation (phase 27 Pitfall 4)
**What goes wrong:** the server compares the replayed body with the stored jsonb; any server-side reformatting, rounding or key reordering that the phone did not apply becomes `409 sync_version_conflict`.
**How to avoid:** canonical form on the phone (surface rounded to 2 decimals, factors sorted and de-duplicated, group name trimmed), store verbatim, compare with `jsonDeepEqual`; e2e replays an identical body at the same version (expect `synced`, no write, no new event) and a changed route on a submitted survey (expect conflict).

### Pitfall 4: nested DTO traps (phase 27 Pitfalls 2 and 3)
`forbidUnknownValues` rejects a nested plain object without `@Type`; `whitelist` strips undeclared nested keys on `/sync` and rejects them on `POST /surveys`. Declare every key of `SurveyRoute`, including `guide.answers.*` and `complement.*`; test both entry points. Phase 31 will have to extend the DTO for its trace.

### Pitfall 5: autosave or pull erases the new fields (phase 27 Pitfall 5)
`updateLocalDraft` replaces `factors` wholesale and the pull rebuilds the payload from the server row. If B `strata_cover` and F keyed counts are not part of the form state, the first edit of another factor wipes them; if `buildSurveyPayloadFromRemote` does not copy `survey_route`, a reinstall loses it. Tests: edit another factor after entering déplafonné data and reload; pull a survey that has a route.

### Pitfall 6: SQL parameter renumbering (phase 27 Pitfall 9)
`fastWriteValues` ends with `$27` weather then the CAS token `$28`; the new column makes the CAS token `$29`. The pinned assertions in `surveys-upsert-fast-path.spec.ts` and the call site `casToken === null ? [] : [casToken]` (`surveys.repository.ts:244`) change together; the two non-CTE statements in `surveys.service.ts` (`$1..$24`, `$1..$21`) gain one parameter; the restricted submitted-survey UPDATE does not.

### Pitfall 7: the hard-coded PDF claim
`identity.ts:121-122` and `survey-export.ts:44` state "Relevé plafonné, aucun facteur déplafonné" for every survey, including those that will carry no route. Tests pin it (`identity.test.ts`, `build-html.test.ts`, `build-html` fixture page counts). Decide the legacy behaviour in the spec (O-07) and update the pinned tests deliberately.

### Pitfall 8: PDF page budget (phase 27 Pitfall 13)
Blocks are unsplittable and heights are estimates. A route block of 5-7 rows adds roughly 100-130 design px; re-measure the maximal fixture on both platforms and record the page count next to the constants in `export-settings.ts`.

### Pitfall 9: group assignment after submit versus read-only (G-8)
The CNPF allows a placette to join a group after the inventory; D-09 makes the route read-only after submit. Decide in the spec before any group UI exists; the cheapest escape is to keep grouping outside the immutable record.

### Pitfall 10: the surface prefill is a parcel, not a stand
A cadastral parcel is neither the stand nor the sampled zone (partial routes sample a fraction). The prefill must be labelled and correctable, and the sheet's "zone de relevé IBP" (sampled area) is distinct from the stand surface that drives the choice: the questionnaire asks the stand surface, the record stores the sampled `zone_surface_ha` (for en plein they are equal; the guide prefills the zone from the stand).

### Pitfall 11: three surface fields in the form versus one in the record
C, D and E each carry their own `surface_ha` input today. Two sources of truth will diverge. Prefill them from `zone_surface_ha` and keep them editable only until the observer touches them, or show one shared field (design decision in the UI-SPEC); never change the package contract (`surface_ha` inside each factor).

### Pitfall 12: new app, old API
The API deploys by pulling the new image within minutes of a merge to `main`; app builds are installed by hand. If a build with `survey_route` meets an API without it, `/sync` strips the key silently and a later pull (server row without the route) could overwrite the local payload. Merge and deploy the API first; the e2e `sync-installed-app-compat` covers old clients without the field.

## Code Examples

Patterns confirmed in the repo, to copy.

### Nested DTO, declared keys (template: `api/src/surveys/dtos/survey-weather.dto.ts`)
```typescript
// Source: api/src/surveys/dtos/survey-upsert.dto.ts:97-103 (existing pattern)
@IsOptional()
@ValidateNested()
@Type(() => SurveyWeatherDto)
weather?: SurveyWeatherDto | null
// New, same shape:
@IsOptional()
@ValidateNested()
@Type(() => SurveyRouteDto)
survey_route?: SurveyRouteDto | null
```

### Read-only compare after submit (`api/src/surveys/surveys-normalize.utils.ts:283-288`)
```typescript
case "weather": {
  if (!jsonDeepEqual(bodyValue, existing.weather ?? null)) {
    changed.push(field)
  }
  break
}
// Add: case "survey_route" with existing.survey_route ?? null
```

### Draft-only storage patch (shape of `mobile/src/storage/surveys.ts:524-600`)
```typescript
// Re-read the row inside the transaction; refuse anything that is not a draft.
if (!existing?.id || existing.status !== "draft") return null
const nextPayload: SurveyQueuePayload = { ...basePayload, sync_version: nextSyncVersion, status: "draft" }
if (input.survey_route !== undefined) nextPayload.survey_route = input.survey_route
await writeDraftPayload(tx, input.survey_id, nextPayload, now)
```

### Package pure function, codes only (proposal)
```typescript
// packages/ibp-domain/src/route-guide.ts
export const ROUTE_PLEIN_MAX_HA = 5          // M p. 4, p. 6; S p. 18
export const ROUTE_SMALL_STAND_HA = 1        // M p. 4 Tableau 1
export const ROUTE_TINY_STAND_HA = 0.5       // M p. 4
export type RouteRecommendation = {
  method: RouteMethod
  counting: CountingMode
  uncapped_factors: FactorKey[]
  reasons: RouteReasonCode[]                 // codes, never text
  warnings: RouteWarningCode[]
  alternatives: RouteAlternative[]           // above the 10-20 ha bound (R-11b)
  estimated_minutes: { min: number; max: number } | null
}
export function recommendRoute(answers: RouteAnswers): RouteRecommendation { /* table R-01..R-21 */ }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Survey methods document 2022-10-10 (offline, README says 404) | "Méthodes de relevé de l'IBP" 09/09/25, hosted at CNPF (2026-04 path) | 2025/2026 | the full rule set is readable again; README must be updated |
| v3 sheet strip half-width 10-15 m | 10-20 m (S p. 18), 10-25 m by visibility (M p. 15) | v3.2 | advice text in the guide |
| Sheet "Méthode": plein / partiel / typologique | systematic has its own déplafonné sheet; typologique and systematic documented separately | M 2025 | record `systematic` as a fourth method |
| Single "relevé plafonné" claim in the app PDF | recorded per survey, per factor | this phase | replace the hard-coded row |

**Deprecated/outdated:** the app's phrase "En protocole détaillé" for F (`labels.ts:71`) is a loose reference to déplafonné counting; rewrite it with the mode.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Subdivision/surface bound T = 10 ha for heterogeneous and 20 ha for homogeneous stands (CNPF gives only "10-20 ha, depending on heterogeneity") | 1.2 R-11 | wrong suggestion for 10-20 ha stands; owner O-02 |
| A2 | Pre-select "subdiviser" above T | 1.2 R-11b | owner may prefer typologique; O-03 |
| A3 | Experience and time are advisory only | 1.2 R-20, R-21 | owner may want them to change the suggestion; O-04 |
| A4 | Pooled H = identical score, else 2 | 2.3 G-1 | wrong group H under v3.2; O-group |
| A5 | Pooled J = union of types qualifying in their own placette | 2.3 G-2 | over- or under-counts J |
| A6 | Group members must share method version and cas | 2.3 G-5 | CNPF silent; mixed-cas groups could be allowed |
| A7 | Complement adds genera and edge percentage only; excluded from the first group lot | 2.3 G-3, G-11 | incomplete group G |
| A8 | The derived `strata_count` / `trees_per_ha` are written next to the new detail inputs so existing readers keep working | 3.1 | readers see two sources of truth if not derived |
| A9 | Surface helper accuracy of 1 % is acceptable for an editable estimate | Standard Stack | a stand surface error of 1 % crosses a threshold only in edge cases |
| A10 | IGN cadastre features do not need to carry `contenance` for the prefill | 5.3 | none, the helper works from geometry |
| A11 | Nielsen-style "5 testers find most usability problems" as the tester-test sizing | 7.4 | owner may fix another number |
| A12 | Group name free text capped at 60 characters is acceptable (D-24 risk) | 4, G-10 | privacy decision, O-08 |

## Open Questions (owner decisions, to resolve in the written spec)

1. **O-01 Counting mode per factor or one flag?** The sheet lists "Facteurs déplafonnés"; chapter 8 names factor sets. Recommendation: record `counting` plus `uncapped_factors`; the guide offers presets (study: A B C D E F G I J; mature stand: A C D E F; max-score stand: choose among A C D E F I J; minimum-score stand: C D E).
2. **O-02 The 10-20 ha bound** (A1).
3. **O-03 Default above the bound** (A2).
4. **O-04 Do experience and time change the suggestion?** (A3). Recommendation: no, advice only.
5. **O-05 Plein limit:** 5 ha (M p. 6 and Tableau 1) over Tableau 2's "dizaine d'ha".
6. **O-06 What the app says about typologique and systematic group results while the pooled calculation is not built** (30.1): e.g. "à calculer avec la feuille de calcul du CNPF" or hide the two methods from the suggestion until 30.1.
7. **O-07 Legacy surveys with no route:** keep the PDF row "Relevé plafonné, aucun facteur déplafonné" (no regression) or print nothing; in the detail show nothing or "Parcours non renseigné".
8. **O-08 Group name:** free text allowed (D-24 risk accepted)? Editable after submit (G-8)?
9. **O-09 Guide for v3.0 surveys:** yes (recommended).
10. **O-10 Linear stands under 15 m wide** (per-km thresholds): out of scope; warn only.
11. **O-11 Stands under 0.5 ha:** warn, do not block.
12. **O-12 Vocabulary:** "Parcours" for the route, "Comptage" for the mode, "Méthode IBP" stays the version (Pitfalls 1 and 2).
13. **O-13 Tester test:** how many testers, what counts as unaided success (7.4).
14. **O-14 D-04:** split the group lot to 30.1 (recommended, 2.5).
15. **O-15 Community view:** show the route read-only on another member's survey (recommended, cheap) or not.
16. **O-16 Method values:** record `systematic` as a method although the CNPF sheet's "Méthode" box does not list it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | yes | v22.22.3 (engines >= 22.5) | - |
| npm | workspaces | yes | 10.9.8 | - |
| PostgreSQL | API e2e, migration 024 | yes, accepting connections on `/tmp:5432`; databases `ibp` and `ibp_test` exist | postgresql@16 (Homebrew) | Docker Compose (`docker` CLI present, daemon not probed; memory note: may not start) |
| `api/.env.test` | e2e config | only `api/.env.test.example` present | - | copy the example, default database `ibp_test` |
| `node_modules` | all test commands | yes (baseline domain run green) | - | `npm install` |
| `pdftotext`, `pdftoppm` | research only (reading CNPF PDFs) | yes | - | not needed by the phase |
| Android emulator / iPhone | device checks of the guide layout and keyboard | not probed | - | owner's iPhone (memory note); small-screen simulator (320 x 568, 360 x 640) for the questionnaire layout |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `api/.env.test` (copy the example).

## Validation Architecture

(`workflow.nyquist_validation` is absent from `.planning/config.json`, so the section applies.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest in every workspace; Supertest for API e2e |
| Config files | `packages/ibp-domain/jest.config.js` (100 % thresholds), `api/jest.unit.config.js`, `api/jest.config.js` (e2e, `ibp_test`, globalSetup drops and re-migrates), `mobile/jest.unit.config.js` |
| Quick run command | `npm --workspace @cortege/ibp-domain run test`; `cd api && npx jest --runInBand -c jest.unit.config.js <file>`; `cd mobile && npx jest -c jest.unit.config.js <path> --coverage=false` |
| Full suite command | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` then `npm run test:e2e` (local Postgres) |

### Phase Requirements to Test Map
| Req ID (proposed) | Behavior | Test Type | Automated Command | File Exists? |
|---------|----------|-----------|-------------------|-------------|
| REQ-DOC-route-rules | every spec rule R-nn has exactly one case in `ROUTE_RULE_CASES`; ids unique; each cites a CNPF page | unit (package) | `npm --workspace @cortege/ibp-domain run test -- route` | Wave 0 gap |
| REQ-DOC-route-rules | the spec file lists the same rule ids as the fixture | unit (a small consistency test reading `docs/specs/route-choice-rules-v1.md`, like the matrix id check in `parity/cases.ts` header) | package test | Wave 0 gap |
| REQ-DOC-route-rules | owner validated the spec with a date | **owner only** (a dated line in the spec; a gate check in the plan) | manual | - |
| REQ-C-route-guide | each rule returns the expected method, counting, reason codes, warnings at the boundaries 0.5, 1, 5, 10, 20, 40 ha | unit (package, 100 % coverage) | `npm --workspace @cortege/ibp-domain run test:coverage` | Wave 0 gap |
| REQ-C-route-guide | every reason and warning code has French text; no em dash; abbreviation gate; static strings | unit (mobile gates) | `cd mobile && npx jest -c jest.unit.config.js src/i18n src/__checks__ --coverage=false` | extend existing |
| REQ-C-route-guide | the screen renders the questions progressively, shows suggestion plus reasons, "changer", direct choice, skip, works with no surface prefill and offline | unit (RN testing) | `npx jest -c jest.unit.config.js src/screens/route-guide` | Wave 0 gap |
| REQ-C-route-guide | the wizard goes parcel step -> guide -> summary with selection kept; skip ends the same way | unit | `... src/navigation/wizard-reset-flow.test.tsx src/navigation/routes/routes.test.tsx` | extend existing |
| REQ-C-route-guide | surface helper matches a known 1 ha rectangle at latitude 46 within 1 %, handles MultiPolygon and empty input | unit | `... src/map/parcel-area.test.ts` | Wave 0 gap |
| REQ-C-route-record | validators accept canonical records and reject bad enums, negative surface, > 60 characters group name | unit (package) | package test | Wave 0 gap |
| REQ-C-route-record | migration 024 nullable, checks validated, idempotent | e2e | `cd api && npx jest --runInBand -c jest.config.js test/migration-024-survey-route.e2e-spec.ts` | Wave 0 gap |
| REQ-C-route-record | upsert, `/sync`, `/sync/changes`, `GET /surveys/:id` round trip; identical replay at the same version gives no 409 and no event; changed route on a submitted survey conflicts; old client without the key unaffected; nested DTO validated on both `POST /v1/surveys` and `POST /v1/sync` | e2e + unit | `... test/surveys-route.e2e-spec.ts test/survey-upsert.dto.spec.ts test/surveys-normalize.utils.spec.ts test/surveys-upsert-fast-path.spec.ts test/surveys-sync.service.spec.ts` | Wave 0 gap |
| REQ-C-route-record | local patch is draft-only, survives form autosave and a pull, queues the upsert, completion counters unchanged | unit (sqlite) | `... src/storage/surveys.route.sqlite.test.ts src/storage/sync.pull.sqlite.test.ts src/storage/surveys.completion.sqlite.test.ts` | Wave 0 gap |
| REQ-C-route-display | detail section text per method and mode; PDF block escaped, height estimate, page count of the maximal fixture, legacy behaviour | unit | `... src/screens/survey-detail/route src/app/survey-pdf/route-section.test.ts src/app/survey-pdf/build-html.test.ts` | Wave 0 gap |
| REQ-C-uncapped-entry | B `strata_cover` derives the count (19 % no, 20 % yes), F keyed counts capped at 2/ha with a surface, same score as plafonné entry for equal data; parity in package, API adapter, mobile adapter | unit (parity x3) | `npm --workspace @cortege/ibp-domain run test:coverage`; `cd api && npx jest -c jest.unit.config.js test/ibp-parity.spec.ts`; `cd mobile && npx jest -c jest.unit.config.js src/app/ibp-parity.test.ts` | extend existing |
| REQ-C-uncapped-entry | form writes detail keys only with scored keys; field visibility follows the mode | unit | `... src/hooks/useSurveyForm.test.ts src/screens/FactorDetailScreen.test.tsx` | extend existing |
| REQ-FT-route-test | a tester who does not know the method completes the choice unaided, recorded | **tester only** (owner's tester, recorded session) | manual protocol 7.4 | report to write |
| Gates | no em dash, abbreviations, 400-line cap, icons outline, motion, contrast | source gates | `cd mobile && npx jest -c jest.unit.config.js src/__checks__ src/app/visual-tokens.test.ts --coverage=false` | exist |

### Sampling Rate
- **Per task commit:** the targeted test file(s) of the touched workspace plus lint on it; any change under `packages/ibp-domain` also runs `npm run test:coverage:domain` (100 %).
- **Per wave merge:** `npm run test:unit`, the e2e files touched in the wave, `npm run typecheck`, `npm run format:check`.
- **Phase gate:** full `npm run test`, lint, typecheck, format, mobile source gates, then the owner and tester checks.

### Wave 0 Gaps
- [ ] `docs/specs/route-choice-rules-v1.md` and the dated owner validation line (owner)
- [ ] `packages/ibp-domain/src/route.test.ts`, `route-guide.test.ts`, `route-cases.ts` (fixture)
- [ ] `api/test/migration-024-survey-route.e2e-spec.ts`, `api/test/surveys-route.e2e-spec.ts`
- [ ] `mobile/src/map/parcel-area.test.ts`, `mobile/src/storage/surveys.route.sqlite.test.ts`, `mobile/src/screens/route-guide/*.test.tsx`
- [ ] `docs/user-tests/route-choice-assistant.md` (test plan then report)
- [ ] Framework install: none

### Only owner or tester verifiable
Spec validation in writing; wording review of every French sentence (reasons, questions, glossary); the recorded unaided tester test; the layout and keyboard behaviour of the questionnaire on a small phone (cannot be unit tested, same as phase 27 Pitfall 12); the PDF look on both platforms.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no (unchanged, Auth0 JWT guard) | existing `AuthGuard` |
| V3 Session Management | no | existing |
| V4 Access Control | yes | route written only by the owner of the survey through the existing owner-scoped upsert; read-only after submit enforced server side by `getChangedSubmittedReadOnlyFields`; mobile patch refuses non-drafts |
| V5 Input Validation | yes | nested class-validator DTO with enums and numeric ranges from the package, `maxLength` on `group_name`, DB `CHECK` on type and size, parameterised jsonb binding (no string interpolation; the repo's SQL lint rule applies) |
| V6 Cryptography | no | none introduced |
| V8 Data Protection | yes (light) | no personal data in the route except `group_name` (free text, D-24 risk accepted by owner or constrained, O-08); route-free surveys valid |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampering with a submitted survey's route through a replayed upsert | Tampering | same-version deep-equal compare returns 409; PATCH does not accept the field |
| Oversized or malformed jsonb flooding the table or the sync batch | DoS | DTO bounds, `chk_surveys_survey_route_size`, existing body-size handling (phase 27 Pitfall 7 notes the 100 kB default) |
| Mass assignment of undeclared nested keys | Tampering | whitelist DTO, every key declared |
| Free text in `group_name` naming a person | Information disclosure | length cap, owner decision O-08, retained like survey notes (D-24) |
| Leak through the community read | Information disclosure | only after submit, only if O-15 says so, read-only |

## 6. Suggested plan breakdown (waves)

Owner items are marked **[OWNER]**. Numbering is indicative; the planner owns the final split. Mobile plans respect the 400-line cap by splitting files.

**Wave 0, source and spec (no code that encodes a rule)**
- **30-01** Add the CNPF methods document to `docs/references/README.md` (URL, SHA-256 `3954746756b770f338055310973ada871ea5bdd768cb6be1ce60581a7a87d7f2`, retrieval date); write `docs/specs/route-choice-rules-v1.md` in French from sections 1, 2, 3, 4 above: glossary, inputs, rule table R-01.., one test case per rule with the CNPF page, the recorded data, the group model and Table 5 with ambiguities G-1..G-11, the owner decisions O-01..O-16, the proposed requirement IDs.
- **GATE G1 [OWNER]:** the owner reads and validates the spec in writing, dated, resolving O-01..O-16 (D-10, criterion 1). **Nothing below starts before G1**, except nothing: all code and screens follow it. The same gate settles the **D-04 decision**.
- **UI-SPEC** (the phase is marked "UI hint: yes"): a UI-SPEC for the questionnaire, suggestion card, step numbering, déplafonné fields and the Contexte section may be written in parallel with G1 review; it is design, not rules.

**Wave 1 (after G1, parallel)**
- **30-02** Package: `route.ts`, `route-guide.ts`, `route-cases.ts`, wire types, index exports, 100 % tests, spec/test id consistency check.
- **30-03** Package: déplafonné B and F scoring, parity cases `MAT-B-*`, `MAT-F-*` in the package, API adapter and mobile adapter; update `ibp-validation-matrix-v2.md`.
- **30-04** API: migration 024, `SurveyRouteDto`, repository and service write sites, same-version and read-only compare, changes feed, optional community read, unit and e2e tests, three technical docs.

**Wave 2 (needs wave 1)**
- **30-05** Mobile storage and sync: payload type, `patchLocalSurveyRoute`, pull copy, draft patcher action and context, regression tests (autosave, completion counters, pull).
- **30-06** Catalogue `fr/route-guide.ts` and the gates (dash, abbreviations, structure); glossary and reasons; `AbbreviationInfo` terms if needed.
- **30-07** Surface helper `map/parcel-area.ts` and the `onSave` second argument.

**Wave 3 (UI)**
- **30-08** Guide screens and route component, wizard integration after the parcel step, skip, change suggestion, direct choice, offline behaviour, tests.
- **30-09** Déplafonné form: `useUncappedEntry`, B and F fields, mode-aware hints, surface prefill of C, D, E, autosave regression.
- **30-10** Survey detail: Contexte `RouteSection`, summary row value, edit entry for drafts, read-only for submitted.
- **30-11** PDF: `route-section.ts`, identity row replacement, legacy behaviour per O-07, page budget re-measure.

**Wave 4 (close)**
- **30-12** Docs: `ibp-form-spec.md`, `api-contract-v1.md`, `data-contract-v1.md`, `sync-conflict-resolution-v1.md`, `ibp-validation-matrix-v2.md`, CLAUDE.md (new fields, the guide, the package exports), README references. REQUIREMENTS, ROADMAP (criterion 3 reworded, "Depends on" line) and STATE edits **at the end of planning only**, as the owner asked.
- **30-13 [OWNER] wording review** of every French sentence of the catalogue (reasons, questions, explanations, glossary).
- **30-14 Decision point D-04 close-out:** if split, create Phase 30.1 with the group lot (section 2.4); if kept, the 6-8 plans of 2.4 are added here after the spec gate.
- **30-15 [OWNER + tester] recorded tester test** (7.4), report in `docs/user-tests/route-choice-assistant.md`; defects found are fixed or logged; criterion 4 closes only with a pass.

## 7. Plain-French UX (Q5)

### 7.1 What exists to reuse
- `fr.ibpMethod` (`mobile/src/i18n/fr/ibp-method.ts`): cas captions, per-factor help `factorHelp`, per-factor input hints `factorInputHints`. The explanations of B, C, D, E, F in déplafonné mode reuse these sentences and add the mode difference.
- `fr.abbreviations.terms` (BMg, BMm, TGB, GB with long forms and explanations) and `AbbreviationInfo`.
- `fr.surveyForm.wizard` wording style: one question per screen, a lead sentence, a recommended badge (`w.method.recommended`), caption under each option (`CasPicker`).
- The status and notice components (`AppNotice`) for warnings; `AppCollapsibleSection` for "Plus de précisions".

### 7.2 Terms that need explaining (draft glossary for the catalogue, owner reviews)

| Term (CNPF) | Plain French draft (one or two short sentences) |
|-------------|--------------------------------------------------|
| peuplement | "Un peuplement est un morceau de forêt homogène : mêmes arbres, même âge, même aspect." |
| parcours en plein | "Vous marchez dans tout le peuplement, par bandes régulières, et vous notez tout ce que vous voyez." |
| parcours partiel | "Vous ne décrivez qu'une partie du peuplement, bien choisie, et vous jetez un coup d'œil rapide au reste." |
| par bande / par placette | "Une bande est une large allée que vous suivez. Une placette est un cercle ou un carré marqué sur le terrain." |
| placette | "Une surface de forme simple et de taille connue (par exemple un cercle d'un hectare) où l'on relève tout." |
| échantillonnage typologique | "Plusieurs placettes choisies à l'œil pour représenter un type de peuplement : diagnostic rapide, sans les bordures." |
| échantillonnage systématique | "De petites placettes placées à intervalles réguliers, comme dans un inventaire. Les données sont regroupées ensuite." |
| relevé plafonné | "On arrête de compter un élément dès que son score est sûr. C'est le plus rapide." |
| relevé déplafonné | "On compte tout, sans s'arrêter. C'est plus long, mais nécessaire pour regrouper des placettes ou pour une étude." |
| groupe de relevés | "Plusieurs placettes d'un même type de peuplement, dont les données sont calculées ensemble." |
| surface totale du groupe (Sg) | write "surface totale du groupe", never "Sg" |
| zone de relevé | "La surface que vous décrivez réellement." |
| dendromicrohabitat (dmh) | write "dendromicrohabitat" in full; the existing factor F help explains it |
| TGB, GB, BMg, BMm | already registered terms: written out with their long form, info sheet available |
| zone non échantillonnée, relevé complémentaire | "Le reste du peuplement, que vous ne parcourez pas : vous notez seulement ce que vous y voyez sans effort (une mare, un rocher, une lisière)." |

**Abbreviation constraint recap:** allowlist = units, OK, PDF, GPS, IBP, "ex."; `ha` is a unit and is allowed. "Sg" and "dmh" must not appear in any string.

### 7.3 Question wording principles for criterion 4
One question per card, a one-sentence "pourquoi cette question ?" under each, answers as large choices with an example each ("plantation, taillis, jeune peuplement" for homogeneous), the suggestion shown as a result card with the **reason in a sentence** and a plain "Pourquoi ?" detail, "Changer" and "Choisir moi-même" always visible, and a short "Passer cette étape" that leaves the survey creatable. No term of the glossary appears before it has been explained once on the same screen.

### 7.4 Recommended approach for the recorded no-help test (criterion 4)
1. **Protocol file** `docs/user-tests/route-choice-assistant.md` in the existing case-table format (`docs/user-tests/epic-a-access-and-security.md`), written before the session: scenarios, expected suggestions from the decision table, pass rules.
2. **Testers:** people who cannot define "plafonné" or "placette" (a 3-question pre-check), ideally 3 to 5 `[ASSUMED, Nielsen-style sizing]`; at least one must be the owner's own tester (D-10). Not the owner, not anyone who read the spec.
3. **Scenarios (three, on a real device, offline once):** (a) a 2 ha homogeneous plantation, easy to walk (expected: partiel, plafonné, by R-09); (b) a 12 ha mixed irregular forest (expected: R-11b options, partiel or subdivide, explained); (c) "an inventory is already planned" or a study (expected: systématique or déplafonné with lifted factors).
4. **Unaided means:** the facilitator reads the scenario card only, answers no question about the app or the method, and notes every question the tester asks or hesitation over 10 seconds; the tester thinks aloud.
5. **Recording:** screen plus audio with written consent, stored outside the repo; only the report (anonymised) is committed.
6. **Success measures per tester:** reaches a recorded route without help; the chosen route equals the table's expectation or is a justified alternative; can restate in their own words why (one question after); distinguishes "Méthode IBP" from "Parcours" and does not confuse "plafonné" with the score cap (Pitfalls 1 and 2); completes in under about 3 minutes `[ASSUMED]`.
7. **Pass rule (owner decision O-13):** proposal: every tester completes scenario (a) unaided, and at least two of three testers complete (b) or (c); any systematic confusion becomes a wording fix and a re-test of that card.
8. The test needs the real build on a phone, so it is the last plan, after the wording review.

## Sources

### Primary (HIGH confidence)
- IBP FR v3.2 definition and survey sheets (CNPF, INRAE Dynafor, 02/02/26), pages 1-4, 6, 18-24 read; SHA-256 `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001` matches `docs/references/README.md`. Source URL recorded there: `https://www.cnpf.fr/sites/socle/files/2026-04/IBP_FR_v3_2_260202.pdf`.
- CNPF, Gonin P. and Larrieu L., "Méthodes de relevé de l'Indice de Biodiversité Potentielle (IBP)", 09/09/25, 28 pp.: `https://www.cnpf.fr/sites/socle/files/2026-04/IBP_met_fr_250909.pdf` (SHA-256 `3954746756b770f338055310973ada871ea5bdd768cb6be1ce60581a7a87d7f2`, read in full on 2026-10-13). Discovered through a web search; it is the document S p. 18 cites as "Gonin, Larrieu, 2025" and it is hosted on cnpf.fr, so it is treated as authoritative.
- Codebase, read and grepped in this worktree on 2026-10-13: `packages/ibp-domain/src` (evaluate, rules, conditions, contract, parity, index), `api/src/surveys` (dto, repository, service, normalize utils, sync service, types), `api/migrations/023_survey_note_weather.sql`, `mobile/src` (wizard, parcel selection route, storage, patcher, state provider, PDF builders, catalogue, gates), `.planning/phases/27-quick-survey-additions-inserted-v1/27-RESEARCH.md` and `27-VALIDATION.md` (pattern and pitfalls), CLAUDE.md, `docs/technical/ibp-version-comparison-v3.0-v3.2.md`, `docs/references/README.md`.
- Git: `git fetch origin`, per-branch scan for `api/migrations/02[4-9]_*` (none), `git diff --name-only main...origin/29-login-stabilization`.
- Test run: `npm --workspace @cortege/ibp-domain run test:coverage` (269 tests, 100 %).

### Secondary (MEDIUM confidence)
- Web search results confirming the existence and date of the 2025 methods document (CNPF listing pages); the Parcellaire Express WFS attributes (`contenance`) could not be confirmed and are not relied on.

### Tertiary (LOW confidence)
- None used as authority; `[ASSUMED]` items are listed in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependency, patterns copied from phase 27
- CNPF rules and decision table: HIGH for the cited thresholds and mappings (read at the source), MEDIUM for the judgement rows (flagged J/H, owner decisions)
- Group lot analysis: MEDIUM (Table 5 is explicit; the open points are listed and the size estimate is judgement)
- Architecture and integration map: HIGH (code read), MEDIUM for the new-file layout (proposal)
- Pitfalls: HIGH where inherited from phase 27 research and verified in code, MEDIUM for the UX ones (unproven until the tester test)

**Research date:** 2026-10-13
**Valid until:** 2026-11-12 (CNPF documents change rarely but v3.2 and the methods guide are recent; re-check the migration number and `origin` branches immediately before writing migration 024)
