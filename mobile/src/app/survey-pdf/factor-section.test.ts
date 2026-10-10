import { FACTOR_KEYS, IBP_METHOD_V3_2, allowedScoresFor } from "@cortege/ibp-domain"
import type { FactorKey } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { FACTOR_CARD_BASE_HEIGHT, buildFactorBlocks, factorSectionCss } from "./factor-section"
import { escapeHtml } from "./html"
import { PDF_FONT_FAMILIES } from "./types"
import type { ExportMethodContext, PdfPalette, SurveyExportData } from "./types"

const t = fr.surveyExport

const PALETTE_KEYS = [
  "ink",
  "inkMuted",
  "inkFaint",
  "line",
  "paper",
  "panel",
  "panelStrong",
  "accent",
  "accentInk",
  "accentSoft",
  "alert",
  "alertSoft",
  "bandLow",
  "bandMid",
  "bandHigh",
  "bandTrack",
  "watermark",
  "parcelFill",
  "parcelStroke",
  "mapCanvas",
  "chartGrid",
] as const

// Fake palette: each value is its key name, so a rule can be traced without any colour literal.
const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, key])) as PdfPalette

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

const POINTS: Record<FactorKey, number> = {
  A: 2,
  B: 1,
  C: 5,
  D: 0,
  E: 2,
  F: 2,
  G: 5,
  H: 5,
  I: 2,
  J: 0,
}

function entries(overrides: Record<string, [string, number | null]> = {}) {
  return FACTOR_KEYS.map((key) => {
    const [selectedClass, points] = overrides[key] ?? [`S${POINTS[key]}`, POINTS[key]]
    return [key, { selected_class: selectedClass, warnings: [], score_points: points }] as [
      string,
      { selected_class: string; warnings: string[]; score_points: number | null },
    ]
  })
}

function makeData(overrides: Partial<SurveyExportData> = {}): SurveyExportData {
  return {
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: [],
    observationYear: 2026,
    versionNumber: 1,
    dateIso: "2026-10-10T08:00:00Z",
    isDraft: false,
    observerName: null,
    method: V32,
    scores: null,
    factorEntries: entries(),
    generatedAtIso: "2026-10-10T09:00:00Z",
    coordinates: null,
    rawFactors: {
      A: { genera: ["Fagus", "Abies"], native_cover_percent: 80 },
      B: { strata_count: 3, strata: ["low", "high"] },
      C: { bmg_count: 1, bmm_count: 2, surface_ha: 1 },
      D: { bmg_count: 0, bmm_count: 0, surface_ha: 1 },
      E: { tgb_count: 1, gb_count: 2, surface_ha: 1 },
      F: { trees_per_ha: 4, dmh_groups: ["dmh_01"] },
      G: { open_flowering_percent: 3 },
      H: { class_score: 5, evidence: ["etat_major_map"] },
      I: { type_count: 1, types: ["spring_seep"] },
      J: { type_count: 0 },
    },
    photos: { items: [], total: 0, unavailable: 0 },
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
    ...overrides,
  }
}

function blockById(blocks: ReturnType<typeof buildFactorBlocks>, id: string) {
  const found = blocks.find((block) => block.id === id)
  if (!found) throw new Error(`no block ${id}`)
  return found
}

