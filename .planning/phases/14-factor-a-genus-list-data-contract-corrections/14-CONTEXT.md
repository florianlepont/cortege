# Phase 5: Factor A Genus List & Data-Contract Corrections - Context

**Gathered:** 2026-09-27
**Status:** Ready for research and planning
**Source:** ROADMAP phase 5 (success criteria 1-6), REQUIREMENTS `REQ-ML-contracts` and
`REQ-DOC-form-spec`, ADR-002 (D-01, D-06, D-13, D-14, D-15) and ADR-003 (CH-12). Run autonomously,
following the phase 01.1/01.8 pattern; decisions below were taken without asking and are recorded
for the owner's review.

<domain>
## Phase Boundary

This phase is **contracts, migration and package work only**. It does not build the mobile
genus-entry UI (manual picker or on-device photo recognition) — that is Phase 6, which depends on
this phase and is not running yet. Six success criteria:

1. `data-contract-v1.md` redefines Factor A as a genus list with the count derived from it,
   replacing the single `native_genus_count`, with no species entity and no stored recognition
   photo or suggestion-acceptance outcome (ADR-002 D-01, D-13, D-14, D-15).
2. `api-contract-v1.md` documents the genus-list shape under `/v1`, validated against the CNPF
   list, with standard error codes; no recognition endpoint (ADR-002 D-06).
3. A migration introduces the genus list and states what happens to surveys already recorded as a
   bare count (unchanged score, no decomposition); applies cleanly on an empty database and a copy
   of existing data.
4. Factor A scoring derives from the genus list in `packages/ibp-domain`, delegated to by
   `IbpRulesService` and `mobile/src/app/ibp-scoring.ts`; the CNPF list is one of the package's
   allowed sets and the genus-list shape is one of its sync contract types; the parity fixture and
   the 17 `ibp-validation-matrix-v1.md` reference cases still pass.
5. The genus list round-trips through `POST /v1/sync`: replaying the same payload twice does not
   duplicate anything.
6. `docs/specs/ibp-form-spec.md` §4 (multi-parcel `parcel_ids[]`) and §10.1 (shipped status enum,
   `submitted_at`/`deleted_at`, no `deleted`/`published_at`) are corrected.

Depends on Phase 1 (ADR-002, the 34-class genus list), Phase 1.1 (ADR-003, v3.2 adoption) and
Phase 1.8 (`packages/ibp-domain`, the thin-adapter architecture) — all complete.

Out of scope: the mobile genus picker and on-device recognition UI (Phase 6); recomputing or
decomposing any survey already recorded as a bare count.
</domain>

<decisions>
## Implementation Decisions

### Genus list source and codes (Claude, autonomous)
The 34-class code list matches ADR-002's own label set (`species-recognition-spike-measurements-v1.md`
§2), so the contract Phase 5 writes and the model Phase 6 will wire up share one vocabulary from
day one: `Quercus_deciduae` / `Quercus_sempervirens` (never a bare `Quercus`), 28 other main-list
genera (29 taxa total), and 5 supplementary genera (Ceratonia, Cercis, Olea, Phillyrea, Pistacia)
counted only in cas 2 and cas 4 (v3.2 p. 3). Codes and allowed-set logic live in
`packages/ibp-domain/src/genus.ts`.

### CH-12's three open items, resolved (Claude, autonomous — owner reviews)
- **Ficus.** Not a valid genus code at all. It is in Table 1 (p. 10-11) but not in the p. 3 genus
  list, and p. 6 restricts counting to listed genera (A-6, ADR-003 open question 2). The
  conservative reading applies, same as the RESEARCH already flagged.
- **Coastal-only Juniperus.** No coastal gate. Table 1 restricts two of Juniperus's three
  countable species to coastal stands while the third (*J. thurifera*) carries no such
  restriction. Because recognition and counting are genus-level only (D-01), the software never
  records which species was observed, so it cannot gate the genus on coastal-ness without
  sometimes excluding a genuinely countable inland *J. thurifera* stand. Juniperus is in the main
  list unconditionally, like every other genus; the species-level restriction (and the Table 2
  exclusion of the shrub *J. communis* / *J. oxycedrus*) is field guidance, not a data-model gate
  — Phase 6's help text can carry it, not the contract.
