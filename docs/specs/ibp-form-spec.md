# Functional Specification - IBP Form (France)

## 1) Purpose
This document defines the complete structure of the IBP form used in the Etats-Sauvages public mobile app.
It is the source of truth for:
- entering the 10 IBP factors,
- determining classes and scores,
- UI validations (blocking/non-blocking),
- calculating subscores and total score,
- submission data contract.

## 2) Scope
Included:
- IBP surveys on metropolitan French forest stands.
- Two IBP method versions, chosen per survey (§5):
  - IBP FR v3.2 (default): station context given by the "cas" 1-4 (`ibp_cas`) and the cas-3
    scale flag (`ibp_cas3_scale`).
  - IBP Fr v3.0: biogeographic versions ACA (Atlantic / Continental / Alpine) and M (Mediterranean:
    thermo, meso, supra-mediterranean), with a vegetation stage.
- Standard full/partial transect workflows.
- Mobile entry and validation rules.

Excluded:
- Advanced ecological interpretation of scores.
- Community moderation workflows (covered in epics).

Method version status (phase 01.8, 2026-09-26):
- Implemented: v3.2 (v3.0 available per survey). New surveys default to IBP FR v3.2 (02/02/2026),
  adopted by [ADR-003](../technical/adr-003-ibp-method-version-v1.md); the observer can choose
  IBP Fr v3.0 instead, and every survey recorded before phase 01.8 is v3.0.
- The rules below are implemented once, in the shared package `packages/ibp-domain`, which both
  the API and the mobile app call. Their executable test cases are listed in
  [`../technical/ibp-validation-matrix-v2.md`](../technical/ibp-validation-matrix-v2.md).
- The app's v3.0 rules fix two transcription errors that were wrong under both versions: BUG-1
  (the native-cover cap is on Factor A, not B) and BUG-2 (Factors G and H accept only 0, 2 or 5).
  The official v3.0 PDFs are no longer published by CNPF (see §12).
- The differences between the versions are listed in
  [`../technical/ibp-version-comparison-v3.0-v3.2.md`](../technical/ibp-version-comparison-v3.0-v3.2.md).
  Linear stands (rows F-5, G-3, CD-6) are not applicable: the app has none.

## 3) Metadata
- Spec version: v1.0
- Language: English
- Owner: Etats-Sauvages
- Last update: 2026-09-26 (phase 01.8)
- IBP method version field: `ibp_method_version`
  - Values: `cnpf_ibp_fr_v3_2_2026-02-02` (IBP FR v3.2, default for new surveys) or
    `cnpf_ibp_fr_v3_0_2023-03-23` (IBP Fr v3.0).
  - A missing value (`null`, absent) means v3.0: every survey recorded before phase 01.8 has none
    and is never stamped afterwards.
  - Implemented in phase 01.8, closing BUG-4: API migration 016 adds the nullable
    `surveys.ibp_method_version` column (plus `ibp_cas` and `ibp_cas3_scale`), the upsert, PATCH
    and sync bodies accept it, and the phone keeps it in the survey's JSON payload.

## 4) Global Form Rules
- A survey is linked to one site/stand.
- A survey may reference one or many French cadastral parcels (`parcel_ids[]`) and must be linked
  to at least one before submission. `parcel_id` is kept as a nullable compatibility field (the
  primary parcel, mirroring `parcel_ids[0]`), never the sole linkage (`REQ-X-parcel-required` is
  overridden by multi-parcel support, `survey_parcels`).
- For parcel follow-up, survey metadata includes `observation_year` and `version_number`.
- ~~A draft expires 7 days after creation. After 7 days, status becomes `expired` and submission is rejected.~~ Removed (OA-41 2026-10-06): there is no submission deadline.
- Submission requires all mandatory factors to be filled and scorable.
- Submission is blocked when cadastral linkage metadata is missing/invalid.
- Allowed factor scores, both method versions:
  - factors `A` to `F`: `{0,1,2,5}`;
  - factors `G`, `H`, `I` and `J`: `{0,2,5}`. G and H accepted 1 before phase 01.8 (BUG-2); a
    direct score of 1 on G or H is now rejected as blocking `factor_invalid_score`.
- Subscores:
  - `ibp_peuplement_gestion = A + B + C + D + E + F + G` (max 35)
  - `ibp_contexte = H + I + J` (max 15)
