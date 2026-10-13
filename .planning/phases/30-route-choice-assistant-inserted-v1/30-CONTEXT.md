# Phase 30: Route Choice Assistant (INSERTED, V1) - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning

<domain>
## Phase Boundary

The observer is guided to choose the survey route (the CNPF "méthode de relevé") and the counting mode for the parcel, and the route actually used is recorded with the survey and shown as text. Seminar cards: "Aide au choix du parcours" and "Parcours utilisé".

Split decided 2026-10-13 (replaces the ROADMAP line "Depends on: Phase 31"): Phase 30 does NOT draw or display the route trace on the map. That belongs to Phase 31 (annotation view), which now depends on Phase 30. Phase 30 depends only on the CNPF documents in `docs/references/`. ROADMAP criterion 3 is reworded: the route used is recorded with the survey and shown in the survey detail and the PDF; the map display moves to Phase 31. The ROADMAP edit is done at the end of planning (owner asked to touch STATE.md and ROADMAP.md only then).

Out of scope: trace drawing and map display (Phase 31), compass and GPS tracing (V2), the choice of IBP version and cas (stays as in phase 01.8).
</domain>

<decisions>
## Implementation Decisions

### What "method" means
- **D-01:** "Parcours et méthode" means the CNPF survey method (v3.2 p. 18) and the counting mode. IBP version (v3.0/v3.2) and cas 1 to 4 keep their existing choice at survey creation; the guide does not change them.

### Scope of the rules (all methods)
- **D-02:** The guide covers every method of the CNPF text: parcours en plein, parcours partiel (par bande ou placette, with complementary observation in the non-sampled zone), échantillonnage typologique (placettes of 1 ha, even 0.5 ha), échantillonnage systématique (placettes under 1/3 ha), and both counting modes (relevé plafonné, relevé déplafonné). Rules cite the CNPF page. Source facts already read: parcours en plein is the simplest, suited to small stands (< 5 ha); others otherwise; effort 15-20 min/ha per person, above 25-30 min/ha in difficult terrain; plafonné is the fastest and used in most cases, déplafonné is for placette groups and studies.
- **D-03:** Group calculation is in scope: IBP computed over the data of all placettes of a group as if one survey, with caps on counts from the group's total surface Sg (C, D: BMg max 3 x Sg, BMm max 1 x Sg; E: TGB max 5 x Sg, GB max 1 x Sg; F: max 2 x Sg per dmh group, 8 x Sg total). The calculation lives only in `@cortege/ibp-domain` (parity cases added, coverage threshold 100% kept); never re-implemented in api or mobile.
- **D-04:** The group calculation is a late lot of the phase, behind a decision point: the written spec defines the group model and calculation first; if the spec shows it is too large, it is detailed in a Phase 30.1 instead of squeezed in. The spec and the guide do not wait for it.

### Questions asked to the observer
- **D-05:** Detailed questionnaire (not three short questions): surface (prefilled from the cadastre, correctable), stand homogeneity, routine survey versus study or inventory, relief and visibility, the observer's experience, available time. Every question carries a plain French explanation; the suggestion and its reasons are shown with it. Planner: keep it light to fill (short answers, progressive disclosure) despite the length.

### Form and moment
- **D-06:** The guide is a skippable step in survey creation, after the parcel choice. A button changes the suggestion; the observer may choose the route directly. Creation stays possible offline. Keep creation short (SEED-007).
- **D-07:** The mode adapts the form: plafonné keeps the current entry; déplafonné adds the cover fields it needs (A and B as percentage of cover, no count stop such as 5 TGB/ha). This is required by the group calculation. The form and payload of Phase 27 are finished, so no parallel owner conflicts there, but check Phase 29 (running elsewhere) for shared files before editing.