describe("buildFactorBlocks structure", () => {
  const blocks = buildFactorBlocks(makeData(), palette)

  it("orders the stand heading, A to G, the context heading, then H to J", () => {
    expect(blocks.map((block) => block.id)).toEqual([
      "factor-heading-stand",
      "factor-A",
      "factor-B",
      "factor-C",
      "factor-D",
      "factor-E",
      "factor-F",
      "factor-G",
      "factor-heading-context",
      "factor-H",
      "factor-I",
      "factor-J",
    ])
  })

  it("keeps each heading with the card that follows", () => {
    expect(blockById(blocks, "factor-heading-stand").keepWithNext).toBe(true)
    expect(blockById(blocks, "factor-heading-context").keepWithNext).toBe(true)
    expect(blockById(blocks, "factor-heading-stand").html).toContain(t.factors.standGroup)
    expect(blockById(blocks, "factor-heading-context").html).toContain(t.factors.contextGroup)
  })

  it("shows the letter, the catalogue title, the observations and the scale line", () => {
    const html = blockById(blocks, "factor-A").html
    expect(html).toContain(">A<")
    expect(html).toContain(fr.labels.factorTitles.A)
    expect(html).toContain("Hêtre (Fagus)")
    expect(html).toContain(t.factors.scale)
    expect(html).toContain(escapeHtml(t.scaleLines.v3_2.A))
    expect(html).toContain(t.factors.pointsOutOfFive({ points: "2" }))
  })

  it("has one chip per allowed score and highlights only the retained points", () => {
    for (const factor of FACTOR_KEYS) {
      const html = blockById(blocks, `factor-${factor}`).html
      const chips = html.match(/class="factor-chip[ "]/g) ?? []
      expect(chips).toHaveLength(allowedScoresFor(factor).length)
      expect(html.match(/factor-chip-on/g)).toHaveLength(1)
    }
    const htmlD = blockById(blocks, "factor-D").html
    expect(htmlD).toMatch(/factor-chip factor-chip-on">0</)
  })

  it("gives every card a positive height", () => {
    for (const block of blocks) expect(block.height).toBeGreaterThan(0)
    for (const factor of FACTOR_KEYS) {
      expect(blockById(blocks, `factor-${factor}`).height).toBeGreaterThanOrEqual(
        FACTOR_CARD_BASE_HEIGHT,
      )
    }
  })
})

describe("method versions", () => {
  it("prints the v3.0 scale lines for a v3.0 survey and the v3.2 ones for v3.2", () => {
    const v30 = buildFactorBlocks(makeData({ method: V30 }), palette)
    const v32 = buildFactorBlocks(makeData({ method: V32 }), palette)
    for (const factor of ["A", "G"] as const) {
      const old = blockById(v30, `factor-${factor}`).html
      const current = blockById(v32, `factor-${factor}`).html
      expect(old).toContain(escapeHtml(t.scaleLines.v3_0[factor]))
      expect(old).not.toContain(escapeHtml(t.scaleLines.v3_2[factor]))
      expect(current).toContain(escapeHtml(t.scaleLines.v3_2[factor]))
      expect(current).not.toContain(escapeHtml(t.scaleLines.v3_0[factor]))
    }
  })

  it("shows the legacy genus count of a v3.0 survey", () => {
    const data = makeData({
      method: V30,
      rawFactors: { A: { native_genus_count: 3, native_cover_percent: 90 } },
    })
    const html = blockById(buildFactorBlocks(data, palette), "factor-A").html
    expect(html).toContain(t.factors.legacyGenusCount({ count: 3 }))
  })
})

describe("missing factors (D-10)", () => {
  it("marks the sentinel and an absent entry with the alert colour and no highlighted chip", () => {
    const data = makeData({
      factorEntries: entries({ B: ["Not filled", null] }).filter(([key]) => key !== "C"),
    })
    const blocks = buildFactorBlocks(data, palette)
    for (const id of ["factor-B", "factor-C"]) {
      const html = blockById(blocks, id).html
      expect(html).toContain(t.factors.missing)
      expect(html).toContain("alert")
      expect(html).not.toContain("factor-chip-on")
      expect(html).not.toContain(t.factors.pointsOutOfFive({ points: "0" }))
    }
    expect(blockById(blocks, "factor-A").html).not.toContain(t.factors.missing)
  })

  it("still prints the observations of a factor that has no retained class", () => {
    const data = makeData({
      factorEntries: entries({ A: ["Not filled", null] }),
      rawFactors: { A: { genera: ["Fagus"] } },
    })
    const html = blockById(buildFactorBlocks(data, palette), "factor-A").html
    expect(html).toContain(t.factors.missing)
    expect(html).toContain("Hêtre (Fagus)")
  })

  it("draws the whole sheet when nothing was entered", () => {
    const data = makeData({ factorEntries: [], rawFactors: {} })
    const blocks = buildFactorBlocks(data, palette)
    expect(blocks).toHaveLength(12)
    for (const factor of FACTOR_KEYS) {
      expect(blockById(blocks, `factor-${factor}`).html).toContain(t.factors.missing)
    }
  })
})

