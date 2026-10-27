import { buildRoseSvg } from "./rose-svg"
import type { RoseInput, RoseItem } from "./rose-svg"
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

const TITLES = [
  "Essences autochtones",
  "Structure verticale",
  "Bois morts sur pied",
  "Bois morts au sol",
  "Très gros bois vivants",
  "Dendromicrohabitats",
  "Milieux ouverts florifères",
  "Continuité boisée",
  "Milieux aquatiques",
  "Milieux rocheux",
]
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

function itemsOf(points: Array<number | null>): RoseItem[] {
  return LETTERS.map((factor, index) => ({
    factor,
    title: TITLES[index],
    points: points[index],
    group: index < 7 ? "stand" : "context",
  }))
}

const input: RoseInput = {
  rings: [
    { value: 0, tone: "low" },
    { value: 2, tone: "low" },
    { value: 5, tone: "high" },
  ],
  items: itemsOf([5, 3, 2, 0, 5, 2, 5, 2, 5, 2]),
  label: "Score par facteur, anneaux à 0, 2 et 5 points.",
}

const SIZE = { width: 209, height: 160 }

type Attrs = Record<string, string>

function parse(raw: string): Attrs {
  const attrs: Attrs = {}
  for (const attr of raw.matchAll(/([a-z0-9-]+)="([^"]*)"/g)) attrs[attr[1]] = attr[2]
  return attrs
}

function elements(svg: string, tag: string): Attrs[] {
  return [...svg.matchAll(new RegExp(`<${tag}\\b([^>]*?)/?>`, "g"))].map((match) => parse(match[1]))
}

