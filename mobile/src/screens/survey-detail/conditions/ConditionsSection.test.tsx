import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import type { SurveyWeather } from "@cortege/ibp-domain"
import { setReducedMotion } from "../../../../test/react-native-reanimated.mock"
import { defaultTheme } from "../../../app/theme"
import { editWeatherValue, type WeatherViewState } from "../../../app/weather"
import { fr } from "../../../i18n"
import { ConditionsReadOnly } from "./ConditionsReadOnly"
import { ConditionsSection } from "./ConditionsSection"
import type { SurveyConditions } from "./useSurveyConditions"

const mockPlatform = {
  OS: "ios",
  select: <T,>(options: Record<string, T>): T | undefined =>
    options[mockPlatform.OS] ?? options.default,
}
const mockAlert = jest.fn()
const mockAnnounce = jest.fn()

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    ActivityIndicator: mockComponent("ActivityIndicator"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
    AccessibilityInfo: { announceForAccessibility: (text: string) => mockAnnounce(text) },
    get Platform() {
      return mockPlatform
    },
  }
})

jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
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

beforeEach(() => {
  mockAlert.mockClear()
  mockAnnounce.mockClear()
})

afterEach(() => {
  mockPlatform.OS = "ios"
  setReducedMotion(false)
  jest.useRealTimers()
})

const t = fr.conditions

type SectionProps = React.ComponentProps<typeof ConditionsSection>

const LOADED_EMPTY: SurveyConditions = { note: null, weather: null, parcelIds: [], loaded: true }

function sectionProps(over: Partial<SectionProps> = {}): SectionProps {
  return {
    editable: true,
    conditions: LOADED_EMPTY,
    viewState: "noParcel",
    onEditWeather: jest.fn(),
    onRetry: jest.fn(),
    onRefill: jest.fn(),
    ...over,
  }
}

function mount(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return tree
}

const byTestId = (tree: ReactTestRenderer, testID: string): ReactTestInstance =>
  tree.root.find((node) => node.props.testID === testID && typeof node.type === "string")

const maybeByTestId = (tree: ReactTestRenderer, testID: string): ReactTestInstance | undefined =>
  tree.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")[0]

/** Every text string drawn by a Text of the tree. */
function texts(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat(Infinity).join(""))
}

const glyphs = (tree: ReactTestRenderer): string[] =>
  tree.root.findAll((node) => node.type === Ionicons).map((node) => node.props.name as string)

