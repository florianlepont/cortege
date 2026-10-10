import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { buildFactorObservations, methodKeyOf } from "./factor-fields"
import type { ObservationLine } from "./factor-fields"
import type { ExportMethodContext } from "./types"

const t = fr.surveyExport.factors

const V32: ExportMethodContext = {
  version: IBP_METHOD_V3_2,
  ibpCas: 1,
  ibpCas3Scale: false,
  regionVersion: null,
  vegetationStage: null,
}

const V30: ExportMethodContext = {
  version: null,
  ibpCas: null,
  ibpCas3Scale: false,
  regionVersion: "ACA",
  vegetationStage: "collineen",
}

function lineOf(lines: ObservationLine[], caption: string): ObservationLine {
  const found = lines.find((line) => line.caption === caption)
  if (!found) throw new Error(`no line "${caption}" in ${JSON.stringify(lines)}`)
  return found
}

function noLine(lines: ObservationLine[], caption: string): void {
  expect(lines.find((line) => line.caption === caption)).toBeUndefined()
}

describe("methodKeyOf", () => {
  it("maps the v3.2 tag to v3_2 and everything else to v3_0", () => {
    expect(methodKeyOf(IBP_METHOD_V3_2)).toBe("v3_2")
    expect(methodKeyOf(IBP_METHOD_V3_0)).toBe("v3_0")
    expect(methodKeyOf(null)).toBe("v3_0")
    expect(methodKeyOf("")).toBe("v3_0")
    expect(methodKeyOf("something_else")).toBe("v3_0")
  })
})

describe("factor A", () => {
  const raw = {
    A: { genera: ["Fagus", "Quercus_deciduae", "Ceratonia"], native_cover_percent: 40 },
  }

  it("lists genera by display name and code, flags the ones not counted at the cas", () => {
    const lines = buildFactorObservations("A", raw, { method: V32, points: 1 })
    const genera = lineOf(lines, t.genera)
    expect(genera.items).toEqual([
      "Hêtre (Fagus)",
      "Chêne à feuilles caduques (Quercus deciduae)",
      `Caroubier (Ceratonia), ${t.genusNotCounted}`,
    ])
    expect(lines.some((line) => line.caption === t.genusCount({ count: 2 }))).toBe(true)
    expect(lineOf(lines, t.nativeCover).value).toBe("40 %")
  })

  it("counts the supplementary genus at cas 2", () => {
    const cas2 = { ...V32, ibpCas: 2 }
    const lines = buildFactorObservations("A", raw, { method: cas2, points: 2 })
    expect(lineOf(lines, t.genera).items?.[2]).toBe("Caroubier (Ceratonia)")
    expect(lines.some((line) => line.caption === t.genusCount({ count: 3 }))).toBe(true)
  })

  it("adds the cover cap note only when the raw genus score is above 2", () => {
    const five = {
      A: {
        genera: ["Fagus", "Abies", "Acer", "Alnus", "Betula"],
        native_cover_percent: 40,
      },
    }
    const capped = buildFactorObservations("A", five, { method: V32, points: 2 })
    expect(lineOf(capped, t.nativeCover).note).toBe(t.coverCapped)

    const three = {
      A: { genera: ["Fagus", "Abies", "Acer"], native_cover_percent: 40 },
    }
    const notCapped = buildFactorObservations("A", three, { method: V32, points: 2 })
    expect(lineOf(notCapped, t.nativeCover).note).toBeUndefined()

    const highCover = { A: { genera: five.A.genera, native_cover_percent: 60 } }
    const fine = buildFactorObservations("A", highCover, { method: V32, points: 5 })
    expect(lineOf(fine, t.nativeCover).note).toBeUndefined()

    const otherPoints = buildFactorObservations("A", five, { method: V32, points: 5 })
    expect(lineOf(otherPoints, t.nativeCover).note).toBeUndefined()
  })

  it("uses the cas-3 scale for the cap test", () => {
    const three = {
      A: { genera: ["Fagus", "Abies", "Acer"], native_cover_percent: 40 },
    }
    const cas3 = { ...V32, ibpCas: 3 }
    const lines = buildFactorObservations("A", three, { method: cas3, points: 2 })
    expect(lineOf(lines, t.nativeCover).note).toBe(t.coverCapped)
  })

  it("prints the legacy count of a v3.0 survey and the cover stored under B", () => {
    const legacy = {
      A: { native_genus_count: 3 },
      B: { strata_count: 2, covered_autochthonous_percent: 70 },
    }
    const lines = buildFactorObservations("A", legacy, { method: V30, points: 2 })
    expect(lineOf(lines, t.genera).value).toBe(t.legacyGenusCount({ count: 3 }))
    expect(lineOf(lines, t.nativeCover).value).toBe("70 %")

    const bLines = buildFactorObservations("B", legacy, { method: V30, points: 1 })
    noLine(bLines, t.nativeCover)
    expect(lineOf(bLines, t.strataCount).value).toBe("2")
  })

  it("does not count a supplementary genus in v3.0", () => {
    const lines = buildFactorObservations("A", raw, { method: V30, points: 1 })
    expect(lineOf(lines, t.genera).items?.[2]).toContain(t.genusNotCounted)
  })

  it("uses the subalpine scale for the v3.0 cap test", () => {
    const three = {
      A: { genera: ["Fagus", "Abies", "Acer"], native_cover_percent: 40 },
    }
    const subalpine = { ...V30, vegetationStage: "subalpin" }
    expect(
      lineOf(buildFactorObservations("A", three, { method: subalpine, points: 2 }), t.nativeCover)
        .note,
    ).toBe(t.coverCapped)
    expect(
      lineOf(buildFactorObservations("A", three, { method: V30, points: 2 }), t.nativeCover).note,
    ).toBeUndefined()
  })

  it("says so when no genus was entered, and drops codes that are not genera", () => {
    const empty = buildFactorObservations(
      "A",
      { A: { genera: [], native_cover_percent: 80 } },
      { method: V32, points: 0 },
    )
    expect(lineOf(empty, t.genera).value).toBe(t.generaNone)

    const hostile = buildFactorObservations(
      "A",
      { A: { genera: ["<script>alert(1)</script>", "Fagus", 3], native_cover_percent: 80 } },
      { method: V32, points: 0 },
    )
    expect(lineOf(hostile, t.genera).items).toEqual(["Hêtre (Fagus)"])
  })
})