function texts(svg: string): Array<Attrs & { content: string }> {
  return [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map((match) => ({
    ...parse(match[1]),
    content: match[2],
  }))
}

const build = (over: Partial<RoseInput> = {}, title: string | null = "Score par facteur") =>
  buildRoseSvg({ ...input, ...over }, palette, SIZE, { title, fill: "paper" })

describe("buildRoseSvg", () => {
  const svg = build()

  it("is one svg with a role, the label and its size", () => {
    expect(svg.match(/<svg\b/g)).toHaveLength(1)
    expect(svg).toContain('class="chart-rose"')
    expect(svg).toContain('role="img"')
    expect(svg).toContain('aria-label="Score par facteur, anneaux à 0, 2 et 5 points."')
    expect(svg).toContain('width="209" height="160" viewBox="0 0 209 160"')
  })

  it("draws the panel and its centred header title", () => {
    const [panel] = elements(svg, "rect")
    expect(panel).toMatchObject({ x: "0.5", width: "208", height: "159", rx: "8", fill: "paper" })
    const title = texts(svg).find((item) => item.content === "Score par facteur")
    expect(title).toMatchObject({ x: "104.5", y: "11", "text-anchor": "middle", fill: "ink" })
    expect(title?.["font-family"]).toBe(PDF_FONT_FAMILIES.label)
  })

  it("draws the zone discs outwards in, the hub, then the ring circles", () => {
    const circles = elements(svg, "circle")
    const zones = circles.filter((item) => item.class === "rose-zone")
    expect(zones.map((item) => [item.r, item.fill, item.cx, item.cy])).toEqual([
      ["46", "zoneHighSoft", "107.5", "87"],
      ["24.4", "zoneLowSoft", "107.5", "87"],
    ])
    const hub = circles.find((item) => item.class === "rose-hub")
    expect(hub).toMatchObject({ r: "10", fill: "paper" })
    const rings = circles.filter((item) => item.class === "rose-ring")
    expect(rings.map((item) => [item.r, item.fill, item.stroke, item["stroke-width"]])).toEqual([
      ["10", "none", "bandLow", "1.5"],
      ["24.4", "none", "bandLow", "1.5"],
      ["46", "none", "bandHigh", "1.5"],
    ])
    expect(svg.indexOf("rose-zone")).toBeLessThan(svg.indexOf("rose-hub"))
    expect(svg.indexOf("rose-hub")).toBeLessThan(svg.indexOf("rose-ring"))
  })

  it("draws ten paper spokes and prints the ring values on the scale line", () => {
    const lines = elements(svg, "line")
    const spokes = lines.filter((item) => item.stroke === "paper")
    expect(spokes).toHaveLength(10)
    const scale = lines.find((item) => item.stroke === "inkMuted")
    expect(scale).toMatchObject({ x1: "107.5", y1: "77", x2: "107.5", y2: "41" })
    const values = texts(svg).filter((item) => item.x === "110")
    expect(values.map((item) => [item.content, item.y, item.fill])).toEqual([
      ["0", "74.5", "ink"],
      ["2", "60.1", "ink"],
      ["5", "38.5", "ink"],
    ])
  })

  it("closes one polygon path when every factor is filled, with a dot per factor", () => {
    const [polygon] = elements(svg, "path")
    expect(polygon.d.endsWith(" Z")).toBe(true)
    expect(polygon.d.match(/M/g)).toHaveLength(1)
    expect(polygon).toMatchObject({
      fill: "none",
      stroke: "accent",
      "stroke-width": "2",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    })
    const dots = elements(svg, "circle").filter((item) => item.class === "rose-vertex")
    expect(dots).toHaveLength(10)
    for (const dot of dots) expect(dot).toMatchObject({ r: "2.5", fill: "accent" })
  })

  it("places a vertex by its points: A at 5 on the outer ring, at 0 on the hub", () => {
    const full = elements(build({ items: itemsOf([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]) }), "circle")
    expect(full.filter((item) => item.class === "rose-vertex")[0]).toMatchObject({
      cx: "121.7",
      cy: "43.3",
    })
    const empty = elements(build({ items: itemsOf([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) }), "circle")
    expect(empty.filter((item) => item.class === "rose-vertex")[0]).toMatchObject({
      cx: "110.6",
      cy: "77.5",
    })
  })

  it("clamps a point above the outer ring and one below the hub", () => {
    const out = elements(build({ items: itemsOf([7, -1, 3, 3, 3, 3, 3, 3, 3, 3]) }), "circle")
    const dots = out.filter((item) => item.class === "rose-vertex")
    expect(dots[0]).toMatchObject({ cx: "121.7", cy: "43.3" })
    // B at 54 degrees, radius 10: (107.5 + 10 sin 54, 87 - 10 cos 54)
    expect(dots[1]).toMatchObject({ cx: "115.6", cy: "81.1" })
  })

  it("breaks the polygon on both sides of a missing factor and dashes its spoke", () => {
    const broken = build({ items: itemsOf([5, 3, 2, 0, 5, 2, 5, 2, null, null]) })
    const [polygon] = elements(broken, "path")
    expect(polygon.d).not.toContain("Z")
    expect(polygon.d.match(/M/g)).toHaveLength(7)
    expect(polygon.d.match(/L/g)).toHaveLength(7)
    const lines = elements(broken, "line")
    const dashed = lines.filter((item) => item["stroke-dasharray"] !== undefined)
    expect(dashed).toHaveLength(2)
    for (const spoke of dashed) {
      expect(spoke).toMatchObject({
        stroke: "inkMuted",
        "stroke-dasharray": "2 2",
        "stroke-width": "1",
      })
    }
    expect(lines.filter((item) => item.stroke === "paper")).toHaveLength(8)
    expect(elements(broken, "circle").filter((item) => item.class === "rose-vertex")).toHaveLength(
      8,
    )
  })

  it("keeps the wrap-around neighbours: J and A are joined when both are filled", () => {
    const wrap = build({ items: itemsOf([5, null, 2, 0, 5, 2, 5, 2, 5, 2]) })
    const [polygon] = elements(wrap, "path")
    // B is missing, so A-B and B-C are gone and J-A (the last segment) stays: 8 segments remain
    const segments = polygon.d.split("M").filter(Boolean)
    expect(segments).toHaveLength(8)
    expect(segments[segments.length - 1]).toContain("L121.7 43.3")
  })

  it("draws no segment for a lone filled factor and no path for none", () => {
    const lone = build({
      items: itemsOf([5, null, null, null, null, null, null, null, null, null]),
    })
    expect(elements(lone, "path")).toHaveLength(0)
    expect(elements(lone, "circle").filter((item) => item.class === "rose-vertex")).toHaveLength(1)
    const none = build({
      items: itemsOf([null, null, null, null, null, null, null, null, null, null]),
    })
    expect(elements(none, "path")).toHaveLength(0)
  })

  it("prints the names: two balanced lines, green for the stand, brown for the context", () => {
    const all = texts(svg)
    const pick = (...contents: string[]) =>
      all
        .filter((item) => contents.includes(item.content))
        .map((item) => [item.content, item.x, item.y, item["text-anchor"], item.fill])
    expect(pick("Essences", "autochtones")).toEqual([
      ["Essences", "124.5", "22.7", "start", "accent"],
      ["autochtones", "124.5", "32.7", "start", "accent"],
    ])
    expect(pick("Continuité", "boisée")).toEqual([
      ["Continuité", "52.5", "85", "end", "contextInk"],
      ["boisée", "52.5", "95", "end", "contextInk"],
    ])
    const micro = all.filter((item) => item.content === "Dendromicrohabitats")
    expect(micro).toHaveLength(1)
    expect(micro[0]).toMatchObject({ "text-anchor": "end", fill: "accent" })
    for (const name of all.filter((item) =>
      ["Milieux", "aquatiques", "rocheux"].includes(item.content),
    )) {
      expect(name.fill).toBe("contextInk")
    }
    for (const name of all.filter((item) => item.fill === "accent" || item.fill === "contextInk")) {
      expect(name["font-family"]).toBe(PDF_FONT_FAMILIES.body)
      expect(name["font-size"]).toBe("8")
    }
  })

  it("puts the name of a lower axis under its anchor", () => {
    const lower = texts(svg).filter(
      (item) => item.content === "Très gros" || item.content === "bois vivants",
    )
    // E at 162 degrees: first baseline 6.5 under the anchor at radius 55
    expect(lower.map((item) => item.y)).toEqual(["145.8", "155.8"])
  })

  it("keeps every text inside the panel", () => {
    for (const item of texts(svg)) {
      expect(Number(item.y)).toBeLessThan(160)
      expect(Number(item.y)).toBeGreaterThan(10)
    }
  })

  it("has no header band without a title: the centre moves up by 16", () => {
    const bare = build({}, null)
    expect(elements(bare, "circle").find((item) => item.class === "rose-hub")).toMatchObject({
      cy: "71",
    })
    expect(texts(bare).some((item) => item.content === "Score par facteur")).toBe(false)
  })

  it("draws a mid-tone ring in the zoneMid tint and the mid stroke", () => {
    const mid = build({
      rings: [
        { value: 0, tone: "low" },
        { value: 3, tone: "mid" },
        { value: 5, tone: "high" },
      ],
    })
    const circles = elements(mid, "circle")
    expect(circles.filter((item) => item.class === "rose-zone").map((item) => item.fill)).toEqual([
      "zoneHighSoft",
      "zoneMid",
    ])
    expect(circles.filter((item) => item.class === "rose-ring").map((item) => item.stroke)).toEqual(
      ["bandLow", "bandMid", "bandHigh"],
    )
  })

  it("survives no rings and no items", () => {
    const bare = build({ rings: [], items: [] })
    expect(bare).toContain("<svg")
    expect(bare).not.toContain("<path")
  })
})

describe("buildRoseSvg, escaping and the print contract", () => {
  it("escapes the label, the title, the names and a hostile palette value", () => {
    const hostile = '"><script>alert(1)</script>'
    const out = buildRoseSvg(
      {
        ...input,
        label: hostile,
        items: input.items.map((item) => ({ ...item, title: hostile })),
      },
      { ...palette, accent: hostile, contextInk: hostile, zoneHighSoft: hostile },
      SIZE,
      { title: hostile, fill: hostile },
    )
    expect(out).not.toContain("<script")
    expect((out.match(/"/g) ?? []).length % 2).toBe(0)
    expect(out).toContain("&lt;script&gt;")
  })

  it("holds no transparency, ramp, pattern, transform, script, resource or colour literal", () => {
    const broken = build({ items: itemsOf([5, 3, null, 0, 5, 2, 5, 2, 5, 2]) })
    for (const out of [build(), broken]) {
      expect(out).not.toMatch(/opacity|gradient|<pattern|transform=|filter=|<script|http|url\(/i)
      expect(out).not.toMatch(/rgba?\(|#[0-9a-f]{3,8}\b/i)
      expect(out).not.toMatch(/href|<image|<use|<style|rotate/)
    }
  })

  it("draws only palette keys as colours", () => {
    const colours = new Set<string>()
    for (const match of build().matchAll(/(?:fill|stroke)="([^"]*)"/g)) colours.add(match[1])
    for (const colour of colours) {
      expect(colour === "none" || (PALETTE_KEYS as readonly string[]).includes(colour)).toBe(true)
    }
  })
})
