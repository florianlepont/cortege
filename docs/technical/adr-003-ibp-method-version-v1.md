# ADR-003 — IBP method version (Fr v3.0 → FR v3.2)

## Status

Accepted (decided autonomously by Claude in phase 01.1 per D-06; the owner reviews it at the end
of the phase and may overrule it)

## Date

2026-09-26

## Context

The repository cites IBP Fr v3.0 (CNPF, PDFs dated 2023-03-23) in `docs/references/README.md` and
`docs/specs/ibp-form-spec.md`. Both v3.0 links now return HTTP 404 (checked 2026-09-26), and the
CNPF IBP page no longer links any v3.0 document: CNPF no longer publishes v3.0.

CNPF currently publishes IBP FR v3.2, dated 02/02/2026:
`https://www.cnpf.fr/sites/socle/files/2026-04/IBP_FR_v3_2_260202.pdf` (28 pages, 1,264,005 bytes,
SHA-256 `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`, retrieved 2026-09-26).
Its p. 28 names FR v3.0 as the previous version. The PDF is not committed (third-party work, see
`docs/references/README.md`).

Phase 1 already built its 34-class Factor A genus list from v3.2 (ADR-002,
`adr-002-on-device-species-recognition-v1.md`, and the spike measurements document §2), while the
scoring code implements v3.0. The repository therefore carried two method versions.

The factor-by-factor comparison
([`ibp-version-comparison-v3.0-v3.2.md`](ibp-version-comparison-v3.0-v3.2.md)) compares what the
app runs (the v3.0 baseline, per D-02) against v3.2 and finds:

- **4 engine-level score changes**, where the same stored inputs give a different score:
  - the native-cover < 50 % cap moves from **B** to **A** (A-1/B-1);
  - C and D, score 1, test (BMm + BMg)/ha ≥ 1 instead of BMm/ha alone (CD-1);
  - E, score 1, tests (GB + TGB)/ha ≥ 1 instead of GB/ha alone (E-1);
  - the A and G scales are selected by the v3.2 "cas" (1, 2, 3 or 4) instead of region + stage;
    only the middle and upper subalpine is cas 3 (CLS-2/CLS-4/G-2).
- **20 field-definition changes, plus 2 that matter for linear stands only** (F-5, G-3), where
  what the observer counts changes (strata heights, diameter thresholds per cas, dendromicrohabitat
  groups, open flowering habitats, grazing and orchard rules for H, a new aquatic type, twelve
  rocky types, the cas classification itself). See the comparison's `## Summary counts`.
- **Factor A genus-list changes**: Cupressus and Tamarix added, Juniperus widened beyond
  *J. thurifera*, the five supplementary genera extended to cas 2, and a species-level Table 1
  (archaeophytes, all poplar cultivars) with shrub congeners excluded (Table 2).
- **A v3.0-era bug**: the app caps **B** at 2 when native cover is below 50 %. Both v3.2 (p. 3,
  p. 20) and the 2021 CNPF v3 survey sheet put the cap on **A**, so the app is wrong under both
  versions (BUG-1).

Global aggregation (A–G max 35, H–J max 15, total 50), every count threshold, the G percentage
bands and the interpretation chart are unchanged.

## Decision

**Decision:** Migrate the app to IBP FR v3.2 in this milestone (phase 01.8).
The rules change once, in `packages/ibp-domain`, in phase 01.8 (which already extracts the IBP
rules into one shared package), against the change list CH-1..CH-11 below. Until 01.8 ships, the
app computes Fr v3.0 scores and the documentation says so: the citation files
(`docs/references/README.md`, `docs/specs/ibp-form-spec.md`) state "implemented: v3.0, target:
v3.2 (ADR-003)". Writing "the app implements v3.2" before 01.8 ships would be false.

**Owner decisions (2026-09-26, after review of this ADR):**
- The owner confirms the migration to IBP FR v3.2.
- The app manages method versions: every survey is tagged with the method version it was
  recorded under, and the observer can choose the version when creating a new survey. v3.2 is
  the default; v3.0 stays available as an earlier version (for example, to re-survey a parcel
  under the same method as its previous survey). The version cannot change once the survey is
  submitted. This extends CH-6.
