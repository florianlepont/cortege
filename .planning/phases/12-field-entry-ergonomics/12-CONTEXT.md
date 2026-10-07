---
phase: 12-field-entry-ergonomics
status: executing
created: 2026-09-27
---

# Phase 3 — Field-Entry Ergonomics: Context

Source: `docs/design/ux-ui-audit-2026-09.md` §3.1 (FLOW-01..FLOW-12), §5 (tokens), §7 Lot 1.
ROADMAP success criteria: `.planning/ROADMAP.md` "### Phase 3: Field-Entry Ergonomics".

This session executes the phase directly (single agent, no orchestrator/executor split), so
plans are written and closed batch by batch rather than as a 30-plan wave set like 01.9. Each
batch below is a coherent, independently testable slice; `npm run lint && npm run typecheck &&
npm run test:unit && npm run format:check` runs after every batch.

## Scope decisions (resolving ambiguity the audit/ROADMAP text leaves open)

- **Factor A is out of scope.** ROADMAP's own one-line phase summary says "Counters, segments and
  chips replace the numeric keyboard for factors B-J" (A excluded). Phase 5 rebuilds A's input as a
  genus list on top of the components this phase ships. A's two fields stay plain `AppField`
  numeric inputs (still gain comma support and touched-based error timing).
- **Factor F stays a plain numeric field.** `trees_per_ha` is a continuous rate with no natural
  counter/segmented/chip/slider fit, and no success criterion assigns it a variant. It gains comma
  support and touched-based error timing like every other remaining numeric field.
- **Factor B is chips, not slider.** The audit's FLOW-01 row and old success-criteria text list "B"
  under both chips and slider (5% steps), but factor B has had no percent field since phase 01.8
  moved native-cover capture to factor A (`packages/ibp-domain/src/rules/common.ts:99`, "B has no
  native-cover input: the cover belongs to Factor A"). `DEFAULT_SURVEY_FORM.factorB` only has
  `strata_count`. So B gets the chips variant (5 strata tiers, derived count); the slider variant
  applies to G only, the one remaining percent field.
- **Chip labels for I (aquatic) and J (rocky) habitat types are illustrative, not the verbatim CNPF
  taxonomy.** The domain package only stores `type_count` (`packages/ibp-domain/src/rules/common.ts`
  `scoreFactorIJ`); it never records which specific type was observed, and the CNPF methodology PDF
  that would list the official type names is explicitly not redistributed in this repo
  (`docs/references/`). The chip options are named, defensible field categories (spring/stream/pond
  for I; outcrop/scree/cliff for J) whose only contract-relevant property is that there are enough of
  them to derive counts of 0, 1 and 2+ (the three score bands). Labels are plain i18n strings, easy to
  correct later against the primary PDF without touching component code.
- **The factors-step CTA is not renamed to "Vérifier et soumettre".** That action still only writes
  the local draft (`useEditingDraft.handleCreateDraft`/`handleSaveSurveyEdits`) — actual submission
  is a separate action on the survey detail screen, out of this phase's scope. Renaming to imply a
  submit step here would misrepresent what the button does. Success criterion 5 only requires that
  the label stop implying a manual save is required; the CTA becomes "Terminer la saisie" and a
  visible "Enregistré · HH:MM" indicator carries the autosave signal instead.
- **FLOW-08 (surface_ha entered three times), FLOW-11 (dead `ParcelMapModal`) and FLOW-12 (help
  sheet copy) are not in this phase's success criteria** and are left for a later phase, except where
  touching the same file is unavoidable.

## Batches

1. Design tokens (spacing 4-grid, semantic field states, interaction, map tokens) + decimal-comma
   parsing fix (BUG-04, both `numberError` and `toFiniteNumberInRange` paths).
2. `FactorInput` primitives: counter, segmented, chips, slider, plus the shared tri-state shell.
3. Touched-state tracking in `useSurveyForm`/`FactorField`; wire the four variants into
   `FactorDetailScreen` for factors B/C/D/E/G/H/I/J; fix `FactorsList`'s progress computation so an
   untouched factor is neutral, not a warning.
4. Horizontal pager A→J with fixed footer control and "next incomplete factor" shortcut, replacing
   the per-factor stack screen round trip to the grid.
5. Fixed bottom CTA bar, per-factor progress ring that morphs to a check mark, a segmented total
   gauge visible from the first wizard step, and the visible autosave indicator + CTA rename.
6. Parcel map colors onto `map.*` tokens; "Parcels near you" native sheet reusing
   `useNearbyParcelsState`.
7. Charter spec documentation, ROADMAP update, final gate, PR.
