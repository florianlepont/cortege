# Phase 29: Field-feedback fixes (INSERTED) - Context

**Gathered:** 2026-10-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix what the first Android testers and the owner's iPhone walkthrough reported: genus recognition works on Android (model load fixed by PR #272; on-device measurement still to do), the parcel-selection message no longer crowds the map on small screens, abbreviations are explained, genera are sorted alphabetically, and the offline Explorer behaves (F-1 and F-2 of `docs/user-tests/device-checks.md`). Criteria 1 to 7 of the ROADMAP entry stand, with the narrowing in D-01.

</domain>

<decisions>
## Implementation Decisions

### Offline Explorer data (F-2)
- **D-01:** Offline, Explorer draws **every own survey the phone holds, draft or submitted**, from local data (extend `ownDraftMapItems` in `mobile/src/map/own-drafts.ts`, which keeps drafts only today). Other members' markers and clusters are **not** persisted: they stay online only. This narrows ROADMAP criterion 6 ("markers and clusters of the last Explorer view"): no cache of API markers, no `local_meta` key, SQLite schema stays at version 5.
- **D-02:** No stale-data marking needed: the existing red "Hors connexion" badge is enough.

### Offline community survey (F-1)
- **D-03:** Opening another member's survey offline shows a **centred message** ("ce relevé nécessite une connexion") with a **Retry** button directly below, all inside the safe area. No back button beyond the header's. Reuse an existing empty/error state component if one fits. Text goes through the `fr` catalogue (`community-survey.ts`), no em dash.

### Abbreviations
- **D-04:** Write the term out where it fits; where it does not, a tappable info icon opens a small sheet. One shared catalogue entry per abbreviation.
- **D-05:** The inventory is automated: scan the `fr` catalogue for abbreviations, list them in the plan, and add a unit test (in `mobile/src/__checks__/`) that fails on an abbreviation neither written out nor registered as explained.

### Genus ordering
- **D-06:** Browsable and selectable genus lists sort by **Latin genus name**, locale-aware and accent-insensitive.
- **D-07:** Photo-recognition suggestions **keep confidence order** (best guess first). Alphabetical does not apply to them.

### Small screens
- **D-08:** Below a height threshold the parcel-selection information message is compact (shorter text, smaller type, capped height) so the map keeps a usable share of the screen (target about half) on the smallest supported screen. Exact threshold chosen by the planner from device measurements.

### Planning-time decisions (owner, 2026-10-10, after research)
- **D-09:** Offline own-survey markers take their position from the **centre of the survey's cached parcel geometry** (downloaded offline areas). Local only: no `display_location` in the sync/pull payload, no API change. A survey outside every downloaded area is not drawn offline. Refines D-01.
- **D-10:** The genus picker chips show the **Latin genus name**, so the Latin ordering of D-06 is visible. Recognition suggestions are unchanged (D-07).
- **D-11:** Abbreviation allowlist for the D-05 gate: units, "OK", "PDF", "GPS", "ex.". "IBP" is defined once (onboarding, sign-in, PDF) plus an info sheet (D-04) on the main headers, not on every use.

### Carried unchanged from the ROADMAP
- Recognition workflow rethink was set aside (owner, 2026-10-10); only temp-file cleanup (criterion 7) and D-01 to D-03 device measurements (median and p95 vs 3 s, online and airplane mode) remain.

### Claude's Discretion
Info-sheet visual design (within the charter), the height threshold of D-08, where the abbreviation registry lives.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` Phase 29 — goal and 7 success criteria
- `docs/user-tests/device-checks.md` — findings F-1, F-2, checks D-01 to D-05
- `docs/design/charte-graphique-etats-sauvages-spec.md` §13 — visual layer rules
- `docs/technical/sync-conflict-resolution-v1.md` — offline behaviour
- `mobile/src/map/own-drafts.ts` — current draft-only local markers
- `mobile/src/navigation/routes/PublicMapRoute.tsx` — consumer of `ownDraftMapItems`
- `mobile/src/i18n/fr/` (`genus.ts`, `genus-recognition.ts`, `community-survey.ts`, `parcel-selection.ts`) — texts concerned
- `mobile/src/__checks__/` — source gates (no em dash, structure 400-line cap)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ownDraftMapItems`: already builds `PublicMapItem` from local survey details; generalise its status filter.
- `__checks__` tests: pattern for the new abbreviation gate.

### Established Patterns
- All text from the typed `fr` catalogue; colours via `useBrandTheme()`; Ionicons outline only; 400-line cap on screens and navigation.

### Integration Points
- Explorer map items merge (`PublicMapRoute`), community survey screen error state, parcel selection screen, genus pickers and recognition result.

</code_context>

<specifics>
## Specific Ideas

Findings come from the owner's iPhone screen recording of 2026-10-10 and the Android testers.

</specifics>

<deferred>
## Deferred Ideas

- Persisting other members' markers/clusters for offline (dropped by D-01; revisit only if testers ask).
- Central glossary page (not chosen).

</deferred>
