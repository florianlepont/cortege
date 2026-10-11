import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { selectionAsync } from "expo-haptics"
import type { SurveyWeather, WeatherSkyCode } from "@cortege/ibp-domain"
import { formatObservationTime, withObservationTime } from "../../../app/weather"
import { fr } from "../../../i18n"
import { SkyChips } from "./SkyChips"
import { WeatherFields } from "./WeatherFields"

const mockPlatform = {
  OS: "ios",
  select: <T,>(options: Record<string, T>): T | undefined =>
    options[mockPlatform.OS] ?? options.default,
}

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
    StyleSheet: { create: <T,>(styles: T): T => styles },
    get Platform() {
      return mockPlatform
    },
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

beforeEach(() => {
  ;(selectionAsync as jest.Mock).mockClear()
})

afterEach(() => {
  mockPlatform.OS = "ios"
})

const t = fr.conditions

const byTestId = (tree: ReactTestRenderer, testID: string): ReactTestInstance =>
  tree.root.find((node) => node.props.testID === testID && typeof node.type === "string")

function mount(element: React.ReactElement, focus: Record<string, jest.Mock> = {}) {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(element, {
      createNodeMock: () => ({ focus: () => focus.focus?.() }),
    })
  })
  return tree
}

describe("SkyChips", () => {
  const CODES: WeatherSkyCode[] = [
    "clear",
    "partly_cloudy",
    "cloudy",
    "overcast",
    "fog",
    "rain",
    "thunderstorm",
    "snow",
  ]

  test("draws the eight sky values in order, in a group named for the day's sky", () => {
    const tree = mount(<SkyChips value={null} onChange={jest.fn()} />)

    const labels = CODES.map((code) => {
      const chip = byTestId(tree, `conditions-sky-${code}`)
      return chip.findByProps({ accessibilityRole: "button" }).props.accessibilityLabel
    })
    expect(labels).toEqual([
      "Dégagé",
      "Peu nuageux",
      "Nuageux",
      "Couvert",
      "Brouillard",
      "Pluie",
      "Orage",
      "Neige",
    ])
    const group = tree.root.findByProps({ accessibilityLabel: "Ciel du jour" })
    expect(group.props.accessibilityRole).toBe("radiogroup")
  })

  test("an inactive chip selects its code with a haptic tick", () => {
    const onChange = jest.fn()
    const tree = mount(<SkyChips value="cloudy" onChange={onChange} />)

    act(() => {
      byTestId(tree, "conditions-sky-rain")
        .findByType("Pressable" as never)
        .props.onPress()
    })

    expect(onChange).toHaveBeenCalledWith("rain")
    expect(selectionAsync).toHaveBeenCalledTimes(1)
  })

  test("the active chip is selected and pressing it again clears the sky", () => {
    const onChange = jest.fn()
    const tree = mount(<SkyChips value="cloudy" onChange={onChange} />)
    const active = byTestId(tree, "conditions-sky-cloudy").findByType("Pressable" as never)
    expect(active.props.accessibilityState).toEqual({ disabled: false, selected: true })

    act(() => {
      active.props.onPress()
    })

    expect(onChange).toHaveBeenCalledWith(null)
  })
})

