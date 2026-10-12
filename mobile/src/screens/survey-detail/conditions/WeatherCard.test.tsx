import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { WEATHER_SKY_CODES, type SurveyWeather } from "@cortege/ibp-domain"
import { setReducedMotion } from "../../../../test/react-native-reanimated.mock"
import { fr } from "../../../i18n"
import { SKY_GLYPHS, WeatherCard } from "./WeatherCard"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    ActivityIndicator: mockComponent("ActivityIndicator"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: Record<string, T>): T | undefined => options.ios },
  }
})

jest.mock("../../../ui/RipplePressable", () => ({ RipplePressable: "RipplePressable" }))
jest.mock("../../../ui/EntranceView", () => ({ EntranceView: "EntranceView" }))

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

afterEach(() => {
  setReducedMotion(false)
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
const LINE = "Nuageux, 14 °C, vent 12 km/h, pluie 2 mm sur 24 h"

type CardProps = React.ComponentProps<typeof WeatherCard>

function mount(over: Partial<CardProps> = {}): { tree: ReactTestRenderer; onOpen: jest.Mock } {
  const onOpen = jest.fn()
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <WeatherCard
        weather={null}
        loading={false}
        offline={false}
        visitTooOld={false}
        submitted={false}
        onOpen={onOpen}
        {...over}
      />,
    )
  })
  return { tree, onOpen }
}

const maybeByTestId = (tree: ReactTestRenderer, testID: string): ReactTestInstance | undefined =>
  tree.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")[0]

const byTestId = (tree: ReactTestRenderer, testID: string): ReactTestInstance => {
  const node = maybeByTestId(tree, testID)
  if (!node) throw new Error(`no node ${testID}`)
  return node
}

function texts(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat(Infinity).join(""))
}

const glyphs = (tree: ReactTestRenderer): string[] =>
  tree.root.findAll((node) => node.type === Ionicons).map((node) => node.props.name as string)

const spinners = (tree: ReactTestRenderer) =>
  tree.root.findAll((node) => (node.type as unknown) === "ActivityIndicator")

describe("WeatherCard with measurements (compact, D-41)", () => {
  test("shows a small sky glyph, the temperature with its unit and the sky label on the main line", () => {
    const { tree } = mount({ weather: CLOUDY })

    expect(maybeByTestId(tree, "weather-card")).toBeDefined()
    expect(glyphs(tree)).toContain("cloudy-outline")
    expect(glyphs(tree)).toContain("chevron-forward-outline")
    const all = texts(tree)
    expect(all).toContain("14")
    expect(all).toContain(s.temperatureUnit)
    expect(all).toContain("Nuageux")
    const main = byTestId(tree, "weather-card-main")
    expect(main.findAll((n) => n.props.testID === "weather-card-numeral").length).toBeGreaterThan(0)
    expect(texts(tree)).toContain("Nuageux")
    // Wraps to a second line instead of squeezing at very large text sizes.
    expect(main.props.style).toEqual(expect.objectContaining({ flexWrap: "wrap" }))
  })

  test("is one compact row: small tile and glyph, not the big read-out of the Contexte page", () => {
    const { tree } = mount({ weather: CLOUDY })

    expect(byTestId(tree, "weather-card-tile").props.style).toEqual(
      expect.objectContaining({ width: 40, height: 40 }),
    )
    const sky = tree.root.findAll(
      (n) => n.type === Ionicons && n.props.name === "cloudy-outline",
    )[0]
    expect(sky.props.size).toBeLessThanOrEqual(24)
    const area = byTestId(tree, "weather-card-area")
    expect(area.props.style).toEqual(
      expect.objectContaining({ flexDirection: "row", alignItems: "center", minHeight: 44 }),
    )
    // No wind / rain / time columns: those live on the Contexte page.
    expect(maybeByTestId(tree, "weather-card-stats")).toBeUndefined()
    expect(texts(tree)).not.toContain(s.stat.time)
    expect(texts(tree)).not.toContain("12:00")
  })

  test("the numeral keeps the French comma and one decimal, and shrinks instead of overflowing", () => {
    const { tree } = mount({ weather: { ...CLOUDY, temperature_c: 16.94 } })

    const numeral = byTestId(tree, "weather-card-numeral").findAllByType("Text" as never)[0]
    expect(numeral.props.children).toBe("16,9")
    expect(numeral.props.numberOfLines).toBe(1)
    expect(numeral.props.adjustsFontSizeToFit).toBe(true)
    expect(numeral.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5)
  })

  test("wind and rain are one small secondary line that wraps", () => {
    const { tree } = mount({ weather: CLOUDY })

    expect(byTestId(tree, "weather-card-detail").props.children).toBe(
      "vent 12\u00a0km/h, pluie 2\u00a0mm sur 24\u00a0h",
    )
    expect(byTestId(tree, "weather-card-sub").props.style).toEqual(
      expect.objectContaining({ flexWrap: "wrap" }),
    )
    expect(byTestId(tree, "weather-card-mention").props.children).toBe(s.mention)
  })

  test("only the figures that exist are written, and no line when only the temperature exists", () => {
    const wind = mount({ weather: { temperature_c: 9, wind_kmh: 3, source: "meteo_france" } })
    expect(byTestId(wind.tree, "weather-card-detail").props.children).toBe("vent 3\u00a0km/h")

    const rain = mount({ weather: { temperature_c: 9, rain_24h_mm: 0, source: "meteo_france" } })
    expect(byTestId(rain.tree, "weather-card-detail").props.children).toBe(
      "pluie 0\u00a0mm sur 24\u00a0h",
    )

    const only = mount({ weather: { temperature_c: 9, source: "meteo_france" } })
    expect(maybeByTestId(only.tree, "weather-card-detail")).toBeUndefined()
    expect(maybeByTestId(only.tree, "weather-card-mention")).toBeDefined()
  })

  test("an unknown sky shows the neutral glyph, never a wrong one", () => {
    const { tree } = mount({ weather: { ...CLOUDY, sky: "hail" as never } })

    expect(glyphs(tree)).toContain("cloud-outline")
    expect(texts(tree)).not.toContain("Conditions")
  })

  test("the whole card is one button that opens the section, with the weather in its label", () => {
    const { tree, onOpen } = mount({ weather: CLOUDY })

    const area = byTestId(tree, "weather-card-area")
    expect(area.props.accessibilityRole).toBe("button")
    expect(area.props.accessibilityLabel).toBe(s.openWithLineSource(LINE, s.mention))
    expect(area.props.style).toEqual(expect.objectContaining({ minHeight: 44 }))
    act(() => area.props.onPress())
    expect(onOpen).toHaveBeenCalledTimes(1)
    // The numeral, the detail line and the mention are inside that one target.
    expect(area.findAll((n) => n.props.testID === "weather-card-numeral").length).toBeGreaterThan(0)
    expect(area.findAll((n) => n.props.testID === "weather-card-detail").length).toBeGreaterThan(0)
    expect(area.findAll((n) => n.props.testID === "weather-card-mention").length).toBeGreaterThan(0)
  })

  test("enters once, at the top of the screen, and draws no note", () => {
    const { tree } = mount({ weather: CLOUDY })

    const entrance = tree.root.findAll((n) => (n.type as unknown) === "EntranceView")[0]
    expect(entrance.props.index).toBe(0)
    expect(maybeByTestId(tree, "conditions-card-note")).toBeUndefined()
  })
})

