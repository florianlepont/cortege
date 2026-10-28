import { IBP_METHOD_V3_2, type IbpCas, type IbpMethodVersion } from "@cortege/ibp-domain"
import { fr } from "../i18n"
import {
  computeFactorKeyFigure,
  genusCountFigure,
  hasKeyFigure,
  type KeyFigureFactor,
} from "./factor-key-figure"
import { computeRetainedScoresFromRawFactors } from "./ibp-scoring"
import type { FactorField, FactorRetainedScore } from "./types"

const field = (value: string): FactorField => ({
  label: "x",
  value,
  onChange: () => undefined,
  touched: false,
  onTouch: () => undefined,
})

type Overrides = {
  methodVersion?: IbpMethodVersion | null
  ibpCas?: IbpCas | null
  countedInFull?: boolean
  retainedScore?: FactorRetainedScore | null
}

const figure = (factor: KeyFigureFactor, values: string[], overrides: Overrides = {}) =>
  computeFactorKeyFigure({
    factor,
    fields: values.map(field),
    methodVersion: IBP_METHOD_V3_2,
    ibpCas: 1,
    countedInFull: false,
    retainedScore: null,
    ...overrides,
  })

const retained = (score: number): FactorRetainedScore => ({ score }) as FactorRetainedScore

describe("hasKeyFigure", () => {
  it("is every factor but F", () => {
    expect(hasKeyFigure("F")).toBe(false)
    for (const factor of ["A", "B", "C", "D", "E", "G", "H", "I", "J"] as const) {
      expect(hasKeyFigure(factor)).toBe(true)
    }
  })
})

describe("A: native genera", () => {
  it("counts the distinct listed genera", () => {
    const result = figure("A", ["Fagus,Acer,Fagus", "70"])
    expect(result).toMatchObject({
      value: "2",
      unitKey: "genera",
      subLabelKind: "fromList",
      textual: false,
    })
  })

  it("is 0 for an empty list", () => {
    expect(figure("A", ["", ""]).value).toBe("0")
    expect(figure("A", []).value).toBe("0")
  })

  it("leaves out a Mediterranean genus outside cas 2 and 4, counts it at cas 2", () => {
    expect(figure("A", ["Fagus,Olea", ""], { ibpCas: 1 }).value).toBe("1")
    expect(figure("A", ["Fagus,Olea", ""], { ibpCas: 2 }).value).toBe("2")
  })

  it("reads v3.0 with no cas, whatever the form still holds", () => {
    expect(figure("A", ["Fagus,Olea", ""], { methodVersion: null, ibpCas: 2 }).value).toBe("1")
  })

  it("reads a missing cas as no cas", () => {
    expect(figure("A", ["Fagus,Olea", ""], { ibpCas: null }).value).toBe("1")
  })

  it("is null when the package reads no count", () => {
    expect(genusCountFigure({ kind: "none" })).toBeNull()
    expect(genusCountFigure({ kind: "invalid" })).toBeNull()
    expect(genusCountFigure({ kind: "count", count: 4 })).toBe("4")
  })
})

describe("B: strata", () => {
  it("is the strata count, with the capped or the counted-in-full origin", () => {
    expect(figure("B", ["3"])).toMatchObject({
      value: "3",
      unitKey: "strata",
      subLabelKind: "fromChoices",
    })
    expect(figure("B", ["3"], { countedInFull: true }).subLabelKind).toBe("fromStrataCover")
  })

  it("reads an empty or unreadable count as 0", () => {
    expect(figure("B", [""]).value).toBe("0")
    expect(figure("B", ["abc"]).value).toBe("0")
    expect(figure("B", []).value).toBe("0")
  })
})