describe("WeatherFields", () => {
  const field = (tree: ReactTestRenderer, key: string) => byTestId(tree, `conditions-field-${key}`)
  const type = (tree: ReactTestRenderer, key: string, text: string) =>
    act(() => {
      field(tree, key).props.onChangeText(text)
    })
  const blur = (tree: ReactTestRenderer, key: string) =>
    act(() => {
      field(tree, key).props.onBlur({})
    })
  const hasText = (tree: ReactTestRenderer, text: string) =>
    tree.root.findAll((node) => node.props.children === text).length > 0

  test("shows the four fields with their units written out for a screen reader", () => {
    const tree = mount(<WeatherFields weather={null} onEdit={jest.fn()} />)

    expect(field(tree, "temperature").props.accessibilityLabel).toBe(
      t.weather.fields.temperature.a11y,
    )
    expect(field(tree, "wind").props.accessibilityLabel).toBe(t.weather.fields.wind.a11y)
    expect(field(tree, "rain").props.accessibilityLabel).toBe(t.weather.fields.rain.a11y)
    expect(field(tree, "time").props.accessibilityLabel).toBe(t.weather.fields.time.a11y)
    // The unit suffixes are decoration for a screen reader.
    const hidden = tree.root
      .findAllByProps({ accessibilityElementsHidden: true })
      .filter((node) => typeof node.type === "string")
    expect(hidden).toHaveLength(3)
    expect(hasText(tree, "°C")).toBe(true)
    expect(hasText(tree, "km/h")).toBe(true)
    expect(hasText(tree, "mm")).toBe(true)
  })

  test("shows the stored values with the French comma and the local time", () => {
    const observedAt = new Date(2026, 9, 11, 14, 30).toISOString()
    const weather: SurveyWeather = {
      temperature_c: 14.5,
      wind_kmh: 12,
      rain_24h_mm: 0,
      observed_at: observedAt,
    }
    const tree = mount(<WeatherFields weather={weather} onEdit={jest.fn()} />)

    expect(field(tree, "temperature").props.value).toBe("14,5")
    expect(field(tree, "wind").props.value).toBe("12")
    expect(field(tree, "rain").props.value).toBe("0")
    expect(field(tree, "time").props.value).toBe("14:30")
  })

  test("uses the iOS pads for numbers and the numeric keyboard on Android", () => {
    const ios = mount(<WeatherFields weather={null} onEdit={jest.fn()} />)
    expect(field(ios, "temperature").props.keyboardType).toBe("numbers-and-punctuation")
    expect(field(ios, "time").props.keyboardType).toBe("numbers-and-punctuation")
    expect(field(ios, "wind").props.keyboardType).toBe("decimal-pad")
    expect(field(ios, "rain").props.keyboardType).toBe("decimal-pad")
    expect(field(ios, "time").props.returnKeyType).toBeUndefined()

    mockPlatform.OS = "android"
    const android = mount(<WeatherFields weather={null} onEdit={jest.fn()} />)
    for (const key of ["temperature", "wind", "rain", "time"]) {
      expect(field(android, key).props.keyboardType).toBe("numeric")
    }
    expect(field(android, "temperature").props.returnKeyType).toBe("next")
    expect(field(android, "rain").props.returnKeyType).toBe("next")
    expect(field(android, "time").props.returnKeyType).toBe("done")
  })

  test("on Android the next key moves to the next field and the last one just closes", () => {
    mockPlatform.OS = "android"
    const focus = jest.fn()
    const tree = mount(<WeatherFields weather={null} onEdit={jest.fn()} />, { focus })

    act(() => {
      field(tree, "temperature").props.onSubmitEditing()
    })
    expect(focus).toHaveBeenCalledTimes(1)

    act(() => {
      field(tree, "time").props.onSubmitEditing()
    })
    expect(focus).toHaveBeenCalledTimes(1)
  })

  test("a valid number is edited on blur, with the comma accepted", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={null} onEdit={onEdit} />)

    type(tree, "temperature", "14,5")
    blur(tree, "temperature")

    expect(onEdit).toHaveBeenCalledWith("temperature_c", 14.5)
    expect(field(tree, "temperature").props.value).toBe("14,5")
  })

  test("a point is read as the comma and tidied on blur", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={null} onEdit={onEdit} />)

    type(tree, "wind", "12.0")
    blur(tree, "wind")

    expect(onEdit).toHaveBeenCalledWith("wind_kmh", 12)
    expect(field(tree, "wind").props.value).toBe("12")
  })

  test("emptying a filled field clears the value, emptying an empty one does nothing", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={{ rain_24h_mm: 2 }} onEdit={onEdit} />)

    type(tree, "rain", "")
    blur(tree, "rain")
    expect(onEdit).toHaveBeenCalledWith("rain_24h_mm", null)

    onEdit.mockClear()
    type(tree, "wind", "")
    blur(tree, "wind")
    expect(onEdit).not.toHaveBeenCalled()
  })

  test("visiting a prefilled field without changing it is not an edit", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={{ temperature_c: 14.5 }} onEdit={onEdit} />)

    act(() => {
      field(tree, "temperature").props.onFocus({})
    })
    blur(tree, "temperature")

    expect(onEdit).not.toHaveBeenCalled()
  })

  test("an out-of-range number shows its range under the field and is not written", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={null} onEdit={onEdit} />)

    type(tree, "temperature", "80")
    expect(hasText(tree, "Entre -40 et 55 °C")).toBe(false)
    blur(tree, "temperature")

    expect(hasText(tree, "Entre -40 et 55 °C")).toBe(true)
    expect(onEdit).not.toHaveBeenCalled()
    // The message follows the typing: it goes away when the text changes.
    type(tree, "temperature", "8")
    expect(hasText(tree, "Entre -40 et 55 °C")).toBe(false)
  })

  test("text that is not a number gets the range of its field", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={null} onEdit={onEdit} />)

    type(tree, "wind", "fort")
    blur(tree, "wind")
    type(tree, "rain", "-3")
    blur(tree, "rain")

    expect(hasText(tree, "Entre 0 et 350 km/h")).toBe(true)
    expect(hasText(tree, "Entre 0 et 1000 mm")).toBe(true)
    expect(onEdit).not.toHaveBeenCalled()
  })

  test("a time typed as 1430 is kept on the survey's date", () => {
    const onEdit = jest.fn()
    const requestedAt = new Date(2026, 9, 11, 9, 5).toISOString()
    const tree = mount(<WeatherFields weather={{ requested_at: requestedAt }} onEdit={onEdit} />)

    type(tree, "time", "1430")
    blur(tree, "time")

    expect(onEdit).toHaveBeenCalledWith("observed_at", withObservationTime(requestedAt, "14:30"))
    expect(formatObservationTime(withObservationTime(requestedAt, "14:30"))).toBe("14:30")
    expect(field(tree, "time").props.value).toBe("14:30")
  })

  test("with no survey time the typed time lands on today", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={null} onEdit={onEdit} />)

    type(tree, "time", "9h05")
    blur(tree, "time")

    const iso = onEdit.mock.calls[0][1] as string
    expect(formatObservationTime(iso)).toBe("09:05")
  })

  test("an unreadable time shows the time message and is not written", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={null} onEdit={onEdit} />)

    type(tree, "time", "25:00")
    blur(tree, "time")

    expect(hasText(tree, t.weather.fields.time.invalid)).toBe(true)
    expect(onEdit).not.toHaveBeenCalled()
  })

  test("the same time again is not an edit and an emptied time clears the stored one", () => {
    const onEdit = jest.fn()
    const observedAt = new Date(2026, 9, 11, 14, 30).toISOString()
    const tree = mount(<WeatherFields weather={{ observed_at: observedAt }} onEdit={onEdit} />)

    type(tree, "time", "14h30")
    blur(tree, "time")
    expect(onEdit).not.toHaveBeenCalled()

    type(tree, "time", "")
    blur(tree, "time")
    expect(onEdit).toHaveBeenCalledWith("observed_at", null)

    onEdit.mockClear()
    const empty = mount(<WeatherFields weather={null} onEdit={onEdit} />)
    type(empty, "time", "")
    blur(empty, "time")
    expect(onEdit).not.toHaveBeenCalled()
  })

  test("a focus reports the top of the field inside the block", () => {
    const onFieldFocus = jest.fn()
    const tree = mount(
      <WeatherFields weather={null} onEdit={jest.fn()} onFieldFocus={onFieldFocus} />,
    )
    const cells = tree.root.findAll(
      (node) => (node.type as unknown) === "View" && typeof node.props.onLayout === "function",
    )
    expect(cells).toHaveLength(4)
    const wrapper = cells[1]

    act(() => {
      wrapper.props.onLayout({ nativeEvent: { layout: { y: 72 } } })
    })
    act(() => {
      field(tree, "wind").props.onFocus({})
    })
    act(() => {
      field(tree, "time").props.onFocus({})
    })

    expect(onFieldFocus).toHaveBeenNthCalledWith(1, 72)
    expect(onFieldFocus).toHaveBeenNthCalledWith(2, 0)
  })

  test("the fields follow a late provider answer, but not the one being typed in", () => {
    const onEdit = jest.fn()
    const tree = mount(<WeatherFields weather={null} onEdit={onEdit} />)
    act(() => {
      field(tree, "wind").props.onFocus({})
    })
    type(tree, "wind", "3")

    act(() => {
      tree.update(<WeatherFields weather={{ temperature_c: 9, wind_kmh: 20 }} onEdit={onEdit} />)
    })

    expect(field(tree, "temperature").props.value).toBe("9")
    expect(field(tree, "wind").props.value).toBe("3")

    // Leaving the typed field edits it: the observer's text wins over the provider's.
    blur(tree, "wind")
    expect(onEdit).toHaveBeenCalledWith("wind_kmh", 3)
  })

  test("a refill empties the fields and the messages", () => {
    const tree = mount(<WeatherFields weather={{ temperature_c: 9 }} onEdit={jest.fn()} />)
    type(tree, "wind", "999")
    blur(tree, "wind")
    expect(hasText(tree, "Entre 0 et 350 km/h")).toBe(true)

    act(() => {
      tree.update(<WeatherFields weather={{}} onEdit={jest.fn()} />)
    })

    expect(field(tree, "temperature").props.value).toBe("")
    expect(field(tree, "wind").props.value).toBe("")
    expect(hasText(tree, "Entre 0 et 350 km/h")).toBe(false)
  })
})
