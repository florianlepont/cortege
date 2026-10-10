import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { buildIdentityBlocks, identityCss, inseeFromParcelId } from "./identity"
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
  version: IBP_METHOD_V3_0,
  ibpCas: null,
  ibpCas3Scale: false,
  regionVersion: "ACA",
  vegetationStage: "collineen",
}

function makeData(overrides: Partial<SurveyExportData> = {}): SurveyExportData {
  return {
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: ["77186000AB0123", "77186000AB0124"],
    observationYear: 2026,
    versionNumber: 2,
    dateIso: "2026-10-10T08:00:00Z",
    isDraft: false,
    observerName: "Claire Martin",
    method: V32,
    scores: null,
    factorEntries: [],
    generatedAtIso: "2026-10-10T09:00:00Z",
    coordinates: { lat: 48.40491, lng: 2.69924 },
    rawFactors: {},
    photos: { items: [], total: 0, unavailable: 0 },
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
    ...overrides,
  }
}

function build(overrides: Partial<SurveyExportData> = {}) {
  const blocks = buildIdentityBlocks(makeData(overrides), palette)
  const byId = (id: string) => {
    const found = blocks.find((block) => block.id === id)
    if (!found) throw new Error(`no block ${id}`)
    return found
  }
  return { blocks, identity: byId("identity"), method: byId("identity-method") }
}

describe("inseeFromParcelId", () => {
  it("reads the commune and the department of a mainland id", () => {
    expect(inseeFromParcelId("77186000AB0123")).toEqual({ commune: "77186", department: "77" })
  })

  it("keeps the Corsican letters as the department", () => {
    expect(inseeFromParcelId("2A004000AB0001")).toEqual({ commune: "2A004", department: "2A" })
    expect(inseeFromParcelId("2B033000AB0001")).toEqual({ commune: "2B033", department: "2B" })
  })

  it("takes three characters for the overseas departments", () => {
    expect(inseeFromParcelId("97411000AB0001")).toEqual({ commune: "97411", department: "974" })
  })

  it("gives null for a malformed id", () => {
    expect(inseeFromParcelId("")).toBeNull()
    expect(inseeFromParcelId("77186")).toBeNull()
    expect(inseeFromParcelId("77186000AB01234")).toBeNull()
    expect(inseeFromParcelId("XX186000AB0123")).toBeNull()
    expect(inseeFromParcelId("7718600<script>")).toBeNull()
  })
})

describe("identity block", () => {
  it("returns the identity block then the method block", () => {
    const { blocks } = build()
    expect(blocks.map((block) => block.id)).toEqual(["identity", "identity-method"])
    for (const block of blocks) expect(block.height).toBeGreaterThan(0)
  })

  it("lists site, parcels, commune, department, year, version, date, observer, coordinates, mode", () => {
    const { identity } = build()
    const html = identity.html
    expect(html).toContain(t.identity.heading)
    expect(html).toContain("Forêt de test")
    expect(html).toContain("77186000AB0123, 77186000AB0124")
    expect(html).toContain(t.identity.commune)
    expect(html).toContain("77186")
    expect(html).toContain(t.identity.department)
    expect(html).toContain("2026")
    expect(html).toContain(t.identity.versionNumber)
    expect(html).toContain("10 octobre 2026")
    expect(html).toContain("Claire Martin")
    expect(html).toContain(t.identity.coordinatesValue({ lat: "48,40491", lng: "2,69924" }))
    expect(html).toContain(t.identity.surveyMode)
    expect(html).toContain(t.identity.cappedMode)
  })

  it("derives commune and department from the first parcel only", () => {
    const { identity } = build({ parcelIds: ["2A004000AB0001", "77186000AB0123"] })
    expect(identity.html).toContain("2A004")
    expect(identity.html).not.toContain(">77<")
  })

  it("prints Non renseigné for a missing year, version number or date", () => {
    const { identity } = build({ observationYear: null, versionNumber: null, dateIso: "nope" })
    const unknown = identity.html.split(t.identity.unknown).length - 1
    expect(unknown).toBe(3)
  })

  it("omits the observer and coordinates lines when null", () => {
    const { identity } = build({ observerName: null, coordinates: null })
    expect(identity.html).not.toContain(t.identity.observer)
    expect(identity.html).not.toContain(t.identity.coordinates)
    expect(identity.html).not.toContain("WGS 84")
  })

  it("omits the observer line for a blank observer", () => {
    const { identity } = build({ observerName: "   " })
    expect(identity.html).not.toContain(t.identity.observer)
  })

  it("prints the no-parcel text and no commune without a parcel", () => {
    const { identity } = build({ parcelIds: [] })
    expect(identity.html).toContain(t.identity.noParcel)
    expect(identity.html).not.toContain(t.identity.commune)
    expect(identity.html).not.toContain(t.identity.department)
  })

  it("omits commune and department when the first id is malformed", () => {
    const { identity } = build({ parcelIds: ["bad-id"] })
    expect(identity.html).toContain("bad-id")
    expect(identity.html).not.toContain(t.identity.commune)
  })

  it("never prints a dash for an unknown value", () => {
    const { blocks } = build({ observationYear: null, versionNumber: null })
    for (const block of blocks) {
      expect(block.html).not.toContain("—")
      expect(block.html).not.toMatch(/>\s*-\s*</)
    }
  })

  it("counts one line for the 78 character v3.2 cas row and the 64 character site name", () => {
    const { method, identity } = build({
      method: { ...V32, ibpCas: 1 },
      siteName: "Foret domaniale des trois parcelles de la grande colline du nord",
    })
    const oneLineRow = 6 + 13
    // card padding 20, heading 24, margin 10, two rows of one line (version, cas)
    expect(method.height).toBe(20 + 24 + 10 + 2 * oneLineRow)
    // the same card with a site name of 64 characters is not taller than with a short one
    expect(identity.height).toBe(build({ method: { ...V32, ibpCas: 1 } }).identity.height)
  })

  it("grows with long parcel lists", () => {
    const short = build({ parcelIds: ["77186000AB0123"] }).identity.height
    const many = Array.from({ length: 20 }, (_, i) => `77186000AB${String(i).padStart(4, "0")}`)
    expect(build({ parcelIds: many }).identity.height).toBeGreaterThan(short)
  })
})

