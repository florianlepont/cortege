import type { IbpScores } from "../contract/survey"
import type { IbpEvaluationInput, IbpEvaluationMode } from "../evaluate"
import type { FactorKey } from "../factors"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "../method-version"
import type { SubmitReadiness } from "../readiness"

// The parity fixture (D-07, CH-10): the executable form of docs/technical/ibp-validation-matrix-v2.md.
// Expected values are worked out by hand from the matrix and the CNPF rules, never pasted from the
// engine's output. The package runs it (parity.test.ts); the API and mobile suites run the same
// data through their adapters, which proves both sides delegate to the package.

export type IbpParityCase = {
  /** Unique id: the matrix id, plus "#variant" when one matrix case runs several inputs. */
  id: string
  /** Case id in ibp-validation-matrix-v2.md (cross-checked by the phase gate). */
  matrixId: string
  /** Stored method version; null = untagged (v3.0). */
  method: string | null
  mode: IbpEvaluationMode
  context?: {
    region_version?: string
    vegetation_stage?: string
    ibp_cas?: number
    ibp_cas3_scale?: boolean
  }
  factors: Record<string, unknown>
  expect: {
    ok: boolean
    /** Per-factor score; null = not scored (missing, invalid or incomplete). */
    scores: Partial<Record<FactorKey, number | null>>
    totals?: IbpScores
    /** Blocking and non-blocking issue codes, compared as a set (order and repeats ignored). */
    issueCodes: string[]
  }
}

export type IbpReadinessCase = {
  id: string
  draft: IbpEvaluationInput
  expect: SubmitReadiness
}

export type IbpMigrationCase = {
  id: string
  draft: IbpEvaluationInput & { id?: string }
  expect: IbpEvaluationInput & { id?: string }
}

const ACA_COLLINEEN = { region_version: "ACA", vegetation_stage: "collineen" }
const ACA_SUBALPIN = { region_version: "ACA", vegetation_stage: "subalpin" }
const CAS_1 = { ibp_cas: 1 }

/** MAT-SUBMIT-02: direct scores, G = H = 2 (BUG-2). Stand 5+2+1+0+2+5+2 = 17, context 2+5+0 = 7. */
const COMPLETE_DIRECT = { A: 5, B: 2, C: 1, D: 0, E: 2, F: 5, G: 2, H: 2, I: 5, J: 0 }
const COMPLETE_DIRECT_TOTALS = { ibp_peuplement_gestion: 17, ibp_contexte: 7, ibp_total: 24 }

/** A complete v3.2 set whose A and G need the cas (MAT-CAS-01, readiness R-1). */
const COMPLETE_V32_OBJECTS = {
  ...COMPLETE_DIRECT,
  A: { native_genus_count: 5, native_cover_percent: 60 },
  G: { open_flowering_percent: 2 },
}

const C_BMG1_BMM1_2HA = { bmg_count: 1, bmm_count: 1, surface_ha: 2 }
const DMH_3333 = { dmh_group_counts: [3, 3, 3, 3] }

/** A case whose input and result are the same under v3.0 (untagged) and v3.2. */
function bothVersions(
  build: (suffix: "v3.0" | "v3.2") => Omit<IbpParityCase, "method">,
): IbpParityCase[] {
  return [
    { ...build("v3.0"), method: null },
    { ...build("v3.2"), method: IBP_METHOD_V3_2 },
  ]
}