describe("height estimate", () => {
  it("grows with the number of listed items", () => {
    const small = makeData({ rawFactors: { A: { genera: ["Fagus", "Abies"] } } })
    const big = makeData({
      method: { ...V32, ibpCas: 2 },
      rawFactors: {
        A: {
          genera: [
            "Abies",
            "Acer",
            "Alnus",
            "Arbutus",
            "Betula",
            "Carpinus",
            "Castanea",
            "Celtis",
            "Cupressus",
            "Fagus",
            "Fraxinus",
            "Juglans",
            "Juniperus",
            "Larix",
            "Malus",
            "Ostrya",
            "Picea",
            "Pinus",
            "Populus",
            "Prunus",
            "Pyrus",
            "Quercus_deciduae",
            "Quercus_sempervirens",
            "Salix",
            "Sorbus",
            "Tamarix",
            "Taxus",
            "Tilia",
            "Ulmus",
            "Ceratonia",
            "Cercis",
            "Olea",
            "Phillyrea",
            "Pistacia",
          ],
          native_cover_percent: 90,
        },
      },
    })
    const smallHeight = blockById(buildFactorBlocks(small, palette), "factor-A").height
    const bigHeight = blockById(buildFactorBlocks(big, palette), "factor-A").height
    expect(bigHeight).toBeGreaterThan(smallHeight + 40)
  })

  it("grows with the number of observation lines", () => {
    const bare = makeData({ rawFactors: { B: { strata_count: 3 } } })
    const full = makeData({ rawFactors: { B: { strata_count: 3, strata: ["low", "high"] } } })
    expect(blockById(buildFactorBlocks(full, palette), "factor-B").height).toBeGreaterThan(
      blockById(buildFactorBlocks(bare, palette), "factor-B").height,
    )
  })
})

describe("escaping", () => {
  it("escapes the retained class text and never lets a hostile code through", () => {
    const data = makeData({
      factorEntries: entries({ A: ["<img src=x onerror=alert(1)>", 2] }),
      rawFactors: { A: { genera: ["<script>alert(1)</script>", "Fagus"] } },
    })
    const html = blockById(buildFactorBlocks(data, palette), "factor-A").html
    expect(html).not.toContain("<script")
    expect(html).not.toContain("<img")
    expect(html).toContain("&lt;img")
  })

  it("never prints the site name", () => {
    const data = makeData({ siteName: "<b>NomDuSite</b>" })
    const all = buildFactorBlocks(data, palette)
      .map((block) => block.html)
      .join("")
    expect(all).not.toContain("NomDuSite")
  })
})

describe("factorSectionCss", () => {
  const css = factorSectionCss(palette)

  it("prefixes every class with factor-", () => {
    const classes = css.match(/\.[A-Za-z][\w-]*/g) ?? []
    expect(classes.length).toBeGreaterThan(5)
    for (const name of classes) expect(name.startsWith(".factor-")).toBe(true)
  })

  it("uses palette values and the charter fonts, no colour literal, no columns", () => {
    expect(css).toContain(PDF_FONT_FAMILIES.title)
    expect(css).toContain(PDF_FONT_FAMILIES.body)
    expect(css).toContain("accent")
    expect(css).toContain("alert")
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
    expect(css).not.toContain("column-count")
  })
})