describe("WeatherCard sky glyphs", () => {
  test("every sky code has its own outline glyph", () => {
    expect(Object.keys(SKY_GLYPHS).sort()).toEqual([...WEATHER_SKY_CODES].sort())
    expect(SKY_GLYPHS.fog).toBe("reorder-two-outline")
    for (const glyph of Object.values(SKY_GLYPHS)) expect(glyph.endsWith("-outline")).toBe(true)
    expect(new Set(Object.values(SKY_GLYPHS)).size).toBe(WEATHER_SKY_CODES.length)
  })

  test.each(WEATHER_SKY_CODES.map((code) => [code]))("%s draws its glyph", (code) => {
    const { tree } = mount({ weather: { sky: code, source: "manual", edited: ["sky"] } })
    expect(glyphs(tree)).toContain(SKY_GLYPHS[code])
  })
})

describe("WeatherCard attribution (D-26, D-35, D-37)", () => {
  test("shows the short provider mention while the provider's values are shown", () => {
    const { tree } = mount({ weather: CLOUDY })

    expect(texts(tree)).toContain(s.mention)
    expect(texts(tree).join(" ")).not.toContain("Source :")
    expect(texts(tree).join(" ")).not.toContain("mesure du")
  })

  test("stays the bare mention when the observer set the sky, never 'en partie modifiée'", () => {
    const { tree } = mount({ weather: { ...CLOUDY, sky: "fog", edited: ["sky"] } })

    expect(texts(tree)).toContain(s.mention)
    expect(texts(tree).join(" ")).not.toContain("modifiée")
  })

  test("the observer's sky alone shows the glyph and the label, no figure and no mention", () => {
    const { tree } = mount({ weather: { sky: "rain", edited: ["sky"], source: "manual" } })

    expect(glyphs(tree)).toContain("rainy-outline")
    expect(texts(tree)).toContain("Pluie")
    expect(texts(tree)).not.toContain(s.temperatureUnit)
    expect(texts(tree).join(" ")).not.toContain("Météo-France")
    expect(maybeByTestId(tree, "weather-card-mention")).toBeUndefined()
    expect(maybeByTestId(tree, "weather-card-numeral")).toBeUndefined()
    expect(maybeByTestId(tree, "weather-card-detail")).toBeUndefined()
    expect(byTestId(tree, "weather-card-area").props.accessibilityLabel).toBe(
      s.openWithLine("Pluie"),
    )
  })

  test("a manual weather and a provider weather whose figures are all empty carry no mention", () => {
    const manual = mount({ weather: { ...CLOUDY, source: "manual" } })
    expect(texts(manual.tree).join(" ")).not.toContain("Météo-France")

    const skyOnly = mount({ weather: { sky: "rain", edited: ["sky"], source: "meteo_france" } })
    expect(texts(skyOnly.tree).join(" ")).not.toContain("Météo-France")
  })
})

