import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { brandMapTokens } from "../../app/brand-tokens"
import { darkenColor, darkenPlanIgnStyle, parseColor } from "./dark-style"

function lightnessOf(css: string): number {
  const match = /hsla\(\d+, \d+%, (\d+)%, [\d.]+\)/.exec(css)
  if (!match) throw new Error(`not a dark colour: ${css}`)
  return Number(match[1])
}

describe("parseColor", () => {
  test("reads hex (3, 6 and 8 digits) and rgb(a)", () => {
    expect(parseColor("#fff")).toMatchObject({ l: 1, a: 1 })
    expect(parseColor("#000000")).toMatchObject({ l: 0 })
    expect(parseColor("#FF000080")?.a).toBeCloseTo(0.5, 1)
    expect(parseColor("rgba(255, 255, 255, 0.25)")).toMatchObject({ l: 1, a: 0.25 })
    expect(parseColor("rgb(0, 128, 0)")?.h).toBeCloseTo(120, 0)
  })

  test("leaves anything else alone", () => {
    expect(parseColor("motorway")).toBeNull()
    expect(darkenColor("motorway")).toBe("motorway")
  })
})

describe("darkenColor", () => {
  test("flips the lightness: a white ground goes dark, dark text goes light", () => {
    expect(lightnessOf(darkenColor("#FFFFFF"))).toBeLessThanOrEqual(10)
    expect(lightnessOf(darkenColor("#000000"))).toBeGreaterThanOrEqual(80)
  })

  test("keeps the hue and the alpha", () => {
    expect(darkenColor("rgba(0, 128, 0, 0.5)")).toMatch(/^hsla\(120, \d+%, \d+%, 0\.5\)$/)
  })
})

describe("darkenPlanIgnStyle", () => {
  const style = {
    version: 8,
    sprite: "https://example.test/sprite",
    glyphs: "https://example.test/{fontstack}/{range}.pbf",
    sources: { plan_ign: { type: "vector", url: "https://example.test/metadata.json" } },
    layers: [
      { id: "land", type: "fill", source: "plan_ign", paint: { "fill-color": "#FFFFFF" } },
      {
        id: "road",
        type: "line",
        source: "plan_ign",
        paint: {
          "line-color": ["match", ["get", "kind"], "motorway", "#E0B000", "#CCCCCC"],
          "line-width": 2,
        },
      },
      {
        id: "label",
        type: "symbol",
        source: "plan_ign",
        paint: { "text-color": "#222222", "text-halo-color": "#FFFFFF" },
      },
      { id: "plain", type: "symbol", source: "plan_ign" },
    ],
  } as unknown as StyleSpecification

  const dark = darkenPlanIgnStyle(style)

  test("puts a dark ground under the recoloured layers", () => {
    expect(dark.layers[0]).toEqual({
      id: "basemap-dark-ground",
      type: "background",
      paint: { "background-color": brandMapTokens.darkBasemapBackground },
    })
    expect(dark.layers.map((layer) => layer.id)).toEqual([
      "basemap-dark-ground",
      "land",
      "road",
      "label",
      "plain",
    ])
  })

  test("recolours colour properties, inside expressions too, and nothing else", () => {
    const paint = (id: string): Record<string, unknown> =>
      (dark.layers.find((layer) => layer.id === id) as { paint: Record<string, unknown> }).paint
    expect(lightnessOf(paint("land")["fill-color"] as string)).toBeLessThanOrEqual(10)
    const expression = paint("road")["line-color"] as unknown[]
    expect(expression.slice(0, 3)).toEqual(["match", ["get", "kind"], "motorway"])
    expect(expression[3]).toMatch(/^hsla\(/)
    expect(expression[4]).toMatch(/^hsla\(/)
    expect(paint("road")["line-width"]).toBe(2)
    expect(lightnessOf(paint("label")["text-color"] as string)).toBeGreaterThanOrEqual(70)
    expect(lightnessOf(paint("label")["text-halo-color"] as string)).toBeLessThanOrEqual(10)
  })

  test("keeps sources, sprite and glyphs, so the same tiles serve both themes", () => {
    expect(dark.sources).toEqual(style.sources)
    expect(dark.sprite).toBe(style.sprite)
    expect(dark.glyphs).toBe(style.glyphs)
  })

  test("does not change the style it was given", () => {
    expect(style.layers).toHaveLength(4)
    expect((style.layers[0] as { paint: Record<string, unknown> }).paint["fill-color"]).toBe(
      "#FFFFFF",
    )
  })
})
