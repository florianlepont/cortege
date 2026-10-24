# Phase 32: Detailed DMH Information (INSERTED, V1) - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning, with one blocker (D-01: the WSL source and its licence)

<domain>
## Phase Boundary

While recording factor F, the observer reaches detailed identification information on dendromicrohabitats (DMH), offline, in a dedicated tool. The content crosses the IBP typology (15 groups, `dmh_01` to `dmh_15`) with the WSL one, with sources and reuse licence recorded. Recording a survey with many potential DMH must be quicker than before, measured on a real survey.

**Not in scope (owner clarification, seminar 2026-10-10):** any change to recorded data. `F.dmh_groups`, `F.dmh_counts`, the IBP rules, the package and the SQLite schema (version 5) do not change. No API change. Avoid `mobile/src/app/survey-pdf/` (phase 33) and the map screens.

</domain>

<decisions>
## Implementation Decisions

### Source and licence
- **D-01 (blocker):** The WSL PDF is not in the repository and the assistant has not read it. The owner provides it outside the repository (like the CNPF PDFs; record its SHA-256 and retrieval date in `docs/references/README.md`). Planning reads the licence from the document and reports what is reusable. Nothing from it is embedded until the licence is read; in case of doubt, ask the owner.
- **D-01 resolved (owner, 2026-10-24):** the reference is the 2024 second edition of the pocket guide, French and English, as read by the research (SHA-256 recorded in `32-RESEARCH.md`). The owner does not supply a file; no request to the Swiss institute is needed because the drawings are the association's own (D-09) and the texts are our own wording.
- **D-02:** Fallback if the licence does not allow copying: short texts written by us, citing WSL and CNPF as sources (no copied wording). The plan must work under both outcomes.
- **D-03:** Sources, authors, licence and retrieval date are recorded in `docs/references/README.md` and shown in the app on the tool's pages.

### Form of the tool
- **D-04:** Both: an info affordance on each DMH group of the F list opens that group's sheet, and a searchable catalogue of the 15 groups is reachable from the same F screen. Offline, embedded in the app (not downloaded).
- **D-05:** Navigation entries live in the survey stack (typed in `navigation/types.ts`), never in the map screens. Screen files respect the 400-line cap (`structure.test.ts`).

### Content
- **D-06:** Short text plus illustrations (owner, corrected 2026-10-23). Per group: definition, how to identify it, frequent confusions, the WSL types attached to the group, and an image per group or type. Crossing IBP and WSL means each of the 15 IBP groups lists its WSL types. Images are embedded offline; their licence is checked like the text (D-01), and app size is budgeted in the plan. If the images are not reusable, fall back to text only (D-02) and flag it to the owner.
- **D-07:** All strings go through the typed `fr` catalogue (new module under `mobile/src/i18n/fr/`), no em dash (U+2014), abbreviations written out or explained (`AbbreviationInfo`). The group labels stay those of `factorInput.dmhGroupOptions`.

### Faster recording
- **D-08:** Owner-chosen levers (2026-10-23): (a) +/- counters directly on the group row, (b) search and grouping of the 15 groups by form, (c) frequent or already ticked groups first. A timed baseline on a real survey comes first, so the plan can drop a lever that does not help. Hard constraints: the stored payload is unchanged, the capped score is unchanged (parity cases untouched), and the speed gain is measured on a real survey (timed before and after, protocol written in the plan).

### Licence outcome and counters (owner, 2026-10-23, after research)
- **D-09:** Research found the WSL pocket guide (2024) carries only "© WSL 2024", no reuse licence, photos by 7 creators. So texts are our own wording with sources cited (D-02 applies), and no WSL image is embedded without written permission. Owner choice: illustrations are original drawings owned by the association (not WSL photos). The plan treats the drawings as a deliverable with its own lead time: the guide ships text-first and the drawings slot in per group when delivered. Who produces them (commission or in-house) is an open item for the owner.
- **D-10:** The +/- counter on the group row exists only when the recorded route counts F in full (the only case where `dmh_counts` is stored); in capped mode the tick stays. Going down to 0 leaves the group ticked. No stored data changes.

### Claude's Discretion
- Details of the three speed levers (D-08) and which to keep after the timed baseline; the owner validates on the phone.
- Exact sheet layout, within the visual layer rules of CLAUDE.md.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and data
- `.planning/ROADMAP.md` (Phase 32) - goal and 3 success criteria
- `docs/specs/ibp-form-spec.md` §5 factor F (lines ~358-380) - dmh groups, `dmh_counts`, `surface_ha`
- `docs/specs/epic-c-ibp-survey-data-entry.md` - factor entry UX
- `.planning/phases/25.1-pdf-export-improvement/25.1-CONTEXT.md` - DMH stored in `F.dmh_groups` (D-12)
- `docs/references/README.md` - where reference sources and licences are recorded

### Code
- `mobile/src/app/factor-selections.ts`, `mobile/src/i18n/fr/factor-input.ts` (`dmhGroupOptions`), `mobile/src/i18n/fr/factor-detail.ts`
- `mobile/src/screens/FactorDetailScreen.tsx`, `mobile/src/screens/factor-detail/DmhCountFields.tsx`
- `mobile/src/ui/AbbreviationInfo.tsx`
- CLAUDE.md sections "Text and i18n", "Visual layer", "Navigation"

### External (not in repo)
- WSL document on tree microhabitats (PDF supplied by the owner, D-01); CNPF IBP FR v3.2 (see `docs/references/README.md`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DmhCountFields` and the F chip list: where the info affordance attaches
- `AbbreviationInfo`: pattern for inline explanations
- Form sheet routes of the survey stack (`surveyFinish`, `surveyRouteChoose`): precedent for sheets on iOS and modals on Android

### Established Patterns
- Typed `fr` catalogue, one module per area; source gates in `mobile/src/__checks__/`
- Pure data modules with tests; no network

### Integration Points
- Survey stack and `navigation/types.ts`; F screen (`FactorDetailScreen`)

</code_context>

<specifics>
## Specific Ideas

- The owner supplies the WSL PDF; the licence check happens at the start of planning.

</specifics>

<deferred>
## Deferred Ideas

- Photos attached by the observer to each DMH and photo recognition: V1.x, phase 34.

</deferred>

---

*Phase: 32-Detailed DMH Information*
*Context gathered: 2026-10-23*
