import { computeRetainedScores, computeTotals, evaluateIbp } from "./evaluate"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "./method-version"

const NOW = new Date("2026-09-26T12:00:00.000Z")
const FUTURE = "2026-12-31T00:00:00.000Z"
const PAST = "2026-01-01T00:00:00.000Z"
const codes = (result: { issues: Array<{ code: string }> }) => result.issues.map((i) => i.code)

const COMPLETE_DIRECT = { A: 5, B: 2, C: 1, D: 0, E: 2, F: 5, G: 2, H: 2, I: 5, J: 0 }

describe("evaluateIbp: dispatch (CH-6)", () => {
  it("null or absent version means v3.0", () => {
    const factors = { C: { bmg_count: 1, bmm_count: 1, surface_ha: 2 } }
    expect(evaluateIbp({ factors }, "draft").factor_scores).toEqual({ C: 0 })
    const tagged = evaluateIbp({ ibp_method_version: null, factors }, "draft")
    expect(tagged.method_version).toBe(IBP_METHOD_V3_0)
    expect(tagged.factor_scores).toEqual({ C: 0 })
    const v32 = evaluateIbp({ ibp_method_version: IBP_METHOD_V3_2, factors }, "draft")
    expect(v32.method_version).toBe(IBP_METHOD_V3_2)
    expect(v32.factor_scores).toEqual({ C: 1 })
  })

  it.each(["draft", "submit"] as const)(
    "an unknown version is blocking ibp_method_version_unsupported (%s)",
    (mode) => {
      const result = evaluateIbp(
        { ibp_method_version: "cnpf_ibp_fr_v9", factors: COMPLETE_DIRECT, expires_at: FUTURE },
        mode,
        NOW,
      )
      expect(result.ok).toBe(false)
      expect(result.method_version).toBeNull()
      expect(codes(result)).toEqual(["ibp_method_version_unsupported"])
      expect(result.issues[0].blocking).toBe(true)
      expect(result.factor_scores).toBeNull()
      expect(result.factor_results).toBeNull()
      expect(result.scores).toBeNull()
      expect(Object.values(result.retained).every((r) => r === null)).toBe(true)
    },
  )
})

