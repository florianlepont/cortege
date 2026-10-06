# IBP Validation Matrix (V2)

## Status

Accepted for phase 01.8 (2026-09-26). Supersedes
[`ibp-validation-matrix-v1.md`](ibp-validation-matrix-v1.md), which is kept as the pre-01.8
baseline. Produced for CH-10 of [ADR-003](adr-003-ibp-method-version-v1.md). Extended in phase 5
(2026-09-27) with the Factor A genus list (MAT-A-09..11, CH-12).

## Date

2026-09-26

## Method versions

| Version | Tag stored in `ibp_method_version` | Scoring context |
|---|---|---|
| IBP Fr v3.0, as the app implements it (BUG-1 and BUG-2 fixed, see below) | `cnpf_ibp_fr_v3_0_2023-03-23` | `region_version` (ACA, M) and `vegetation_stage` |
| IBP FR v3.2 (CNPF / INRAE Dynafor, 02/02/2026) | `cnpf_ibp_fr_v3_2_2026-02-02` | `ibp_cas` (1 to 4) and `ibp_cas3_scale` (boolean) |

**A missing method version means v3.0.** An untagged payload and a payload tagged
`cnpf_ibp_fr_v3_0_2023-03-23` are scored by the same rules. Any other string is rejected
(MAT-VER-02).

Sources: v3.2 p. 2 (cas classification), p. 3-4 (definition sheet A to J), p. 7 (FAQ on the A and
G scales), p. 24 (interpretation chart). Row IDs such as A-1 or CD-1 point to
[`ibp-version-comparison-v3.0-v3.2.md`](ibp-version-comparison-v3.0-v3.2.md).

## Executable form

The parity fixture `IBP_PARITY_CASES` in `packages/ibp-domain` (`src/parity/cases.ts`) is the
executable form of this matrix. It uses the same case ids. The package runs it, and the API and
mobile test suites run it again through their adapters. The mobile-only extras (submit readiness
and draft migration) are `IBP_READINESS_CASES` and `IBP_MIGRATION_CASES` in the same file. The
phase gate (01.8-16) cross-checks the ids of this document against the fixture.

Case id format: `MAT-X-NN@v3.0`, `MAT-X-NN@v3.2`, or `MAT-X-NN@both` when one case runs under
both versions. The v3.0 group applies to untagged payloads and to the v3.0 tag alike; the fixture
encodes an untagged payload with `method: null`. When one matrix case runs several inputs (for
example "cas 3; then cas 1", or a draft and a submit), the fixture holds one entry per input: its
`matrixId` is the id in this document and its `id` adds a `#variant` suffix (`MAT-A-02@v3.2#cas-3`).

## Changes from v1

| Case | Change | Why |
|---|---|---|
| MAT-B-01@v3.0 | **`B=5` instead of `B=2`.** B has no native-cover cap any more | BUG-1: both v3.2 (p. 3) and the 2021 CNPF v3 sheet put the cap on A, so the app was wrong under both versions. D-05 fixes it in the v3.0 rules too, because v3.0 stays a choice for new surveys |
| MAT-A-06@v3.0 | New: the cap now applies to A, reading the cover from B's legacy field when A has none | Keeps the stored v3.0 shape (cover under B) scoring correctly |
| G, H | Allowed scores are `0, 2, 5` (were `0, 1, 2, 5`). A direct `G=1`, `H=1` or `H.class_score=1` is blocking | BUG-2: both CNPF versions allow only 0, 2 or 5 (v3.2 p. 4) |
| MAT-A-01, MAT-A-02 | Split into `@v3.0` (region and stage) and `@v3.2` (cas; A now also needs a cover input) | CLS-1, CLS-2, A-1 |
| MAT-G-01 | Split into `@v3.0` and `@v3.2` (cas 1) | CLS-1, G-2 |
| MAT-SUBMIT-01, MAT-SUBMIT-02 | Split per version. Under v3.2 a missing cas is blocking at submit. MAT-SUBMIT-02 now uses `G=2` and `H=2` | CLS-1, CH-6, BUG-2 |
| New v3.2 cases | MAT-A-03 to MAT-A-05, MAT-A-07, MAT-A-08, MAT-C-02, MAT-C-03, MAT-E-02, MAT-G-02, MAT-CAS-01, MAT-CAS-02 | CH-1 to CH-4 |
| New both-version cases | MAT-G-03, MAT-H-02 | CH-5 |
| New dispatch cases | MAT-VER-01, MAT-VER-02 | CH-6 |

Replays of surveys recorded before 01.8 stay safe: validation rejects only blocking issues and
never compares a recomputed score with the stored one. The only newly blocked shapes are a direct
`G=1` or `H=1`, which the form cannot produce.

