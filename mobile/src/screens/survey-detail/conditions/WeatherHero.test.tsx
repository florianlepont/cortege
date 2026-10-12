import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { WEATHER_SKY_CODES, type SurveyWeather } from "@cortege/ibp-domain"
import { fr } from "../../../i18n"
import { SKY_GLYPHS, weatherCardModel } from "./weather-card-model"
import { WeatherHero } from "./WeatherHero"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: Record<string, T>): T | undefined => options.ios },
  }
})

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

const t = fr.conditions
const s = t.summary

const CLOUDY: SurveyWeather = {
  sky: "cloudy",
  temperature_c: 14,
  wind_kmh: 12,
  rain_24h_mm: 2,
  observed_at: new Date(2026, 9, 12, 12, 0).toISOString(),
  source: "meteo_france",
}

function mount(weather: SurveyWeather): ReactTestRenderer {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(<WeatherHero model={weatherCardModel(weather)} />)
  })
  return tree
}

const maybeByTestId = (tree: ReactTestRenderer, testID: string): ReactTestInstance | undefined =>
  tree.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")[0]

const byTestId = (tree: ReactTestRenderer, testID: string): ReactTestInstance => {
  const node = maybeByTestId(tree, testID)
  if (!node) throw new Error(`no node ${testID}`)
  return node
}

const texts = (tree: ReactTestRenderer): string[] =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat(Infinity).join(""))

const glyphs = (tree: ReactTestRenderer): string[] =>
  tree.root.findAll((node) => node.type === Ionicons).map((node) => node.props.name as string)

describe("WeatherHero, the big read-out of the Contexte page (D-41)", () => {
  test("shows the big sky glyph, the temperature numeral with its unit and the sky label", () => {
    const tree = mount(CLOUDY)

    expect(glyphs(tree)).toEqual(["cloudy-outline"])
    expect(byTestId(tree, "weather-hero-tile").props.style).toEqual(
      expect.objectContaining({ width: 64, height: 64 }),
    )
    const all = texts(tree)
    expect(all).toEqual(expect.arrayContaining(["14", s.temperatureUnit, "Nuageux"]))
  })

  test("the numeral keeps the French comma and one decimal, and shrinks instead of overflowing", () => {
    const tree = mount({ ...CLOUDY, temperature_c: 16.94 })

    const numeral = byTestId(tree, "weather-hero-numeral").findAllByType("Text" as never)[0]
    expect(numeral.props.children).toBe("16,9")
    expect(numeral.props.numberOfLines).toBe(1)
    expect(numeral.props.adjustsFontSizeToFit).toBe(true)
    expect(numeral.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5)
  })

  test("wind, rain over 24 h and the time are columns that wrap, each read by a screen reader", () => {
    const tree = mount(CLOUDY)

    const stats = byTestId(tree, "weather-hero-stats")
    expect(stats.props.style).toEqual(expect.objectContaining({ flexWrap: "wrap" }))
    expect(texts(tree)).toEqual(
      expect.arrayContaining([s.stat.wind, "12 km/h", s.stat.rain, "2 mm", s.stat.time, "12:00"]),
    )
    for (const key of ["wind", "rain", "time"]) {
      expect(byTestId(tree, `weather-hero-stat-${key}`).props.style).toEqual(
        expect.objectContaining({ flexGrow: 1 }),
      )
    }
    expect(byTestId(tree, "weather-hero-stat-wind").props.accessibilityLabel).toBe("Vent, 12 km/h")
  })

  test("only the columns that exist are drawn, none when only the temperature exists", () => {
    const wind = mount({ temperature_c: 9, wind_kmh: 3, source: "meteo_france" })
    expect(maybeByTestId(wind, "weather-hero-stat-wind")).toBeDefined()
    expect(maybeByTestId(wind, "weather-hero-stat-rain")).toBeUndefined()
    expect(maybeByTestId(wind, "weather-hero-stat-time")).toBeUndefined()

    const only = mount({ temperature_c: 9, source: "meteo_france" })
    expect(maybeByTestId(only, "weather-hero-stats")).toBeUndefined()
  })

  test("the observer's sky alone is the glyph and the label, no figure", () => {
    const tree = mount({ sky: "rain", edited: ["sky"], source: "manual" })

    expect(glyphs(tree)).toEqual(["rainy-outline"])
    expect(texts(tree)).toEqual(["Pluie"])
    expect(maybeByTestId(tree, "weather-hero-numeral")).toBeUndefined()
  })

  test("a time alone gets the neutral glyph and the generic headline", () => {
    const tree = mount({ observed_at: CLOUDY.observed_at })

    expect(glyphs(tree)).toEqual(["cloud-outline"])
    expect(texts(tree)).toContain(s.emptyTitle)
    expect(maybeByTestId(tree, "weather-hero-stat-time")).toBeDefined()
  })

  test.each(WEATHER_SKY_CODES.map((code) => [code]))("%s draws its glyph", (code) => {
    expect(glyphs(mount({ sky: code, source: "manual", edited: ["sky"] }))).toEqual([
      SKY_GLYPHS[code],
    ])
  })

  test("an unknown sky shows the neutral glyph, never a wrong one", () => {
    const tree = mount({ ...CLOUDY, sky: "hail" as never })

    expect(glyphs(tree)).toEqual(["cloud-outline"])
    expect(texts(tree)).not.toContain("Ciel")
  })
})