- **Pistacia ("the CNPF answer").** Counted as a supplementary genus, per p. 3's explicit listing.
  p. 3 is the methodology's own scale definition and names the genus directly as countable; Table
  2 (shrubs, never counted) is scoped to species that are shrubs of an otherwise-tree genus, the
  same treatment every other genus's look-alikes get. This is the "CNPF answer" the ROADMAP phase
  goal refers to: p. 3 governs.

### Backward compatibility (Claude, autonomous)
- The legacy bare `factors.A.native_genus_count` shape is kept, permanently, for surveys recorded
  before this phase: `readFactorAGenusCount` (`rules/common.ts`) falls back to it whenever
  `factors.A.genera` is absent. Their stored score is never recomputed or decomposed.
- A structurally valid genus outside its cas (a supplementary genus recorded on a cas-1 survey, or
  any supplementary genus on a v3.0 survey, which has no cas) is **silently excluded** from the
  derived count, exactly like a genus that was never observed. It is not an error — only an
  unlisted code is (`factor_a_genus_invalid`, blocking).
- v3.0 surveys may also use the genus-list shape (not only v3.2): the CNPF list applies to Factor A
  regardless of method version, since the count derivation itself is version-independent. v3.0
  simply never has a cas, so it never counts the supplementary genera.

### Migration shape (Claude, autonomous)
Migration 018 adds **no column**: the genus list lives inside the existing `factors` JSONB, exactly
like the bare count did before it (JSONB is schemaless; genus-code whitelist validation stays in
the application layer, same split as `native_genus_count`, which the database never validated
either). The one thing it adds is a structural CHECK constraint,
`chk_surveys_factor_a_genera_is_array`, rejecting a non-array `factors.A.genera` — cheap, additive,
`NOT VALID` + `VALIDATE` like migration 016. Verified directly (not only via the E2E suite) against
a seeded "existing data" database containing a legacy bare-count row, a direct-numeric-A row and a
no-factors row: all three pass unchanged, and a malformed `genera` is rejected with `23514`.

### Error surface (Claude, autonomous)
`factor_a_genus_invalid` is a new blocking issue code in `packages/ibp-domain`, following the exact
shape of every other blocking factor issue (`factor_invalid_raw`, `factor_invalid_score`, …). It
reaches `POST /surveys` (direct) as a message inside the `422` body's `errors` array, and
`POST /v1/sync` as a `fatal_error` with a generic `http_422` code — this is the existing, unchanged
architecture for every blocking IBP issue (no code ever reaches the client through `/v1/sync`
today; the E2E spec tests both surfaces rather than inventing a new one).
</decisions>

<canonical_refs>
## Canonical References
- `.planning/ROADMAP.md` phase 5 (success criteria, CH-12 input line)
- `docs/technical/adr-003-ibp-method-version-v1.md` CH-12 and "CNPF source inconsistencies"
- `docs/technical/adr-002-on-device-species-recognition-v1.md` D-01, D-06, D-13, D-14, D-15
- `docs/technical/ibp-version-comparison-v3.0-v3.2.md` "Factor A genus list" section (the full
  CNPF p. 3 / Table 1 / Table 2 transcription)
- `docs/technical/species-recognition-spike-measurements-v1.md` §2 (the 34-class label set)
- `.planning/phases/09-shared-ibp-domain-package-and-test-completeness/` (the package's
  architecture and thin-adapter pattern this phase extends)
</canonical_refs>

<deferred>
## Deferred
- The mobile genus-entry UI: manual picker and on-device photo recognition (Phase 6)
- Field-guidance help text for the Juniperus/Table 2 look-alike exclusions (Phase 6)
</deferred>