describe("factor B", () => {
  it("gives the count, then the tiers when stored", () => {
    const stored = buildFactorObservations(
      "B",
      { B: { strata_count: 2, strata: ["very_low", "high", "not_a_tier"] } },
      { method: V32, points: 2 },
    )
    expect(lineOf(stored, t.strataCount).value).toBe("2")
    expect(lineOf(stored, t.strata).items).toEqual(["Très basse", "Haute"])
  })

  it("gives only the count for a survey saved before the details", () => {
    const old = buildFactorObservations("B", { B: { strata_count: 3 } }, { method: V32, points: 2 })
    expect(old).toHaveLength(1)
    noLine(old, t.strata)
  })
})

describe("factors C, D and E", () => {
  it("shows counts with per-hectare values and the surface", () => {
    const lines = buildFactorObservations(
      "C",
      { C: { bmg_count: 3, bmm_count: 2, surface_ha: 1.5 } },
      { method: V32, points: 5 },
    )
    expect(lineOf(lines, t.bmg).value).toBe("3 (2 / ha)")
    expect(lineOf(lines, t.bmm).value).toBe("2 (1,3 / ha)")
    expect(lineOf(lines, t.surface).value).toBe("1,5 ha")
  })

  it("reads D like C", () => {
    const lines = buildFactorObservations(
      "D",
      { D: { bmg_count: 0, bmm_count: 4, surface_ha: 2 } },
      { method: V30, points: 1 },
    )
    expect(lineOf(lines, t.bmg).value).toBe("0 (0 / ha)")
    expect(lineOf(lines, t.bmm).value).toBe("4 (2 / ha)")
  })

  it("reads E with TGB and GB", () => {
    const lines = buildFactorObservations(
      "E",
      { E: { tgb_count: 3, gb_count: 6, surface_ha: 1.5 } },
      { method: V32, points: 2 },
    )
    expect(lineOf(lines, t.tgb).value).toBe("3 (2 / ha)")
    expect(lineOf(lines, t.gb).value).toBe("6 (4 / ha)")
    expect(lineOf(lines, t.surface).value).toBe("1,5 ha")
  })

  it("prints the bare count when the surface cannot divide", () => {
    const lines = buildFactorObservations(
      "C",
      { C: { bmg_count: 3, bmm_count: 2, surface_ha: 0 } },
      { method: V32, points: 0 },
    )
    expect(lineOf(lines, t.bmg).value).toBe("3")
  })
})