describe("C, D, E: per hectare", () => {
  it("C: the large dead standing trees per hectare, with a decimal comma", () => {
    expect(figure("C", ["3", "4", "2"])).toMatchObject({
      value: "1,5",
      unitKey: "standingDeadwoodPerHa",
      subLabelKind: "fromDescribedSurface",
      pending: "compute",
    })
  })

  it("D: the large dead trees on the ground per hectare", () => {
    expect(figure("D", ["6", "0", "2"])).toMatchObject({
      value: "3",
      unitKey: "groundDeadwoodPerHa",
    })
  })

  it("E: the very large living trees per hectare, not the large ones", () => {
    expect(figure("E", ["2", "9", "4"])).toMatchObject({
      value: "0,5",
      unitKey: "veryLargeTreesPerHa",
    })
  })

  it("reads a surface written with a comma", () => {
    expect(figure("C", ["3", "0", "1,5"]).value).toBe("2")
  })

  it("keeps a small figure above 0 visible", () => {
    expect(figure("C", ["1", "0", "50"]).value).toBe("0,02")
    expect(figure("C", ["1", "0", "5000"]).value).toBe("0,0002")
  })

  it("is 0 for a surface with no large tree", () => {
    expect(figure("E", ["0", "0", "2"]).value).toBe("0")
  })

  it("is null without a count, with an unreadable count, or without a positive surface", () => {
    expect(figure("C", ["", "4", "2"]).value).toBeNull()
    expect(figure("C", ["3", "", "2"]).value).toBeNull()
    expect(figure("C", ["3", "4", ""]).value).toBeNull()
    expect(figure("C", ["3", "4", "0"]).value).toBeNull()
    expect(figure("C", ["1,5", "4", "2"]).value).toBeNull()
    expect(figure("D", ["-1", "4", "2"]).value).toBeNull()
    expect(figure("E", []).value).toBeNull()
  })
})

describe("G: open flowering habitats", () => {
  it("is the percent, with a no-break space before the sign", () => {
    expect(figure("G", ["3"])).toMatchObject({
      value: "3 %",
      unitKey: "floweringOpen",
      subLabelKind: "shareOfSurface",
      pending: "estimate",
    })
    expect(figure("G", ["2,5"]).value).toBe("2,5 %")
    expect(figure("G", ["0"]).value).toBe("0 %")
  })

  it("is null when empty or outside 0 to 100", () => {
    expect(figure("G", [""]).value).toBeNull()
    expect(figure("G", ["101"]).value).toBeNull()
    expect(figure("G", ["-2"]).value).toBeNull()
  })
})

describe("H: continuity", () => {
  it("is the chosen class as a word", () => {
    expect(figure("H", ["0"])).toMatchObject({
      value: "Récente",
      unitKey: "continuity",
      subLabelKind: "continuityAge",
      textual: true,
      pending: "choose",
    })
    expect(figure("H", ["2"]).value).toBe("Partielle")
    expect(figure("H", [" 5 "]).value).toBe("Ancienne")
  })

  it("is null without a class, or with an unknown one", () => {
    expect(figure("H", [""]).value).toBeNull()
    expect(figure("H", ["1"]).value).toBeNull()
    expect(figure("H", []).value).toBeNull()
  })
})

describe("I and J: types", () => {
  it("is the number of types ticked", () => {
    expect(figure("I", ["3"])).toMatchObject({
      value: "3",
      unitKey: "aquaticTypes",
      subLabelKind: "fromChoices",
    })
    expect(figure("J", ["2"])).toMatchObject({ value: "2", unitKey: "rockyTypes" })
  })

  it("is 0 when nothing is ticked", () => {
    expect(figure("I", [""]).value).toBe("0")
    expect(figure("J", []).value).toBe("0")
  })
})

describe("top score", () => {
  const FACTORS: readonly KeyFigureFactor[] = ["A", "B", "C", "D", "E", "G", "H", "I", "J"]

  it("shows only when the retained score is the highest the factor allows", () => {
    for (const factor of FACTORS) {
      expect(figure(factor, ["1"], { retainedScore: retained(5) }).topScore).toBe(true)
      expect(figure(factor, ["1"], { retainedScore: retained(2) }).topScore).toBe(false)
      expect(figure(factor, ["1"], { retainedScore: null }).topScore).toBe(false)
    }
  })

  it("follows the evaluation: a real survey reaches it with the figure shown", () => {
    const factors = {
      C: { bmg_count: 6, bmm_count: 0, surface_ha: 2 },
      G: { open_flowering_percent: 3 },
    }
    const scores = computeRetainedScoresFromRawFactors(factors, {
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
    })
    const c = figure("C", ["6", "0", "2"], { retainedScore: scores.C })
    expect(c).toMatchObject({ value: "3", topScore: true })
    expect(figure("G", ["3"], { retainedScore: scores.G }).topScore).toBe(true)
  })
})

describe("catalogue", () => {
  it("has a label, a sub label and a pending word for the keys", () => {
    const sample = figure("C", ["1", "1", "1"])
    expect(fr.factorDetail.keyFigure.label[sample.unitKey]).toBeTruthy()
    expect(fr.factorDetail.keyFigure.sub[sample.subLabelKind]).toBeTruthy()
    expect(fr.factorDetail.keyFigure.pending[sample.pending]).toBe("À calculer")
  })
})
