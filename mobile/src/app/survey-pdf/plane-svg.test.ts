import { buildPlaneSvg } from "./plane-svg"
import type { PlaneInput } from "./plane-svg"
import { contextLevels, standZones } from "./score-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette } from "./types"

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
  "forest",
  "forestDeep",
  "onForest",
  "onForestAccent",
  "onForestBody",
  "contourSage",
  "contourMoss",
  "zoneLow",
  "zoneLowSoft",
  "zoneMid",
  "zoneHighSoft",
  "zoneHigh",
  "contextInk",
] as const

// Fake palette: each value is its key name, so a rule can be traced without any colour literal.
const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, key])) as PdfPalette

const input: PlaneInput = {
  stand: 20,
  context: 12,
  standZones: standZones(),
  contextLevels: contextLevels(),
  xTitle: "Peuplement et gestion : 20 / 35",
  yTitle: "Contexte : 12 / 15",
  label: "Le relevé se place à 20 sur 35",
}

const COMPLETE = { width: 272, height: 160 }
const SUMMARY = { width: 299, height: 156 }

type Attrs = Record<string, string>

// The attributes of every element of a tag, in document order.
function elements(svg: string, tag: string): Attrs[] {
  const found: Attrs[] = []
  for (const match of svg.matchAll(new RegExp(`<${tag}\\b([^>]*?)/?>`, "g"))) {
    const attrs: Attrs = {}
    for (const attr of match[1].matchAll(/([a-z0-9-]+)="([^"]*)"/g)) attrs[attr[1]] = attr[2]
    found.push(attrs)
  }
  return found
}

