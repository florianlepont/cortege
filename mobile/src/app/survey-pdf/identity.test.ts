import { IBP_METHOD_V3_0, IBP_METHOD_V3_2, type SurveyRoute } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { escapeHtml } from "./html"
import { buildIdentityBlocks, identityCss, inseeFromParcelId } from "./identity"
import { sectionTitleCss } from "./styles"
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
  "warning",
  "warningSoft",
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
    mode: "complete",
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: ["77186000AB0123", "77186000AB0124"],
    // D-25: the year differs from the year of the date, so the year row prints in the base case.
    observationYear: 2025,
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
    conditions: { note: null, weather: null },
    route: null,
    photos: { items: [], total: 0, unavailable: 0 },
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
    ...overrides,
  }
}

const ROUTE: SurveyRoute = {
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 8,
  guide: { chosen_by: "observer" },
}

const CAPPED_ROW = `<tr class="identity-row"><th class="identity-caption">${t.identity.surveyMode}</th><td class="identity-value">${t.identity.cappedMode}</td></tr>`

function build(overrides: Partial<SurveyExportData> = {}) {
  const blocks = buildIdentityBlocks(makeData(overrides), palette)
  const identity = blocks[0]
  // The method part of the merged card: everything after the sub-heading.
  const marker = '<h3 class="identity-subheading">'
  const method = { html: identity.html.slice(identity.html.indexOf(marker)) }
  return { blocks, identity, method }
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

  it("takes three characters for the 98x collectivities", () => {
    expect(inseeFromParcelId("98818000AB0001")).toEqual({ commune: "98818", department: "988" })
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
  it("returns exactly one block, with the method folded in (UI-SPEC B.6)", () => {
    const { blocks, identity } = build()
    expect(blocks.map((block) => block.id)).toEqual(["identity"])
    expect(identity.height).toBeGreaterThan(0)
    const html = identity.html
    const parts = [
      html.indexOf(`<h2 class="identity-heading">${t.identity.heading}</h2>`),
      html.indexOf(t.identity.site),
      html.indexOf('<div class="identity-rule"></div>'),
      html.indexOf(`<h3 class="identity-subheading">${t.method.heading}</h3>`),
      html.indexOf(t.method.version),
    ]
    expect(parts.every((index) => index >= 0)).toBe(true)
    expect(parts).toEqual([...parts].sort((a, b) => a - b))
    expect(html.split("<section").length - 1).toBe(1)
  })

  it("lists site, parcels, commune, year, version, date, observer, coordinates, mode", () => {
    const { identity } = build()
    const html = identity.html
    expect(html).toContain(t.identity.heading)
    expect(html).toContain("Forêt de test")
    expect(html).toContain(
      '<span class="identity-nowrap">77186000AB0123</span>, <span class="identity-nowrap">77186000AB0124</span>',
    )
    expect(html).toContain(t.identity.commune)
    expect(html).toContain("77186 (département 77)")
    expect(html).toContain("2026")
    expect(html).toContain(t.identity.versionNumber)
    expect(html).toContain("10 octobre 2026")
    expect(html).toContain("Claire Martin")
    expect(html).toContain(t.identity.coordinatesValue({ lat: "48,40491", lng: "2,69924" }))
    expect(html).toContain(t.identity.surveyMode)
    expect(html).toContain(t.identity.cappedMode)
  })

  it("keeps the Mode de relevé row exactly as before for a survey without a route (U-11, P-3)", () => {
    const { identity } = build({ route: null })
    expect(identity.html).toContain(
      `<tr class="identity-row"><th class="identity-caption">${t.identity.surveyMode}</th><td class="identity-value">${t.identity.cappedMode}</td></tr>`,
    )
    // The row is the last one of the card.
    expect(identity.html.indexOf(t.identity.surveyMode)).toBeGreaterThan(
      identity.html.indexOf(t.identity.date),
    )
    expect(identity.html).toContain("</td></tr></table>")
    // The identity table ends with it, right before the rule of the method part.
    expect(identity.html).toContain(
      `${t.identity.cappedMode}</td></tr></table>\n<div class="identity-rule"></div>`,
    )
  })

  it("drops the Mode de relevé row only when the route block prints (phase 30)", () => {
    const withoutRoute = build({ route: null }).identity
    const withRoute = build({ route: ROUTE }).identity
    expect(withRoute.html).not.toContain(t.identity.surveyMode)
    expect(withRoute.html).not.toContain(t.identity.cappedMode)
    // The rest of the card is the same text, one row (6 + 13) shorter.
    expect(withoutRoute.html.replace(CAPPED_ROW, "")).toBe(withRoute.html)
    expect(withRoute.height).toBe(withoutRoute.height - 19)
    // The method part does not depend on the route.
    expect(build({ route: ROUTE }).method).toEqual(build({ route: null }).method)
  })

  it("prints one Commune row and no separate Département row", () => {
    const { identity } = build()
    expect(identity.html).not.toContain(">Département<")
    const identityPart = identity.html.slice(
      0,
      identity.html.indexOf('<div class="identity-rule">'),
    )
    expect(identityPart.split('class="identity-caption"').length - 1).toBe(9)
    const captions = [...identityPart.matchAll(/<th class="identity-caption">([^<]*)<\/th>/g)].map(
      (match) => match[1],
    )
    expect(captions).toEqual([
      t.identity.site,
      t.identity.parcels,
      t.identity.commune,
      escapeHtml(t.identity.observationYear),
      t.identity.versionNumber,
      t.identity.date,
      t.identity.observer,
      t.identity.coordinates,
      t.identity.surveyMode,
    ])
  })

  it.each([
    ["77186000AB0123", "77186 (département 77)"],
    ["2A004000AB0001", "2A004 (département 2A)"],
    ["97411000AB0001", "97411 (département 974)"],
    ["98818000AB0001", "98818 (département 988)"],
  ])("derives the Commune value of %s from the first parcel only", (first, value) => {
    const { identity } = build({ parcelIds: [first, "77186000AB0123"] })
    expect(identity.html).toContain(`<td class="identity-value">${value}</td>`)
  })

  it("is one row (19 units) shorter than before for a valid parcel id", () => {
    const valid = build({ parcelIds: ["77186000AB0123"] }).identity
    const malformed = build({ parcelIds: ["77186000AB012"] }).identity
    // The malformed id prints no Commune row; its parcel text is one character shorter, same line.
    expect(valid.height - malformed.height).toBe(19)
  })

  it("prints Non renseigné for a missing version number or date", () => {
    const { identity } = build({ versionNumber: null, dateIso: "nope" })
    const unknown = identity.html.split(t.identity.unknown).length - 1
    expect(unknown).toBe(2)
  })

  describe("the observation year row (D-25)", () => {
    const yearRow = (data: Partial<SurveyExportData>) =>
      build(data).identity.html.includes(escapeHtml(t.identity.observationYear))

    it("prints no row when the year is the year of the date, and is 19 units shorter", () => {
      const same = build({ observationYear: 2026 }).identity
      const other = build({ observationYear: 2025 }).identity
      expect(yearRow({ observationYear: 2026 })).toBe(false)
      expect(same.height).toBe(other.height - 19)
    })

    it("prints the row with the year when it differs from the date's", () => {
      const { identity } = build({ observationYear: 2024 })
      expect(identity.html).toContain(
        `<th class="identity-caption">${escapeHtml(t.identity.observationYear)}</th><td class="identity-value">2024</td>`,
      )
    })

    it("prints no row for a null year", () => {
      expect(yearRow({ observationYear: null })).toBe(false)
    })

    it("prints the row when the date cannot be read but the year is known", () => {
      const { identity } = build({ observationYear: 2024, dateIso: "nope" })
      expect(identity.html).toContain(escapeHtml(t.identity.observationYear))
      expect(identity.html).toContain(">2024</td>")
    })

    it("keeps the other rows and their order when the year row is left out", () => {
      const html = build({ observationYear: 2026 }).identity.html
      const identityPart = html.slice(0, html.indexOf('<div class="identity-rule">'))
      const captions = [
        ...identityPart.matchAll(/<th class="identity-caption">([^<]*)<\/th>/g),
      ].map((match) => match[1])
      expect(captions).toEqual([
        t.identity.site,
        t.identity.parcels,
        t.identity.commune,
        t.identity.versionNumber,
        t.identity.date,
        t.identity.observer,
        t.identity.coordinates,
        t.identity.surveyMode,
      ])
    })
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
  })

  it("omits the Commune row when the first id is malformed", () => {
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
    const { identity } = build({
      method: { ...V32, ibpCas: 1 },
      siteName: "Foret domaniale des trois parcelles de la grande colline du nord",
    })
    // the same card with a site name of 64 characters is not taller than with a short one
    expect(identity.height).toBe(build({ method: { ...V32, ibpCas: 1 } }).identity.height)
  })

  it("estimates the merged card as padding, heading, rows, rule, sub-heading, rows, margin", () => {
    const oneLineRow = 6 + 13
    // Valid parcel id (Commune row), a route (no Mode de relevé row): site, parcels, commune,
    // year, version, date, observer, coordinates = 8 identity rows; v3.2 cas 1 = 2 method rows.
    const { identity } = build({ route: ROUTE, parcelIds: ["77186000AB0123"] })
    // Padding 20, border 2 (measured in Chrome 2026-10-26: the card prints taller than its rows).
    expect(identity.height).toBe(20 + 2 + 24 + 8 * oneLineRow + 1 + 24 + 2 * oneLineRow + 10)
  })

  it("is 29 units shorter than the two cards it replaces, less its own 2 unit border (UI-SPEC B.6)", () => {
    const oneLineRow = 6 + 13
    const { identity } = build({ route: ROUTE, parcelIds: ["77186000AB0123"] })
    const oldIdentityCard = 20 + 24 + 8 * oneLineRow + 10
    const oldMethodCard = 20 + 24 + 2 * oneLineRow + 10
    expect(oldIdentityCard + oldMethodCard - identity.height).toBe(29 - 2)
  })

  describe("the parcels row (D-23)", () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, i) => `77186000AB${String(i + 1).padStart(4, "0")}`)
    const heightOf = (count: number) => build({ parcelIds: ids(count) }).identity.height
    const oneId = heightOf(1)

    it("counts one line for 1, 2 or 3 ids, two for 4 and ten for 30", () => {
      expect(heightOf(2)).toBe(oneId)
      expect(heightOf(3)).toBe(oneId)
      // A row is 6 of padding and 13 per line: 19 for one line, 32 for two, 136 for ten.
      expect(heightOf(4) - oneId).toBe(32 - 19)
      expect(heightOf(30) - oneId).toBe(136 - 19)
    })

    it("prints every one of 30 ids in its own nowrap span and shortens nothing", () => {
      const list = ids(30)
      const { identity } = build({ parcelIds: list })
      for (const id of list) {
        expect(identity.html).toContain(`<span class="identity-nowrap">${id}</span>`)
      }
      expect(identity.html.split('class="identity-nowrap"').length - 1).toBe(30)
      expect(identity.html).not.toContain("…")
      expect(identity.html).not.toContain("...")
    })

    it("escapes an id inside a long list", () => {
      const list = [...ids(29), "<i>x</i>"]
      const { identity } = build({ parcelIds: list })
      expect(identity.html).not.toContain("<i>")
      expect(identity.html).toContain('<span class="identity-nowrap">&lt;i&gt;x&lt;/i&gt;</span>')
    })

    it("keeps a text row for no parcel at one line", () => {
      expect(build({ parcelIds: [] }).identity.height).toBeLessThanOrEqual(oneId)
    })
  })

  it("grows with long parcel lists", () => {
    const short = build({ parcelIds: ["77186000AB0123"] }).identity.height
    const many = Array.from({ length: 20 }, (_, i) => `77186000AB${String(i).padStart(4, "0")}`)
    expect(build({ parcelIds: many }).identity.height).toBeGreaterThan(short)
  })
})

describe("method part of the identity card", () => {
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

  it("escapes each parcel id before it is wrapped in a nowrap span", () => {
    const { identity } = build({ parcelIds: ['a"<b>', "77186000AB0123"] })
    expect(identity.html).toContain('<span class="identity-nowrap">a&quot;&lt;b&gt;</span>')
    expect(identity.html).not.toContain("<b>")
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

  it("draws the section title, the radius 12 card, the sub-heading, the rule and the nowrap id", () => {
    expect(css).toContain(sectionTitleCss(".identity-heading", palette))
    expect(css).toMatch(/\.identity-card \{[^}]*border-radius: 12px/)
    expect(css).toMatch(
      /\.identity-subheading \{[^}]*font-family: [^;]*Sora[^;]*; font-size: 11px; line-height: 24px; color: ink;/,
    )
    expect(css).toMatch(/\.identity-rule \{[^}]*border-top: 1px solid line;/)
    expect(css).toContain(".identity-nowrap { white-space: nowrap; }")
  })

  it("uses no CSS columns", () => {
    expect(css).not.toContain("column-count")
    expect(css).not.toContain("columns:")
  })
})