describe("evaluateIbp: v3.0 (fixed, D-05)", () => {
  it("legacy shapes stay valid: A capped from B's legacy cover, B not capped (BUG-1)", () => {
    const result = evaluateIbp(
      {
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: {
          A: { native_genus_count: 5 },
          B: { strata_count: 5, covered_autochthonous_percent: 40 },
        },
      },
      "draft",
    )
    expect(result.ok).toBe(true)
    expect(result.factor_scores).toEqual({ A: 2, B: 5 })
    expect(result.factor_results?.B).toEqual({
      factor_id: "factor_b",
      observed_value_raw: { strata_count: 5, covered_autochthonous_percent: 40 },
      selected_class: "S5",
      score_points: 5,
      warnings: [],
    })
    expect(result.retained.A).toEqual({ score: 2, selected_class: "S2" })
    expect(result.retained.C).toBeNull()
  })

  it("A without any cover is not capped; G percent scores; H class_score 2 scores", () => {
    const result = evaluateIbp(
      {
        factors: {
          A: { native_genus_count: 5 },
          G: { open_flowering_percent: 0 },
          H: { class_score: 2 },
        },
      },
      "draft",
    )
    expect(result.factor_scores).toEqual({ A: 5, G: 0, H: 2 })
  })

  it.each([
    [{ G: 1 }, "G", "factor G must resolve to one of [0,2,5]"],
    [{ H: 1 }, "H", "factor H must resolve to one of [0,2,5]"],
    [{ H: { class_score: 1 } }, "H", "factor H must resolve to one of [0,2,5]"],
    [{ A: 3 }, "A", "factor A must resolve to one of [0,1,2,5]"],
    [{ I: 1 }, "I", "factor I must resolve to one of [0,2,5]"],
  ])("direct %p is blocking factor_invalid_score (BUG-2)", (factors, factor, message) => {
    const result = evaluateIbp({ factors }, "draft")
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      { code: "factor_invalid_score", message, blocking: true, factor },
    ])
    expect(result.errors).toEqual([message])
    expect(result.factor_scores).toEqual({})
    expect(result.factor_results).toBeNull()
  })

  it("never throws on malformed factors (T-01.8-13)", () => {
    for (const factors of [null, undefined, "x", 3, [1, 2]]) {
      const result = evaluateIbp({ factors }, "draft")
      expect(result.ok).toBe(true)
      expect(result.factor_scores).toEqual({})
    }
    const bad = evaluateIbp(
      { factors: { A: [5], B: "abc", C: { bmg_count: Number.NaN }, D: true, E: "" } },
      "draft",
    )
    expect(bad.ok).toBe(false)
    expect(codes(bad)).toEqual([
      "factor_invalid_raw",
      "factor_invalid_raw",
      "factor_invalid_raw",
      "factor_invalid_raw",
    ])
    expect(bad.issues.map((i) => i.factor)).toEqual(["A", "B", "C", "D"])
  })

  it("F dmh groups over 2 emit factor_f_group_capped, attached to F's warnings", () => {
    const result = evaluateIbp({ factors: { E: 2, F: { dmh_group_counts: [3, 1] } } }, "draft")
    expect(result.ok).toBe(true)
    expect(codes(result)).toEqual(["factor_f_group_capped"])
    expect(result.warnings).toEqual(["factor F group count capped to 2 trees/ha"])
    expect(result.factor_results?.F.warnings).toEqual(["factor F group count capped to 2 trees/ha"])
  })

  it("consistency warnings (A/B, E/F)", () => {
    const result = evaluateIbp({ factors: { A: 0, B: 2, E: 0, F: 5 } }, "draft")
    expect(result.ok).toBe(true)
    expect(codes(result)).toEqual(["consistency_a_b", "consistency_e_f"])
    expect(result.factor_results?.A.warnings).toHaveLength(1)
    expect(result.factor_results?.F.warnings).toHaveLength(1)
  })

  it("consistency warnings need both factors scored (absent or incomplete is not 'very low')", () => {
    expect(codes(evaluateIbp({ factors: { B: 5, F: 5 } }, "draft"))).toEqual([])
    expect(codes(evaluateIbp({ factors: { A: 0, E: 0 } }, "draft"))).toEqual([])
    expect(codes(evaluateIbp({ factors: { A: 0, B: 1, E: 0, F: 2 } }, "draft"))).toEqual([])
  })

  it("submit: region, stage, expiry and missing factors", () => {
    const result = evaluateIbp({ factors: { A: 5 } }, "submit", NOW)
    expect(result.ok).toBe(false)
    expect(codes(result)).toEqual([
      "region_version_required",
      "vegetation_stage_required",
      "expires_at_required",
      ...Array(9).fill("factor_required"),
    ])
    expect(result.scores).toEqual({ ibp_peuplement_gestion: 5, ibp_contexte: 0, ibp_total: 5 })

    const expired = evaluateIbp(
      {
        region_version: "ACA",
        vegetation_stage: " ",
        expires_at: PAST,
        factors: COMPLETE_DIRECT,
      },
      "submit",
      NOW,
    )
    expect(codes(expired)).toEqual(["vegetation_stage_required", "survey_expired"])
  })

  it("submit: a complete v3.0 survey is ok with the totals", () => {
    const result = evaluateIbp(
      {
        ibp_method_version: IBP_METHOD_V3_0,
        region_version: "M",
        vegetation_stage: "meso_mediterraneen",
        expires_at: FUTURE,
        factors: COMPLETE_DIRECT,
      },
      "submit",
      NOW,
    )
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
    expect(result.scores).toEqual({ ibp_peuplement_gestion: 17, ibp_contexte: 7, ibp_total: 24 })
    expect(result.incomplete_factors).toEqual([])
  })

  it("defaults `now` to the current time", () => {
    const result = evaluateIbp(
      { region_version: "ACA", vegetation_stage: "collineen", expires_at: PAST, factors: {} },
      "submit",
    )
    expect(codes(result)).toContain("survey_expired")
  })
})

