import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { WEATHER_SKY_CODES, type SurveyWeather } from "@cortege/ibp-domain"
import { setReducedMotion } from "../../../../test/react-native-reanimated.mock"
import { fr } from "../../../i18n"
import { ConditionsCard, SKY_GLYPHS } from "./ConditionsCard"

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

const CLOUDY: SurveyWeather = {
  sky: "cloudy",
  temperature_c: 14,
  wind_kmh: 12,
  rain_24h_mm: 2,
  source: "meteo_france",
}
const LINE = "Nuageux, 14 °C, vent 12 km/h, pluie 2 mm sur 24 h"

type CardProps = React.ComponentProps<typeof ConditionsCard>

function mount(over: Partial<CardProps> = {}): { tree: ReactTestRenderer; onOpen: jest.Mock } {
  const onOpen = jest.fn()
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ConditionsCard
        note={null}
        weather={null}
        loading={false}
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

const noteNode = (tree: ReactTestRenderer) => byTestId(tree, "conditions-card-note")

function reportLines(tree: ReactTestRenderer, count: number) {
  act(() => {
    noteNode(tree).props.onTextLayout({
      nativeEvent: { lines: Array.from({ length: count }, () => ({})) },
    })
  })
}

describe("ConditionsCard weather line (D-17)", () => {
  test("shows the sky glyph and the values that exist on one line", () => {
    const { tree } = mount({ weather: CLOUDY })

    expect(maybeByTestId(tree, "conditions-card")).toBeDefined()
    expect(texts(tree)).toContain(LINE)
    expect(glyphs(tree)).toContain("cloudy-outline")
    expect(glyphs(tree)).toContain("chevron-forward-outline")
  })

  test("every sky code has its own outline glyph, no sky uses partly-sunny, fog reorder-two", () => {
    expect(Object.keys(SKY_GLYPHS).sort()).toEqual([...WEATHER_SKY_CODES].sort())
    expect(SKY_GLYPHS.fog).toBe("reorder-two-outline")
    for (const glyph of Object.values(SKY_GLYPHS)) expect(glyph.endsWith("-outline")).toBe(true)

    const noSky = mount({ weather: { temperature_c: 9, source: "manual" } })
    expect(glyphs(noSky.tree)).toContain("partly-sunny-outline")
    expect(texts(noSky.tree)).toContain("9 °C")

    const fog = mount({ weather: { sky: "fog", source: "manual" } })
    expect(glyphs(fog.tree)).toContain("reorder-two-outline")
  })

  test("the weather area is a 52 point button that opens the section", () => {
    const { tree, onOpen } = mount({ weather: CLOUDY })

    const area = byTestId(tree, "conditions-card-weather")
    expect(area.props.accessibilityRole).toBe("button")
    expect(area.props.accessibilityLabel).toBe(t.summary.openWithLine(LINE))
    expect(area.props.style).toEqual(expect.objectContaining({ minHeight: 52 }))
    act(() => area.props.onPress())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  test("a note without weather says so in the area and in its label", () => {
    const { tree } = mount({ note: "Sol détrempé" })

    const area = byTestId(tree, "conditions-card-weather")
    expect(texts(tree)).toContain(t.summary.noWeather)
    expect(area.props.accessibilityLabel).toBe(t.summary.openWithLine(t.summary.noWeather))
    expect(texts(tree)).toContain("Sol détrempé")
  })

  test("a weather with only an unknown sky counts as no weather", () => {
    const { tree } = mount({
      weather: { sky: "hail" as never, source: "meteo_france" },
      submitted: true,
    })

    expect(maybeByTestId(tree, "conditions-card")).toBeUndefined()
    expect(tree.toJSON()).toBeNull()
  })
})

describe("ConditionsCard attribution (D-26, D-35)", () => {
  test("shows the short provider mention under the line while a value is still the provider's", () => {
    const { tree } = mount({ weather: CLOUDY })

    expect(texts(tree)).toContain(t.summary.mention)
    expect(texts(tree)).toContain("Météo-France")
    expect(texts(tree).join(" ")).not.toContain("Source :")
  })

  test("hides it for a manual weather and when every value was edited", () => {
    const manual = mount({ weather: { ...CLOUDY, source: "manual" } })
    expect(texts(manual.tree).join(" ")).not.toContain("Météo-France")

    const edited = mount({
      weather: { ...CLOUDY, edited: ["sky", "temperature_c", "wind_kmh", "rain_24h_mm"] },
    })
    expect(texts(edited.tree).join(" ")).not.toContain("Météo-France")
  })

  test("carries no date and no sentence, the date is in the Contexte page (D-31 detail view)", () => {
    const observedAt = new Date(2026, 9, 12, 4, 0).toISOString()
    const { tree } = mount({ weather: { ...CLOUDY, observed_at: observedAt } })

    expect(texts(tree)).toContain("Météo-France")
    expect(texts(tree).join(" ")).not.toContain("12/10/2026")
    expect(texts(tree).join(" ")).not.toContain("mesure du")
  })

  test("says the weather is partly modified when only some values were edited", () => {
    const { tree } = mount({ weather: { ...CLOUDY, edited: ["temperature_c"] } })

    expect(texts(tree)).toContain("Météo-France, en partie modifiée")
    expect(texts(tree)).not.toContain(t.summary.mention)
  })
})

describe("ConditionsCard note fold (UI-SPEC 3.1)", () => {
  const NOTE = "Une très longue note de terrain ".repeat(10)

  test("folds the note to 2 lines and carries the full text", () => {
    const { tree } = mount({ weather: CLOUDY, note: NOTE })

    const note = noteNode(tree)
    expect(note.props.numberOfLines).toBe(2)
    expect([note.props.children].flat().join("")).toBe(NOTE)
    expect(maybeByTestId(tree, "conditions-card-more")).toBeUndefined()
  })

  test("a note that fits shows no link", () => {
    const { tree } = mount({ note: "Courte" })

    reportLines(tree, 2)
    expect(maybeByTestId(tree, "conditions-card-more")).toBeUndefined()
  })

  test("a note cut after 2 lines gets a link that expands it in place and folds it back", () => {
    const { tree, onOpen } = mount({ weather: CLOUDY, note: NOTE })

    reportLines(tree, 3)
    const more = byTestId(tree, "conditions-card-more")
    expect(more.props.accessibilityLabel).toBe(t.summary.noteMoreA11y)
    expect(texts(tree)).toContain(t.summary.noteMore)

    act(() => more.props.onPress())
    expect(noteNode(tree).props.numberOfLines).toBeUndefined()
    const less = byTestId(tree, "conditions-card-more")
    expect(less.props.accessibilityLabel).toBe(t.summary.noteLessA11y)
    expect(less.props.accessibilityState).toEqual({ expanded: true })
    expect(texts(tree)).toContain(t.summary.noteLess)

    act(() => less.props.onPress())
    expect(noteNode(tree).props.numberOfLines).toBe(2)
    expect(texts(tree)).toContain(t.summary.noteMore)
    expect(onOpen).not.toHaveBeenCalled()
  })

  test("layout reports while expanded do not change the link", () => {
    const { tree } = mount({ note: NOTE })

    reportLines(tree, 3)
    act(() => byTestId(tree, "conditions-card-more").props.onPress())
    reportLines(tree, 1)
    expect(maybeByTestId(tree, "conditions-card-more")).toBeDefined()
  })

  test("the note and the weather work under Reduce Motion", () => {
    setReducedMotion(true)
    const { tree } = mount({ weather: CLOUDY, note: NOTE })

    reportLines(tree, 3)
    expect(maybeByTestId(tree, "conditions-card-more")).toBeDefined()
  })

  test("a blank note is no note", () => {
    const { tree } = mount({ weather: CLOUDY, note: "   " })

    expect(maybeByTestId(tree, "conditions-card-note")).toBeUndefined()
  })
})

describe("ConditionsCard states (U-11)", () => {
  test("a draft with neither shows the invitation row", () => {
    const { tree, onOpen } = mount()

    expect(texts(tree)).toContain(t.summary.emptyTitle)
    expect(texts(tree)).toContain(t.summary.emptyBody)
    expect(glyphs(tree)).toEqual(["partly-sunny-outline", "chevron-forward-outline"])
    const area = byTestId(tree, "conditions-card-weather")
    expect(area.props.accessibilityLabel).toBe(t.summary.openWithLine(t.summary.emptyBody))
    act(() => area.props.onPress())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  test("a submitted survey with neither draws nothing", () => {
    const { tree } = mount({ submitted: true })

    expect(tree.toJSON()).toBeNull()
  })

  test("an empty weather object and an empty note count as neither", () => {
    const { tree } = mount({
      submitted: true,
      note: "",
      weather: { requested_at: "2026-10-11T08:00:00.000Z" },
    })

    expect(tree.toJSON()).toBeNull()
  })

  test("a lookup in flight with nothing yet shows the spinner and the search sentence", () => {
    const { tree } = mount({ loading: true })

    expect(spinners(tree)).toHaveLength(1)
    expect(texts(tree)).toContain(t.summary.loading)
    expect(texts(tree)).not.toContain(t.summary.emptyTitle)
    expect(byTestId(tree, "conditions-card-weather").props.accessibilityLabel).toBe(
      t.summary.openWithLine(t.summary.loading),
    )
  })

  test("a lookup with values already there shows the values, not the spinner", () => {
    const { tree } = mount({ loading: true, weather: CLOUDY })

    expect(spinners(tree)).toHaveLength(0)
    expect(texts(tree)).toContain(LINE)
  })

  test("a lookup with a note only keeps the spinner and the note", () => {
    const { tree } = mount({ loading: true, note: "Brume au lever" })

    expect(spinners(tree)).toHaveLength(1)
    expect(texts(tree)).toContain("Brume au lever")
  })

  test("a submitted survey with a weather opens the same card", () => {
    const { tree, onOpen } = mount({ submitted: true, weather: CLOUDY })

    act(() => byTestId(tree, "conditions-card-weather").props.onPress())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
