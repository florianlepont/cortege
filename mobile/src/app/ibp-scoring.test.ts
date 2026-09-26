import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import {
  computeIbpTotalsFromRetainedScores,
  computeRetainedScoresFromRawFactors,
  evaluateSubmitReadinessFromDraft,
  resolveDraftParcelIds,
  resolveFactorScoreFromRaw,
} from "./ibp-scoring"

const ACA_COLLINEEN = { region_version: "ACA", vegetation_stage: "collineen" }

describe("ibp-scoring", () => {
  test("computes retained scores and totals from raw factors", () => {
    const retained = computeRetainedScoresFromRawFactors(
      {
        A: { native_genus_count: 5 },
        B: { strata_count: 3, covered_autochthonous_percent: 60 },
        C: { bmg_count: 2, bmm_count: 2, surface_ha: 1 },
        D: { bmg_count: 0, bmm_count: 2, surface_ha: 1 },
        E: { tgb_count: 6, gb_count: 0, surface_ha: 1 },
        F: { trees_per_ha: 9 },
        G: { open_flowering_percent: 2 },
        H: { class_score: 5 },
        I: { type_count: 1 },
        J: { type_count: 2 },
      },
      ACA_COLLINEEN,
    )

    expect(retained.A?.score).toBe(5)
    expect(retained.D?.score).toBe(1)
    expect(retained.H?.score).toBe(5)
    expect(retained.J?.score).toBe(5)

    const totals = computeIbpTotalsFromRetainedScores(retained)
    expect(totals.completed_factors).toBe(10)
    expect(totals.ibp_peuplement_gestion).toBe(25)
    expect(totals.ibp_contexte).toBe(12)
    expect(totals.ibp_total).toBe(37)
  })

  test("BUG-1 fixed (01.8 D-05): a legacy B cover under 50 % caps A, not B", () => {
    // Before 01.8 the cover capped B (B = 2) and left A at 5; the CNPF sheet caps A.
    const retained = computeRetainedScoresFromRawFactors(
      {
        A: { native_genus_count: 5 },
        B: { strata_count: 5, covered_autochthonous_percent: 40 },
      },
      ACA_COLLINEEN,
    )

    expect(retained.A?.score).toBe(2)
    expect(retained.B?.score).toBe(5)
  })

  test("defaults to an untagged (v3.0) context and tolerates missing factors", () => {
    const retained = computeRetainedScoresFromRawFactors(null)
    expect(Object.values(retained).every((score) => score === null)).toBe(true)
    expect(computeIbpTotalsFromRetainedScores(retained)).toEqual({
      ibp_peuplement_gestion: 0,
      ibp_contexte: 0,
      ibp_total: 0,
      completed_factors: 0,
    })
    expect(computeRetainedScoresFromRawFactors({ C: 1 }).C?.score).toBe(1)
  })

  test("scores under the survey's method version", () => {
    // v3.2 scores A only once the cas is known; an unknown version scores nothing.
    const factors = { A: { native_genus_count: 5, native_cover_percent: 80 } }
    expect(
      computeRetainedScoresFromRawFactors(factors, { ibp_method_version: IBP_METHOD_V3_0 }).A
        ?.score,
    ).toBe(5)
    expect(
      computeRetainedScoresFromRawFactors(factors, { ibp_method_version: IBP_METHOD_V3_2 }).A,
    ).toBeNull()
    expect(
      computeRetainedScoresFromRawFactors(factors, {
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 1,
      }).A?.score,
    ).toBe(5)
    expect(
      computeRetainedScoresFromRawFactors({ C: 1 }, { ibp_method_version: "unknown" }).C,
    ).toBeNull()
  })

  test("resolves one factor's score on its own", () => {
    expect(resolveFactorScoreFromRaw("I", { type_count: 1 })).toBe(2)
    expect(resolveFactorScoreFromRaw("H", 5)).toBe(5)
    expect(resolveFactorScoreFromRaw("G", 1)).toBeNull()
    expect(resolveFactorScoreFromRaw("J", "not a score")).toBeNull()
    expect(resolveFactorScoreFromRaw("A", { native_genus_count: 1 }, ACA_COLLINEEN)).toBe(0)
  })

  test("normalizes selected parcel ids from draft payload", () => {
    expect(
      resolveDraftParcelIds({
        parcel_ids: ["75056000AB0001", " 75056000ab0001 ", "75056000AB0002", 42, "  "],
      }),
    ).toEqual(["75056000AB0001", "75056000AB0002"])

    expect(resolveDraftParcelIds({})).toEqual([])
  })

  test("reports missing factors and fields for submit readiness", () => {
    const readiness = evaluateSubmitReadinessFromDraft({
      ...ACA_COLLINEEN,
      factors: {
        A: { native_genus_count: 2 },
        B: { strata_count: 2, covered_autochthonous_percent: 80 },
      },
      parcel_ids: [],
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.expired).toBe(false)
    expect(readiness.missing_fields).toEqual(["parcel_ids"])
    expect(readiness.missing_factors).toEqual(["C", "D", "E", "F", "G", "H", "I", "J"])
  })

  test("names the cas of a v3.2 draft and an unsupported method version", () => {
    const v32 = evaluateSubmitReadinessFromDraft({
      ibp_method_version: IBP_METHOD_V3_2,
      factors: {},
      parcel_ids: ["75056000AB0001"],
    })
    expect(v32.missing_fields).toEqual(["ibp_cas"])

    const unknown = evaluateSubmitReadinessFromDraft({
      ibp_method_version: "cnpf_ibp_fr_v9",
      parcel_ids: ["75056000AB0001"],
    })
    expect(unknown.ready).toBe(false)
    expect(unknown.missing_fields).toEqual(["ibp_method_version"])
  })

  test("marks expired surveys as not ready", () => {
    const readiness = evaluateSubmitReadinessFromDraft({
      ...ACA_COLLINEEN,
      factors: {
        A: { native_genus_count: 2 },
        B: { strata_count: 2, covered_autochthonous_percent: 80 },
        C: { bmg_count: 0, bmm_count: 1, surface_ha: 1 },
        D: { bmg_count: 0, bmm_count: 1, surface_ha: 1 },
        E: { tgb_count: 0, gb_count: 1, surface_ha: 1 },
        F: { trees_per_ha: 2 },
        G: { open_flowering_percent: 2 },
        H: { class_score: 2 },
        I: { type_count: 1 },
        J: { type_count: 1 },
      },
      parcel_ids: ["75056000AB0001"],
      expires_at: "2020-01-01T00:00:00.000Z",
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.expired).toBe(true)
    expect(readiness.missing_factors).toHaveLength(0)
    expect(readiness.missing_fields).toHaveLength(0)
  })

  test("a complete v3.0 draft with parcels is ready", () => {
    const readiness = evaluateSubmitReadinessFromDraft(
      {
        ...ACA_COLLINEEN,
        factors: { A: 5, B: 2, C: 1, D: 0, E: 2, F: 5, G: 2, H: 2, I: 5, J: 0 },
        parcel_ids: ["75056000AB0001"],
        expires_at: "2027-01-01T00:00:00.000Z",
      },
      new Date("2026-09-26T12:00:00.000Z"),
    )
    expect(readiness).toEqual({
      ready: true,
      expired: false,
      missing_factors: [],
      missing_fields: [],
    })
  })
})