describe("evaluateIbp: v3.2", () => {
  const complete32 = {
    A: { native_genus_count: 5, native_cover_percent: 60 },
    B: { strata_count: 5 },
    C: 1,
    D: 0,
    E: 2,
    F: 5,
    G: { open_flowering_percent: 2 },
    H: 2,
    I: 5,
    J: 0,
  }

  it("draft without ibp_cas: ok, A and G not scored, non-blocking factor_incomplete", () => {
    const result = evaluateIbp(
      { ibp_method_version: IBP_METHOD_V3_2, factors: complete32 },
      "draft",
    )
    expect(result.ok).toBe(true)
    expect(result.factor_scores?.A).toBeUndefined()
    expect(result.factor_scores?.G).toBeUndefined()
    expect(result.retained.A).toBeNull()
    expect(result.incomplete_factors).toEqual(["A", "G"])
    expect(result.issues).toEqual([
      {
        code: "factor_incomplete",
        message: "factor A is incomplete: ibp_cas is required",
        blocking: false,
        factor: "A",
      },
      {
        code: "factor_incomplete",
        message: "factor G is incomplete: ibp_cas is required",
        blocking: false,
        factor: "G",
      },
    ])
  })

  it("submit without ibp_cas: ibp_cas_required + factor_required for A and G", () => {
    const result = evaluateIbp(
      { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 7, expires_at: FUTURE, factors: complete32 },
      "submit",
      NOW,
    )
    expect(result.ok).toBe(false)
    expect(codes(result)).toEqual(["ibp_cas_required", "factor_required", "factor_required"])
    expect(result.issues.slice(1).map((i) => i.factor)).toEqual(["A", "G"])
  })

  it("region and stage are not required; a complete v3.2 survey is ok", () => {
    const result = evaluateIbp(
      { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 1, expires_at: FUTURE, factors: complete32 },
      "submit",
      NOW,
    )
    expect(result.ok).toBe(true)
    expect(result.factor_scores).toEqual({
      A: 5,
      B: 5,
      C: 1,
      D: 0,
      E: 2,
      F: 5,
      G: 5,
      H: 2,
      I: 5,
      J: 0,
    })
    expect(result.scores).toEqual({ ibp_peuplement_gestion: 23, ibp_contexte: 7, ibp_total: 30 })
  })

  it("A without cover: incomplete in draft, factor_required at submit", () => {
    const input = {
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
      expires_at: FUTURE,
      factors: { ...complete32, A: { native_genus_count: 5 } },
    }
    const draft = evaluateIbp(input, "draft")
    expect(draft.ok).toBe(true)
    expect(draft.issues).toEqual([
      {
        code: "factor_incomplete",
        message: "factor A is incomplete: native_cover is required",
        blocking: false,
        factor: "A",
      },
    ])
    const submit = evaluateIbp(input, "submit", NOW)
    expect(submit.issues).toEqual([
      { code: "factor_required", message: "factor A is required", blocking: true, factor: "A" },
    ])
  })

  it("C with bmg 1, bmm 1 on 2 ha scores 1 (sum rule); E likewise", () => {
    const factors = {
      C: { bmg_count: 1, bmm_count: 1, surface_ha: 2 },
      E: { tgb_count: 1, gb_count: 1, surface_ha: 2 },
    }
    expect(
      evaluateIbp({ ibp_method_version: IBP_METHOD_V3_2, factors }, "draft").factor_scores,
    ).toEqual({ C: 1, E: 1 })
    expect(evaluateIbp({ factors }, "draft").factor_scores).toEqual({ C: 0, E: 0 })
  })

  it("F group cap warning under v3.2 too", () => {
    const result = evaluateIbp(
      { ibp_method_version: IBP_METHOD_V3_2, factors: { F: { dmh_group_counts: [3, 3, 3, 3] } } },
      "draft",
    )
    expect(result.factor_scores).toEqual({ F: 5 })
    expect(new Set(codes(result))).toEqual(new Set(["factor_f_group_capped"]))
  })
})

