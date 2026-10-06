import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { IbpRulesService } from "../src/surveys/ibp-rules.service"

// The adapter's API-visible behaviour: the result shape the service and the 422 bodies rely on.
// Per-factor scores are covered by the shared parity fixture (ibp-parity.spec.ts).
describe("IbpRulesService (unit)", () => {
  const service = new IbpRulesService()

  const ACA_COLLINEEN = { region_version: "ACA", vegetation_stage: "collineen" } as const

  // A-F = 1, G = H = 2 (BUG-2: G and H accept only 0, 2 or 5), I = 2, J = 5.
  const completeDirect = { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 2, H: 2, I: 2, J: 5 }

  it("fills canonical factor_results for every scored factor", () => {
    const result = service.validateDraft({
      ...ACA_COLLINEEN,
      factors: {
        C: { bmg_count: 0, bmm_count: 2, surface_ha: 1 },
        H: { class: "partial" },
        J: { type_count: 2 },
      },
    })

    expect(result.ok).toBe(true)
    expect(result.factor_scores).toEqual({ C: 1, H: 2, J: 5 })
    expect(result.factor_results).toEqual({
      C: {
        factor_id: "factor_c",
        observed_value_raw: { bmg_count: 0, bmm_count: 2, surface_ha: 1 },
        selected_class: "S1",
        score_points: 1,
        warnings: [],
      },
      H: {
        factor_id: "factor_h",
        observed_value_raw: { class: "partial" },
        selected_class: "S2",
        score_points: 2,
        warnings: [],
      },
      J: {
        factor_id: "factor_j",
        observed_value_raw: { type_count: 2 },
        selected_class: "S5",
        score_points: 5,
        warnings: [],
      },
    })
  })

  it("applies the native-cover cap to A, not B (BUG-1 fixed, 01.8 D-05)", () => {
    const result = service.validateDraft({
      ...ACA_COLLINEEN,
      factors: {
        A: { native_genus_count: 5 },
        B: { strata_count: 5, covered_autochthonous_percent: 40 },
      },
    })

    expect(result.ok).toBe(true)
    expect(result.factor_scores).toEqual({ A: 2, B: 5 })
    expect(result.method_version).toBe(IBP_METHOD_V3_0)
  })

  it("returns warning when factor F dmh_group_counts are capped", () => {
    const result = service.validateDraft({
      ...ACA_COLLINEEN,
      factors: { F: { dmh_group_counts: [3, 3, 3, 3] } },
    })

    expect(result.ok).toBe(true)
    expect(result.factor_scores?.F).toBe(5)
    expect(
      result.issues.some((i) => i.code === "factor_f_group_capped" && i.blocking === false),
    ).toBe(true)
    expect(result.factor_results?.F.warnings.join(" | ")).toContain("capped to 2 trees/ha")
  })

  it("returns non-blocking consistency warnings and propagates to canonical factors", () => {
    const result = service.validateDraft({
      ...ACA_COLLINEEN,
      factors: { A: 0, B: 2, E: 0, F: 5 },
    })

    expect(result.ok).toBe(true)
    expect(result.warnings.join(" | ")).toContain(
      "factor_b indicates complex strata while factor_a is very low",
    )
    expect(result.warnings.join(" | ")).toContain("factor_f is high while factor_e is 0")

    expect(result.factor_results?.A.warnings.join(" | ")).toContain(
      "factor_b indicates complex strata",
    )
    expect(result.factor_results?.F.warnings.join(" | ")).toContain(
      "factor_f is high while factor_e is 0",
    )
  })

  it("rejects invalid direct score for factor I (must be 0,2,5)", () => {
    const result = service.validateDraft({ ...ACA_COLLINEEN, factors: { I: 1 } })

    expect(result.ok).toBe(false)
    expect(result.errors.join(" | ")).toContain("factor I must resolve to one of [0,2,5]")
  })

  it("rejects a direct G = 1 with a blocking factor_invalid_score (BUG-2)", () => {
    const result = service.validateDraft({ factors: { G: 1 } })

    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual({
      code: "factor_invalid_score",
      message: "factor G must resolve to one of [0,2,5]",
      blocking: true,
      factor: "G",
    })
  })

  it("scores an explicitly tagged v3.2 draft under v3.2", () => {
    const result = service.validateDraft({
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
      factors: { B: { strata_count: 5 } },
    })

    expect(result.ok).toBe(true)
    expect(result.method_version).toBe(IBP_METHOD_V3_2)
  })

  it("validateSubmit blocks missing required factors", () => {
    const result = service.validateSubmit({ ...ACA_COLLINEEN, factors: { A: 1 } })

    expect(result.ok).toBe(false)
    expect(result.errors.join(" | ")).toContain("factor B is required")
  })

  // OA-41: no submission deadline. An `expires_at` in the past (a client of an older build still
  // sends one, and the column is still filled) blocks nothing.
  it("validateSubmit ignores a past expires_at (OA-41)", () => {
    // The type has no such field any more: an older build's payload still has it.
    const olderBuildInput = {
      ...ACA_COLLINEEN,
      expires_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      factors: completeDirect,
    }
    const result = service.validateSubmit(olderBuildInput)

    expect(result.ok).toBe(true)
    expect(result.errors.join(" | ")).not.toContain("expired")
  })

  it("validateSubmit succeeds with complete valid payload and computes aggregate scores", () => {
    const result = service.validateSubmit({
      ...ACA_COLLINEEN,
      factors: completeDirect,
    })

    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.method_version).toBe(IBP_METHOD_V3_0)
    expect(result.scores).toEqual({
      ibp_peuplement_gestion: 8,
      ibp_contexte: 9,
      ibp_total: 17,
    })
  })

  it("validateSubmit rejects missing parcel-independent required fields", () => {
    const result = service.validateSubmit({
      region_version: "ACA",
      vegetation_stage: "",
      factors: completeDirect,
    })

    expect(result.ok).toBe(false)
    expect(result.errors.join(" | ")).toContain("vegetation_stage is required")
  })

  it("validateSubmit accepts payload without location metadata", () => {
    const result = service.validateSubmit({
      ...ACA_COLLINEEN,
      factors: completeDirect,
    })

    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