describe("ConditionsSection weather status line (UI-SPEC 1.3)", () => {
  const CASES: {
    state: WeatherViewState
    glyph: string | null
    text: string
    link: "retry" | "refill" | null
  }[] = [
    {
      state: "noParcel",
      glyph: "partly-sunny-outline",
      text: t.weather.status.noParcel,
      link: null,
    },
    { state: "loading", glyph: null, text: t.weather.status.loading, link: null },
    {
      state: "prefilled",
      glyph: "cloud-done-outline",
      text: t.weather.status.prefilled,
      link: null,
    },
    {
      state: "edited",
      glyph: "cloud-done-outline",
      text: t.weather.status.edited,
      link: "refill",
    },
    { state: "manual", glyph: "create-outline", text: t.weather.status.manual, link: null },
    {
      state: "offline",
      glyph: "cloud-offline-outline",
      text: t.weather.status.offline,
      link: null,
    },
    {
      state: "unavailable",
      glyph: "cloud-offline-outline",
      text: t.weather.status.unavailable,
      link: "retry",
    },
  ]

  test.each(CASES)("$state shows its glyph, its sentence and its link", (item) => {
    const tree = mount(<ConditionsSection {...sectionProps({ viewState: item.state })} />)

    const status = byTestId(tree, "conditions-weather-status")
    expect(texts(tree)).toContain(item.text)
    expect(status.props.accessibilityLiveRegion).toBe("polite")
    if (item.glyph) {
      expect(glyphs(tree)).toContain(item.glyph)
      expect(tree.root.findAll((n) => (n.type as unknown) === "ActivityIndicator")).toHaveLength(0)
    } else {
      expect(tree.root.findAll((n) => (n.type as unknown) === "ActivityIndicator")).toHaveLength(1)
    }
    expect(maybeByTestId(tree, "conditions-retry") !== undefined).toBe(item.link === "retry")
    expect(maybeByTestId(tree, "conditions-refill") !== undefined).toBe(item.link === "refill")
  })

  test("prefilled and edited carry the date of the data when it is known (D-31)", () => {
    const weather: SurveyWeather = {
      sky: "cloudy",
      temperature_c: 14,
      observed_at: new Date(2026, 9, 12, 4, 0).toISOString(),
      source: "meteo_france",
    }
    const conditions = { ...LOADED_EMPTY, weather }
    const prefilled = mount(
      <ConditionsSection {...sectionProps({ viewState: "prefilled", conditions })} />,
    )
    expect(texts(prefilled)).toContain(
      "Préremplie d'après Météo-France, mesure du 12/10/2026 à 04:00.",
    )
    expect(texts(prefilled)).toContain("Source : Météo-France, mesure du 12/10/2026 à 04:00")

    const edited = mount(
      <ConditionsSection
        {...sectionProps({
          viewState: "edited",
          conditions: { ...LOADED_EMPTY, weather: { ...weather, edited: ["temperature_c"] } },
        })}
      />,
    )
    expect(texts(edited)).toContain(
      "Préremplie d'après Météo-France, mesure du 12/10/2026 à 04:00, modifiée par vous. Vos valeurs ne seront pas remplacées.",
    )
    // Some values are still the provider's: the source line says that others were modified.
    expect(texts(edited)).toContain(
      "Source : Météo-France, mesure du 12/10/2026 à 04:00, certaines valeurs modifiées par l'observateur",
    )
  })

  test("no state says error and no glyph takes a danger colour", () => {
    for (const item of CASES) {
      const tree = mount(<ConditionsSection {...sectionProps({ viewState: item.state })} />)
      expect(item.text.toLowerCase()).not.toContain("erreur")
      const colours = tree.root
        .findAll((node) => node.type === Ionicons)
        .map((node) => node.props.color)
      for (const color of colours) {
        expect(color).not.toBe(defaultTheme.onSurface.danger)
        expect(color).not.toBe(defaultTheme.componentColors.field.borderError)
      }
    }
  })

  test("the retry link asks again, the refill link asks first", () => {
    const onRetry = jest.fn()
    const retry = mount(
      <ConditionsSection {...sectionProps({ viewState: "unavailable", onRetry })} />,
    )
    act(() => {
      byTestId(retry, "conditions-retry").props.onPress()
    })
    expect(onRetry).toHaveBeenCalledTimes(1)

    const onRefill = jest.fn()
    const refill = mount(<ConditionsSection {...sectionProps({ viewState: "edited", onRefill })} />)
    act(() => {
      byTestId(refill, "conditions-refill").props.onPress()
    })
    expect(onRefill).not.toHaveBeenCalled()
    expect(mockAlert).toHaveBeenCalledTimes(1)
    const [title, message, buttons] = mockAlert.mock.calls[0]
    expect(title).toBe(t.weather.refillConfirm.title)
    expect(message).toBe(t.weather.refillConfirm.message)
    expect(buttons).toEqual([
      { text: "Annuler", style: "cancel" },
      { text: "Remplacer", style: "destructive", onPress: expect.any(Function) },
    ])

    act(() => {
      buttons[1].onPress()
    })
    expect(onRefill).toHaveBeenCalledTimes(1)
  })

  test("cancelling the confirmation refills nothing", () => {
    const onRefill = jest.fn()
    const tree = mount(<ConditionsSection {...sectionProps({ viewState: "edited", onRefill })} />)
    act(() => {
      byTestId(tree, "conditions-refill").props.onPress()
    })
    const buttons = mockAlert.mock.calls[0][2] as { onPress?: () => void }[]
    expect(buttons[0].onPress).toBeUndefined()
    expect(onRefill).not.toHaveBeenCalled()
  })

  test("iOS announces a change of the line once, not the first render", () => {
    const element = (viewState: WeatherViewState) => (
      <ConditionsSection {...sectionProps({ viewState })} />
    )
    const tree = mount(element("loading"))
    expect(mockAnnounce).not.toHaveBeenCalled()

    act(() => {
      tree.update(element("prefilled"))
    })
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith(t.weather.status.prefilled)

    act(() => {
      tree.update(element("prefilled"))
    })
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
  })

  test("Android leaves the announcement to the live region", () => {
    mockPlatform.OS = "android"
    const element = (viewState: WeatherViewState) => (
      <ConditionsSection {...sectionProps({ viewState })} />
    )
    const tree = mount(element("loading"))

    act(() => {
      tree.update(element("prefilled"))
    })

    expect(mockAnnounce).not.toHaveBeenCalled()
  })
})

