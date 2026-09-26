# IBP Validation Matrix (V1)

## Status
Accepted for implementation baseline (2026-03-09)

## Method version
The 17 cases in the Case Matrix encode IBP Fr v3.0 as the app implements it today (API
`ibp-rules.service.ts`, mobile `ibp-scoring.ts`). They stay the baseline until phase 01.8.

[ADR-003](adr-003-ibp-method-version-v1.md) adopts IBP FR v3.2 (02/02/2026). Phase 01.8 changes
the rules and produces `ibp-validation-matrix-v2.md` from this file (CH-10). The differences are
listed in [`ibp-version-comparison-v3.0-v3.2.md`](ibp-version-comparison-v3.0-v3.2.md). The two
sections after the Case Matrix show which cases move under v3.2 and the cases v3.2 adds; neither
is implemented yet.

## Purpose
Define a stable set of reference cases for the IBP rule engine.  
Each case is intended to be covered by automated tests (`api/test/ibp-rules.spec.ts`).

## Scope
- Factor normalization from raw observation payloads
- Canonical factor outputs (`selected_class`, `score_points`)
- Aggregate score computation
- Blocking vs non-blocking validation outcomes

## Case Matrix

| Case ID | Context | Input | Expected |
|---|---|---|---|
| MAT-A-01 | `region=ACA`, `stage=collineen` | `A.native_genus_count=2` | `A=1` (`S1`) |
| MAT-A-02 | `region=ACA`, `stage=subalpin` | `A.native_genus_count=2` | `A=2` (`S2`) |
| MAT-B-01 | any | `B.strata_count=5`, `B.covered_autochthonous_percent=40` | `B=2` (cover cap applied) |
| MAT-C-01 | any | `C.bmg_count=0`, `C.bmm_count=2`, `C.surface_ha=1` | `C=1` (`S1`) |
| MAT-D-01 | any | `D.bmg_count=4`, `D.bmm_count=0`, `D.surface_ha=1` | `D=5` (`S5`) |
| MAT-E-01 | any | `E.tgb_count=0`, `E.gb_count=2`, `E.surface_ha=1` | `E=1` (`S1`) |
| MAT-F-01 | any | `F.trees_per_ha=8` | `F=5` (`S5`) |
| MAT-F-02 | any | `F.dmh_group_counts=[3,3,3,3]` | `F=5` + non-blocking warning `factor_f_group_capped` |
| MAT-G-01 | `region=ACA`, `stage=collineen` | `G.open_flowering_percent=2` | `G=5` (`S5`) |
| MAT-H-01 | any | `H.class=partial` | `H=2` (`S2`) |
| MAT-I-01 | any | `I.type_count=1` | `I=2` (`S2`) |
| MAT-I-02 | any | direct `I=1` | blocking error (`I` allowed scores: `0,2,5`) |
| MAT-J-01 | any | `J.type_count=2` | `J=5` (`S5`) |
| MAT-CONS-01 | any | `A=0`, `B=2` | non-blocking consistency warning `consistency_a_b` |
| MAT-CONS-02 | any | `E=0`, `F=5` | non-blocking consistency warning `consistency_e_f` |
| MAT-SUBMIT-01 | submit | expired `expires_at` + incomplete factors | blocking errors (`survey_expired`, missing factors) |
| MAT-SUBMIT-02 | submit | complete valid payload A..J | `ok=true` + valid aggregates (`ibp_total`) |

## Impact of v3.2 on these cases

Row IDs in the Reference column point to
[`ibp-version-comparison-v3.0-v3.2.md`](ibp-version-comparison-v3.0-v3.2.md).

| Case | Under v3.2 | Reference |
|---|---|---|
| MAT-A-01 | Context becomes cas 1 (native cover >= 50 % now needed as an A input); value unchanged: `A=1` | CLS-1, A-1 |
| MAT-A-02 | Context becomes cas 3 (middle or upper subalpine) to keep `A=2`; the lower subalpine is cas 1 and gives `A=1` | CLS-1, CLS-2 |
| MAT-B-01 | **Value changes:** `B=5`. The native-cover cap moves to A (A capped at 2 when its raw score is above 2) | A-1, B-1, BUG-1 |
| MAT-G-01 | Context becomes cas 1; value unchanged: `G=5` | CLS-1, G-2 |
| MAT-SUBMIT-01 | The blocking error list grows if the cas and the method version become required at submit | CLS-1, CH-6 |
| MAT-SUBMIT-02 | Context expressed as a cas instead of region/stage; same totals | CLS-1, GS-1 |

The other 11 cases (MAT-C-01, MAT-D-01, MAT-E-01, MAT-F-01, MAT-F-02, MAT-H-01, MAT-I-01,
MAT-I-02, MAT-J-01, MAT-CONS-01, MAT-CONS-02) keep their expected values under v3.2.

## v3.2 target cases (not implemented yet)

**v3.2 target, not implemented yet. These cases are specified for phase 01.8. They fail against
today's v3.0 engine by design and must not be added to `api/test/ibp-rules.spec.ts` or the mobile
tests before 01.8.** Inputs are named in words where no field exists today; the payload shape is
01.8's decision.

| Case ID | Context | Input | Expected |
|---|---|---|---|
| MAT-A-03 | cas 1 | `A.native_genus_count=5`, A native cover 40 % | `A=2` (native-cover cap on A) |
| MAT-A-04 | cas 1 | `A.native_genus_count=5`, A native cover 50 % | `A=5` (exactly 50 % is not capped) |
| MAT-A-05 | cas 2 in a cas-3 zone, or on lapiaz/dune/peat-bog/*Juniperus thurifera* habitat | `A.native_genus_count=2` | `A=2` (cas-3 scale) |
| MAT-C-02 | any | `C.bmg_count=1`, `C.bmm_count=1`, `C.surface_ha=2` | `C=1` ((BMm+BMg)/ha >= 1; v3.0 gives `C=0`) |
| MAT-E-02 | any | `E.tgb_count=1`, `E.gb_count=1`, `E.surface_ha=2` | `E=1` ((GB+TGB)/ha >= 1; v3.0 gives `E=0`) |
| MAT-G-02 | cas 3 | `G.open_flowering_percent=0.5`; then `G.open_flowering_percent=6` | `G=2`; then `G=5` |
| MAT-G-03 | any | direct `G=1` | blocking error (`G` allowed scores: `0,2,5`) |
| MAT-H-02 | any | direct `H=1`, or `H.class_score=1` | blocking error (`H` allowed scores: `0,2,5`) |
| MAT-VER-01 | method version v3.0 (tag, or no tag) | a v3.0 payload; an identical replay of a submitted v3.0 survey | scored with v3.0 rules; the replay stays accepted (no 422) |

## Aggregate Score Rules
- `ibp_peuplement_gestion = A + B + C + D + E + F + G`
- `ibp_contexte = H + I + J`
- `ibp_total = ibp_peuplement_gestion + ibp_contexte`

## Notes
- Allowed scores:
  - A..H: `0 | 1 | 2 | 5`
    - Known divergence (BUG-2): both CNPF versions (v3.0 and FR v3.2) allow only `0 | 2 | 5` for G
      and H. The current engine accepts 1; phase 01.8 fixes it (CH-5). This line describes the
      current engine.
  - I, J: `0 | 2 | 5`
- Canonical class mapping:
  - `0 -> S0`
  - `1 -> S1`
  - `2 -> S2`
  - `5 -> S5`