describe("WeatherCard states (U-11, D-40, D-41)", () => {
  test("a draft with no weather shows the invitation as one slim line", () => {
    const { tree, onOpen } = mount()

    expect(byTestId(tree, "weather-card-slim").props.children).toBe(s.compactEmpty)
    expect(texts(tree)).toHaveLength(1)
    expect(maybeByTestId(tree, "weather-card-main")).toBeUndefined()
    expect(glyphs(tree)).toEqual(["cloud-outline", "chevron-forward-outline"])
    const area = byTestId(tree, "weather-card-area")
    expect(area.props.accessibilityLabel).toBe(s.openWithLine(s.emptyBody))
    act(() => area.props.onPress())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  test("offline with nothing yet is calm: a quiet glyph, a plain sentence, no error word", () => {
    const { tree } = mount({ offline: true })

    expect(texts(tree)).toEqual([s.compactOffline])
    expect(texts(tree).join(" ").toLowerCase()).not.toContain("erreur")
    expect(glyphs(tree)).toEqual(["cloud-offline-outline", "chevron-forward-outline"])
    expect(byTestId(tree, "weather-card-area").props.accessibilityLabel).toBe(
      s.openWithLine(s.offlineBody),
    )
  })

  test("a visit older than 24 h with nothing says so calmly, without promising a fill (D-42)", () => {
    const { tree } = mount({ visitTooOld: true })

    expect(byTestId(tree, "weather-card-slim").props.children).toBe(s.compactTooOld)
    expect(texts(tree)).toEqual([s.compactTooOld])
    expect(texts(tree)).not.toContain(s.compactEmpty)
    expect(s.compactTooOld).toContain("plus de 24\u00a0h")
    expect(s.compactTooOld.toLowerCase()).not.toContain("remplit")
    expect(s.compactTooOld.toLowerCase()).not.toContain("erreur")
    expect(spinners(tree)).toHaveLength(0)
    expect(byTestId(tree, "weather-card-area").props.accessibilityLabel).toBe(
      s.openWithLine(s.compactTooOld),
    )
  })

  test("a too old visit wins over the offline line, the invitation never comes back", () => {
    const { tree } = mount({ visitTooOld: true, offline: true })
    expect(texts(tree)).toEqual([s.compactTooOld])
  })

  test("a too old visit with the observer's sky keeps the glyph and the label", () => {
    const { tree } = mount({
      visitTooOld: true,
      weather: { sky: "fog", edited: ["sky"], source: "manual" },
    })

    expect(texts(tree)).toEqual([t.sky.fog])
    expect(glyphs(tree)).toContain(SKY_GLYPHS.fog)
    expect(texts(tree)).not.toContain(s.compactTooOld)
  })

  test("offline with values already there keeps showing the values", () => {
    const { tree } = mount({ offline: true, weather: CLOUDY })

    expect(texts(tree)).not.toContain(s.compactOffline)
    expect(glyphs(tree)).toContain("cloudy-outline")
  })

  test("a submitted survey with no weather draws nothing, an empty weather object too", () => {
    expect(mount({ submitted: true }).tree.toJSON()).toBeNull()
    expect(
      mount({
        submitted: true,
        weather: { requested_at: "2026-10-11T08:00:00.000Z" },
      }).tree.toJSON(),
    ).toBeNull()
    expect(
      mount({
        submitted: true,
        weather: { sky: "hail" as never, source: "meteo_france" },
      }).tree.toJSON(),
    ).toBeNull()
  })

  test("a submitted survey with a weather still shows it", () => {
    expect(
      maybeByTestId(mount({ submitted: true, weather: CLOUDY }).tree, "weather-card"),
    ).toBeDefined()
  })

  test("a lookup in flight with nothing yet shows the spinner and the search sentence", () => {
    const { tree } = mount({ loading: true })

    expect(spinners(tree)).toHaveLength(1)
    expect(texts(tree)).toEqual([s.loading])
    expect(texts(tree)).not.toContain(s.compactEmpty)
    expect(byTestId(tree, "weather-card-area").props.accessibilityLabel).toBe(
      s.openWithLine(s.loading),
    )
  })

  test("a lookup with values already there shows the values, not the spinner", () => {
    const { tree } = mount({ loading: true, weather: CLOUDY })

    expect(spinners(tree)).toHaveLength(0)
    expect(texts(tree)).not.toContain(s.loading)
    expect(texts(tree)).toContain("14")
  })

  test("a submitted survey whose lookup runs still draws the card", () => {
    const { tree } = mount({ submitted: true, loading: true })

    expect(maybeByTestId(tree, "weather-card")).toBeDefined()
    expect(spinners(tree)).toHaveLength(1)
  })

  test("under Reduce Motion the card is the same, nothing loops", () => {
    setReducedMotion(true)
    const { tree } = mount({ weather: CLOUDY })

    expect(texts(tree)).toContain("14")
  })
})
