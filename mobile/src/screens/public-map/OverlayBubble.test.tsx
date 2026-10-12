import React from "react"
import renderer, { act } from "react-test-renderer"
import { selectionAsync } from "expo-haptics"

const mockWindow = { width: 390 }
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Switch: mockComponent("Switch"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    useWindowDimensions: () => mockWindow,
    StyleSheet: { create: <T,>(value: T): T => value, hairlineWidth: 0.5, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
// The shared Reanimated mock, with a recording entering builder and a host view for the bubble.
jest.mock("react-native-reanimated", () => {
  const ReactRef = require("react") as typeof import("react")
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as {
    default: Record<string, unknown>
  }
  const builder = (calls: Record<string, unknown>) => ({
    duration: (ms: number) => builder({ ...calls, durationMs: ms }),
    reduceMotion: (mode: string) => builder({ ...calls, reduceMotion: mode }),
    calls,
  })
  return {
    ...shared,
    __esModule: true,
    default: {
      ...shared.default,
      View: ({ children, ...props }: { children?: React.ReactNode }) =>
        ReactRef.createElement("AnimatedView", props, children),
    },
    FadeIn: builder({}),
    ReduceMotion: { System: "system" },
  }
})
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = { light: actual.defaultTheme, dark: actual.buildTheme("dark") }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandMotion } from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
import { forestTypesLegend } from "../../app/visual-tokens"
import { OverlayBubble } from "./OverlayBubble"

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

beforeEach(() => {
  ;(selectionAsync as jest.Mock).mockClear()
  mockWindow.width = 390
})

afterEach(() => {
  mockScheme.current = "light"
})

// The host pressable of a chip (the composite chip carries the same testID).
const chip = (tree: renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll(
    (node) => (node.type as unknown) === "Pressable" && node.props.testID === testID,
  )[0]

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function render(props: Partial<React.ComponentProps<typeof OverlayBubble>> = {}) {
  const onToggleForest = jest.fn()
  const onChangeParcels = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <OverlayBubble
        top={120}
        forest={false}
        forestAvailable
        parcels="all"
        comparing={false}
        onToggleForest={onToggleForest}
        onChangeParcels={onChangeParcels}
        {...props}
      />,
    )
  })
  const texts = () =>
    tree.root.findAllByType("Text" as never).map((node) => [node.props.children].flat().join(""))
  const bubble = tree.root.findByProps({ testID: "map-overlay-bubble" })
  const forestSwitch = tree.root.findByProps({ testID: "overlay-forest-switch" })
  return { tree, texts, bubble, forestSwitch, onToggleForest, onChangeParcels }
}

describe("OverlayBubble content", () => {
  test("shows the headers, the forest row, the Parcelles control and the helper of the state", () => {
    const { texts, forestSwitch, tree } = render()
    expect(texts()).toEqual(
      expect.arrayContaining([
        "Superpositions",
        "Types de forêt",
        "Feuillus, conifères, mélangées",
        "Parcelles",
        "Toutes",
        "Avec IBP",
        "Aucune",
        "Lignes du cadastre et toutes les parcelles.",
      ]),
    )
    expect(forestSwitch.props.accessibilityLabel).toBe("Afficher les types de forêt")
    expect(forestSwitch.props.value).toBe(false)
    expect(tree.root.findAllByProps({ testID: "overlay-parcels-all" }).length).toBeGreaterThan(0)
    expect(tree.root.findByProps({ accessibilityRole: "radiogroup" })).toBeTruthy()
  })

  test.each([
    ["withIbp", "Seulement les parcelles qui ont un relevé IBP. Pas de lignes du cadastre."],
    [
      "none",
      "Ni lignes du cadastre, ni parcelles, ni pastilles de relevés. Les parcelles ne sont plus touchables.",
    ],
  ] as const)("the helper line follows Parcelles %s", (parcels, help) => {
    expect(render({ parcels }).texts()).toContain(help)
  })

  test("the forest row uses the leaf glyph on the icon tile of the theme", () => {
    const { tree } = render()
    const icon = tree.root.findByType("Ionicons" as never)
    expect(icon.props.name).toBe("leaf-outline")
    expect(icon.props.color).toBe(defaultTheme.visual.glass.iconTint)
  })
})

describe("the forest switch and its legend", () => {
  test("turning the switch ticks and calls onToggleForest", () => {
    const { forestSwitch, onToggleForest } = render()
    act(() => {
      forestSwitch.props.onValueChange(true)
    })
    expect(selectionAsync).toHaveBeenCalledTimes(1)
    expect(onToggleForest).toHaveBeenCalledTimes(1)
  })

  test("no legend while the overlay is off", () => {
    expect(
      render({ forest: false }).tree.root.findAllByProps({ testID: "overlay-forest-legend" }),
    ).toHaveLength(0)
  })

  test("with the overlay on the legend shows the five groups drawn from the tokens", () => {
    const { tree, texts, forestSwitch } = render({ forest: true })
    expect(forestSwitch.props.value).toBe(true)
    const legend = tree.root.findByProps({ testID: "overlay-forest-legend" })
    expect(legend.props.accessibilityLabel).toBe(
      "Légende des types de forêt : forêts fermées de feuillus, de conifères ou mélangées, forêts ouvertes, peupleraies, landes et formations herbacées",
    )
    expect(texts()).toEqual(
      expect.arrayContaining([
        "Feuillus",
        "Conifères",
        "Forêts mélangées",
        "Peupleraies",
        "Landes et forêts ouvertes",
      ]),
    )
    const swatches = legend
      .findAllByType("View" as never)
      .map((node) => flat(node.props.style).backgroundColor)
      .filter((color) => forestTypesLegend.some((item) => item.color === color))
    expect(swatches).toEqual(forestTypesLegend.map((item) => item.color))
    expect(flat(legend.props.style).backgroundColor).toBe(defaultTheme.colors.panel)
  })

  test("the legend is five distinct colours, one per group", () => {
    expect(forestTypesLegend.map((item) => item.key)).toEqual([
      "broadleaf",
      "conifer",
      "mixed",
      "poplar",
      "open",
    ])
    expect(new Set(forestTypesLegend.map((item) => item.color)).size).toBe(5)
  })
})