const V30_CASES: IbpParityCase[] = [
  {
    id: "MAT-A-01@v3.0",
    matrixId: "MAT-A-01@v3.0",
    method: null,
    mode: "draft",
    context: ACA_COLLINEEN,
    factors: { A: { native_genus_count: 2 } },
    expect: { ok: true, scores: { A: 1 }, issueCodes: [] },
  },
  {
    id: "MAT-A-02@v3.0",
    matrixId: "MAT-A-02@v3.0",
    method: null,
    mode: "draft",
    context: ACA_SUBALPIN,
    factors: { A: { native_genus_count: 2 } },
    expect: { ok: true, scores: { A: 2 }, issueCodes: [] },
  },
  {
    // BUG-1: the cap is on A (cover read from B's legacy field); B itself is not capped.
    id: "MAT-A-06@v3.0",
    matrixId: "MAT-A-06@v3.0",
    method: IBP_METHOD_V3_0,
    mode: "draft",
    context: ACA_COLLINEEN,
    factors: {
      A: { native_genus_count: 5 },
      B: { strata_count: 5, covered_autochthonous_percent: 40 },
    },
    expect: { ok: true, scores: { A: 2, B: 5 }, issueCodes: [] },
  },
  {
    // Phase 5, D-15: the count is derived from a genus list instead of a bare number.
    id: "MAT-A-09@v3.0",
    matrixId: "MAT-A-09@v3.0",
    method: null,
    mode: "draft",
    factors: {
      A: {
        genera: ["Fagus", "Quercus_deciduae", "Quercus_sempervirens"],
        native_cover_percent: 60,
      },
    },
    expect: { ok: true, scores: { A: 2 }, issueCodes: [] },
  },
  {
    // v3.0 has no cas: the supplementary genera (Pistacia et al.) never count (D-15, genus.ts).
    id: "MAT-A-10@v3.0",
    matrixId: "MAT-A-10@v3.0",
    method: null,
    mode: "draft",
    factors: { A: { genera: ["Fagus", "Pistacia"], native_cover_percent: 60 } },
    expect: { ok: true, scores: { A: 0 }, issueCodes: [] },
  },
  {
    // Ficus is not on the CNPF list (A-6): blocking, whichever version.
    id: "MAT-A-11@v3.0",
    matrixId: "MAT-A-11@v3.0",
    method: null,
    mode: "draft",
    factors: { A: { genera: ["Ficus"], native_cover_percent: 60 } },
    expect: { ok: false, scores: { A: null }, issueCodes: ["factor_a_genus_invalid"] },
  },
  {
    // v1 said B = 2 (the cap was on B); fixed by BUG-1.
    id: "MAT-B-01@v3.0",
    matrixId: "MAT-B-01@v3.0",
    method: null,
    mode: "draft",
    factors: { B: { strata_count: 5, covered_autochthonous_percent: 40 } },
    expect: { ok: true, scores: { B: 5, A: null }, issueCodes: [] },
  },
  {
    id: "MAT-C-01@v3.0",
    matrixId: "MAT-C-01@v3.0",
    method: null,
    mode: "draft",
    factors: { C: { bmg_count: 0, bmm_count: 2, surface_ha: 1 } },
    expect: { ok: true, scores: { C: 1 }, issueCodes: [] },
  },
  {
    // BMg/ha 0.5 and BMm/ha 0.5: the lower class alone is under 1/ha.
    id: "MAT-C-02@v3.0",
    matrixId: "MAT-C-02@v3.0",
    method: null,
    mode: "draft",
    factors: { C: C_BMG1_BMM1_2HA },
    expect: { ok: true, scores: { C: 0 }, issueCodes: [] },
  },
  {
    id: "MAT-D-01@v3.0",
    matrixId: "MAT-D-01@v3.0",
    method: null,
    mode: "draft",
    factors: { D: { bmg_count: 4, bmm_count: 0, surface_ha: 1 } },
    expect: { ok: true, scores: { D: 5 }, issueCodes: [] },
  },
  {
    id: "MAT-E-01@v3.0",
    matrixId: "MAT-E-01@v3.0",
    method: null,
    mode: "draft",
    factors: { E: { tgb_count: 0, gb_count: 2, surface_ha: 1 } },
    expect: { ok: true, scores: { E: 1 }, issueCodes: [] },
  },
  {
    id: "MAT-E-02@v3.0",
    matrixId: "MAT-E-02@v3.0",
    method: null,
    mode: "draft",
    factors: { E: { tgb_count: 1, gb_count: 1, surface_ha: 2 } },
    expect: { ok: true, scores: { E: 0 }, issueCodes: [] },
  },
  {
    id: "MAT-F-01@v3.0",
    matrixId: "MAT-F-01@v3.0",
    method: null,
    mode: "draft",
    factors: { F: { trees_per_ha: 8 } },
    expect: { ok: true, scores: { F: 5 }, issueCodes: [] },
  },
  {
    // Each group capped at 2: 2+2+2+2 = 8 → 5, one warning per capped group.
    id: "MAT-F-02@v3.0",
    matrixId: "MAT-F-02@v3.0",
    method: null,
    mode: "draft",
    factors: { F: DMH_3333 },
    expect: { ok: true, scores: { F: 5 }, issueCodes: ["factor_f_group_capped"] },
  },
  {
    id: "MAT-G-01@v3.0",
    matrixId: "MAT-G-01@v3.0",
    method: null,
    mode: "draft",
    context: ACA_COLLINEEN,
    factors: { G: { open_flowering_percent: 2 } },
    expect: { ok: true, scores: { G: 5 }, issueCodes: [] },
  },
  {
    id: "MAT-H-01@v3.0",
    matrixId: "MAT-H-01@v3.0",
    method: null,
    mode: "draft",
    factors: { H: { class: "partial" } },
    expect: { ok: true, scores: { H: 2 }, issueCodes: [] },
  },
  {
    id: "MAT-I-01@v3.0",
    matrixId: "MAT-I-01@v3.0",
    method: null,
    mode: "draft",
    factors: { I: { type_count: 1 } },
    expect: { ok: true, scores: { I: 2 }, issueCodes: [] },
  },
  {
    id: "MAT-I-02@v3.0",
    matrixId: "MAT-I-02@v3.0",
    method: null,
    mode: "draft",
    factors: { I: 1 },
    expect: { ok: false, scores: { I: null }, issueCodes: ["factor_invalid_score"] },
  },
  {
    id: "MAT-J-01@v3.0",
    matrixId: "MAT-J-01@v3.0",
    method: null,
    mode: "draft",
    factors: { J: { type_count: 2 } },
    expect: { ok: true, scores: { J: 5 }, issueCodes: [] },
  },
  {
    id: "MAT-CONS-01@v3.0",
    matrixId: "MAT-CONS-01@v3.0",
    method: null,
    mode: "draft",
    factors: { A: 0, B: 2 },
    expect: { ok: true, scores: { A: 0, B: 2 }, issueCodes: ["consistency_a_b"] },
  },
  {
    id: "MAT-CONS-02@v3.0",
    matrixId: "MAT-CONS-02@v3.0",
    method: null,
    mode: "draft",
    factors: { E: 0, F: 5 },
    expect: { ok: true, scores: { E: 0, F: 5 }, issueCodes: ["consistency_e_f"] },
  },
  {
    // A (2 genera, collineen) = 1, B (3 strata) = 2, C direct 1; D to J missing.
    id: "MAT-SUBMIT-01@v3.0",
    matrixId: "MAT-SUBMIT-01@v3.0",
    method: null,
    mode: "submit",
    context: ACA_COLLINEEN,
    factors: { A: { native_genus_count: 2 }, B: { strata_count: 3 }, C: 1 },
    expect: {
      ok: false,
      scores: { A: 1, B: 2, C: 1, D: null, J: null },
      issueCodes: ["factor_required"],
    },
  },
  {
    id: "MAT-SUBMIT-02@v3.0",
    matrixId: "MAT-SUBMIT-02@v3.0",
    method: IBP_METHOD_V3_0,
    mode: "submit",
    context: ACA_COLLINEEN,
    factors: COMPLETE_DIRECT,
    expect: { ok: true, scores: COMPLETE_DIRECT, totals: COMPLETE_DIRECT_TOTALS, issueCodes: [] },
  },
]

