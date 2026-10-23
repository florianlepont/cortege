import React from "react"
import renderer, { act, ReactTestInstance } from "react-test-renderer"
import { UNCAPPABLE_FACTORS, UNCAPPED_PRESET_IDS } from "@cortege/ibp-domain"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    Modal: mockComponent("Modal"),
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
      style?: unknown
    }) =>
      ReactRef.createElement(
        "Pressable",
        { ...props, style: typeof style === "function" ? style({ pressed: false }) : style },
        typeof children === "function" ? children({ pressed: false }) : children,
      ),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))

import { UNCAPPED_PRESET_TEXT } from "../../app/route-text"
import { fr } from "../../i18n"
import { CountingPicker } from "./CountingPicker"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

const guide = fr.routeGuide

type PickerProps = React.ComponentProps<typeof CountingPicker>

function baseProps(extra: Partial<PickerProps> = {}): PickerProps {
  return {
    counting: "capped",
    preset: "all_factors",
    factors: [],
    factorsMissing: false,
    keptValuesNotice: false,
    onSelectCounting: jest.fn(),
    onSelectPreset: jest.fn(),
    onToggleFactor: jest.fn(),
    ...extra,
  }
}

function mount(props: PickerProps) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<CountingPicker {...props} />)
  })
  const byId = (id: string): ReactTestInstance[] =>
    tree.root.findAll((node) => node.props.testID === id && typeof node.type === "string")
  const one = (id: string): ReactTestInstance => {
    const found = byId(id)
    expect(found).toHaveLength(1)
    return found[0]
  }
  const texts = () =>
    tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .flatMap((node) => React.Children.toArray(node.props.children).map(String))
  return { tree, byId, one, texts }
}

describe("CountingPicker: the two modes", () => {
  test("shows the caption, both modes with their words and explanations, and a glyph each", () => {
    const { one, texts, byId } = mount(baseProps())
    expect(texts()).toContain("Mode de relevé")
    expect(texts()).toContain(guide.counting.capped.name)
    expect(texts()).toContain(guide.counting.capped.short)
    expect(texts()).not.toContain(guide.counting.capped.explanation)
    expect(texts()).toContain(guide.counting.uncapped.name)
    expect(texts()).toContain(guide.counting.uncapped.short)
    expect(one("route-counting-capped").props.accessibilityState).toMatchObject({ selected: true })
    expect(one("route-counting-uncapped").props.accessibilityState).toMatchObject({
      selected: false,
    })
    expect(byId("glossary-info-relevePlafonne")).toHaveLength(1)
    expect(byId("glossary-info-releveDeplafonne")).toHaveLength(1)
  })

  test("does not show the retired labels", () => {
    const { texts } = mount(baseProps())
    expect(texts().join(" ")).not.toMatch(/Comptage|Étude/)
  })

  test("pressing a mode reports it", () => {
    const props = baseProps()
    const { one } = mount(props)
    act(() => one("route-counting-uncapped").props.onPress())
    expect(props.onSelectCounting).toHaveBeenCalledWith("uncapped")
    act(() => one("route-counting-capped").props.onPress())
    expect(props.onSelectCounting).toHaveBeenCalledWith("capped")
  })

  test("shows neither presets nor factor chips in plafonné", () => {
    const { byId } = mount(baseProps())
    expect(byId("route-counting-factors")).toHaveLength(0)
    expect(byId("route-preset-all_factors")).toHaveLength(0)
    expect(byId("route-factor-A")).toHaveLength(0)
  })
})

