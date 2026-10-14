import type { SurveyRoute } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { routeDisplayRows } from "../route-display"
import { conditionsBlockHeight } from "./conditions-section"
import { buildRouteBlock, routeSectionCss } from "./route-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette, SurveyExportData } from "./types"

const t = fr.surveyExport.route

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

// The parcours en plein, relevé plafonné, chosen directly: 4 rows (no factors, no complement).
const FULL_CAPPED: SurveyRoute = {
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 8,
  guide: { chosen_by: "observer" },
}

// The fullest record: partial by plot, uncapped on three factors, complement done, guide accepted.
const MAXIMAL_ROUTE: SurveyRoute = {
  version: 1,
  method: "partial_plot",
  counting: "uncapped",
  uncapped_factors: ["C", "D", "E"],
  zone_surface_ha: 4,
  complement: { done: true, total_surface_ha: 12.5 },
  guide: {
    chosen_by: "guide",
    suggested: { method: "partial_plot", counting: "uncapped" },
    answers: {
      surface_ha: 12.5,
      homogeneity: "homogeneous",
      difficulty: false,
      narrow: false,
      experience: "regular",
    },
  },
}

function makeData(route: SurveyRoute | null, isDraft = false): SurveyExportData {
  return {
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: [],
    observationYear: 2026,
    versionNumber: 1,
    dateIso: "2026-10-10T08:00:00Z",
    isDraft,
    observerName: null,
    method: {
      version: "3.2",
      ibpCas: 1,
      ibpCas3Scale: false,
      regionVersion: null,
      vegetationStage: null,
    },
    scores: null,
    factorEntries: [],
    generatedAtIso: "2026-10-10T09:00:00Z",
    coordinates: null,
    rawFactors: {},
    conditions: { note: null, weather: null },
    route,
    photos: { items: [], total: 0, unavailable: 0 },
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
  }
}

function required(route: SurveyRoute | null, isDraft = false) {
  const block = buildRouteBlock(makeData(route, isDraft), palette)
  if (!block) throw new Error("expected a route block")
  return block
}

describe("buildRouteBlock presence", () => {
  it("is omitted when the survey has no route", () => {
    expect(buildRouteBlock(makeData(null), palette)).toBeNull()
    expect(buildRouteBlock(makeData(null, true), palette)).toBeNull()
  })

  it("is printed for a draft and for a submitted survey", () => {
    expect(buildRouteBlock(makeData(FULL_CAPPED), palette)).not.toBeNull()
    expect(buildRouteBlock(makeData(FULL_CAPPED, true), palette)).not.toBeNull()
  })

  it("is one block with the id route, no page break and no keep-with-next", () => {
    const block = required(FULL_CAPPED)

    expect(block.id).toBe("route")
    expect(block.breakBefore).toBeUndefined()
    expect(block.keepWithNext).toBeUndefined()
  })
})

describe("buildRouteBlock rows", () => {
  it("prints the heading and one row per display row of the PDF variant, in order", () => {
    const { html } = required(MAXIMAL_ROUTE)
    const rows = routeDisplayRows(MAXIMAL_ROUTE, "pdf")

    expect(html).toContain(`>Parcours utilisé</h2>`)
    expect(html.split('<tr class="route-row">')).toHaveLength(rows.length + 1)
    const positions = rows.map((row) => html.indexOf(`>${row.caption}</th>`))
    positions.forEach((position) => expect(position).toBeGreaterThan(-1))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it("prints the six rows of the spec for a partial uncapped route", () => {
    const { html } = required(MAXIMAL_ROUTE)

    expect(html).toContain(">Parcours</th>")
    expect(html).toContain(">Mode de relevé</th>")
    expect(html).toContain(">Facteurs comptés en entier</th>")
    expect(html).toContain(">Surface décrite</th>")
    expect(html).toContain(">Reste du peuplement</th>")
    expect(html).toContain(">Choix</th>")
    // The answers sit in the Choix sentence, with no row of their own.
    expect(html).toContain(
      "Conseillé par l&#39;application d&#39;après vos réponses : peuplement de 12,5 ha",
    )
    expect(html).not.toContain(fr.surveyDetail.route.answers)
  })

  it("leaves out the factors row for a capped route and the complement row for a full one", () => {
    const { html } = required(FULL_CAPPED)

    expect(html).not.toContain(t.countedFactors)
    expect(html).not.toContain(t.complement)
    expect(html).toContain(`>${t.choiceObserver.replace("'", "&#39;")}</td>`)
  })

  it("prints a draft exactly like a submitted survey", () => {
    expect(required(MAXIMAL_ROUTE, true)).toEqual(required(MAXIMAL_ROUTE, false))
  })

  it("escapes every dynamic value (T-30-32)", () => {
    const route = fr.surveyExport.route as { choiceObserver: string; choice: string }
    const saved = { observer: route.choiceObserver, caption: route.choice }
    route.choiceObserver = `<b>"x" & 'y'</b>`
    route.choice = "<i>Choix</i>"
    try {
      const { html } = required(FULL_CAPPED)

      expect(html).not.toContain("<b>")
      expect(html).not.toContain("<i>")
      expect(html).toContain("&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;")
      expect(html).toContain("&lt;i&gt;Choix&lt;/i&gt;")
    } finally {
      route.choiceObserver = saved.observer
      route.choice = saved.caption
    }
  })
})

describe("buildRouteBlock height", () => {
  it("follows the conditions formula: a six-row block of one line each is 168", () => {
    expect(conditionsBlockHeight(Array.from({ length: 6 }, () => ({ text: "x" })))).toBe(168)
  })

  it("counts the rows of the route in that formula", () => {
    for (const route of [FULL_CAPPED, MAXIMAL_ROUTE]) {
      const rows = routeDisplayRows(route, "pdf")
      expect(required(route).height).toBe(
        conditionsBlockHeight(rows.map((row) => ({ text: row.value }))),
      )
    }
    // Four one-line rows: 20 + 24 + 4 x 19 + 10.
    expect(required(FULL_CAPPED).height).toBe(130)
  })

  it("adds a line for a value longer than 80 characters", () => {
    const longest = routeDisplayRows(MAXIMAL_ROUTE, "pdf").find((row) => row.id === "choice")
    expect((longest?.value.length ?? 0) > 80).toBe(true)
    // Six rows, the choice sentence on two lines: 168 + 13.
    expect(required(MAXIMAL_ROUTE).height).toBe(181)
  })
})

describe("routeSectionCss", () => {
  const css = routeSectionCss(palette)

  it("prefixes every class with route- and uses palette values only", () => {
    const classes = css.match(/\.[a-z-]+/g) ?? []
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith(".route-")).toBe(true)
    expect(css).toContain("border: 1px solid line")
    expect(css).toContain("background: panel")
    expect(css).toContain(`font-family: ${PDF_FONT_FAMILIES.heading}`)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  })

  it("uses a 150 px caption column and neither flex nor grid nor CSS columns", () => {
    expect(css).toContain("width: 150px")
    expect(css).not.toMatch(/flex|grid|column-count|columns:/)
  })
})