describe("method block", () => {
  it("shows the v3.2 label, the cas and its caption", () => {
    const { method } = build({ method: { ...V32, ibpCas: 3 } })
    expect(method.html).toContain(t.method.heading)
    expect(method.html).toContain(fr.ibpMethod.versions[IBP_METHOD_V3_2])
    expect(method.html).toContain(fr.ibpMethod.casLabels[3])
    expect(method.html).toContain(fr.ibpMethod.casCaptions[3])
  })

  it("prints the cas-3 scale line only when that scale applies", () => {
    const cas1 = build({ method: V32 }).method.html
    expect(cas1).not.toContain(t.method.cas3Scale)
    const forced = build({ method: { ...V32, ibpCas: 2, ibpCas3Scale: true } }).method.html
    expect(forced).toContain(t.method.cas3Scale)
    expect(forced).toContain(fr.ibpMethod.cas3ScaleLabel)
    const cas3 = build({ method: { ...V32, ibpCas: 3 } }).method.html
    expect(cas3).toContain(t.method.cas3Scale)
  })

  it("prints Non renseigné for a v3.2 survey without a cas", () => {
    const { method } = build({ method: { ...V32, ibpCas: null } })
    expect(method.html).toContain(t.identity.unknown)
    expect(method.html).not.toContain(fr.ibpMethod.casLabels[1])
  })

  it("shows the v3.0 label with the region and the stage", () => {
    const { method } = build({ method: V30 })
    expect(method.html).toContain(fr.ibpMethod.versions[IBP_METHOD_V3_0])
    expect(method.html).toContain(t.method.region)
    expect(method.html).toContain(fr.labels.regions.ACA)
    expect(method.html).toContain(t.method.stage)
    expect(method.html).toContain(fr.labels.vegetationStages.collineen)
    expect(method.html).not.toContain(t.method.cas)
  })

  it("shows the legacy label for an untagged survey", () => {
    const { method } = build({ method: { ...V30, version: null } })
    expect(method.html).toContain(fr.ibpMethod.legacyVersionLabel)
    expect(method.html).toContain(fr.labels.regions.ACA)
  })

  it("prints Non renseigné for a v3.0 survey without region or stage", () => {
    const { method } = build({
      method: { ...V30, regionVersion: null, vegetationStage: "unknown-stage" },
    })
    expect(method.html.split(t.identity.unknown).length - 1).toBe(2)
  })

  it("prints Non renseigné as the version of an unknown tag", () => {
    const { method } = build({ method: { ...V30, version: "cnpf_future" } })
    expect(method.html).toContain(t.identity.unknown)
    expect(method.html).not.toContain(fr.ibpMethod.versions[IBP_METHOD_V3_0])
    expect(method.html).not.toContain(fr.ibpMethod.versions[IBP_METHOD_V3_2])
    expect(method.html).not.toContain(fr.ibpMethod.legacyVersionLabel)
  })

  it("does not read object prototype keys as labels", () => {
    const { method } = build({
      method: { ...V30, regionVersion: "constructor", vegetationStage: "__proto__" },
    })
    expect(method.html.split(t.identity.unknown).length - 1).toBe(2)
  })
})

describe("escaping", () => {
  it("escapes a script payload in the site name and the parcel ids", () => {
    const { identity } = build({
      siteName: "<script>alert(1)</script>",
      parcelIds: ["<img src=x onerror=y>"],
    })
    expect(identity.html).not.toContain("<script>")
    expect(identity.html).not.toContain("<img")
    expect(identity.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
  })

  it("escapes quotes in the observer name", () => {
    const { identity } = build({ observerName: '"onerror=x' })
    expect(identity.html).toContain("&quot;onerror=x")
    expect(identity.html).not.toContain('"onerror=x')
  })

  it("escapes a hostile region code that is not in the catalogue", () => {
    const { method } = build({
      method: { ...V30, regionVersion: "<b>x</b>", vegetationStage: "<i>y</i>" },
    })
    expect(method.html).not.toContain("<b>x")
    expect(method.html).not.toContain("<i>y")
  })
})

describe("identityCss", () => {
  const css = identityCss(palette)

  it("prefixes every class with identity-", () => {
    const classes = css.match(/\.[A-Za-z][\w-]*/g) ?? []
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith(".identity-")).toBe(true)
  })

  it("uses palette colours and the charter fonts, with no hex literal", () => {
    expect(css).toContain("ink")
    expect(css).toContain(PDF_FONT_FAMILIES.body)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
  })

  it("uses no CSS columns", () => {
    expect(css).not.toContain("column-count")
    expect(css).not.toContain("columns:")
  })
})