describe("ConditionsSection weather card", () => {
  test("the source line shows exactly when a shown value is still the provider's", () => {
    const provider: SurveyWeather = { sky: "cloudy", temperature_c: 14, source: "meteo_france" }
    const withSource = mount(
      <ConditionsSection
        {...sectionProps({
          conditions: { ...LOADED_EMPTY, weather: provider },
          viewState: "prefilled",
        })}
      />,
    )
    expect(texts(withSource)).toContain("Source : Météo-France")

    const everyValueEdited = mount(
      <ConditionsSection
        {...sectionProps({
          conditions: {
            ...LOADED_EMPTY,
            weather: { ...provider, edited: ["sky", "temperature_c"] },
          },
          viewState: "edited",
        })}
      />,
    )
    expect(texts(everyValueEdited)).not.toContain("Source : Météo-France")

    const manual = mount(
      <ConditionsSection
        {...sectionProps({
          conditions: { ...LOADED_EMPTY, weather: { temperature_c: 9, source: "manual" } },
          viewState: "manual",
        })}
      />,
    )
    expect(texts(manual)).not.toContain("Source : Météo-France")
  })

  test("pressing a sky chip edits the sky through editWeatherValue", () => {
    const onEditWeather = jest.fn()
    const tree = mount(<ConditionsSection {...sectionProps({ onEditWeather })} />)

    act(() => {
      byTestId(tree, "conditions-sky-rain")
        .findByType("Pressable" as never)
        .props.onPress()
    })

    const update = onEditWeather.mock.calls[0][0] as (
      current: SurveyWeather | null,
    ) => SurveyWeather | null
    const current: SurveyWeather = { sky: "cloudy", source: "meteo_france" }
    expect(update(current)).toEqual(editWeatherValue(current, "sky", "rain"))
    expect(update(null)).toEqual(editWeatherValue(null, "sky", "rain"))
  })

  test("typing a temperature edits it as a number through editWeatherValue", () => {
    const onEditWeather = jest.fn()
    const tree = mount(<ConditionsSection {...sectionProps({ onEditWeather })} />)
    const field = byTestId(tree, "conditions-field-temperature")

    act(() => {
      field.props.onChangeText("14,5")
    })
    act(() => {
      field.props.onBlur({})
    })

    const update = onEditWeather.mock.calls[0][0] as (
      current: SurveyWeather | null,
    ) => SurveyWeather | null
    expect(update(null)).toEqual(editWeatherValue(null, "temperature_c", 14.5))
  })

  test("a provider answer arriving fades the values in without breaking the card", () => {
    const element = (weather: SurveyWeather | null) => (
      <ConditionsSection
        {...sectionProps({ conditions: { ...LOADED_EMPTY, weather }, viewState: "prefilled" })}
      />
    )
    const tree = mount(element(null))

    act(() => {
      tree.update(element({ sky: "clear", temperature_c: 12, source: "meteo_france" }))
    })

    expect(byTestId(tree, "conditions-field-temperature").props.value).toBe("12")
  })

  test("a field focus reports its top inside the section, offsets added up", () => {
    const onFieldFocus = jest.fn()
    const tree = mount(<ConditionsSection {...sectionProps({ onFieldFocus })} />)
    const layouts = tree.root.findAll(
      (node) => (node.type as unknown) === "View" && typeof node.props.onLayout === "function",
    )
    // Weather card wrapper, the values view and the fields view of the card, then the four field
    // cells (the note is not part of the section any more, D-33).
    expect(layouts).toHaveLength(7)
    const at = (index: number, y: number) =>
      act(() => {
        layouts[index].props.onLayout({ nativeEvent: { layout: { y } } })
      })
    at(0, 100)
    at(1, 60)
    at(2, 30)
    at(4, 20)

    act(() => {
      byTestId(tree, "conditions-field-wind").props.onFocus({})
    })
    act(() => {
      byTestId(tree, "conditions-field-temperature").props.onFocus({})
    })

    expect(onFieldFocus).toHaveBeenNthCalledWith(1, 100 + 60 + 30 + 20)
    expect(onFieldFocus).toHaveBeenNthCalledWith(2, 100 + 60 + 30)
  })

  test("nothing is drawn under the header until the draft was read", () => {
    const tree = mount(
      <ConditionsSection {...sectionProps({ conditions: { ...LOADED_EMPTY, loaded: false } })} />,
    )

    expect(texts(tree)).toEqual([t.section.title, t.section.subtitle])
    expect(maybeByTestId(tree, "survey-note-field")).toBeUndefined()

    const readOnly = mount(
      <ConditionsSection
        {...sectionProps({ editable: false, conditions: { ...LOADED_EMPTY, loaded: false } })}
      />,
    )
    expect(texts(readOnly)).toEqual([t.section.title, t.section.subtitle])
  })
})