describe("evaluateIbp: Factor A genus list (D-15, ADR-003 CH-12, phase 5)", () => {
  it("v3.2: the count is derived from the genus list, deduplicated", () => {
    const factors = {
      A: {
        genera: ["Fagus", "Quercus_deciduae", "Quercus_sempervirens", "Fagus"],
        native_cover_percent: 60,
      },
    }
    const result = evaluateIbp(
      { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 1, factors },
      "draft",
    )
    expect(result.factor_scores).toEqual({ A: 2 })
  })

  it("v3.2: a supplementary genus counts in cas 4, is silently excluded in cas 1", () => {
    const factors = { A: { genera: ["Fagus", "Pistacia"], native_cover_percent: 60 } }
    expect(
      evaluateIbp({ ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 4, factors }, "draft")
        .factor_scores,
    ).toEqual({ A: 1 })
    const excluded = evaluateIbp(
      { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 1, factors },
      "draft",
    )
    expect(excluded.factor_scores).toEqual({ A: 0 })
    expect(excluded.issues).toEqual([])
  })

  it("v3.2: a genus not on the CNPF list is blocking, both draft and submit", () => {
    const factors = { A: { genera: ["Fagus", "Ficus"], native_cover_percent: 60 } }
    const draft = evaluateIbp({ ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 1, factors }, "draft")
    expect(draft.ok).toBe(false)
    expect(draft.issues).toEqual([
      {
        code: "factor_a_genus_invalid",
        message: "factor A genera must each be one of the CNPF regional list's classes",
        blocking: true,
        factor: "A",
      },
    ])
  })

  it("v3.2: a non-array genera is blocking, same code as an unknown genus", () => {
    const factors = { A: { genera: "Fagus", native_cover_percent: 60 } }
    const result = evaluateIbp(
      { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 1, factors },
      "draft",
    )
    expect(codes(result)).toEqual(["factor_a_genus_invalid"])
  })

  it("v3.0: the count is derived from the genus list; the main list only, no supplementary genera", () => {
    const factors = { A: { genera: ["Fagus", "Pistacia"], native_cover_percent: 60 } }
    const result = evaluateIbp({ factors }, "draft")
    expect(result.factor_scores).toEqual({ A: 0 })
    expect(result.issues).toEqual([])
  })

  it("v3.0: an unknown genus is blocking factor_a_genus_invalid", () => {
    const factors = { A: { genera: ["Ficus"], native_cover_percent: 60 } }
    const result = evaluateIbp({ factors }, "draft")
    expect(codes(result)).toEqual(["factor_a_genus_invalid"])
  })

  it("the legacy bare count still scores, unchanged (surveys already recorded)", () => {
    const factors = { A: { native_genus_count: 5, native_cover_percent: 60 } }
    expect(evaluateIbp({ factors }, "draft").factor_scores).toEqual({ A: 5 })
    expect(
      evaluateIbp({ ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 1, factors }, "draft")
        .factor_scores,
    ).toEqual({ A: 5 })
  })
})

describe("computeRetainedScores and computeTotals", () => {
  it("retains allowed scores per version and totals them", () => {
    const retained = computeRetainedScores(
      { A: { native_genus_count: 2, native_cover_percent: 80 }, G: 1, H: "5", I: { count: 1 } },
      { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 3 },
    )
    expect(retained).toEqual({
      A: { score: 2, selected_class: "S2" },
      B: null,
      C: null,
      D: null,
      E: null,
      F: null,
      G: null,
      H: { score: 5, selected_class: "S5" },
      I: { score: 2, selected_class: "S2" },
      J: null,
    })
    expect(computeTotals(retained)).toEqual({
      ibp_peuplement_gestion: 2,
      ibp_contexte: 7,
      ibp_total: 9,
      completed_factors: 3,
    })
  })

  it("an unsupported version retains nothing", () => {
    const retained = computeRetainedScores({ A: 5 }, { ibp_method_version: "x" })
    expect(computeTotals(retained)).toEqual({
      ibp_peuplement_gestion: 0,
      ibp_contexte: 0,
      ibp_total: 0,
      completed_factors: 0,
    })
  })
})
