import { migrateDraftToV32 } from "./migrate"
import { evaluateSubmitReadiness } from "./readiness"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "./method-version"
import type { IbpEvaluationInput } from "./evaluate"

const COMPLETE_DIRECT = { A: 5, B: 2, C: 1, D: 0, E: 2, F: 5, G: 2, H: 2, I: 5, J: 0 }

describe("evaluateSubmitReadiness", () => {
  it("v3.0 (untagged): region and stage are required", () => {
    const readiness = evaluateSubmitReadiness({ factors: COMPLETE_DIRECT })
    expect(readiness).toEqual({
      ready: false,
      missing_factors: [],
      missing_fields: ["region_version", "vegetation_stage"],
    })
  })

  it("v3.0 complete and not expired is ready", () => {
    const readiness = evaluateSubmitReadiness({
      ibp_method_version: IBP_METHOD_V3_0,
      region_version: "ACA",
      vegetation_stage: "collineen",
      expires_at: "2026-12-31T00:00:00.000Z",
      factors: COMPLETE_DIRECT,
    })
    expect(readiness).toEqual({
      ready: true,
      missing_factors: [],
      missing_fields: [],
    })
  })

  it("v3.2 without cas: ibp_cas missing and A, G not ready", () => {
    const readiness = evaluateSubmitReadiness({
      ibp_method_version: IBP_METHOD_V3_2,
      factors: {
        ...COMPLETE_DIRECT,
        A: { native_genus_count: 5, native_cover_percent: 60 },
        G: { open_flowering_percent: 2 },
      },
    })
    expect(readiness.missing_fields).toEqual(["ibp_cas"])
    expect(readiness.missing_factors).toEqual(["A", "G"])
    expect(readiness.ready).toBe(false)
  })

  it("v3.2 with cas: no region or stage needed", () => {
    const readiness = evaluateSubmitReadiness({
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 2,
      factors: COMPLETE_DIRECT,
    })
    expect(readiness).toEqual({
      ready: true,
      missing_factors: [],
      missing_fields: [],
    })
  })

  it("unknown version: ibp_method_version missing, every factor missing", () => {
    const readiness = evaluateSubmitReadiness({
      ibp_method_version: "v9",
      factors: COMPLETE_DIRECT,
    })
    expect(readiness.missing_fields).toEqual(["ibp_method_version"])
    expect(readiness.missing_factors).toHaveLength(10)
  })

  // OA-41: there is no submission deadline, so a draft's age never makes it unready.
  it("a past, unreadable or missing expires_at never makes a draft unready (OA-41)", () => {
    const complete = {
      region_version: "M",
      vegetation_stage: "supra_mediterraneen",
      factors: COMPLETE_DIRECT,
    }
    for (const expires_at of ["2020-01-01T00:00:00Z", "garbage", null, undefined]) {
      const readiness = evaluateSubmitReadiness({ ...complete, expires_at })
      expect(readiness.ready).toBe(true)
      expect(readiness).not.toHaveProperty("expired")
    }
  })
})

describe("migrateDraftToV32 (CH-7)", () => {
  it("ACA/collineen: cas 1, B's cover moved to A, no region or stage; input not mutated", () => {
    const draft = {
      id: "s-1",
      region_version: "ACA",
      vegetation_stage: "collineen",
      factors: {
        A: { native_genus_count: 5 },
        B: { strata_count: 5, covered_autochthonous_percent: 40 },
        C: 1,
      },
    }
    const snapshot = JSON.parse(JSON.stringify(draft))
    const migrated = migrateDraftToV32(draft)
    expect(migrated).toEqual({
      id: "s-1",
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
      ibp_cas3_scale: false,
      factors: {
        A: { native_genus_count: 5, native_cover_percent: 40 },
        B: { strata_count: 5 },
        C: 1,
      },
    })
    expect("region_version" in migrated).toBe(false)
    expect("vegetation_stage" in migrated).toBe(false)
    expect(draft).toEqual(snapshot)
  })

  it.each([
    ["ACA", "subalpin", null],
    ["M", "meso_mediterraneen", 4],
    ["M", "supra_mediterraneen", null],
    [undefined, undefined, null],
  ])("%p/%p → ibp_cas %p", (region, stage, cas) => {
    const migrated = migrateDraftToV32<IbpEvaluationInput>({
      region_version: region,
      vegetation_stage: stage,
    })
    expect(migrated.ibp_cas).toBe(cas)
    expect(migrated.ibp_method_version).toBe(IBP_METHOD_V3_2)
    expect(migrated.factors).toBeUndefined()
  })

  it("keeps A's own cover, drops B's; creates A from B's cover when A is absent", () => {
    const kept = migrateDraftToV32({
      factors: {
        A: { native_genus_count: 5, native_cover_below_50: true },
        B: { strata_count: 5, native_cover_percent: 80 },
      },
    })
    expect(kept.factors).toEqual({
      A: { native_genus_count: 5, native_cover_below_50: true },
      B: { strata_count: 5 },
    })
    const created = migrateDraftToV32({
      factors: { B: { strata_count: 3, native_cover_percent: 70 } },
    })
    expect(created.factors).toEqual({ A: { native_cover_percent: 70 }, B: { strata_count: 3 } })
    const direct = migrateDraftToV32({
      factors: { A: 2, B: { covered_autochthonous_percent: 20 } },
    })
    expect(direct.factors).toEqual({ A: 2, B: {} })
    const noCover = migrateDraftToV32({ factors: { B: 5 } })
    expect(noCover.factors).toEqual({ B: 5 })
    const bWithoutCover = migrateDraftToV32({
      factors: { A: { count: 3 }, B: { strata_count: 4 } },
    })
    expect(bWithoutCover.factors).toEqual({ A: { count: 3 }, B: { strata_count: 4 } })
  })

  it("a created A with only the cover is incomplete, not blocking", () => {
    const migrated = migrateDraftToV32({
      region_version: "ACA",
      vegetation_stage: "collineen",
      factors: { B: { strata_count: 3, native_cover_percent: 70 } },
    })
    expect(evaluateSubmitReadiness(migrated).missing_factors).toContain("A")
  })

  it("a v3.2 draft is returned as an unchanged copy", () => {
    const draft = { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 3, factors: { A: 2 } }
    const migrated = migrateDraftToV32(draft)
    expect(migrated).toEqual(draft)
    expect(migrated).not.toBe(draft)
  })
})