const BOTH_CASES: IbpParityCase[] = [
  ...bothVersions((suffix) => ({
    id: `MAT-G-03@both#${suffix}`,
    matrixId: "MAT-G-03@both",
    mode: "draft",
    context: suffix === "v3.2" ? CAS_1 : ACA_COLLINEEN,
    factors: { G: 1 },
    expect: { ok: false, scores: { G: null }, issueCodes: ["factor_invalid_score"] },
  })),
  ...bothVersions((suffix) => ({
    id: `MAT-H-02@both#${suffix}-direct`,
    matrixId: "MAT-H-02@both",
    mode: "draft",
    factors: { H: 1 },
    expect: { ok: false, scores: { H: null }, issueCodes: ["factor_invalid_score"] },
  })),
  ...bothVersions((suffix) => ({
    id: `MAT-H-02@both#${suffix}-class-score`,
    matrixId: "MAT-H-02@both",
    mode: "draft",
    factors: { H: { class_score: 1 } },
    expect: { ok: false, scores: { H: null }, issueCodes: ["factor_invalid_score"] },
  })),
]

/** A v3.2 draft case (tag set); most v3.2 cases are cas 1. */
function v32(
  c: Omit<IbpParityCase, "method" | "mode" | "matrixId"> & {
    matrixId?: string
    mode?: IbpEvaluationMode
  },
): IbpParityCase {
  return {
    mode: "draft",
    context: CAS_1,
    ...c,
    matrixId: c.matrixId ?? c.id,
    method: IBP_METHOD_V3_2,
  }
}