- Total score:
  - `ibp_total = ibp_peuplement_gestion + ibp_contexte` (max 50)
  - The app shows every total out of 50 ("n / 50"): home sector card, nearby-parcel badge, public
    map, survey form and survey detail.
- Interpretation bands (unchanged between versions; a score equal to a cut-off falls in the
  higher band):
  - stand and management (/35), CNPF chart (v3.2 p. 24): cut-offs 7, 14, 21, 28 give faible,
    assez faible, moyenne, assez forte, forte;
  - context (/15), CNPF chart: cut-offs 5 and 10 give faible, moyenne, forte;
  - total (/50): the CNPF chart has no band for the total. The app uses cut-offs 10, 20, 30, 40
    (the stand axis' 20/40/60/80 % applied to 50). This is an app convention, under the owner's
    review. The nearby-parcel badge and the home sector card colour totals with it; the survey
    detail colours only the /35 and /15 sub-scores, with their CNPF bands.
- Privacy:
  - each survey has a visibility status: `private` or `public`.
  - default value: `private`.
  - only `public` surveys can be displayed in community surfaces.
- Post-publication management:
  - users can switch visibility (`public` <-> `private`) after submission.
  - users can delete a submitted survey (with confirmation).
  - switching to `private` or deleting removes survey from community surfaces.

## 5) Method Version and Scoring Context

### 5.1 Method version choice
- The observer chooses the method on the first step of the survey form ("Méthode IBP"): IBP v3.2
  is preselected, IBP v3.0 can be chosen (for example to re-survey a parcel under the method of its
  earlier survey).
- The form, help texts, validation and scoring all follow the survey's version.
- Drafts keep their version: an untagged draft stays untagged (v3.0) and nothing is silently
  re-scored. An unsubmitted v3.0 or untagged draft can be switched to v3.2 from the survey detail
  ("Passer en IBP v3.2"): the native cover moves from B to A, the cas is pre-filled from region and
  stage (§5.2) and region/stage are dropped. The observer checks the cas.
- The version, cas and cas-3 flag are fixed once the survey is submitted (API: `409
  survey_submitted_read_only` on replays, `422 submitted_read_only_fields` on PATCH).

### 5.2 IBP FR v3.2: cas and cas-3 scale
Required before scoring A and G:
- `ibp_cas` (integer `1` to `4`, growth constraints, v3.2 p. 2):
  - `1`: no strong growth constraint (most temperate forests);
  - `2`: very infertile station (very poor, very shallow, very dry or waterlogged soil);
  - `3`: middle and upper subalpine, or equivalent climatic constraints;
  - `4`: thermo- and meso-Mediterranean, outside cool or humid zones.
- `ibp_cas3_scale` (boolean, "Échelle du cas 3 pour A et G"): applies the cas-3 scale to A and G
  for cas 2 in a zone whose macroclimate matches cas 3, and for stands on lapiaz, dunes or peat
  bogs, or dominated by *Juniperus thurifera* (v3.2 p. 3, p. 4 footnote, p. 7).
- The cas-3 scale applies when `ibp_cas = 3` or `ibp_cas3_scale = true`.
- New v3.2 surveys start with cas 1 selected (under the owner's review); the form shows a caption
  for each cas.
- v3.2 surveys carry no `region_version` or `vegetation_stage`.
- A v3.2 draft without a cas is accepted, with A and G not scored yet (non-blocking
  `factor_incomplete`); submit requires it (`ibp_cas_required`).
- Pre-fill when switching a v3.0 draft (ADR-003 mapping): ACA planitiaire, collineen, montagnard or
  montagnard_mediterraneen -> cas 1; M thermo- or meso-mediterranean -> cas 4; ACA subalpin and M
  supra-mediterranean -> no cas, the observer chooses.

### 5.3 IBP Fr v3.0: region and vegetation stage
Required before scoring factors:
- `region_version` (enum): `ACA` | `M`
- `vegetation_stage` (minimal enum):
  - for `ACA`: `planitiaire`, `collineen`, `montagnard`, `subalpin`, `montagnard_mediterraneen`
  - for `M`: `thermo_mediterraneen`, `meso_mediterraneen`, `supra_mediterraneen`

Compatibility rule:
- If `region_version = ACA`, use ACA thresholds.
- If `region_version = M`, use M thresholds.
- Special case: `montagnard_mediterraneen` -> use ACA (CNPF rule).

v3.0 surveys carry no `ibp_cas` or `ibp_cas3_scale`.

## 6) IBP Factors (Detailed Model)

### Factor A - Native Tree Taxa
- Ecological objective: characterize diversity of native tree taxa.
- Field ID: `factor_a`
- Input type: a list of observed native genera (`genera`, drawn from the closed CNPF regional
  list; phase 5, ADR-002 D-15, ADR-003 CH-12) + native cover of the described stand
  (`native_cover_percent`, 0-100). The genus count Factor A scores from is derived from the list
  (its number of distinct valid codes), never entered directly. Surveys recorded before this phase
  keep their legacy bare `native_genus_count`, unchanged (see `data-contract-v1.md`). Recognition
  and counting are genus-level only: there is no species entity anywhere in the model (D-01). The
  genus-entry UI (manual picker and on-device photo recognition) is phase 6; this phase is the
  contract only.
- Unit/scope: number of distinct native genera observed in the described stand.
- Determination:
  - count native genera (from the closed CNPF regional list, 34 classes; `Quercus` is the one
    genus the methodology splits into two countable classes, deciduous and evergreen).
  - a supplementary genus (Ceratonia, Cercis, Olea, Phillyrea, Pistacia) counts only in cas 2 or 4.
  - include living trees (h > 50 cm) and dead trees.
- Classes/scores, IBP FR v3.2:
  - cas 1, 2 and 4 (standard scale):
    - `0`: 0-1 genera
    - `1`: 2 genera
    - `2`: 3-4 genera
    - `5`: >= 5 genera
  - cas 3, or `ibp_cas3_scale = true`:
    - `0`: 0 genera
    - `1`: 1 genus
    - `2`: 2 genera
    - `5`: >= 3 genera
  - In cas 2 and 4, Mediterranean genera are added to the list (help text only).
- Classes/scores, IBP Fr v3.0:
  - ACA (planitiaire/collineen/montagnard):
    - `0`: 0-1 genera
    - `1`: 2 genera
    - `2`: 3-4 genera
    - `5`: >= 5 genera
  - ACA (subalpin):
    - `0`: 0 genera
    - `1`: 1 genus
    - `2`: 2 genera
    - `5`: >= 3 genera
  - M:
    - `0`: 0-1 genera
    - `1`: 2 genera
    - `2`: 3-4 genera
    - `5`: >= 5 genera
- Special rule (both versions, A-1 / BUG-1):
  - score capped at `2` if the native species cover is below 50% of the described stand (exactly
    50% is not capped).
  - v3.2: the cover is required; A without it is not scored yet (`factor_incomplete` on a draft,
    blocking `factor_required` at submit).
  - v3.0: the cover is read from A, else from B's legacy `covered_autochthonous_percent` field
    (surveys recorded before phase 01.8); an unknown cover means no cap.
  - A cover outside 0-100 is `factor_invalid_raw`.
- UI validation:
  - blocking: the genus count and the native cover must both be entered (the form sends A only
    when both are valid).
- Example:
  - v3.0 ACA collineen, 4 native genera -> score `2`.
  - v3.2 cas 1, 5 native genera, native cover 40% -> score `2` (capped).

### Factor B - Vertical Vegetation Structure
- Ecological objective: describe vertical complexity.
- Field ID: `factor_b`
- Input type: number of strata (`strata_count`). B has no native-cover input: the cover belongs to
  Factor A.
- Unit/scope: number of strata covering >= 20% of described area.
- Determination:
  - count among 5 strata.
  - one woody plant can contribute to multiple strata.
- Strata definition (help text; mosses do not count):
  - v3.2 cas 1: very low <1.5 m, low 1.5-7 m, intermediate 7-18 m, high >18 m
    (+ herbaceous/semi-woody).
  - v3.2 cas 2, 3 and 4: very low <1.5 m, low 1.5-5 m, intermediate 5-12 m, high >12 m
    (+ herbaceous/semi-woody).
  - v3.0 ACA: very low <1.5 m, low 1.5-7 m, intermediate 7-20 m, high >20 m
    (+ herbaceous/semi-woody).
  - v3.0 M: very low <1.5 m, low 1.5-5 m, intermediate 5-15 m, high >15 m
    (+ herbaceous/semi-woody).
- Classes/scores:
  - `0`: 1 stratum
  - `1`: 2 strata
  - `2`: 3-4 strata
  - `5`: 5 strata
- No native-cover cap on B (both versions). Before phase 01.8 the app capped B; both CNPF v3
  editions (the 2021 v3 sheet and FR v3.2, p. 3) put the cap on Factor A, so phase 01.8 moved it
  there (BUG-1, CH-1). A cover still stored under B by an older v3.0 draft is read for A only.
- UI validation:
  - blocking: at least 1 stratum selected.
- Example:
  - 5 observed strata, native cover 40% -> B score `5` (the cap applies to A).

### Factor C - Standing Deadwood of Large Size
- Ecological objective: estimate vertical deadwood resource.
- Field ID: `factor_c`
- Input type: counters `bmg_count`, `bmm_count`, `surface_ha`.
- Unit/scope: density per hectare.
- Determination:
  - count standing deadwood (h >= 1 m): dead trees, snags, high stumps.
  - derive `BMg/ha`, `BMm/ha`.
- Diameter thresholds (help text):
  - v3.2 cas 1: BMg D > 37.5 cm, BMm 17.5-37.5 cm; cas 3 and 4: BMg D > 27.5 cm, BMm
    17.5-27.5 cm; cas 2 and slow-growing species: BMg D > 17.5 cm, BMm 7.5-17.5 cm.
  - v3.0 ACA:
    - BMg: D > 37.5 cm (special cases: D > 17.5 cm)
    - BMm: 17.5 < D < 37.5 cm
  - v3.0 M:
    - BMg: D > 27.5 cm (special cases: D > 17.5 cm)
    - BMm: 17.5 < D < 27.5 cm
- Classes/scores:
  - `0`: BMg/ha < 1 and BMm/ha < 1 (v3.2: BMg/ha < 1 and (BMg + BMm)/ha < 1)
  - `1`: BMg/ha < 1 and BMm/ha >= 1 (v3.2: BMg/ha < 1 and (BMg + BMm)/ha >= 1, CD-1)
  - `2`: 1 <= BMg/ha < 3
  - `5`: BMg/ha >= 3
- UI validation:
  - blocking: `surface_ha > 0`.
  - blocking: counters >= 0.
- Example:
  - BMg/ha = 2.2 -> score `2`.

### Factor D - Downed Deadwood of Large Size
- Ecological objective: estimate horizontal deadwood resource.
- Field ID: `factor_d`
- Input type: counters `bmg_count`, `bmm_count`, `surface_ha`.
- Unit/scope: density per hectare.
- Determination:
  - count downed deadwood with length >= 1 m.
- Diameter thresholds (help text):
  - v3.2: measured 1 m from the large end, same per-cas thresholds as C.
  - v3.0 ACA:
    - BMg: D > 37.5 cm (at 1 m from large end; special cases: >17.5)
    - BMm: 17.5 < D < 37.5 cm
  - v3.0 M:
    - BMg: D > 27.5 cm (special cases: >17.5)
    - BMm: 17.5 < D < 27.5 cm
- Classes/scores (same as C, including the v3.2 sum rule for scores `0` and `1`):
  - `0`: BMg/ha < 1 and BMm/ha < 1
  - `1`: BMg/ha < 1 and BMm/ha >= 1
  - `2`: 1 <= BMg/ha < 3
  - `5`: BMg/ha >= 3
- UI validation:
  - blocking: `surface_ha > 0`.
- Example:
  - BMg/ha = 0.6, BMm/ha = 1.3 -> score `1`.

### Factor E - Very Large Living Trees
- Ecological objective: quantify very large living trees.
- Field ID: `factor_e`
- Input type: counters `tgb_count`, `gb_count`, `surface_ha`.
- Unit/scope: density per hectare.
- Determination:
  - count TGB and GB (GB used if TGB < 1/ha).
- Diameter thresholds (help text):
  - v3.2 cas 1: TGB D > 67.5 cm, GB 47.5-67.5 cm; cas 3 and 4: TGB D > 57.5 cm, GB 37.5-57.5 cm;
    cas 2 and slow-growing species: TGB D > 37.5 cm, GB 17.5-37.5 cm.
  - v3.0 ACA:
    - TGB: D > 67.5 cm (special cases: >47.5)
    - GB: 47.5 < D < 67.5 cm
  - v3.0 M:
    - TGB: D > 57.5 cm (special cases: >37.5)
    - GB: 37.5 < D < 57.5 cm
- Classes/scores:
  - `0`: TGB/ha < 1 and GB/ha < 1 (v3.2: TGB/ha < 1 and (TGB + GB)/ha < 1)
  - `1`: TGB/ha < 1 and GB/ha >= 1 (v3.2: TGB/ha < 1 and (TGB + GB)/ha >= 1, E-1)
  - `2`: 1 <= TGB/ha < 5
  - `5`: TGB/ha >= 5
- UI validation:
  - blocking: `surface_ha > 0`.
- Example:
  - TGB/ha = 0.4 and GB/ha = 1.1 -> score `1`.

### Factor F - Living Trees with Dendromicrohabitats
- Ecological objective: capture arboreal microhabitat diversity.
- Field ID: `factor_f`
- Input type: table per dmh group (15 groups) + derived total counter.
- Unit/scope: trees/ha (capped per group).
- Determination:
  - count trees carrying dmh according to IBP typology.
  - one tree can be counted in multiple groups.
  - within one group, one tree counts once.
  - capping: max 2 trees/ha per group.
- Classes/scores:
  - `0`: trees/ha < 2
  - `1`: 2 <= trees/ha < 3
  - `2`: 3 <= trees/ha < 8
  - `5`: trees/ha >= 8
- UI validation:
  - blocking: at least 1 dmh group evaluated (0 allowed).
  - non-blocking: value above group cap -> auto-cap + warning.
- Example:
  - total after capping = 8.4 trees/ha -> score `5`.

### Factor G - Flowering Open Habitats
- Ecological objective: qualify proportion of flowering open habitats linked to stand.
- Field ID: `factor_g`
- Input type: flowering open area (m2) + described area (m2/ha).
- Unit/scope: percentage of flowering open area.
- Determination:
  - include gaps/clearings, edges (standard width 2 m), open canopy stands.
  - count only fraction clearly occupied by flowering vegetation.
- Allowed scores: `0`, `2`, `5` only (BUG-2).
- Classes/scores, IBP FR v3.2:
  - cas 1, 2 and 4:
    - `0`: 0%
    - `2`: <1% or >5%
    - `5`: 1 to 5%
  - cas 3, or `ibp_cas3_scale = true`:
    - `0`: 0%
    - `2`: <1%
    - `5`: >=1%
  - v3.2 excludes the flowering vegetation of the intermediate and high strata (help text).
  - A v3.2 G without a cas is not scored yet (`factor_incomplete`).
- Classes/scores, IBP Fr v3.0:
  - ACA (collineen and montagnard):
    - `0`: 0%
    - `2`: <1% or >5%
    - `5`: 1 to 5%
  - ACA (subalpin):
    - `0`: 0%
    - `2`: <1%
    - `5`: >=1%
  - M:
    - `0`: 0%
    - `2`: <1% or >5%
    - `5`: 1 to 5%
- UI validation:
  - blocking: described area > 0.
- Example:
  - 3.2% flowering open habitats (v3.0 M) -> score `5`.
  - 6% flowering open habitats (v3.2 cas 3) -> score `5`; the same under cas 1 -> score `2`.

### Factor H - Temporal Continuity of Forest Cover
- Ecological objective: estimate forest continuity/antiquity.
- Field ID: `factor_h`
- Input type: guided expert class + justifications (desk sources + field evidence).
- Unit/scope: ordinal class.
- Determination:
  - reference 19th-century forest minimum (Etat-major map) + later documents + field evidence.
- Classes/scores:
  - `0`: recent forest (cleared over whole area)
  - `2`: partial continuity OR continuity with full-soil-disturbance reforestation
  - `5`: ancient continuous forest (no clearing, no full-soil-disturbance reforestation)
- Allowed scores: `0`, `2`, `5` only, both versions (BUG-2); a direct `1` or `class_score: 1` is
  blocking `factor_invalid_score`.
- UI validation:
  - blocking: one class required.
  - blocking: `evidence_source` required (map, aerial photo, field observation).
- Example:
  - stand present on Etat-major map with no discontinuity signs -> score `5`.

### Factor I - Aquatic Habitats
- Ecological objective: account for nearby aquatic habitat diversity.
- Field ID: `factor_i`
- Input type: multi-select of observed aquatic habitat types.
- Unit/scope: number of distinct habitat types (inside or bordering stand).
- Rules:
  - natural or artificial types.
  - permanent or temporary (excluding flood events).
- Classes/scores:
  - `0`: no type
  - `2`: 1 type
  - `5`: >=2 types
- UI validation:
  - blocking: number of types determined (0 allowed).
- Example:
  - spring + small stream -> score `5`.

### Factor J - Rocky Habitats
- Ecological objective: account for rocky/mineral habitat diversity.
- Field ID: `factor_j`
- Input type: multi-select of observed rocky habitat types.
- Unit/scope: number of distinct habitat types.
- Rules:
  - located inside or bordering stand.
  - a type counts only if cumulative area > 20 m2.
- Classes/scores:
  - `0`: no type
  - `2`: 1 type
  - `5`: >=2 types
- UI validation:
  - blocking: number of types determined (0 allowed).
- Example:
  - slab + outcrops (each >20 m2 cumulative area) -> score `5`.

## 7) Edge Cases and Cross-Cutting Rules
- Special low-fertility/low-growth taxa cases:
  - apply reduced diameter thresholds for C, D, E.
- Capped survey mode (default mobile mode):
  - a factor can stop being observed as soon as final score is secured.
- Uncapped survey mode (study mode):
  - allowed, but score still computed with same IBP classes.
- Linear forests (<15 m width):
  - density/km adaptation (CNPF table):
    - C and D: BMg/km <9; 9-<15; >=15
    - E: TGB/km <9; 9-<20; >=20
    - F: trees/km <12; 12-<15; 15-<25; >=25
    - F cap: max 9 trees/km per dmh group.

## 8) Validation Matrix (UI + Submission)

### 8.1 Blocking Validations by Factor
- A: a genus list (`genera`, each entry on the closed CNPF list — an unlisted entry is blocking
  `factor_a_genus_invalid`) or the legacy `native_genus_count`, plus native cover available; v3.2:
  `ibp_cas` set; v3.0: region_version + stage set.
- B: at least 1 stratum entered.
- C/D/E: `surface_ha > 0`; non-negative counters.
- F: coherent dmh-group data; computable total.
- G: computable surfaces and `open_flowering_percent`; v3.2: `ibp_cas` set.
- H: class selected + evidence source.
- I/J: number of types determined (0 accepted).
- Survey context at submit: v3.2 requires `ibp_cas` (`ibp_cas_required`); v3.0 requires
  `region_version` and `vegetation_stage` (`region_version_required`, `vegetation_stage_required`).

### 8.2 Time/Status Validations
- ~~If `now > created_at + 7 days` and status is `draft`: force status `expired`, block submission, message `This survey has expired`.~~ Removed (OA-41 2026-10-06): there is no submission deadline, a draft is never expired.

### 8.3 Visibility Validations
- `visibility` is required at submission (`private` or `public`).
- Default value at draft creation: `private`.
- If `visibility = public`, verify exposed data complies with anonymization/pseudonymization rules.

### 8.4 Post-Publication Action Validations
- Visibility change action is allowed only for survey owner (or authorized moderator/admin role).
- Deletion requires explicit user confirmation.
- After deletion, `deleted_at` is set (soft delete; `status` is unchanged — there is no `deleted`
  status value, see §10.1) and the survey is excluded from list/map/community feeds.

### 8.5 Inter-Factor Consistency (Non-Blocking)
App heuristics, both versions. Since phase 01.8 each warning fires only when both factors of the
pair are scored: an absent or incomplete factor is not "very low".
- `factor_b >= 3 strata` (score >= 2) with `factor_a = 0` -> consistency warning
  (`consistency_a_b`).
- `factor_f >= 5` with `factor_e = 0` -> warning (possible but should be checked,
  `consistency_e_f`).
- `factor_g = 5` and `factor_i = 0`/`factor_j = 0` -> no error (no strict constraint).

### 8.6 Canonical Error Messages (EN)
- `Missing required field: {field_id}`
- `Invalid value for {field_id}`
- `Invalid described area (must be > 0)`
- `ibp_method_version is not a supported IBP method version` (code
  `ibp_method_version_unsupported`)
- `ibp_cas is required and must be 1, 2, 3 or 4` (code `ibp_cas_required`, v3.2 submit)
- `factor {X} is incomplete: {ibp_cas | native_cover | native_genus_count} is required` (code
  `factor_incomplete`, non-blocking, drafts)
- `Inconsistent region/IBP version`
- `This survey has expired (more than 7 days).`
- `Invalid visibility (expected values: private, public).`
- `Deletion cancelled or not confirmed.`

## 9) Calculation Rules
- Rule set: chosen from `ibp_method_version`; a missing value is v3.0. An unsupported value is
  blocking `ibp_method_version_unsupported` in both draft and submit mode, and nothing is scored.
  (The API rejects an unknown value before that: `400` on REST, `invalid_sync_operation` on
  `/sync`.)
- Per-factor calculation:
  - evaluate class based on the version's thresholds (v3.2: cas and cas-3 scale; v3.0: region
    and stage).
  - apply caps/adjustments (A native cover, F per-group cap, special diameter cases).
- Final calculation:
  - `ibp_peuplement_gestion = A+B+C+D+E+F+G`
  - `ibp_contexte = H+I+J`
  - `ibp_total = ibp_peuplement_gestion + ibp_contexte`
- Totals are shown out of 50 (§4).
- Rounding:
  - factor scores are discrete (no intermediate score rounding).
  - densities/percentages may be computed as floating values then compared strictly to thresholds.

## 10) Data Contract (API/Storage)

### 10.1 Main Types
- `ibp_method_version: "cnpf_ibp_fr_v3_2_2026-02-02" | "cnpf_ibp_fr_v3_0_2023-03-23" | null`
  (null or absent = v3.0; stored as sent, an untagged survey stays untagged)
- `ibp_cas: 1 | 2 | 3 | 4 | null` (v3.2 only; required at submit)
- `ibp_cas3_scale: boolean | null` (v3.2 only)
- `region_version: "ACA" | "M"` (v3.0 only; required at submit)
- `vegetation_stage: string` (v3.0 only; required at submit)
- `status: "draft" | "submitted" | "synced" | "error" | "expired"` (shipped enum; no `deleted`
  value — a deleted survey is soft-deleted via `deleted_at`, its `status` unchanged)
- `visibility: "private" | "public"` (required, default `private`)
- `submitted_at?: datetime`
- `deleted_at?: datetime` (soft delete; no `published_at` field exists)
- `factors: array[10]` (required)

### 10.2 Factor Structure
- `factor_id: "factor_a" | ... | "factor_j"`
- `observed_value_raw: object` (raw input data)
- `selected_class: "S0" | "S1" | "S2" | "S5"` (G/H/I/J: `S0|S2|S5`)
- `score_points: number` (A-F: 0|1|2|5; G-J: 0|2|5)
- `evidence: { notes?: string, photos?: string[], gps?: {lat:number,lng:number,accuracy_m?:number} }`

### 10.3 Logical Submission Payload
```json
{
  "survey_id": "uuid",
  "parcel_ids": ["parcel-uuid-1"],
  "ibp_method_version": "cnpf_ibp_fr_v3_2_2026-02-02",
  "ibp_cas": 1,
  "ibp_cas3_scale": false,
  "created_at": "2026-03-04T10:00:00Z",
  "status": "submitted",
  "visibility": "public",
  "submitted_at": "2026-03-04T10:35:00Z",
  "factors": [
    {
      "factor_id": "factor_a",
      "observed_value_raw": {
        "genera": ["Fagus", "Quercus_deciduae", "Acer", "Fraxinus"],
        "native_cover_percent": 80
      },
      "selected_class": "S2",
      "score_points": 2,
      "evidence": { "notes": "Taxon validated in field" }
    }
  ],
  "ibp_peuplement_gestion": 23,
  "ibp_contexte": 7,
  "ibp_total": 30,
  "validation_errors": []
}
```

### 10.4 Versioning Rules
- The mobile form sets `ibp_method_version` at draft creation (v3.2 by default). The API does not
  require it: a missing value means v3.0, so installed apps that send none keep working.
- A v3.2 survey stores `ibp_cas`/`ibp_cas3_scale` and no region/stage; a v3.0 survey stores
  region/stage and no cas. Switching a draft's version clears the other version's fields.
- If the version is unsupported:
  - the API rejects the write (`400`, or `invalid_sync_operation` on `/sync`) and the database
    constraint allows only the two tags;
  - the rules report blocking `ibp_method_version_unsupported`, and the phone's submit readiness
    reports it.
- Class enums and thresholds are fixed per version.
- The version, cas and cas-3 flag are read-only after submit (§5.1). The explicit v3.0 tag and a
  missing value are the same method in this comparison.

## 11) Acceptance Test Scenarios
1. Correct factor classification:
- raw input -> expected class -> expected score.

2. Threshold edge case:
- value exactly on threshold -> correct class based on inclusive/exclusive bounds.

3. Inter-factor inconsistency:
- warning raised without blocking submission (for non-blocking rule).

4. Valid submission:
- 10 scorable factors + required fields -> score computed + status `submitted`.

5. ~~Expired draft: draft > 7 days -> status `expired`, submission denied.~~ Removed (OA-41 2026-10-06): an old draft is submitted like any other.

6. Visibility:
- `private` not published in map/community surfaces, `public` eligible for publication.

7. Post-publication management:
- switching `public` -> `private` removes survey from map/community surfaces.
- deletion sets `deleted_at` (soft delete, `status` unchanged) and removes the survey from user/community lists.

8. Versioning:
- same survey with different version -> verify version-specific thresholds / support (MAT-VER-01:
  C with 1 BMg and 1 BMm on 2 ha scores 0 untagged or v3.0, 1 under v3.2).
- unknown version -> blocking `ibp_method_version_unsupported` (MAT-VER-02).

## 12) Official References (Primary Source)
- CNPF - IBP home page (current documents): https://www.cnpf.fr/ibp
- IBP FR v3.2, implemented default method (ADR-003), dated 2026-02-02, 28 pp., retrieved 2026-09-26, SHA-256 `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`: https://www.cnpf.fr/sites/socle/files/2026-04/IBP_FR_v3_2_260202.pdf
- The links below are kept for the record; all are no longer online (HTTP 404, checked 2026-09-26) because CNPF no longer publishes v3.0:
  - CNPF - former IBP page: https://www.cnpf.fr/n/ibp/n:2006
  - IBP Fr v3.0 definition (updated 2023-03-23), v3.0, available per survey: https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/9a66d6016d0a99f576f35f53df4e73f3/ibp_def_fr_v3_0_230323_0.pdf
  - IBP Fr v3.0 survey sheets (updated 2023-03-23), v3.0, available per survey: https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/5cf710f876f8e4ddfd4007df318f71f5/ibp_rel_fr_v3_0_230323_0.pdf
  - IBP survey methods (updated 2022-10-10): https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/e5f7f1ea0f6f4f63a2ef41a58ecab8e0/ibp_methodes_de_releve_v221010_0.pdf (v3.2 now includes the survey instructions, p. 18-19)

## 13) Change Log
- 2026-03-04: moved from template to full operational specification (factors, thresholds, scoring, validations, data contract, CNPF references).
- 2026-09-26: phase 01.1: method version status (implemented v3.0, target v3.2 per ADR-003), dead v3.0 links marked, v3.2 reference added, known divergences flagged (BUG-1, BUG-4, region/stage vs cas).
- 2026-09-26: phase 01.8: implemented: v3.2 (v3.0 available per survey). Method version chosen per survey (`ibp_method_version`, BUG-4 closed), cas model (`ibp_cas`, `ibp_cas3_scale`), native cover and cap moved to Factor A (BUG-1), G/H allowed scores 0/2/5 (BUG-2), v3.2 C/D/E sum rule, totals shown out of 50 with the band convention, validation codes `ibp_method_version_unsupported`, `ibp_cas_required`, `factor_incomplete`.
- 2026-09-27: phase 5 (`REQ-ML-contracts`, `REQ-DOC-form-spec`): Factor A carries a genus list (`genera`) instead of a bare count, with the count derived from it (§6, §10.1/§10.3); new validation code `factor_a_genus_invalid` (§8.1). §4 corrected to multi-parcel `parcel_ids[]` (conflict-report warning 1). §8.4/§10.1/§11 corrected to the shipped status enum (`draft | submitted | synced | error | expired`, `submitted_at`, `deleted_at`, no `deleted` value, no `published_at`; conflict-report warning 2). Contracts and migration only — the genus-entry UI is phase 6.