### Route used: recorded data
- **D-08:** Recorded with the survey: method and counting mode; evaluated surface (the sheet's "zone de relevé IBP"); complementary observation in the non-sampled zone (yes or no, plus total evaluated surface for a partial route); the answers that led to the choice (the reason).
- **D-09:** Shown as plain text in the survey detail and in the PDF (new block near "Conditions du relevé"). No impact on the plafonné score. Read-only after submit, like `ibp_method_version`. Payload keys follow the `survey_note` / `weather` pattern (nullable migration on the API, JSON payload on mobile, no SQLite migration if possible); sync wire type owned by the package. Next migration number must be checked against Phase 29 before writing.

### Validation
- **D-10:** The written spec (`docs/specs/`, French, one test case per rule, each rule citing the CNPF page) is read and validated by the owner in writing, with the date recorded, before any plan builds a screen (criterion 1). Criterion 4 (a tester who does not know the method completes the choice unaided, recorded) is a final plan with the owner's tester.

### Claude's Discretion
- Wording of the plain French explanations (to be reviewed by the owner), question order, visual treatment of the questionnaire (existing design system).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Method rules
- `docs/references/README.md` — the CNPF v3.2 PDF is not in the repo; download from the link there (SHA-256 given). Pages 18-19 ("Quelques consignes pour effectuer des relevés IBP") are the source of every route rule; p. 20 shows the survey sheet fields (Méthode, Si parcours partiel, Facteurs déplafonnés, Nom groupe de relevés, zone de relevé IBP).
- `docs/technical/ibp-version-comparison-v3.0-v3.2.md` row GS-3 — transect band 10-15 m (v3.0) versus 10-20 m (v3.2).
- `docs/specs/ibp-form-spec.md` — §2 scope mentions "standard full/partial transect workflows"; the app currently has no method or counting-mode field.
- `docs/technical/adr-003-ibp-method-version-v1.md` — version and cas decisions that stay unchanged.
- `docs/technical/ibp-validation-matrix-v2.md` and `packages/ibp-domain/src/parity/cases.ts` — executable rules; group cases are added here.
- `docs/specs/epic-c-ibp-survey-data-entry.md`, `docs/specs/user-stories.md` — acceptance patterns for entry flows.

### Planning
- `.planning/ROADMAP.md` Phase 30 and Phase 31 sections; `.planning/PROJECT.md` (V1 scope: route choice assistant, remarkable elements and route display; V2: compass and GPS tracing).
- `.planning/phases/28-map-layers-comparison-inserted-v1/28-CONTEXT.md` — style of a decided phase; Phase 31 owns the trace view.
- `.planning/seeds/SEED-007-creer-un-releve-sans-reseau.md` — keep creation short and possible offline.
- `CLAUDE.md` — IBP rules live only in `@cortege/ibp-domain`; all text in the French catalogue; no em dash; Phase 27 payload pattern (`survey_note`, `weather`, `factors.annotations`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mobile/src/i18n/fr/ibp-method.ts`: cas captions and factor help in French, the place for method explanations.
- `packages/ibp-domain/src/conditions.ts`: pattern for notes, weather and annotations (limits and helpers owned by the package).
- Survey-creation wizard and parcel selection (`mobile/src/screens/survey-form/`, `parcel-selection/`); cadastre surface from the parcel data.
- PDF "Conditions du relevé" block (`mobile/src/app/survey-pdf/`) and survey detail context page (`SurveyContextScreen`).

### Established Patterns
- Nullable API columns plus payload JSON on mobile (migration 023); parity fixture run in package, api and mobile.
- 400-line cap on screens and navigation; catalogue gates (dash, abbreviations).

### Integration Points
- Creation flow after parcel choice; factor entry screens (déplafonné fields); `ibp-scoring.ts` adapter; sync wire types in `@cortege/ibp-domain`.
</code_context>

<specifics>
## Specific Ideas

- The owner stressed that the method is hard to understand: every suggestion carries its reason in plain French.
- Cards from the seminar: "Aide au choix du parcours" (the guide) and "Parcours utilisé" (the recorded route).
</specifics>

<deferred>
## Deferred Ideas

- Drawing and displaying the route trace on the parcel map: Phase 31.
- Compass and GPS route tracing with out-of-zone alert: V2.
- Group calculation, if the spec shows it too large: Phase 30.1.
</deferred>

---

*Phase: 30-route-choice-assistant-inserted-v1*
*Context gathered: 2026-10-13*
