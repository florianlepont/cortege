import type { IbpSurveyContext, IbpValidationIssue, RuleContext } from "./common"
import { scoreFactorV30 } from "./v3-0"
import { scoreFactorV32 } from "./v3-2"
import { IBP_METHOD_V3_2 } from "../method-version"
import type { FactorKey } from "../factors"

const ctx = (
  survey: IbpSurveyContext,
  factors: Record<string, unknown> = {},
): RuleContext & { issues: IbpValidationIssue[] } => ({ survey, factors, issues: [] })

const V30_ACA = { region_version: "ACA", vegetation_stage: "collineen" }
const V32_CAS1 = { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 1 }

const v30 = (
  key: FactorKey,
  raw: Record<string, unknown>,
  survey: IbpSurveyContext = V30_ACA,
  factors = {},
) => scoreFactorV30(key, raw, ctx(survey, factors))
const v32 = (
  key: FactorKey,
  raw: Record<string, unknown>,
  survey: IbpSurveyContext = V32_CAS1,
  factors = {},
) => scoreFactorV32(key, raw, ctx(survey, factors))

describe("v3.0 rules (D-05: pre-01.8 rules with BUG-1 and BUG-2 fixed)", () => {
  it("A: standard and subalpine scales", () => {
    expect(v30("A", { native_genus_count: 2 })).toEqual({ kind: "scored", score: 1 })
    expect(v30("A", { autochthonous_genus_count: 5 })).toEqual({ kind: "scored", score: 5 })
    expect(v30("A", { count: 2 }, { region_version: "ACA", vegetation_stage: "subalpin" })).toEqual(
      { kind: "scored", score: 2 },
    )
  })

  it("A: the cap reads B's legacy cover when A has none (BUG-1)", () => {
    const factors = { B: { strata_count: 5, covered_autochthonous_percent: 40 } }
    expect(v30("A", { native_genus_count: 5 }, V30_ACA, factors)).toEqual({
      kind: "scored",
      score: 2,
    })
    const other = { B: { strata_count: 5, native_cover_percent: 80 } }
    expect(v30("A", { native_genus_count: 5 }, V30_ACA, other)).toEqual({
      kind: "scored",
      score: 5,
    })
  })

  it("A: its own cover wins over B's; no cover known means no cap", () => {
    const factors = { B: { strata_count: 5, covered_autochthonous_percent: 10 } }
    expect(v30("A", { native_genus_count: 5, native_cover_percent: 70 }, V30_ACA, factors)).toEqual(
      { kind: "scored", score: 5 },
    )
    expect(v30("A", { native_genus_count: 5, native_cover_below_50: true })).toEqual({
      kind: "scored",
      score: 2,
    })
    expect(v30("A", { native_genus_count: 5 }, V30_ACA, { B: 5 })).toEqual({
      kind: "scored",
      score: 5,
    })
    expect(v30("A", { native_genus_count: 5 })).toEqual({ kind: "scored", score: 5 })
  })

  it("A: unreadable input", () => {
    expect(v30("A", {})).toEqual({ kind: "invalid" })
    expect(v30("A", { native_genus_count: 5, native_cover_percent: 120 })).toEqual({
      kind: "invalid",
    })
    expect(v30("A", { native_genus_count: 5, native_cover_percent: "abc" })).toEqual({
      kind: "invalid",
    })
    expect(v30("A", { native_cover_percent: 40 })).toMatchObject({ kind: "incomplete" })
  })

  it("B: strata only, no cap, cover not required", () => {
    expect(v30("B", { strata_count: 5, covered_autochthonous_percent: 40 })).toEqual({
      kind: "scored",
      score: 5,
    })
    expect(v30("B", { count: 2 })).toEqual({ kind: "scored", score: 1 })
    expect(v30("B", { covered_autochthonous_percent: 40 })).toEqual({ kind: "invalid" })
  })

  it("C/D: lower class alone for score 1", () => {
    expect(v30("C", { bmg_count: 0, bmm_count: 2, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 1,
    })
    expect(v30("C", { bmg_count: 1, bmm_count: 1, surface_ha: 2 })).toEqual({
      kind: "scored",
      score: 0,
    })
    expect(v30("D", { bmg_count: 2, bmm_count: 0, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 2,
    })
    expect(v30("D", { bmg_count: 4, bmm_count: 0, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 5,
    })
    expect(v30("C", { bmg_count: 1, bmm_count: 1, surface_ha: 0 })).toEqual({ kind: "invalid" })
    expect(v30("C", { bmg_count: 1, surface_ha: 1 })).toEqual({ kind: "invalid" })
  })

  it("E: lower class alone for score 1", () => {
    expect(v30("E", { tgb_count: 0, gb_count: 2, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 1,
    })
    expect(v30("E", { tgb_count: 1, gb_count: 1, surface_ha: 2 })).toEqual({
      kind: "scored",
      score: 0,
    })
    expect(v30("E", { tgb_count: 2, gb_count: 0, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 2,
    })
    expect(v30("E", { tgb_count: 5, gb_count: 0, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 5,
    })
    expect(v30("E", { tgb_count: 5, gb_count: 0, surface_ha: -1 })).toEqual({ kind: "invalid" })
  })

  it("F: density or capped microhabitat groups, with factor_f_group_capped", () => {
    expect(v30("F", { trees_per_ha: 8 })).toEqual({ kind: "scored", score: 5 })
    const c = ctx(V30_ACA)
    expect(scoreFactorV30("F", { dmh_group_counts: [3, 1, -2] }, c)).toEqual({
      kind: "scored",
      score: 2,
    })
    expect(c.issues.map((i) => i.code)).toEqual(["factor_f_group_capped"])
    expect(c.issues[0]).toMatchObject({ blocking: false, factor: "F" })
    expect(v30("F", { dmh_group_counts: [1] })).toEqual({ kind: "scored", score: 0 })
    expect(v30("F", { dmh_group_counts: [2, 2, 1] })).toEqual({ kind: "scored", score: 2 })
    expect(v30("F", { dmh_group_counts: [2, "x"] })).toEqual({ kind: "invalid" })
    expect(v30("F", { dmh_group_counts: "3" })).toEqual({ kind: "invalid" })
  })

  it("G: percent or area ratio, subalpine scale", () => {
    expect(v30("G", { open_flowering_percent: 2 })).toEqual({ kind: "scored", score: 5 })
    expect(v30("G", { flowering_percent: 0 })).toEqual({ kind: "scored", score: 0 })
    expect(v30("G", { flowering_open_area_m2: 30, described_area_m2: 1000 })).toEqual({
      kind: "scored",
      score: 5,
    })
    expect(v30("G", { open_area_m2: 30, described_area_m2: 0 })).toEqual({ kind: "invalid" })
    expect(
      v30(
        "G",
        { open_flowering_percent: 6 },
        { region_version: "ACA", vegetation_stage: "subalpin" },
      ),
    ).toEqual({ kind: "scored", score: 5 })
    expect(v30("G", { open_flowering_percent: 6 })).toEqual({ kind: "scored", score: 2 })
  })

  it("H: numeric class score passed through (allowed-set check is evaluateIbp's), or class name", () => {
    expect(v30("H", { class_score: 2 })).toEqual({ kind: "scored", score: 2 })
    expect(v30("H", { score: 1 })).toEqual({ kind: "scored", score: 1 })
    expect(v30("H", { class: " Recent " })).toEqual({ kind: "scored", score: 0 })
    expect(v30("H", { class: "partial" })).toEqual({ kind: "scored", score: 2 })
    expect(v30("H", { class: "5" })).toEqual({ kind: "scored", score: 5 })
    expect(v30("H", { class: "other" })).toEqual({ kind: "invalid" })
    expect(v30("H", { class: 3 })).toEqual({ kind: "invalid" })
  })

  it("I/J: type counts", () => {
    expect(v30("I", { type_count: 1 })).toEqual({ kind: "scored", score: 2 })
    expect(v30("J", { count: 2 })).toEqual({ kind: "scored", score: 5 })
    expect(v30("J", { type_count: 0 })).toEqual({ kind: "scored", score: 0 })
    expect(v30("I", {})).toEqual({ kind: "invalid" })
  })
})

describe("v3.2 rules (CH-1..CH-5)", () => {
  it("A: cas scales and the cover cap on A", () => {
    expect(v32("A", { native_genus_count: 5, native_cover_percent: 40 })).toEqual({
      kind: "scored",
      score: 2,
    })
    expect(v32("A", { native_genus_count: 5, native_cover_percent: 50 })).toEqual({
      kind: "scored",
      score: 5,
    })
    expect(v32("A", { native_genus_count: 1, native_cover_percent: 10 })).toEqual({
      kind: "scored",
      score: 0,
    })
    expect(v32("A", { native_genus_count: 5, native_cover_below_50: true })).toEqual({
      kind: "scored",
      score: 2,
    })
    expect(v32("A", { native_genus_count: 5, native_cover_below_50: false })).toEqual({
      kind: "scored",
      score: 5,
    })
    const cas2 = { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 2 }
    expect(
      v32(
        "A",
        { native_genus_count: 2, native_cover_percent: 60 },
        { ...cas2, ibp_cas3_scale: true },
      ),
    ).toEqual({ kind: "scored", score: 2 })
    expect(v32("A", { native_genus_count: 2, native_cover_percent: 60 }, cas2)).toEqual({
      kind: "scored",
      score: 1,
    })
    expect(
      v32("A", { native_genus_count: 2, native_cover_percent: 60 }, { ...cas2, ibp_cas: 3 }),
    ).toEqual({ kind: "scored", score: 2 })
  })

  it("A: missing cas or cover is incomplete; B's legacy cover is not read", () => {
    const factors = { B: { strata_count: 5, covered_autochthonous_percent: 40 } }
    expect(v32("A", { native_genus_count: 5 }, V32_CAS1, factors)).toEqual({
      kind: "incomplete",
      reason: "native_cover",
    })
    expect(
      v32(
        "A",
        { native_genus_count: 5, native_cover_percent: 60 },
        { ibp_method_version: IBP_METHOD_V3_2 },
      ),
    ).toEqual({ kind: "incomplete", reason: "ibp_cas" })
    expect(v32("A", { native_cover_percent: 60 })).toEqual({
      kind: "incomplete",
      reason: "native_genus_count",
    })
    expect(v32("A", {})).toEqual({ kind: "invalid" })
    expect(v32("A", { native_genus_count: 5, native_cover_percent: -1 })).toEqual({
      kind: "invalid",
    })
  })

  it("C/D and E: sum rules for score 1", () => {
    expect(v32("C", { bmg_count: 1, bmm_count: 1, surface_ha: 2 })).toEqual({
      kind: "scored",
      score: 1,
    })
    expect(v32("D", { bmg_count: 0, bmm_count: 9, surface_ha: 10 })).toEqual({
      kind: "scored",
      score: 0,
    })
    expect(v32("C", { bmg_count: 2, bmm_count: 0, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 2,
    })
    expect(v32("C", { bmg_count: 3, bmm_count: 0, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 5,
    })
    expect(v32("C", { bmg_count: 3, surface_ha: 1 })).toEqual({ kind: "invalid" })
    expect(v32("E", { tgb_count: 1, gb_count: 1, surface_ha: 2 })).toEqual({
      kind: "scored",
      score: 1,
    })
    expect(v32("E", { tgb_count: 0, gb_count: 0.5, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 0,
    })
    expect(v32("E", { tgb_count: 4, gb_count: 0, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 2,
    })
    expect(v32("E", { tgb_count: 5, gb_count: 0, surface_ha: 1 })).toEqual({
      kind: "scored",
      score: 5,
    })
    expect(v32("E", { tgb_count: 5, gb_count: 0 })).toEqual({ kind: "invalid" })
  })

  it("G: cas scales; missing cas is incomplete", () => {
    const cas3 = { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 3 }
    expect(v32("G", { open_flowering_percent: 2 })).toEqual({ kind: "scored", score: 5 })
    expect(v32("G", { open_flowering_percent: 6 })).toEqual({ kind: "scored", score: 2 })
    expect(v32("G", { open_flowering_percent: 0.5 }, cas3)).toEqual({ kind: "scored", score: 2 })
    expect(v32("G", { open_flowering_percent: 6 }, cas3)).toEqual({ kind: "scored", score: 5 })
    expect(
      v32("G", { open_flowering_percent: 6 }, { ibp_method_version: IBP_METHOD_V3_2 }),
    ).toEqual({ kind: "incomplete", reason: "ibp_cas" })
    expect(v32("G", {})).toEqual({ kind: "invalid" })
  })

  it("B, F, H, I, J: same as v3.0", () => {
    expect(v32("B", { strata_count: 5 })).toEqual({ kind: "scored", score: 5 })
    expect(v32("F", { trees_per_ha: 8 })).toEqual({ kind: "scored", score: 5 })
    expect(v32("H", { class: "partial" })).toEqual({ kind: "scored", score: 2 })
    expect(v32("I", { type_count: 1 })).toEqual({ kind: "scored", score: 2 })
    expect(v32("J", { type_count: 2 })).toEqual({ kind: "scored", score: 5 })
  })
})
