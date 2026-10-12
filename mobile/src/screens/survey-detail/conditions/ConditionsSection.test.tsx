import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import type { SurveyWeather } from "@cortege/ibp-domain"
import { setReducedMotion } from "../../../../test/react-native-reanimated.mock"
import { defaultTheme } from "../../../app/theme"
import { editWeatherSky, weatherSourceLine, type WeatherViewState } from "../../../app/weather"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
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

describe("ConditionsSection weather status line (UI-SPEC 1.3, D-37)", () => {
  const CASES: {
    state: WeatherViewState
    glyph: string | null
    text: string
    link: "retry" | null
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
    {
      state: "tooOld",
      glyph: "time-outline",
      text: t.weather.status.tooOld,
      link: null,
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
    // The measurements cannot be refilled or edited any more (D-37).
    expect(maybeByTestId(tree, "conditions-refill")).toBeUndefined()
  })

  test("a visit older than 24 h explains why, offers no retry and keeps the sky chips (D-42)", () => {
    const sky: SurveyWeather = { sky: "fog", edited: ["sky"], source: "manual" }
    const onEditWeather = jest.fn()
    const tree = mount(
      <ConditionsSection
        {...sectionProps({
          viewState: "tooOld",
          conditions: { ...LOADED_EMPTY, weather: sky },
          onEditWeather,
        })}
      />,
    )

    const line = texts(tree)
    expect(line).toContain(t.weather.status.tooOld)
    expect(t.weather.status.tooOld).toContain("plus de 24\u00a0h")
    expect(t.weather.status.tooOld).toContain("Vous pouvez choisir le ciel")
    // Nothing promises a later fill, nothing can be retried or waited for.
    expect(maybeByTestId(tree, "conditions-retry")).toBeUndefined()
    expect(line).not.toContain(t.weather.status.retry)
    expect(tree.root.findAll((n) => (n.type as unknown) === "ActivityIndicator")).toHaveLength(0)
    expect(line.join(" ")).not.toContain("arriveront")
    // The sky chips stay and still write the observer's sky.
    const chips = tree.root.findAll(
      (n) => typeof n.type === "string" && n.props.testID?.startsWith("conditions-sky-"),
    )
    expect(chips).toHaveLength(8)
    expect(maybeByTestId(tree, "conditions-skyrow-toggle")).toBeUndefined()
  })

  test("prefilled carries the date of the data when it is known (D-31)", () => {
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
    expect(texts(prefilled)).toContain("Mesures de Météo-France, mesure du 12/10/2026 à 04:00.")
    expect(texts(prefilled)).toContain("Source : Météo-France, mesure du 12/10/2026 à 04:00")
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

  test("the retry link asks again", () => {
    const onRetry = jest.fn()
    const retry = mount(
      <ConditionsSection {...sectionProps({ viewState: "unavailable", onRetry })} />,
    )
    act(() => {
      byTestId(retry, "conditions-retry").props.onPress()
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(mockAlert).not.toHaveBeenCalled()
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

describe("ConditionsSection weather card (D-37: only the sky is editable)", () => {
  const OWNERS_WEATHER: SurveyWeather = {
    sky: null,
    edited: ["sky"],
    source: "meteo_france",
    wind_kmh: 7.2,
    rain_24h_mm: 0,
    observed_at: "2026-10-12T10:00:00Z",
    requested_at: "2026-10-12T10:21:36.959Z",
    temperature_c: 16.9,
  }

  test("shows the provider's measurements as the big read-out, with no text field", () => {
    const tree = mount(
      <ConditionsSection
        {...sectionProps({
          conditions: { ...LOADED_EMPTY, weather: OWNERS_WEATHER },
          viewState: "prefilled",
        })}
      />,
    )

    const all = texts(tree)
    expect(all).toEqual(
      expect.arrayContaining([
        "16,9",
        t.summary.temperatureUnit,
        t.summary.stat.wind,
        "7,2\u00a0km/h",
        t.summary.stat.rain,
        "0\u00a0mm",
        t.summary.stat.time,
      ]),
    )
    expect(tree.root.findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
    expect(maybeByTestId(tree, "conditions-field-temperature")).toBeUndefined()
    // The sky chips are folded behind "Modifier le ciel" (D-43): eight of them once it is pressed.
    const chipHosts = () =>
      tree.root.findAll(
        (n) => typeof n.type === "string" && n.props.testID?.startsWith("conditions-sky-"),
      )
    expect(chipHosts()).toHaveLength(0)
    act(() => byTestId(tree, "conditions-skyrow-toggle").props.onPress())
    expect(chipHosts()).toHaveLength(8)
  })

  test("the whole weather is one card: read-out, status line, chips, then the source sentence (D-41)", () => {
    const tree = mount(
      <ConditionsSection
        {...sectionProps({
          conditions: { ...LOADED_EMPTY, weather: { ...OWNERS_WEATHER, sky: "cloudy" } },
          viewState: "prefilled",
        })}
      />,
    )

    act(() => byTestId(tree, "conditions-skyrow-toggle").props.onPress())
    const hosts = tree.root
      .findAll((n) => typeof n.type === "string" && typeof n.props.testID === "string")
      .map((n) => n.props.testID as string)
    const at = (id: string) => hosts.indexOf(id)
    expect(at("weather-hero")).toBeGreaterThan(-1)
    expect(at("weather-hero")).toBeLessThan(at("conditions-weather-status"))
    expect(at("conditions-weather-status")).toBeLessThan(at("conditions-sky-clear"))

    // Read-out, status line and chips share one glass card.
    const card = tree.root.findAllByType(AppCard as never)
    expect(card).toHaveLength(1)
    expect(card[0].findAll((n) => n.props.testID === "weather-hero").length).toBeGreaterThan(0)
    expect(
      card[0].findAll((n) => n.props.testID === "conditions-sky-clear").length,
    ).toBeGreaterThan(0)
    // The sky of the chips shows in the read-out too, and the dated sentence closes the card.
    const all = texts(tree)
    expect(all).toContain("Nuageux")
    expect(all[all.length - 1]).toBe(weatherSourceLine({ ...OWNERS_WEATHER, sky: "cloudy" }))
    expect(all[all.length - 1]).toContain("ciel saisi par l'observateur")
  })

  test("without provider data only the sky chips are offered, with the calm status line", () => {
    for (const viewState of ["noParcel", "offline", "unavailable"] as const) {
      const tree = mount(<ConditionsSection {...sectionProps({ viewState })} />)
      expect(maybeByTestId(tree, "conditions-weather-hero")).toBeUndefined()
      expect(maybeByTestId(tree, "weather-hero")).toBeUndefined()
      expect(texts(tree)).toContain(t.weather.status[viewState])
    }
  })

  test("the source line shows exactly when a shown value is the provider's, with the sky clause", () => {
    const provider: SurveyWeather = { temperature_c: 14, source: "meteo_france" }
    const withSource = mount(
      <ConditionsSection
        {...sectionProps({
          conditions: { ...LOADED_EMPTY, weather: provider },
          viewState: "prefilled",
        })}
      />,
    )
    expect(texts(withSource)).toContain("Source : Météo-France")

    const observersSky = mount(
      <ConditionsSection
        {...sectionProps({
          conditions: {
            ...LOADED_EMPTY,
            weather: { ...provider, sky: "rain", edited: ["sky"] },
          },
          viewState: "prefilled",
        })}
      />,
    )
    expect(texts(observersSky)).toContain("Source : Météo-France, ciel saisi par l'observateur")

    const skyOnly = mount(
      <ConditionsSection
        {...sectionProps({
          conditions: {
            ...LOADED_EMPTY,
            weather: { sky: "rain", edited: ["sky"], source: "manual" },
          },
          viewState: "noParcel",
        })}
      />,
    )
    expect(texts(skyOnly).join(" ")).not.toContain("Météo-France,")
    expect(texts(skyOnly)).not.toContain("Source : Météo-France")
  })

  test("pressing a sky chip edits the sky through editWeatherSky", () => {
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
    const current: SurveyWeather = { temperature_c: 9, source: "meteo_france" }
    expect(update(current)).toEqual(editWeatherSky(current, "rain"))
    expect(update(null)).toEqual(editWeatherSky(null, "rain"))
  })

  test("pressing the selected chip again clears the sky", () => {
    const onEditWeather = jest.fn()
    const weather: SurveyWeather = { sky: "rain", edited: ["sky"], source: "manual" }
    const tree = mount(
      <ConditionsSection
        {...sectionProps({ onEditWeather, conditions: { ...LOADED_EMPTY, weather } })}
      />,
    )

    act(() => {
      byTestId(tree, "conditions-sky-rain")
        .findByType("Pressable" as never)
        .props.onPress()
    })

    const update = onEditWeather.mock.calls[0][0] as (
      current: SurveyWeather | null,
    ) => SurveyWeather | null
    expect(update(weather)).toEqual(editWeatherSky(weather, null))
    expect(update(weather)?.sky).toBeNull()
  })

  test("a provider answer arriving fades the rows in without breaking the card", () => {
    const element = (weather: SurveyWeather | null) => (
      <ConditionsSection
        {...sectionProps({ conditions: { ...LOADED_EMPTY, weather }, viewState: "prefilled" })}
      />
    )
    const tree = mount(element(null))

    act(() => {
      tree.update(element({ sky: "clear", temperature_c: 12, source: "meteo_france" }))
    })

    expect(texts(tree)).toEqual(expect.arrayContaining(["12", t.summary.temperatureUnit]))
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

describe("Conditions read only (D-03, U-04, D-37)", () => {
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
          viewState: "prefilled",
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
        "14,5\u00a0°C",
        "Vent",
        "12\u00a0km/h",
        t.weather.rows.rain,
        "2\u00a0mm",
        "Heure de la mesure",
        "14:30",
        "Source : Météo-France, mesure du 11/10/2026 à 14:30",
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
    expect(all).not.toContain("Heure de la mesure")
    expect(all).not.toContain(t.note.label)
  })

  test("the source line says when the sky is the observer's, and never calls it Météo-France's", () => {
    const observersSky = mount(
      <ConditionsReadOnly weather={{ ...weather, sky: "fog", edited: ["sky"] }} emptyMode="line" />,
    )
    expect(texts(observersSky)).toContain(
      "Source : Météo-France, mesure du 11/10/2026 à 14:30, ciel saisi par l'observateur",
    )

    const undated = mount(
      <ConditionsReadOnly
        weather={{ temperature_c: 9, source: "meteo_france", observed_at: "garbage" }}
        emptyMode="line"
      />,
    )
    expect(texts(undated)).toContain("Source : Météo-France")

    const skyOnly = mount(
      <ConditionsReadOnly
        weather={{ sky: "rain", source: "manual", edited: ["sky"] }}
        emptyMode="line"
      />,
    )
    expect(texts(skyOnly)).toContain(t.readOnly.sourceManual)
    expect(texts(skyOnly).join(" ")).not.toContain("Météo-France")

    const timeOnly = mount(
      <ConditionsReadOnly weather={{ observed_at: weather.observed_at }} emptyMode="line" />,
    )
    expect(texts(timeOnly)).not.toContain(t.readOnly.sourceManual)
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

describe("ConditionsSection sky row (D-43: the chips fold behind a button while Météo-France's values show)", () => {
  const PROVIDER: SurveyWeather = {
    sky: "cloudy",
    temperature_c: 14,
    wind_kmh: 12,
    rain_24h_mm: 2,
    source: "meteo_france",
  }
  const chipCount = (tree: ReactTestRenderer) =>
    tree.root.findAll(
      (n) => typeof n.type === "string" && n.props.testID?.startsWith("conditions-sky-"),
    ).length

  function mountProvider(over: Partial<SectionProps> = {}) {
    return mount(
      <ConditionsSection
        {...sectionProps({
          viewState: "prefilled",
          conditions: { ...LOADED_EMPTY, weather: PROVIDER },
          ...over,
        })}
      />,
    )
  }

  test("with provider values the chips are absent by default, the current sky stays readable", () => {
    const tree = mountProvider()

    expect(chipCount(tree)).toBe(0)
    expect(maybeByTestId(tree, "conditions-skypicker")).toBeUndefined()
    expect(byTestId(tree, "conditions-skyrow-current").props.children).toBe(t.sky.cloudy)
    // The glyph and the label of the read-out are still there.
    expect(maybeByTestId(tree, "weather-hero")).toBeDefined()
    expect(glyphs(tree)).toContain("cloudy-outline")
  })

  test("a provider weather without a sky says so on the row", () => {
    const tree = mountProvider({
      conditions: { ...LOADED_EMPTY, weather: { ...PROVIDER, sky: null } },
    })
    expect(byTestId(tree, "conditions-skyrow-current").props.children).toBe(t.skyRow.none)
  })

  test("the button is discreet, at least 44 points high and named for a screen reader", () => {
    const tree = mountProvider()
    const toggle = byTestId(tree, "conditions-skyrow-toggle")

    expect(texts(tree)).toContain(t.skyRow.edit)
    expect(toggle.props.accessibilityRole).toBe("button")
    expect(toggle.props.accessibilityLabel).toBe(t.skyRow.editA11y)
    expect(toggle.props.accessibilityState).toEqual({ expanded: false })
    const flat = ([] as Record<string, unknown>[])
      .concat(toggle.props.style)
      .reduce((acc, item) => ({ ...acc, ...item }), {})
    expect(flat.minHeight).toBeGreaterThanOrEqual(44)
  })

  test("pressing it shows the eight chips and turns the button into Fermer, pressing again folds them", () => {
    const tree = mountProvider()

    act(() => byTestId(tree, "conditions-skyrow-toggle").props.onPress())
    expect(chipCount(tree)).toBe(8)
    expect(texts(tree)).toContain(t.skyRow.close)
    expect(texts(tree)).not.toContain(t.skyRow.edit)
    const open = byTestId(tree, "conditions-skyrow-toggle")
    expect(open.props.accessibilityLabel).toBe(t.skyRow.closeA11y)
    expect(open.props.accessibilityState).toEqual({ expanded: true })

    act(() => byTestId(tree, "conditions-skyrow-toggle").props.onPress())
    expect(chipCount(tree)).toBe(0)
    expect(texts(tree)).toContain(t.skyRow.edit)
  })

  test("a sky chosen in the open chips is written at once and survives the fold", () => {
    const onEditWeather = jest.fn()
    const tree = mountProvider({ onEditWeather })

    act(() => byTestId(tree, "conditions-skyrow-toggle").props.onPress())
    act(
      () =>
        byTestId(tree, "conditions-sky-rain").children[0] &&
        (
          byTestId(tree, "conditions-sky-rain").findAll(
            (n) => typeof n.props.onPress === "function",
          )[0] as ReactTestInstance
        ).props.onPress(),
    )
    expect(onEditWeather).toHaveBeenCalledTimes(1)
    const update = onEditWeather.mock.calls[0][0] as (c: SurveyWeather | null) => SurveyWeather
    expect(update(PROVIDER).sky).toBe("rain")

    act(() => byTestId(tree, "conditions-skyrow-toggle").props.onPress())
    expect(chipCount(tree)).toBe(0)
    expect(onEditWeather).toHaveBeenCalledTimes(1)
  })

  test("without provider values the chips are open from the start, with no button (D-37)", () => {
    for (const viewState of ["noParcel", "loading", "offline", "unavailable", "tooOld"] as const) {
      const tree = mount(<ConditionsSection {...sectionProps({ viewState })} />)
      expect(chipCount(tree)).toBe(8)
      expect(maybeByTestId(tree, "conditions-skyrow-toggle")).toBeUndefined()
      expect(maybeByTestId(tree, "conditions-skyrow-current")).toBeUndefined()
      expect(texts(tree)).not.toContain(t.skyRow.edit)
    }
  })

  test("the open state is local: a new section for another survey starts folded", () => {
    const tree = mountProvider()
    act(() => byTestId(tree, "conditions-skyrow-toggle").props.onPress())
    expect(chipCount(tree)).toBe(8)

    const fresh = mountProvider()
    expect(chipCount(fresh)).toBe(0)
  })
})