- The total score is displayed out of 50, as in the methodology (CH-11, BUG-3).

### Why migrate

D-06's rule applies: v3.2 changes scoring rules and the Factor A genus list, so the default is to
migrate, for three reasons:

1. v3.2 is the method CNPF publishes today, and new observers are trained on it.
2. The app's value to ecologists depends on computing the current official index.
3. Phase 2 builds the Factor A genus list from the v3.2 PDF (ADR-002); staying on v3.0 would put
   two method versions in the app.

The "stay on v3.0" exception (D-06) applies only if migrating would break comparability with
already-recorded surveys in a way that cannot be handled. It does not apply here:

- Comparability is handled by tagging every survey with the method version it used and never
  mixing versions in one score or average (next section).
- The milestone is internal-only, so the recorded surveys are field-test data (the owner's query
  below gives the exact numbers).
- Drafts expire 7 days after creation, which bounds the transition for unsubmitted work.

## Surveys already recorded (D-07)

**Would their stored scores change if recomputed under v3.2?**

- For the engine-level rules, yes, deterministically, in these cases:
  - B = 5 with native cover < 50 %: B becomes 5 (no cap), and A drops to 2 when A was 5;
  - C, D or E where the lower class alone is < 1/ha but lower + upper is ≥ 1/ha: 0 becomes 1;
  - `subalpin` surveys: the A and G scale depends on the subalpine level, which was never
    recorded, so the result is unknown.
- For the field-definition changes, they cannot be recomputed at all. The raw counts (strata,
  genera, diameters, dendromicrohabitat trees, aquatic and rocky types) were made under v3.0
  definitions and cannot be re-derived from what is stored. **A v3.2 recomputation of a v3.0
  survey would be neither a v3.0 nor a v3.2 score.**

**Treatment:**

- **Submitted surveys keep the score they were submitted with.** They are never recomputed. They
  are tagged with the method version they used, `cnpf_ibp_fr_v3_0_2023-03-23`.