describe("CountingPicker: déplafonné", () => {
  const uncapped = (extra: Partial<PickerProps> = {}) =>
    baseProps({ counting: "uncapped", factors: ["A", "C"], preset: "custom", ...extra })

  test("shows the lead, the four presets and one chip per factor, never H", () => {
    const { one, byId, texts } = mount(uncapped())
    expect(texts()).toContain(guide.counting.factorsLead)
    expect(UNCAPPED_PRESET_IDS).toHaveLength(4)
    for (const id of UNCAPPED_PRESET_IDS) {
      expect(byId(`route-preset-${id}`)).toHaveLength(1)
      expect(texts()).toContain(UNCAPPED_PRESET_TEXT[id].name)
    }
    expect(texts()).toContain("Tous les facteurs")
    expect(texts()).toContain("Choisir moi-même")
    for (const letter of UNCAPPABLE_FACTORS) {
      expect(byId(`route-factor-${letter}`)).toHaveLength(1)
    }
    expect(byId("route-factor-H")).toHaveLength(0)
    expect(texts()).toContain(`A ${fr.labels.factorTitles.A}`)
    expect(texts()).not.toContain("Le facteur H n'est jamais compté en entier")
    expect(one("route-counting-uncapped").props.accessibilityState).toMatchObject({
      selected: true,
    })
  })

  test("marks the active preset and the selected factors", () => {
    const { one } = mount(uncapped({ preset: "minimum", factors: ["C", "D", "E"] }))
    expect(one("route-preset-minimum").props.accessibilityState).toMatchObject({ selected: true })
    expect(one("route-preset-all_factors").props.accessibilityState).toMatchObject({
      selected: false,
    })
    expect(one("route-factor-C").props.accessibilityState).toMatchObject({ selected: true })
    expect(one("route-factor-A").props.accessibilityState).toMatchObject({ selected: false })
  })

  test("pressing a preset or a factor chip reports it (the active preset stays a no-op)", () => {
    const props = uncapped({ preset: "always_max" })
    const { one } = mount(props)
    act(() => one("route-preset-minimum").props.onPress())
    expect(props.onSelectPreset).toHaveBeenCalledWith("minimum")
    act(() => one("route-preset-always_max").props.onPress())
    expect(props.onSelectPreset).toHaveBeenCalledTimes(1)
    act(() => one("route-factor-G").props.onPress())
    expect(props.onToggleFactor).toHaveBeenCalledWith("G")
  })

  test("the long-count note shows under Scores toujours au maximum only", () => {
    {
      const { one } = mount(uncapped({ preset: "always_max" }))
      expect(one("route-preset-note")).toBeDefined()
    }
    for (const preset of ["all_factors", "minimum", "custom"] as const) {
      expect(mount(uncapped({ preset })).byId("route-preset-note")).toHaveLength(0)
    }
    const { texts } = mount(uncapped({ preset: "always_max" }))
    expect(texts()).toContain(guide.counting.presetNote)
    expect(texts()).toContain(guide.counting.presetCaptions.alwaysMax)
  })

  test("shows the explanation of every preset at once, not only the active one", () => {
    const { texts } = mount(uncapped({ preset: "minimum", factors: ["C", "D", "E"] }))
    expect(texts()).toEqual(
      expect.arrayContaining([
        guide.counting.presetCaptions.allFactors,
        guide.counting.presetCaptions.alwaysMax,
        guide.counting.presetCaptions.minimum,
        guide.counting.presetCaptions.custom,
      ]),
    )
  })

  test("says the déplafonné mode is for extreme situations and studies, only in that mode", () => {
    const { byId, texts } = mount(uncapped({ preset: "minimum", factors: ["C", "D", "E"] }))
    expect(byId("route-counting-rare")).toHaveLength(1)
    expect(texts()).toContain(guide.counting.rareNotice)
  })

  test("asks for at least one factor when none is left", () => {
    expect(mount(uncapped()).byId("route-factors-missing")).toHaveLength(0)
    const { one, texts } = mount(uncapped({ factors: [], factorsMissing: true }))
    expect(one("route-factors-missing").props.accessibilityLiveRegion).toBe("polite")
    expect(texts()).toContain("Choisissez au moins un facteur.")
  })
})

describe("CountingPicker: values kept", () => {
  test("shows the information line when asked, and not otherwise", () => {
    expect(mount(baseProps()).byId("route-kept-values")).toHaveLength(0)
    const { one, texts } = mount(baseProps({ keptValuesNotice: true }))
    expect(one("route-kept-values")).toBeDefined()
    expect(texts()).toContain(guide.counting.keptValues)
  })
})