describe("comparing", () => {
  test("says the overlays apply to both sides, only while comparing", () => {
    const sentence = "S'applique aux deux côtés de la comparaison."
    expect(render({ comparing: true }).texts()).toContain(sentence)
    expect(render({ comparing: false }).texts()).not.toContain(sentence)
  })
})

describe("forest layer not available offline", () => {
  test("the meta explains, the switch is off and disabled, the tile is dimmed", () => {
    const { texts, forestSwitch, tree } = render({ forestAvailable: false, forest: true })
    expect(texts()).toContain("Indisponible hors connexion")
    expect(texts()).not.toContain("Feuillus, conifères, mélangées")
    expect(forestSwitch.props.value).toBe(false)
    expect(forestSwitch.props.disabled).toBe(true)
    const tile = tree.root
      .findAllByType("View" as never)
      .find((node) => flat(node.props.style).opacity === 0.55)
    expect(tile).toBeDefined()
    expect(tree.root.findAllByProps({ testID: "overlay-forest-legend" })).toHaveLength(0)
  })

  test("an available layer keeps the tile at full opacity", () => {
    const { tree } = render()
    expect(
      tree.root
        .findAllByType("View" as never)
        .some((node) => flat(node.props.style).opacity === 0.55),
    ).toBe(false)
  })
})

describe("Parcelles", () => {
  test("changing the mode calls onChangeParcels with it", () => {
    const { tree, onChangeParcels } = render({ parcels: "all" })
    act(() => {
      chip(tree, "overlay-parcels-ibp").props.onPress()
    })
    expect(onChangeParcels).toHaveBeenCalledWith("withIbp")
    act(() => {
      chip(tree, "overlay-parcels-none").props.onPress()
    })
    expect(onChangeParcels).toHaveBeenLastCalledWith("none")
  })

  test("pressing the active mode does nothing", () => {
    const { tree, onChangeParcels } = render({ parcels: "all" })
    act(() => {
      chip(tree, "overlay-parcels-all").props.onPress()
    })
    expect(onChangeParcels).not.toHaveBeenCalled()
  })

  test("radios are announced with their selected state and the long labels", () => {
    const { tree } = render({ parcels: "withIbp" })
    const radios = ["all", "ibp", "none"].map((id) => chip(tree, `overlay-parcels-${id}`))
    expect(radios.map((radio) => radio.props.accessibilityRole)).toEqual([
      "radio",
      "radio",
      "radio",
    ])
    expect(radios.map((radio) => radio.props.accessibilityState.selected)).toEqual([
      false,
      true,
      false,
    ])
    expect(radios.map((radio) => radio.props.accessibilityLabel)).toEqual([
      "Toutes les parcelles et le cadastre",
      "Seulement les parcelles avec un relevé IBP, sans le cadastre",
      "Aucune parcelle et pas de cadastre",
    ])
    const group = tree.root.findByProps({ accessibilityRole: "radiogroup" })
    expect(group.props.accessibilityLabel).toBe("Parcelles affichées sur la carte")
  })
})

describe("placement and entrance", () => {
  test.each(["light", "dark"] as const)("%s: the glass is the dense map panel", (scheme) => {
    mockScheme.current = scheme
    const theme = scheme === "dark" ? buildTheme("dark") : defaultTheme
    const { tree } = render()
    expect(tree.root.findByType("GlassSurface" as never).props.surface).toEqual(
      theme.visual.mapPanel,
    )
  })

  test("right edge 72 pt from the screen, 248 wide, top as given, radius and padding", () => {
    const { bubble, tree } = render({ top: 140 })
    expect(flat(bubble.props.style)).toMatchObject({
      position: "absolute",
      right: 72,
      top: 140,
      width: 248,
    })
    expect(flat(tree.root.findByType("GlassSurface" as never).props.style)).toMatchObject({
      borderRadius: 22,
      padding: 12,
      gap: 12,
    })
  })

  test("takes the room left on a narrow screen", () => {
    mockWindow.width = 300
    expect(flat(render().bubble.props.style).width).toBe(300 - 72 - 14)
  })

  test("enters with a 160 ms fade that follows Reduce Motion", () => {
    const entering = render().bubble.props.entering as {
      calls: { durationMs: number; reduceMotion: string }
    }
    expect(brandMotion.durations.fast).toBe(160)
    expect(entering.calls).toEqual({ durationMs: 160, reduceMotion: "system" })
  })
})