- **Drafts are re-scored under v3.2**, with a mechanical migration where one exists (CH-7):
  - B's `covered_autochthonous_percent` becomes A's native cover (the same quantity: the share of
    native species in the stand's cover);
  - the cas is derived from `region_version` / `vegetation_stage` using the mapping table below;
  - where the stage is ambiguous (`subalpin`) or flagged for review (`supra_mediterraneen`), the
    cas is left blank and blocks submit until the observer picks it.
  - Drafts expire 7 days after creation (`expires_at` is set server-side and never moved), so at
    most one week of drafts is affected.
- **New surveys** are tagged `cnpf_ibp_fr_v3_2_2026-02-02`.
- **Score readers** (the public map, the nearby-parcel average, the parcel history) must either
  show the method version or never mix versions in one figure. 01.8 decides which.
- **The method-version field is only a recorded need here.** No column, DTO field or mobile field
  exists today (the form spec's `ibp_method_version` was never implemented, BUG-4; `version_number`
  is the parcel follow-up version, not a method version). The schema change belongs to phase 01.8
  or phase 2, decided by 01.8's planner (CONTEXT deferred list).

## Method-version dispatch (required)

`SurveysService.prepareUpsert` (`api/src/surveys/surveys.service.ts`, l. 209–251) calls
`IbpRulesService.validateDraft` on every upsert, including identical replays of submitted surveys,
and throws 422 when validation fails. It runs **before** the submitted-survey read-only check
(l. 387–399), which accepts identical replays and writes only `visibility` and `sync_version`.
Installed apps replay pulled surveys during sync. A v3.2-only engine that requires a cas or an A
native-cover input would therefore return 422 on those replays and block device sync.

01.8 must therefore keep the v3.0 rules and dispatch the rules by method version (CH-6):

- **A missing method version means v3.0.**
- A payload tagged `cnpf_ibp_fr_v3_0_2023-03-23` (or untagged) is validated and scored with the
  v3.0 rules; a payload tagged `cnpf_ibp_fr_v3_2_2026-02-02` with the v3.2 rules.
- The API accepts old-app (v3.0-shaped, untagged) payloads until every device has updated. The
  API Docker image and the installed mobile apps both embed the v3.0 rules today.
- The proof is a replay test: a submitted v3.0 survey replayed identically returns `synced`, not
  422 (MAT-VER-01).

## Change list for phase 01.8

Each change comes with the test that proves it. Row IDs (A-1, CD-1, …) refer to the comparison
document. CH-11 was decided by the owner (score out of 50); CH-12 is phase 2, not 01.8.

| # | Change | Test that proves it |
|---|---|---|
| CH-1 | Move the native-cover cap from B to A (A-1/B-1, BUG-1). A = min(score from count, 2) when native cover < 50 %; exactly 50 % is not capped. B has no cap. Accept a percent or a "< 50 / ≥ 50" boolean (v3.2's capped survey records only the class, p. 20). The input moves from `factors.B` to `factors.A` | A cas 1, count 5, cover 40 → 2; cover 50 → 5; count 1, cover 10 → 0; B strata 5 (no cover) → 5 (MAT-B-01 v2) |
| CH-2 | C/D score 1 = BMg/ha < 1 and (BMg + BMm)/ha ≥ 1; score 0 = BMg/ha < 1 and (BMg + BMm)/ha < 1 (CD-1) | bmg 1, bmm 1, 2 ha → 1; bmg 0, bmm 0.9/ha → 0; MAT-C-01 and MAT-D-01 unchanged |
| CH-3 | E score 1 = TGB/ha < 1 and (TGB + GB)/ha ≥ 1 (E-1) | tgb 1, gb 1, 2 ha → 1; MAT-E-01 unchanged |
| CH-4 | Replace ACA/M + stage with a v3.2 cas input (CLS-1..CLS-4). The engine needs one derived fact: does the A/G scale use cas 3? True for cas 3; true for cas 2 in a cas-3 zone or on a lapiaz, dune, peat-bog or *J. thurifera* habitat (p. 4, p. 7); false otherwise. Recommended stored shape: macroclimatic cas (1, 3 or 4), a very-infertile flag (→ cas 2) and a special-habitat flag, from which the effective cas and the A/G scale derive | A count 2: cas 1 → 1, cas 3 → 2, cas 4 → 1, cas 2 in a cas-3 zone → 2; G 0.5 %: cas 3 → 2, cas 1 → 2; G 6 %: cas 3 → 5, cas 1 → 2 |
| CH-5 | Allowed scores: G and H ∈ {0, 2, 5} (BUG-2). Before shipping, the owner counts production rows with G or H = 1 (query below) | `{G: 1}` → blocking `factor_invalid_score`; `{H: {class_score: 1}}` → blocking |
| CH-6 | Method version `ibp_method_version` on every survey (DB, DTO, mobile payload, sync contract). A missing method version means v3.0. The engine dispatches by version; the v3.0 rules are kept to validate legacy replays. Owner decision: the observer picks the version when creating a survey (default v3.2, v3.0 available); it is fixed once the survey is submitted, and the form, help texts and scoring follow the chosen version | a submitted v3.0 survey replayed identically → `synced`, not 422; a v3.0 payload scores with v3.0 rules; a v3.2 payload with v3.2 rules (MAT-VER-01) |
| CH-7 | Draft migration (mobile SQLite `payload_json`, `sync_queue` payloads, server drafts): move B's cover to A; derive the cas from region/stage (mapping table below); leave ambiguous stages blank so submit readiness reports them missing | migration unit test on sample payloads; `evaluateSubmitReadinessFromDraft` reports the missing cas for `subalpin` |
| CH-8 | Guidance text in `mobile/src/i18n/fr/labels.ts` (`factorHelp`, `factorInputHints`): the A cap and no cap on B; strata heights per cas (B-2, B-3); diameters per cas (CD-2, CD-3, E-2, E-3); the slow-growing species list (CD-4); dendromicrohabitat changes (F-1..F-3); the G exclusion (G-1); H grazing, orchard and 10 % rules (H-1, H-2); I « Mer ou océan » (I-1); J 12 types (J-1); cas selector labels instead of `regions` / `vegetationStages` | catalogue unit test or grep; the existing i18n tests still pass |
| CH-9 | Contracts and filters: `api-contract-v1.md`, `data-contract-v1.md` (region enum), the public-map `region` filter semantics, `mobile/src/app/types.ts` `RegionVersion` / `VegetationStage` | API E2E for upsert, submit and the public-map filter |
| CH-10 | `docs/technical/ibp-validation-matrix-v2.md`: revise MAT-B-01, MAT-A-01/02, MAT-G-01, MAT-SUBMIT-01/02; add MAT-A-03..05, MAT-C-02, MAT-E-02, MAT-G-02/03, MAT-H-02, MAT-VER-01; fix the Notes (G, H ∈ {0, 2, 5}). One parity fixture in `packages/ibp-domain` runs every case (01.8 criterion 2) | the parity fixture is green in the API and the mobile app |
| CH-11 | Score display (BUG-3): the 0–50 total is shown as "/10" with colour thresholds 7 and 5; show the total out of 50 as in the methodology (owner decision, 2026-09-26), with the bands of the interpretation chart (GS-2) for colours | component tests for `IbpScoreBadge` and `SectorScoreCard` |
| CH-12 | **Phase 2, not 01.8:** the Factor A genus list from v3.2 p. 3 and Table 1 (p. 10–11), keyed by cas: supplementary genera for cas 4 and cas 2; the coastal Juniperus species; Ficus excluded; Pistacia per the CNPF answer | phase 2's own tests |

## Region and stage to cas mapping

For migrating existing context values (CH-7). One row is an assumption: v3.2 names no
`montagnard_mediterraneen` stage.

| v3.0 `region_version` / `vegetation_stage` | v3.2 cas | Unambiguous? |
|---|---|---|
| ACA / planitiaire, collineen, montagnard | 1 | yes |
| ACA / subalpin | 1 (lower) or 3 (middle/upper) | **no: ask the observer** |
| ACA / montagnard_mediterraneen | 1 | assumed (v3.2 names no such stage) |
| M / thermo_mediterraneen, meso_mediterraneen | 4 | yes (unless riparian → 1) |
| M / supra_mediterraneen | 4, or 1 if humid supra-Mediterranean or riparian | mostly 4; flag for review |
| any + very infertile station | 2 | not recorded today |

## Open questions

1. **Production impact numbers are pending.** Production data lives on the VPS and was not
   reachable from phase 01.1. The owner runs the query below, read-only (it only SELECTs), on the
   production database; the numbers then complete the D-07 statement. The decision holds whatever
   the counts: they size the work, they do not change the treatment.

   ```sql
   -- Source: derived from api/migrations/001_init.sql column shapes; factors may hold a bare number (direct score)
   WITH s AS (
     SELECT status, vegetation_stage, factors,
       CASE WHEN jsonb_typeof(factors->'B') = 'object' THEN factors->'B' END AS b,
       CASE WHEN jsonb_typeof(factors->'C') = 'object' THEN factors->'C' END AS c,
       CASE WHEN jsonb_typeof(factors->'D') = 'object' THEN factors->'D' END AS d,
       CASE WHEN jsonb_typeof(factors->'E') = 'object' THEN factors->'E' END AS e
     FROM surveys WHERE deleted_at IS NULL
   )
   SELECT status,
     count(*) AS surveys,
     count(*) FILTER (WHERE (b->>'strata_count')::numeric >= 5
       AND COALESCE(b->>'covered_autochthonous_percent', b->>'native_cover_percent')::numeric < 50) AS b_cap_hits,
     count(*) FILTER (WHERE (c->>'bmg_count')::numeric / NULLIF((c->>'surface_ha')::numeric,0) < 1
       AND (c->>'bmm_count')::numeric / NULLIF((c->>'surface_ha')::numeric,0) < 1
       AND ((c->>'bmg_count')::numeric + (c->>'bmm_count')::numeric) / NULLIF((c->>'surface_ha')::numeric,0) >= 1) AS c_sum_rule_hits,
     count(*) FILTER (WHERE (d->>'bmg_count')::numeric / NULLIF((d->>'surface_ha')::numeric,0) < 1
       AND (d->>'bmm_count')::numeric / NULLIF((d->>'surface_ha')::numeric,0) < 1
       AND ((d->>'bmg_count')::numeric + (d->>'bmm_count')::numeric) / NULLIF((d->>'surface_ha')::numeric,0) >= 1) AS d_sum_rule_hits,
     count(*) FILTER (WHERE (e->>'tgb_count')::numeric / NULLIF((e->>'surface_ha')::numeric,0) < 1
       AND (e->>'gb_count')::numeric / NULLIF((e->>'surface_ha')::numeric,0) < 1
       AND ((e->>'tgb_count')::numeric + (e->>'gb_count')::numeric) / NULLIF((e->>'surface_ha')::numeric,0) >= 1) AS e_sum_rule_hits,
     count(*) FILTER (WHERE vegetation_stage = 'subalpin') AS subalpine,
     count(*) FILTER (WHERE factors->>'G' = '1' OR factors->>'H' = '1'
       OR factors->'H'->>'class_score' = '1') AS g_h_score_1
   FROM s GROUP BY status;
   ```

   Values are stored as JSON numbers by the mobile app. If a cast fails on a string value, wrap
   the casts in a `~ '^[0-9.]+$'` guard. `b_cap_hits` counts surveys whose B was capped (B and
   possibly A change under v3.2), the three `*_sum_rule_hits` count surveys whose C, D or E would
   go from 0 to 1, `subalpine` counts surveys whose cas is ambiguous, and `g_h_score_1` sizes CH-5.
2. **CNPF source inconsistencies** (questions for CNPF; the conservative reading applies meanwhile):
   - *Ficus carica* is in Table 1 (p. 10–11) but Ficus is not in the p. 3 genus list, and p. 6
     limits counting to listed genera: Ficus is not counted.
   - Pistacia is a supplementary genus (p. 3), but its native species (*P. lentiscus*,
     *P. terebinthus*) appear only in Table 2 (shrubs, never counted, p. 11). Phase 2 decides
     (CH-12).
   - The linear-stand C/D table (p. 6) is still written with BMm alone, inconsistent with the sum
     rule of p. 3 and p. 20 (CD-6). Linear stands are not implemented in the app.
3. **The "/10" score display** (BUG-3, CH-11): the home screen and the nearby-parcel badge show the
   0–50 total as "/10" with colour thresholds 7 and 5. This is presentation, not the method
   version, and needs an owner/design decision (denominator /50; bands from the interpretation
   chart or not).
4. **The subalpine level of existing `subalpin` surveys** (lower = cas 1, middle/upper = cas 3)
   was never recorded. Submitted `subalpin` surveys stay v3.0 and are not recomputed; drafts leave
   the cas blank and submit readiness asks the observer (CH-7).

## Alternatives considered

- **(a) Stay on v3.0.** Rejected. The v3.0 documents are no longer published or retrievable, so
  the app would follow a method observers can no longer consult; observers are trained on v3.2;
  and the phase-2 genus list comes from v3.2 while the app would still score v3.0. The D-06
  exception (comparability that cannot be handled) does not hold: version tagging handles it.
- **(b) Recompute all recorded surveys under v3.2.** Rejected. It is impossible for the
  field-definition changes (the raw counts follow v3.0 definitions and cannot be re-derived), so
  the result would be neither version and would mislead anyone reading the history.
- **(c) Implement the migration in phase 01.1.** Rejected. Phase 01.1 is documentation only, and
  phase 01.8 owns the shared rules package; changing the rules in two places (API and mobile) now
  and again in 01.8 would double the work and the risk of drift. The BUG-1 fix is not small (an
  input moves from B to A in the form, the payload and both engines), so it goes to 01.8 as CH-1.

## Consequences

- A method-version field is needed on every survey (CH-6). Its schema belongs to phase 01.8 or
  phase 2, decided by 01.8's planner; missing means v3.0.
- `region_version` / `vegetation_stage` give way to a cas input (CH-4), and the contracts change:
  `api-contract-v1.md`, `data-contract-v1.md` (CH-9).
- The validation matrix becomes v2, `ibp-validation-matrix-v2.md` (CH-10); the 17 v1 cases stay as
  the v3.0 baseline, and the v3.0 rules keep passing them for legacy replays.
- Phase 2 builds the Factor A genus list from v3.2 (p. 3 and Table 1), keyed by cas (CH-12).
- The citation files (`docs/references/README.md`, `docs/specs/ibp-form-spec.md`) flip to
  "implemented: v3.2" when 01.8 ships.
- No code changed in phase 01.1: the API and the mobile app still compute Fr v3.0 scores.