const A_2_GENERA_COVER_60 = { native_genus_count: 2, native_cover_percent: 60 }

const V32_CASES: IbpParityCase[] = [
  v32({
    id: "MAT-A-01@v3.2",
    factors: { A: A_2_GENERA_COVER_60 },
    expect: { ok: true, scores: { A: 1 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-02@v3.2#cas-3",
    matrixId: "MAT-A-02@v3.2",
    context: { ibp_cas: 3 },
    factors: { A: A_2_GENERA_COVER_60 },
    expect: { ok: true, scores: { A: 2 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-02@v3.2#cas-1",
    matrixId: "MAT-A-02@v3.2",
    factors: { A: A_2_GENERA_COVER_60 },
    expect: { ok: true, scores: { A: 1 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-03@v3.2",
    factors: { A: { native_genus_count: 5, native_cover_percent: 40 } },
    expect: { ok: true, scores: { A: 2 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-04@v3.2",
    factors: { A: { native_genus_count: 5, native_cover_percent: 50 } },
    expect: { ok: true, scores: { A: 5 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-05@v3.2#cas-2-cas3-scale",
    matrixId: "MAT-A-05@v3.2",
    context: { ibp_cas: 2, ibp_cas3_scale: true },
    factors: { A: A_2_GENERA_COVER_60 },
    expect: { ok: true, scores: { A: 2 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-05@v3.2#cas-2",
    matrixId: "MAT-A-05@v3.2",
    context: { ibp_cas: 2 },
    factors: { A: A_2_GENERA_COVER_60 },
    expect: { ok: true, scores: { A: 1 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-07@v3.2",
    factors: { A: { native_genus_count: 1, native_cover_percent: 10 } },
    expect: { ok: true, scores: { A: 0 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-08@v3.2",
    factors: { A: { native_genus_count: 5, native_cover_below_50: true } },
    expect: { ok: true, scores: { A: 2 }, issueCodes: [] },
  }),
  v32({
    // Phase 5, D-15: the count is derived from a genus list instead of a bare number.
    id: "MAT-A-09@v3.2",
    factors: {
      A: {
        genera: ["Fagus", "Quercus_deciduae", "Quercus_sempervirens"],
        native_cover_percent: 60,
      },
    },
    expect: { ok: true, scores: { A: 2 }, issueCodes: [] },
  }),
  v32({
    // Supplementary genus (Pistacia): counted in cas 4, silently excluded in cas 1.
    id: "MAT-A-10@v3.2#cas-4-counts",
    matrixId: "MAT-A-10@v3.2",
    context: { ibp_cas: 4 },
    factors: { A: { genera: ["Fagus", "Pistacia"], native_cover_percent: 60 } },
    expect: { ok: true, scores: { A: 1 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-A-10@v3.2#cas-1-excluded",
    matrixId: "MAT-A-10@v3.2",
    factors: { A: { genera: ["Fagus", "Pistacia"], native_cover_percent: 60 } },
    expect: { ok: true, scores: { A: 0 }, issueCodes: [] },
  }),
  v32({
    // Ficus is not on the CNPF list (A-6): blocking, whichever version.
    id: "MAT-A-11@v3.2",
    factors: { A: { genera: ["Ficus"], native_cover_percent: 60 } },
    expect: { ok: false, scores: { A: null }, issueCodes: ["factor_a_genus_invalid"] },
  }),
  v32({
    id: "MAT-B-01@v3.2",
    factors: { B: { strata_count: 5 } },
    expect: { ok: true, scores: { B: 5 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-C-01@v3.2",
    factors: { C: { bmg_count: 0, bmm_count: 2, surface_ha: 1 } },
    expect: { ok: true, scores: { C: 1 }, issueCodes: [] },
  }),
  v32({
    // (BMg + BMm)/ha = 2/2 = 1 ≥ 1 with BMg/ha 0.5 < 1.
    id: "MAT-C-02@v3.2",
    factors: { C: C_BMG1_BMM1_2HA },
    expect: { ok: true, scores: { C: 1 }, issueCodes: [] },
  }),
  v32({
    // BMm density 0.9/ha (9 on 10 ha), no BMg: the sum stays under 1/ha.
    id: "MAT-C-03@v3.2",
    factors: { C: { bmg_count: 0, bmm_count: 9, surface_ha: 10 } },
    expect: { ok: true, scores: { C: 0 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-D-01@v3.2",
    factors: { D: { bmg_count: 4, bmm_count: 0, surface_ha: 1 } },
    expect: { ok: true, scores: { D: 5 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-E-01@v3.2",
    factors: { E: { tgb_count: 0, gb_count: 2, surface_ha: 1 } },
    expect: { ok: true, scores: { E: 1 }, issueCodes: [] },
  }),
  v32({
    // (GB + TGB)/ha = 2/2 = 1 ≥ 1 with TGB/ha 0.5 < 1.
    id: "MAT-E-02@v3.2",
    factors: { E: { tgb_count: 1, gb_count: 1, surface_ha: 2 } },
    expect: { ok: true, scores: { E: 1 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-F-01@v3.2",
    factors: { F: { trees_per_ha: 8 } },
    expect: { ok: true, scores: { F: 5 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-F-02@v3.2",
    factors: { F: DMH_3333 },
    expect: { ok: true, scores: { F: 5 }, issueCodes: ["factor_f_group_capped"] },
  }),
  v32({
    id: "MAT-G-01@v3.2",
    factors: { G: { open_flowering_percent: 2 } },
    expect: { ok: true, scores: { G: 5 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-G-02@v3.2#cas-3-0.5",
    matrixId: "MAT-G-02@v3.2",
    context: { ibp_cas: 3 },
    factors: { G: { open_flowering_percent: 0.5 } },
    expect: { ok: true, scores: { G: 2 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-G-02@v3.2#cas-3-6",
    matrixId: "MAT-G-02@v3.2",
    context: { ibp_cas: 3 },
    factors: { G: { open_flowering_percent: 6 } },
    expect: { ok: true, scores: { G: 5 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-G-02@v3.2#cas-1-6",
    matrixId: "MAT-G-02@v3.2",
    factors: { G: { open_flowering_percent: 6 } },
    expect: { ok: true, scores: { G: 2 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-H-01@v3.2",
    factors: { H: { class: "partial" } },
    expect: { ok: true, scores: { H: 2 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-I-01@v3.2",
    factors: { I: { type_count: 1 } },
    expect: { ok: true, scores: { I: 2 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-I-02@v3.2",
    factors: { I: 1 },
    expect: { ok: false, scores: { I: null }, issueCodes: ["factor_invalid_score"] },
  }),
  v32({
    id: "MAT-J-01@v3.2",
    factors: { J: { type_count: 2 } },
    expect: { ok: true, scores: { J: 5 }, issueCodes: [] },
  }),
  v32({
    id: "MAT-CONS-01@v3.2",
    factors: { A: 0, B: 2 },
    expect: { ok: true, scores: { A: 0, B: 2 }, issueCodes: ["consistency_a_b"] },
  }),
  v32({
    id: "MAT-CONS-02@v3.2",
    factors: { E: 0, F: 5 },
    expect: { ok: true, scores: { E: 0, F: 5 }, issueCodes: ["consistency_e_f"] },
  }),
  v32({
    id: "MAT-CAS-01@v3.2#draft",
    matrixId: "MAT-CAS-01@v3.2",
    context: {},
    factors: COMPLETE_V32_OBJECTS,
    expect: {
      ok: true,
      scores: { A: null, G: null, B: 2, H: 2 },
      issueCodes: ["factor_incomplete"],
    },
  }),
  v32({
    id: "MAT-CAS-01@v3.2#submit",
    matrixId: "MAT-CAS-01@v3.2",
    mode: "submit",
    context: {},
    factors: COMPLETE_V32_OBJECTS,
    expect: {
      ok: false,
      scores: { A: null, G: null, B: 2, H: 2 },
      issueCodes: ["ibp_cas_required", "factor_required"],
    },
  }),
  v32({
    id: "MAT-CAS-02@v3.2#draft",
    matrixId: "MAT-CAS-02@v3.2",
    factors: { A: { native_genus_count: 5 } },
    expect: { ok: true, scores: { A: null }, issueCodes: ["factor_incomplete"] },
  }),
  v32({
    id: "MAT-CAS-02@v3.2#submit",
    matrixId: "MAT-CAS-02@v3.2",
    mode: "submit",
    factors: { ...COMPLETE_DIRECT, A: { native_genus_count: 5 } },
    expect: { ok: false, scores: { A: null, B: 2 }, issueCodes: ["factor_required"] },
  }),
  v32({
    // No cas: A and G incomplete; B (3 strata) = 2; C to F, H to J missing.
    id: "MAT-SUBMIT-01@v3.2",
    mode: "submit",
    context: {},
    factors: {
      A: { native_genus_count: 5, native_cover_percent: 60 },
      B: { strata_count: 3 },
      G: { open_flowering_percent: 2 },
    },
    expect: {
      ok: false,
      scores: { A: null, B: 2, G: null, J: null },
      issueCodes: ["ibp_cas_required", "factor_required"],
    },
  }),
  v32({
    id: "MAT-SUBMIT-02@v3.2",
    mode: "submit",
    factors: COMPLETE_DIRECT,
    expect: { ok: true, scores: COMPLETE_DIRECT, totals: COMPLETE_DIRECT_TOTALS, issueCodes: [] },
  }),
]

const DISPATCH_CASES: IbpParityCase[] = [
  {
    id: "MAT-VER-01#untagged",
    matrixId: "MAT-VER-01",
    method: null,
    mode: "draft",
    factors: { C: C_BMG1_BMM1_2HA },
    expect: { ok: true, scores: { C: 0 }, issueCodes: [] },
  },
  {
    id: "MAT-VER-01#v3.0",
    matrixId: "MAT-VER-01",
    method: IBP_METHOD_V3_0,
    mode: "draft",
    factors: { C: C_BMG1_BMM1_2HA },
    expect: { ok: true, scores: { C: 0 }, issueCodes: [] },
  },
  {
    id: "MAT-VER-01#v3.2",
    matrixId: "MAT-VER-01",
    method: IBP_METHOD_V3_2,
    mode: "draft",
    factors: { C: C_BMG1_BMM1_2HA },
    expect: { ok: true, scores: { C: 1 }, issueCodes: [] },
  },
  {
    id: "MAT-VER-02",
    matrixId: "MAT-VER-02",
    method: "cnpf_ibp_fr_v9",
    mode: "draft",
    context: CAS_1,
    factors: { A: 5, C: C_BMG1_BMM1_2HA },
    expect: {
      ok: false,
      scores: { A: null, C: null },
      issueCodes: ["ibp_method_version_unsupported"],
    },
  },
]

/** Every parity case: v3.0, both versions, v3.2, dispatch (matrix v2 order). */
export const IBP_PARITY_CASES: readonly IbpParityCase[] = [
  ...V30_CASES,
  ...BOTH_CASES,
  ...V32_CASES,
  ...DISPATCH_CASES,
]

/** Submit readiness per version (matrix v2 "Submit readiness", rows R-n). */
export const IBP_READINESS_CASES: readonly IbpReadinessCase[] = [
  {
    id: "R-1 v3.2 without ibp_cas",
    draft: {
      ibp_method_version: IBP_METHOD_V3_2,
      factors: COMPLETE_V32_OBJECTS,
    },
    expect: {
      ready: false,
      missing_factors: ["A", "G"],
      missing_fields: ["ibp_cas"],
    },
  },
  {
    id: "R-2 untagged without region or stage",
    draft: { factors: COMPLETE_DIRECT },
    expect: {
      ready: false,
      missing_factors: [],
      missing_fields: ["region_version", "vegetation_stage"],
    },
  },
  {
    id: "R-2 v3.0 tag without region or stage",
    draft: { ibp_method_version: IBP_METHOD_V3_0, factors: COMPLETE_DIRECT },
    expect: {
      ready: false,
      missing_factors: [],
      missing_fields: ["region_version", "vegetation_stage"],
    },
  },
  {
    id: "R-3 v3.2 with ibp_cas",
    draft: {
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
      factors: COMPLETE_V32_OBJECTS,
    },
    expect: { ready: true, missing_factors: [], missing_fields: [] },
  },
]

/** v3.0 → v3.2 draft switch (CH-7; matrix v2 "Draft migration", rows M-n). */
export const IBP_MIGRATION_CASES: readonly IbpMigrationCase[] = [
  {
    id: "M-1 ACA/collineen, cover moved from B to A",
    draft: {
      id: "draft-m1",
      region_version: "ACA",
      vegetation_stage: "collineen",
      factors: {
        A: { native_genus_count: 5 },
        B: { strata_count: 5, covered_autochthonous_percent: 40 },
      },
    },
    expect: {
      id: "draft-m1",
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
      ibp_cas3_scale: false,
      factors: {
        A: { native_genus_count: 5, native_cover_percent: 40 },
        B: { strata_count: 5 },
      },
    },
  },
  {
    id: "M-2 ACA/subalpin, cas left to the observer",
    draft: { region_version: "ACA", vegetation_stage: "subalpin" },
    expect: { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: null, ibp_cas3_scale: false },
  },
  {
    id: "M-3 M/supra_mediterraneen, cas flagged for review",
    draft: { region_version: "M", vegetation_stage: "supra_mediterraneen" },
    expect: { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: null, ibp_cas3_scale: false },
  },
  {
    id: "M-4 M/meso_mediterraneen → cas 4",
    draft: { region_version: "M", vegetation_stage: "meso_mediterraneen" },
    expect: { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 4, ibp_cas3_scale: false },
  },
]