## Reading the tables

- **Mode**: `draft` or `submit`. Draft validation reports blocking issues only as errors; missing
  or incomplete factors are not errors in draft. An incomplete factor (v3.2: A or G without the
  cas, A without its cover) gives a non-blocking warning `factor_incomplete` in draft and a blocking
  `factor_required` at submit.
- **Expected**: per-factor score for the factors given. "not scored" means the factor is missing
  or incomplete (for example A without its cover under v3.2).
- **Issues**: the issue codes the case emits, blocking (B) or non-blocking warning (W); "none"
  means no issue at all. Codes are compared as a set, without order or repeats.
- **Totals** are given only where all ten factors are present.

## v3.0 cases

Context for the A and G cases is given; other factors do not depend on it. The subalpine scale
applies when `region_version=ACA` and `vegetation_stage=subalpin`.

> **No submission deadline (OA-41).** `expires_at` is no longer read: neither `expires_at_required` nor `survey_expired` exists, and readiness has no `expired` flag. A survey is never refused for its age.


| Case ID | Mode | Context | Input | Expected | Issues |
|---|---|---|---|---|---|
| MAT-A-01@v3.0 | draft | ACA, collineen | `A.native_genus_count=2` | `A=1` | none |
| MAT-A-02@v3.0 | draft | ACA, subalpin | `A.native_genus_count=2` | `A=2` (subalpine scale) | none |
| MAT-A-06@v3.0 | draft | ACA, collineen | `A.native_genus_count=5`; `B.strata_count=5`, `B.covered_autochthonous_percent=40` | `A=2` (cap on A, cover from B's legacy field), `B=5` | none |
| MAT-A-09@v3.0 | draft | any | `A.genera=[Fagus, Quercus_deciduae, Quercus_sempervirens]`, `A.native_cover_percent=60` | `A=2` (count derived from the list: 3 distinct genera) | none |
| MAT-A-10@v3.0 | draft | any | `A.genera=[Fagus, Pistacia]`, `A.native_cover_percent=60` | `A=0` (v3.0 has no cas: Pistacia, supplementary, never counts) | none |
| MAT-A-11@v3.0 | draft | any | `A.genera=[Ficus]`, `A.native_cover_percent=60` | not scored | B `factor_a_genus_invalid` (Ficus is not on the CNPF list, A-6) |
| MAT-B-01@v3.0 | draft | any | `B.strata_count=5`, `B.covered_autochthonous_percent=40` | `B=5` (no cap on B; v1 said 2) | none |
| MAT-C-01@v3.0 | draft | any | `C.bmg_count=0`, `C.bmm_count=2`, `C.surface_ha=1` | `C=1` | none |
| MAT-C-02@v3.0 | draft | any | `C.bmg_count=1`, `C.bmm_count=1`, `C.surface_ha=2` | `C=0` (BMm/ha alone is 0.5) | none |
| MAT-D-01@v3.0 | draft | any | `D.bmg_count=4`, `D.bmm_count=0`, `D.surface_ha=1` | `D=5` | none |
| MAT-E-01@v3.0 | draft | any | `E.tgb_count=0`, `E.gb_count=2`, `E.surface_ha=1` | `E=1` | none |
| MAT-E-02@v3.0 | draft | any | `E.tgb_count=1`, `E.gb_count=1`, `E.surface_ha=2` | `E=0` (GB/ha alone is 0.5) | none |
| MAT-F-01@v3.0 | draft | any | `F.trees_per_ha=8` | `F=5` | none |
| MAT-F-02@v3.0 | draft | any | `F.dmh_group_counts=[3,3,3,3]` | `F=5` (each group capped at 2, sum 8) | W `factor_f_group_capped` |
| MAT-G-01@v3.0 | draft | ACA, collineen | `G.open_flowering_percent=2` | `G=5` | none |
| MAT-H-01@v3.0 | draft | any | `H.class=partial` | `H=2` | none |
| MAT-I-01@v3.0 | draft | any | `I.type_count=1` | `I=2` | none |
| MAT-I-02@v3.0 | draft | any | direct `I=1` | not scored | B `factor_invalid_score` |
| MAT-J-01@v3.0 | draft | any | `J.type_count=2` | `J=5` | none |
| MAT-CONS-01@v3.0 | draft | any | direct `A=0`, `B=2` | `A=0`, `B=2` | W `consistency_a_b` |
| MAT-CONS-02@v3.0 | draft | any | direct `E=0`, `F=5` | `E=0`, `F=5` | W `consistency_e_f` |
| MAT-SUBMIT-01@v3.0 | submit | ACA, collineen | factors incomplete (A to J not all present) | not all scored | B `factor_required` for each missing factor |
| MAT-SUBMIT-02@v3.0 | submit | ACA, collineen | direct `A=5, B=2, C=1, D=0, E=2, F=5, G=2, H=2, I=5, J=0` | same scores; `ok=true` | none |

MAT-SUBMIT-02@v3.0 totals: `ibp_peuplement_gestion=17`, `ibp_contexte=7`, `ibp_total=24`.

## Cases run under both versions

Each case runs once with the v3.0 tag (or untagged) and once with the v3.2 tag.

| Case ID | Mode | Context | Input | Expected | Issues |
|---|---|---|---|---|---|
| MAT-G-03@both | draft | any | direct `G=1` | not scored | B `factor_invalid_score` (G allowed: 0, 2, 5) |
| MAT-H-02@both | draft | any | direct `H=1`; then `H.class_score=1` | not scored, both inputs | B `factor_invalid_score` (H allowed: 0, 2, 5) |

## v3.2 cases

All v3.2 cases carry the tag `cnpf_ibp_fr_v3_2_2026-02-02`. Under v3.2, A needs a native-cover
input (`A.native_cover_percent` from 0 to 100, or the boolean `A.native_cover_below_50`); A and G
need `ibp_cas`. The cas-3 scale for A and G applies when `ibp_cas=3` or `ibp_cas3_scale=true`.

| Case ID | Mode | Context | Input | Expected | Issues |
|---|---|---|---|---|---|
| MAT-A-01@v3.2 | draft | cas 1 | `A.native_genus_count=2`, `A.native_cover_percent=60` | `A=1` | none |
| MAT-A-02@v3.2 | draft | cas 3; then cas 1 | `A.native_genus_count=2`, `A.native_cover_percent=60` | cas 3: `A=2`; cas 1: `A=1` | none |
| MAT-A-03@v3.2 | draft | cas 1 | `A.native_genus_count=5`, `A.native_cover_percent=40` | `A=2` (cap on A) | none |
| MAT-A-04@v3.2 | draft | cas 1 | `A.native_genus_count=5`, `A.native_cover_percent=50` | `A=5` (exactly 50 % is not capped) | none |
| MAT-A-05@v3.2 | draft | cas 2 with `ibp_cas3_scale=true`; then cas 2 alone | `A.native_genus_count=2`, `A.native_cover_percent=60` | with the flag: `A=2` (cas-3 scale); cas 2 alone: `A=1` | none |
| MAT-A-07@v3.2 | draft | cas 1 | `A.native_genus_count=1`, `A.native_cover_percent=10` | `A=0` (the cap never raises a score) | none |
| MAT-A-08@v3.2 | draft | cas 1 | `A.native_genus_count=5`, `A.native_cover_below_50=true` | `A=2` | none |
| MAT-A-09@v3.2 | draft | cas 1 | `A.genera=[Fagus, Quercus_deciduae, Quercus_sempervirens]`, `A.native_cover_percent=60` | `A=2` (count derived from the list: 3 distinct genera) | none |
| MAT-A-10@v3.2 | draft | cas 4; then cas 1 | `A.genera=[Fagus, Pistacia]`, `A.native_cover_percent=60` | cas 4: `A=1` (Pistacia counts, 2 genera); cas 1: `A=0` (Pistacia excluded, 1 genus) | none |
| MAT-A-11@v3.2 | draft | cas 1 | `A.genera=[Ficus]`, `A.native_cover_percent=60` | not scored | B `factor_a_genus_invalid` (Ficus is not on the CNPF list, A-6) |
| MAT-B-01@v3.2 | draft | any | `B.strata_count=5` (no cover) | `B=5` | none |
| MAT-C-01@v3.2 | draft | any | `C.bmg_count=0`, `C.bmm_count=2`, `C.surface_ha=1` | `C=1` | none |
| MAT-C-02@v3.2 | draft | any | `C.bmg_count=1`, `C.bmm_count=1`, `C.surface_ha=2` | `C=1` ((BMg+BMm)/ha = 1) | none |
| MAT-C-03@v3.2 | draft | any | `C.bmg_count=0`, `C.bmm_count=9`, `C.surface_ha=10` (BMm 0.9/ha) | `C=0` | none |
| MAT-D-01@v3.2 | draft | any | `D.bmg_count=4`, `D.bmm_count=0`, `D.surface_ha=1` | `D=5` | none |
| MAT-E-01@v3.2 | draft | any | `E.tgb_count=0`, `E.gb_count=2`, `E.surface_ha=1` | `E=1` | none |
| MAT-E-02@v3.2 | draft | any | `E.tgb_count=1`, `E.gb_count=1`, `E.surface_ha=2` | `E=1` ((GB+TGB)/ha = 1) | none |
| MAT-F-01@v3.2 | draft | any | `F.trees_per_ha=8` | `F=5` | none |
| MAT-F-02@v3.2 | draft | any | `F.dmh_group_counts=[3,3,3,3]` | `F=5` | W `factor_f_group_capped` |
| MAT-G-01@v3.2 | draft | cas 1 | `G.open_flowering_percent=2` | `G=5` | none |
| MAT-G-02@v3.2 | draft | cas 3; then cas 1 | cas 3: `G.open_flowering_percent=0.5`, then `6`; cas 1: `6` | cas 3: `G=2`, then `G=5`; cas 1 at 6 %: `G=2` | none |
| MAT-H-01@v3.2 | draft | any | `H.class=partial` | `H=2` | none |
| MAT-I-01@v3.2 | draft | any | `I.type_count=1` | `I=2` | none |
| MAT-I-02@v3.2 | draft | any | direct `I=1` | not scored | B `factor_invalid_score` |
| MAT-J-01@v3.2 | draft | any | `J.type_count=2` | `J=5` | none |
| MAT-CONS-01@v3.2 | draft | any | direct `A=0`, `B=2` | `A=0`, `B=2` | W `consistency_a_b` |
| MAT-CONS-02@v3.2 | draft | any | direct `E=0`, `F=5` | `E=0`, `F=5` | W `consistency_e_f` |
| MAT-CAS-01@v3.2 | draft; then submit | no `ibp_cas` | A count and cover, G percent, other factors complete | draft: A and G not scored, `ok=true`; submit: A and G not scored | draft: W `factor_incomplete` (A, G); submit: B `ibp_cas_required`, B `factor_required` (A, G) |
| MAT-CAS-02@v3.2 | draft; then submit | cas 1 | `A.native_genus_count=5` without any cover | A not scored; draft `ok=true` | draft: W `factor_incomplete` (A); submit (other factors complete): B `factor_required` (A) |
| MAT-SUBMIT-01@v3.2 | submit | no `ibp_cas` | factors incomplete | not all scored | B `ibp_cas_required`, B `factor_required` for each missing or incomplete factor |
| MAT-SUBMIT-02@v3.2 | submit | cas 1 | direct `A=5, B=2, C=1, D=0, E=2, F=5, G=2, H=2, I=5, J=0` | same scores; `ok=true` | none |

MAT-SUBMIT-02@v3.2 totals: `ibp_peuplement_gestion=17`, `ibp_contexte=7`, `ibp_total=24`. They
equal the v3.0 totals: the aggregation is unchanged (GS-1).

## Dispatch cases

| Case ID | Mode | Method | Input | Expected | Issues |
|---|---|---|---|---|---|
| MAT-VER-01 | draft | untagged; v3.0 tag; v3.2 tag | `C.bmg_count=1`, `C.bmm_count=1`, `C.surface_ha=2` | untagged: `C=0`; v3.0 tag: `C=0`; v3.2 tag: `C=1` | none |
| MAT-VER-02 | draft | unknown string (for example `cnpf_ibp_fr_v9`) | any factors | not scored | B `ibp_method_version_unsupported` |

MAT-VER-01 has an API E2E part as well: an identical replay of a submitted survey recorded
without a method version returns `synced`, not 422.

## Submit readiness (mobile)

Run by the mobile adapter test from `IBP_READINESS_CASES`. The row labels are descriptive; the
fixture's own ids are not cross-checked.

| Row | Draft | Expected `missing_fields` includes |
|---|---|---|
| R-1 | v3.2, factors complete, no `ibp_cas` | `ibp_cas` |
| R-2 | v3.0 (or untagged), factors complete, no region or stage | `region_version`, `vegetation_stage` |
| R-3 | v3.2 with `ibp_cas` set | neither `ibp_cas` nor region or stage |

## Draft migration to v3.2 (mobile)

Run by the mobile adapter test from `IBP_MIGRATION_CASES`. The migration runs only when an
observer switches an unsubmitted v3.0 draft to v3.2 (CH-7, D-08). The input object is not
mutated.

| Row | v3.0 draft | Expected v3.2 draft |
|---|---|---|
| M-1 | ACA, collineen; `B.covered_autochthonous_percent=40` | `ibp_method_version` = v3.2 tag, `ibp_cas=1`, `ibp_cas3_scale=false`, `A.native_cover_percent=40`, no cover under B, no region or stage |
| M-2 | ACA, subalpin | `ibp_cas` empty (the observer picks cas 1 or 3) |
| M-3 | M, supra_mediterraneen | `ibp_cas` empty (flagged for review) |
| M-4 | M, meso_mediterraneen | `ibp_cas=4` |

## Field-definition rows

Where each field-definition row of the comparison document lands in the app (D-09).

| Rows | Treatment |
|---|---|
| CLS-1, CLS-3, CLS-4 | New inputs: cas picker (1 to 4) and the cas-3 scale switch (`ibp_cas3_scale`) |
| A-1 | New input: native cover on A (`A.native_cover_percent`) |
| A-2, A-3, A-4, A-5, A-8 | Contract and package done in phase 5 (`A.genera`, CH-12; MAT-A-09..11 above); the mobile genus-entry UI and help text are phase 6 |
| B-2, B-3 | Help text: strata heights per cas (cas 1: 1.5-7, 7-18, over 18 m; cas 2, 3 and 4: 1.5-5, 5-12, over 12 m) |
| CD-2, CD-3, CD-4, CD-5, E-2, E-3, E-4 | Help text: diameter thresholds per cas and the slow-growing species list |
| F-1, F-2, F-3, F-6 | Help text: dendromicrohabitat groups and orchards |
| G-1 | Help text: intermediate and high strata excluded |
| H-1, H-2 | Help text: grazing, orchards, the 10 % cover rule |
| I-1, I-2 | Help text: "Mer ou océan", ruts excluded |
| J-1 | Help text: twelve rocky types |
| F-5, G-3, CD-6 | **Not applicable**: these rows concern linear stands, which the app does not have (D-09) |
| CLS-5, CLS-6, A-6, A-7, H-3, J-2, GS-3 | Documented only (wording, or questions for CNPF) |

## Aggregate score rules

Unchanged between versions (GS-1):

- `ibp_peuplement_gestion = A + B + C + D + E + F + G` (maximum 35)
- `ibp_contexte = H + I + J` (maximum 15)
- `ibp_total = ibp_peuplement_gestion + ibp_contexte` (maximum 50)

## Notes

- Allowed scores, both versions:
  - A to F: `0 | 1 | 2 | 5`
  - G, H, I, J: `0 | 2 | 5` (G and H corrected by BUG-2; v3.2 p. 4)
- Native-cover cap (A-1, BUG-1): when the native cover is below 50 %, A = min(A score from the
  count, 2). Exactly 50 % is not capped. B has no cap.
  - v3.0: the cover is read from `A.native_cover_percent`, else `A.native_cover_below_50`, else
    the legacy `B.covered_autochthonous_percent` or `B.native_cover_percent`. Unknown cover means
    no cap, as before.
  - v3.2: the cover is required; A without it is incomplete (MAT-CAS-02).
  - Both versions: an `A.native_cover_percent` that is not a number from 0 to 100 is unreadable
    (B `factor_invalid_raw`); an A object with a cover but no genus count is incomplete.
- Cas-3 scale for A and G (v3.2): used when `ibp_cas=3` or `ibp_cas3_scale=true`. The flag covers
  cas 2 in a zone whose macroclimate matches cas 3, and stands on lapiaz, dunes, peat bogs or
  dominated by *Juniperus thurifera* (p. 3 "Cas 1, 4 et 2\*", p. 4 footnote \*, p. 7). A cas
  number alone cannot express these, hence the separate flag.
- Scales: A standard `<=1 -> 0`, `2 -> 1`, `3-4 -> 2`, `>=5 -> 5`; A subalpine or cas 3
  `0 -> 0`, `1 -> 1`, `2 -> 2`, `>=3 -> 5`. G standard: `0 -> 0`, under 1 % or over 5 % `-> 2`,
  1 to 5 % `-> 5`; G subalpine or cas 3: `0 -> 0`, under 1 % `-> 2`, 1 % or more `-> 5`.
- C, D and E under v3.2 test the sum of the two diameter classes for score 1 (CD-1, E-1); under
  v3.0 the lower class alone.
- Consistency warnings (`consistency_a_b`, `consistency_e_f`, app heuristics, both versions) compare
  two scored factors: they fire only when both factors of the pair are scored. A factor that is
  absent or incomplete is not "very low" (before 01.8 an absent factor counted as 0, so MAT-B-01 or
  MAT-F-01 alone would have warned).
- Canonical class mapping: `0 -> S0`, `1 -> S1`, `2 -> S2`, `5 -> S5`.
- Status: implemented in phase 01.8 (`packages/ibp-domain`).