describe("factors F and G", () => {
  it("gives trees per hectare and the groups when stored", () => {
    const lines = buildFactorObservations(
      "F",
      { F: { trees_per_ha: 4, dmh_groups: ["dmh_01", "unknown_group"] } },
      { method: V32, points: 2 },
    )
    expect(lineOf(lines, t.treesPerHa).value).toBe("4 arbres / ha")
    expect(lineOf(lines, t.dmhGroups).items).toEqual(["1. Loges de pic"])
  })

  it("gives only the density for an older survey", () => {
    const lines = buildFactorObservations(
      "F",
      { F: { trees_per_ha: 2.5 } },
      { method: V30, points: 1 },
    )
    expect(lines).toHaveLength(1)
    expect(lineOf(lines, t.treesPerHa).value).toBe("2,5 arbres / ha")
  })

  it("gives the open flowering cover", () => {
    const lines = buildFactorObservations(
      "G",
      { G: { open_flowering_percent: 3.5 } },
      { method: V32, points: 5 },
    )
    expect(lineOf(lines, t.openFlowering).value).toBe("3,5 %")
  })
})

describe("factors H, I and J", () => {
  it("gives the continuity class label and the sources when stored", () => {
    const lines = buildFactorObservations(
      "H",
      { H: { class_score: 5, evidence: ["etat_major_map", "nope"] } },
      { method: V32, points: 5 },
    )
    expect(lineOf(lines, t.continuity).value).toBe("Ancienne")
    expect(lineOf(lines, t.evidence).items).toEqual(["Carte de l'état-major"])
  })

  it("gives only the class when no source was stored, and skips an unknown class", () => {
    const lines = buildFactorObservations(
      "H",
      { H: { class_score: 2 } },
      { method: V32, points: 2 },
    )
    expect(lines).toHaveLength(1)
    expect(lineOf(lines, t.continuity).value).toBe("Partielle")
    expect(
      buildFactorObservations("H", { H: { class_score: 3 } }, { method: V32, points: 0 }),
    ).toEqual([])
  })

  it("gives the type count and the types by the survey's own wording", () => {
    const aquatic = buildFactorObservations(
      "I",
      { I: { type_count: 2, types: ["spring_seep", "river", "zzz"] } },
      { method: V32, points: 5 },
    )
    expect(lineOf(aquatic, t.typeCount).value).toBe("2")
    expect(lineOf(aquatic, t.aquaticTypes).items).toEqual([
      "Source ou suintement",
      "Rivière ou fleuve, estuaire ou delta (plus de 8 m)",
    ])

    const rocky = buildFactorObservations(
      "J",
      { J: { type_count: 1, types: ["cliff_high"] } },
      { method: V30, points: 2 },
    )
    expect(lineOf(rocky, t.typeCount).value).toBe("1")
    expect(lineOf(rocky, t.rockyTypes).items).toHaveLength(1)
    expect(lineOf(rocky, t.rockyTypes).items?.[0]).not.toContain("cliff_high")
  })

  it("prints the count only for an older survey", () => {
    const lines = buildFactorObservations("J", { J: { type_count: 0 } }, { method: V32, points: 0 })
    expect(lines).toHaveLength(1)
    noLine(lines, t.rockyTypes)
  })
})

describe("absent and broken values", () => {
  it("gives an empty list for an absent factor object", () => {
    for (const factor of ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const) {
      expect(buildFactorObservations(factor, {}, { method: V32, points: null })).toEqual([])
    }
    expect(buildFactorObservations("A", { A: "text" }, { method: V32, points: null })).toEqual([])
  })

  it("skips a value that is not a finite number, never printing NaN", () => {
    const lines = [
      ...buildFactorObservations(
        "C",
        { C: { bmg_count: Number.NaN, bmm_count: "2", surface_ha: Infinity } },
        { method: V32, points: null },
      ),
      ...buildFactorObservations(
        "G",
        { G: { open_flowering_percent: Number.NaN } },
        { method: V32, points: null },
      ),
      ...buildFactorObservations("F", { F: { trees_per_ha: null } }, { method: V32, points: null }),
    ]
    expect(lines).toEqual([])
    expect(JSON.stringify(lines)).not.toContain("NaN")
  })
})