function texts(svg: string): Array<Attrs & { content: string }> {
  return [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map((match) => {
    const attrs: Attrs = {}
    for (const attr of match[1].matchAll(/([a-z0-9-]+)="([^"]*)"/g)) attrs[attr[1]] = attr[2]
    return { ...attrs, content: match[2] }
  })
}

const complete = (over: Partial<PlaneInput> = {}) =>
  buildPlaneSvg({ ...input, ...over }, palette, COMPLETE, { title: "Titre", fill: "paper" })
const summary = (over: Partial<PlaneInput> = {}) =>
  buildPlaneSvg({ ...input, ...over }, palette, SUMMARY, { title: null, fill: "panel" })

describe("buildPlaneSvg, the complete chart (272 x 160, titled)", () => {
  const svg = complete()

  it("is one svg with a role, the label and its size", () => {
    expect(svg.startsWith("<svg ")).toBe(true)
    expect(svg.match(/<svg\b/g)).toHaveLength(1)
    expect(svg).toContain('role="img"')
    expect(svg).toContain('aria-label="Le relevé se place à 20 sur 35"')
    expect(svg).toContain('width="272" height="160" viewBox="0 0 272 160"')
    expect(svg).toContain('class="chart-plane"')
  })

  it("draws the panel inset by half its stroke, the title centred in the header band", () => {
    const [panel] = elements(svg, "rect")
    expect(panel).toMatchObject({
      x: "0.5",
      y: "0.5",
      width: "271",
      height: "159",
      rx: "8",
      fill: "paper",
      stroke: "line",
      "stroke-width": "1",
    })
    const title = texts(svg).find((item) => item.content === "Titre")
    expect(title).toMatchObject({ x: "136", y: "11", "text-anchor": "middle", fill: "ink" })
    expect(title?.["font-family"]).toBe(PDF_FONT_FAMILIES.label)
  })

  it("fills five bands, strong at both ends and soft beside them", () => {
    const bands = elements(svg, "rect").filter((rect) => rect.class === "plane-band")
    expect(bands.map((band) => band.x)).toEqual(["46", "88.8", "131.6", "174.4", "217.2"])
    for (const band of bands) {
      expect(band).toMatchObject({ y: "34", width: "42.8", height: "82" })
    }
    expect(bands.map((band) => band.fill)).toEqual([
      "zoneLow",
      "zoneLowSoft",
      "zoneMid",
      "zoneHighSoft",
      "zoneHigh",
    ])
  })

  it("fills three levels low, mid, high as strong, mid, strong", () => {
    const three = buildPlaneSvg({ ...input, standZones: contextLevels() }, palette, COMPLETE, {
      title: "Titre",
      fill: "paper",
    })
    const bands = elements(three, "rect").filter((rect) => rect.class === "plane-band")
    expect(bands.map((band) => band.fill)).toEqual(["zoneLow", "zoneMid", "zoneHigh"])
  })

  it("draws two dashed ink level lines and the two axes", () => {
    const lines = elements(svg, "line")
    const dashed = lines.filter((item) => item.stroke === "ink")
    expect(dashed).toHaveLength(2)
    expect(dashed.map((item) => item.y1)).toEqual(["88.7", "61.3"])
    for (const item of dashed) {
      expect(item).toMatchObject({ x1: "46", x2: "260", "stroke-dasharray": "3 3" })
    }
    const axes = lines.filter((item) => item.stroke === "inkMuted")
    expect(axes).toHaveLength(2)
    expect(axes[0]).toMatchObject({ x1: "46", y1: "34", x2: "46", y2: "116" })
    expect(axes[1]).toMatchObject({ x1: "46", y1: "116", x2: "260", y2: "116" })
  })

  it("prints the x ticks at the cuts and the band names on one or two lines", () => {
    const all = texts(svg)
    const ticks = all.filter((item) => item.y === "126")
    expect(ticks.map((item) => item.content)).toEqual(["0", "7", "14", "21", "28", "35"])
    expect(ticks.map((item) => item.x)).toEqual(["46", "88.8", "131.6", "174.4", "217.2", "260"])
    for (const tick of ticks) {
      expect(tick).toMatchObject({ "text-anchor": "middle", fill: "inkMuted", "font-size": "8" })
      expect(tick["font-family"]).toBe(PDF_FONT_FAMILIES.body)
    }
    const first = all.filter((item) => item.y === "136")
    expect(first.map((item) => item.content)).toEqual([
      "faible",
      "assez",
      "moyenne",
      "assez",
      "forte",
    ])
    const second = all.filter((item) => item.y === "145")
    expect(second.map((item) => item.content)).toEqual(["faible", "forte"])
    expect(first.map((item) => item.x)).toEqual(["67.4", "110.2", "153", "195.8", "238.6"])
    for (const name of [...first, ...second]) expect(name.fill).toBe("ink")
  })

  it("prints the y ticks and the level names end-anchored at 42", () => {
    const gutter = texts(svg).filter((item) => item["text-anchor"] === "end" && item.x === "42")
    const ticks = gutter.filter((item) => item.fill === "inkMuted")
    expect(ticks.map((item) => item.content)).toEqual(["0", "5", "10", "15"])
    expect(ticks.map((item) => item.y)).toEqual(["119", "91.7", "64.3", "37"])
    const names = gutter.filter((item) => item.fill === "ink")
    expect(names.map((item) => item.content)).toEqual(["faible", "moyenne", "forte"])
    expect(names.map((item) => item.y)).toEqual(["105.3", "78", "50.7"])
  })

  it("places the axis titles: y at the top left, x at the bottom right", () => {
    const yTitle = texts(svg).find((item) => item.content === "Contexte : 12 / 15")
    expect(yTitle).toMatchObject({ x: "8", y: "28", "text-anchor": "start", fill: "ink" })
    expect(yTitle?.["font-family"]).toBe(PDF_FONT_FAMILIES.label)
    const xTitle = texts(svg).find((item) => item.content === "Peuplement et gestion : 20 / 35")
    expect(xTitle).toMatchObject({ x: "260", y: "156", "text-anchor": "end", fill: "ink" })
  })

  it("draws the survey as a disc after two dashed accent guides", () => {
    const lines = elements(svg, "line").filter((item) => item.stroke === "accent")
    expect(lines).toHaveLength(2)
    for (const guide of lines) expect(guide["stroke-dasharray"]).toBe("2 2")
    expect(lines[0]).toMatchObject({ x1: "46", y1: "50.4", x2: "168.3", y2: "50.4" })
    expect(lines[1]).toMatchObject({ x1: "168.3", y1: "50.4", x2: "168.3", y2: "116" })
    const [marker] = elements(svg, "circle")
    expect(marker).toMatchObject({
      cx: "168.3",
      cy: "50.4",
      r: "5",
      fill: "accent",
      stroke: "paper",
      "stroke-width": "1.5",
    })
    expect(svg.indexOf("<circle")).toBeGreaterThan(svg.lastIndexOf("<line"))
    expect(svg.indexOf("<circle")).toBeGreaterThan(svg.lastIndexOf("</text>"))
  })

  it("puts the maximum scores in the top right corner of the plot", () => {
    const [marker] = elements(complete({ stand: 35, context: 15 }), "circle")
    expect(marker).toMatchObject({ cx: "260", cy: "34" })
  })

  it("puts a zero score on the axes", () => {
    const [marker] = elements(complete({ stand: 0, context: 0 }), "circle")
    expect(marker).toMatchObject({ cx: "46", cy: "116" })
  })

  it("clamps scores outside the axes", () => {
    const [high] = elements(complete({ stand: 90, context: 40 }), "circle")
    expect(high).toMatchObject({ cx: "260", cy: "34" })
    const [low] = elements(complete({ stand: -4, context: -1 }), "circle")
    expect(low).toMatchObject({ cx: "46", cy: "116" })
  })

  it("draws no marker and no guide without a finite sub-score", () => {
    for (const over of [
      { stand: null },
      { context: null },
      { stand: Number.NaN },
      { context: Number.POSITIVE_INFINITY },
    ]) {
      const out = complete(over)
      expect(out).not.toContain("<circle")
      expect(elements(out, "line").filter((item) => item.stroke === "accent")).toHaveLength(0)
    }
  })
})

describe("buildPlaneSvg, the summary chart (299 x 156, no title)", () => {
  const svg = summary()

  it("has no header text and a panel fill", () => {
    expect(svg).toContain('width="299" height="156" viewBox="0 0 299 156"')
    const [panel] = elements(svg, "rect")
    expect(panel).toMatchObject({ width: "298", height: "155", fill: "panel" })
    expect(texts(svg).some((item) => item.content === "Titre")).toBe(false)
    expect(
      texts(svg).filter((item) => item["text-anchor"] === "middle" && item.y === "11"),
    ).toEqual([])
  })

  it("starts the plot at 18 and ends it at 287 by 112", () => {
    const bands = elements(svg, "rect").filter((rect) => rect.class === "plane-band")
    expect(bands[0]).toMatchObject({ x: "46", y: "18", height: "94" })
    const last = bands[bands.length - 1]
    expect(Number(last.x) + Number(last.width)).toBeCloseTo(287, 0)
  })

  it("moves the titles and the tick rows up", () => {
    const yTitle = texts(svg).find((item) => item.content === "Contexte : 12 / 15")
    expect(yTitle).toMatchObject({ x: "8", y: "12" })
    const xTitle = texts(svg).find((item) => item.content === "Peuplement et gestion : 20 / 35")
    expect(xTitle).toMatchObject({ x: "287", y: "152", "text-anchor": "end" })
    expect(
      texts(svg)
        .filter((item) => item.y === "122")
        .map((item) => item.content),
    ).toEqual(["0", "7", "14", "21", "28", "35"])
    expect(texts(svg).filter((item) => item.y === "132")).toHaveLength(5)
    expect(texts(svg).filter((item) => item.y === "141")).toHaveLength(2)
  })
})

describe("buildPlaneSvg, escaping and the print contract", () => {
  it("escapes the label, the titles, the names and a hostile palette value", () => {
    const hostile = '"><script>alert(1)</script>'
    const svg = buildPlaneSvg(
      {
        ...input,
        label: hostile,
        xTitle: hostile,
        yTitle: hostile,
        standZones: input.standZones.map((zone) => ({ ...zone, name: hostile })),
        contextLevels: input.contextLevels.map((level) => ({ ...level, name: hostile })),
      },
      { ...palette, accent: hostile, ink: hostile, zoneLow: hostile },
      COMPLETE,
      { title: hostile, fill: hostile },
    )
    expect(svg).not.toContain("<script")
    expect((svg.match(/"/g) ?? []).length % 2).toBe(0)
    expect(svg).toContain("&lt;script&gt;")
    expect(svg).toContain("&quot;&gt;")
  })

  it("holds no transparency, ramp, pattern, transform, script, resource or colour literal", () => {
    for (const svg of [complete(), summary(), complete({ stand: null })]) {
      expect(svg).not.toMatch(/opacity|gradient|<pattern|transform=|filter=|<script|http|url\(/i)
      expect(svg).not.toMatch(/rgba?\(|#[0-9a-f]{3,8}\b/i)
      expect(svg).not.toMatch(/href|<image|<use|<style|rotate/)
    }
  })

  it("draws only palette keys as colours", () => {
    const colours = new Set<string>()
    for (const match of complete().matchAll(/(?:fill|stroke)="([^"]*)"/g)) colours.add(match[1])
    for (const colour of colours) {
      expect(colour === "none" || (PALETTE_KEYS as readonly string[]).includes(colour)).toBe(true)
    }
  })

  it("survives empty zones and levels without throwing", () => {
    const svg = buildPlaneSvg({ ...input, standZones: [], contextLevels: [] }, palette, COMPLETE, {
      title: null,
      fill: "paper",
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain("<circle")
  })
})