describe("Conditions read only (D-03, U-04)", () => {
  const weather: SurveyWeather = {
    sky: "cloudy",
    temperature_c: 14.5,
    wind_kmh: 12,
    rain_24h_mm: 2,
    observed_at: new Date(2026, 9, 11, 14, 30).toISOString(),
    source: "meteo_france",
  }

  test("a submitted survey shows plain rows and no field, chip, link or counter", () => {
    const tree = mount(
      <ConditionsSection
        {...sectionProps({
          editable: false,
          viewState: "edited",
          conditions: { ...LOADED_EMPTY, weather, note: "Sol frais" },
        })}
      />,
    )

    const all = texts(tree)
    expect(all).toEqual(
      expect.arrayContaining([
        "Ciel",
        "Nuageux",
        "Température",
        "14,5 °C",
        "Vent",
        "12 km/h",
        "Pluie sur 24 h",
        "2 mm",
        "Heure",
        "14:30",
        "Source : Météo-France, mesure du 11/10/2026 à 14:30.",
      ]),
    )
    expect(tree.root.findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
    expect(tree.root.findAll((n) => n.props.testID === "conditions-refill")).toHaveLength(0)
    expect(tree.root.findAll((n) => n.props.testID?.startsWith("conditions-sky-"))).toHaveLength(0)
    expect(all.some((text) => /\d+ \/ 1000/.test(text))).toBe(false)
    // The note is a card of its own on the summary now (D-33): not part of this section.
    expect(all).not.toContain("Sol frais")
    expect(all).not.toContain(t.note.label)
    // The heading above says Météo: the group does not repeat it.
    expect(all.filter((text) => text === t.weather.title)).toHaveLength(1)
  })

  test("rows exist only for the values that exist", () => {
    const tree = mount(<ConditionsReadOnly weather={{ temperature_c: 9 }} emptyMode="line" />)

    const all = texts(tree)
    expect(all).toContain("Température")
    expect(all).not.toContain("Ciel")
    expect(all).not.toContain("Vent")
    expect(all).not.toContain("Heure")
    expect(all).not.toContain(t.note.label)
  })

  test("the source line follows who entered the values", () => {
    const edited = mount(
      <ConditionsReadOnly weather={{ ...weather, edited: ["temperature_c"] }} emptyMode="line" />,
    )
    expect(texts(edited)).toContain(
      "Source : Météo-France, mesure du 11/10/2026 à 14:30, certaines valeurs modifiées par l'observateur",
    )

    const allEdited = mount(
      <ConditionsReadOnly
        weather={{ ...weather, edited: ["sky", "temperature_c", "wind_kmh", "rain_24h_mm"] }}
        emptyMode="line"
      />,
    )
    expect(texts(allEdited)).toContain(
      "Préremplie d'après Météo-France, mesure du 11/10/2026 à 14:30, modifiée par l'observateur.",
    )
    expect(texts(allEdited).join(" ")).not.toContain("Source : Météo-France")

    const undated = mount(
      <ConditionsReadOnly
        weather={{ sky: "cloudy", source: "meteo_france", observed_at: "garbage" }}
        emptyMode="line"
      />,
    )
    expect(texts(undated)).toContain(t.readOnly.sourcePrefilled)

    const manual = mount(
      <ConditionsReadOnly
        weather={{ temperature_c: 9, source: "manual", edited: ["temperature_c"] }}
        emptyMode="line"
      />,
    )
    expect(texts(manual)).toContain(t.readOnly.sourceManual)

    const timeOnly = mount(
      <ConditionsReadOnly weather={{ observed_at: weather.observed_at }} emptyMode="line" />,
    )
    const lines = texts(timeOnly)
    expect(lines).not.toContain(t.readOnly.sourcePrefilled)
    expect(lines).not.toContain(t.readOnly.sourceManual)
  })

  test("the group carries the Météo title unless a heading above says it", () => {
    const titled = mount(<ConditionsReadOnly weather={{ temperature_c: 9 }} emptyMode="line" />)
    expect(texts(titled)).toContain(t.weather.title)
    const bare = mount(
      <ConditionsReadOnly weather={{ temperature_c: 9 }} emptyMode="line" showTitle={false} />,
    )
    expect(texts(bare)).not.toContain(t.weather.title)
  })

  test("no weather: one line, or nothing when hidden", () => {
    const line = mount(
      <ConditionsReadOnly
        weather={{ requested_at: "2026-10-11T08:00:00.000Z" }}
        emptyMode="line"
      />,
    )
    expect(texts(line)).toEqual([t.readOnly.empty])

    const section = mount(
      <ConditionsSection {...sectionProps({ editable: false, conditions: LOADED_EMPTY })} />,
    )
    expect(texts(section)).toEqual([t.section.title, t.section.subtitle, t.readOnly.empty])

    const hidden = mount(<ConditionsReadOnly weather={null} emptyMode="hidden" />)
    expect(hidden.toJSON()).toBeNull()
  })

  test("non finite numbers and unknown skies are not drawn", () => {
    const tree = mount(
      <ConditionsReadOnly
        weather={{ sky: "hail" as never, temperature_c: Number.NaN, wind_kmh: 3 }}
        emptyMode="line"
      />,
    )

    const all = texts(tree)
    expect(all).toContain("Vent")
    expect(all).not.toContain("Ciel")
    expect(all).not.toContain("Température")
  })
})
