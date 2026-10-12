import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: mockComponent("Pressable"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(value: T): T => value, hairlineWidth: 0.5, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
const mockScheme: { current: "light" | "dark" } = { current: "dark" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("dark"),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandInteraction } from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { mapControlIconSize } from "../../app/visual-tokens"
import { MapBottomDock, MapTopControls } from "./MapControls"

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

afterEach(() => {
  mockScheme.current = "dark"
})

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function renderSwipeControls(
  options: {
    swipeModeOn?: boolean
    basemapDot?: boolean
    basemapDisabled?: boolean
    basemap?: "map" | "satellite"
  } = {},
  onToggleBasemap = jest.fn(),
): renderer.ReactTestRenderer {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <MapTopControls
        top={60}
        basemap={options.basemap ?? "map"}
        basemapMode="swipe"
        swipeModeOn={options.swipeModeOn}
        basemapDot={options.basemapDot}
        basemapDisabled={options.basemapDisabled}
        onToggleBasemap={onToggleBasemap}
        onOpenOfflineAreas={jest.fn()}
      />,
    )
  })
  return tree
}

function renderControls(locating = false): renderer.ReactTestRenderer {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <>
        <MapTopControls
          top={60}
          basemap="map"
          onToggleBasemap={jest.fn()}
          onOpenOfflineAreas={jest.fn()}
        />
        <MapBottomDock bottom={40} locating={locating} onLocate={jest.fn()} />
      </>,
    )
  })
  return tree
}

describe("Explorer map controls over the basemap (12.2-19 fix round)", () => {
  test.each(["light", "dark"] as const)(
    "%s: every control is on the map control glass, its glyphs 24 pt in the control colour",
    (scheme) => {
      mockScheme.current = scheme
      const theme = scheme === "dark" ? buildTheme("dark") : defaultTheme
      const tree = renderControls()
      const surfaces = tree.root.findAllByType("GlassSurface" as never)
      expect(surfaces).toHaveLength(2)
      for (const surface of surfaces) {
        expect(surface.props.surface).toEqual(theme.visual.mapControl.glass)
        expect(flat(surface.props.style).borderColor).toBe(theme.visual.mapControl.hairline)
      }
      const icons = tree.root.findAllByType("Ionicons" as never)
      expect(icons).toHaveLength(3)
      for (const icon of icons) {
        expect(icon.props.size).toBe(mapControlIconSize)
        expect(icon.props.color).toBe(theme.visual.mapControl.icon)
      }
    },
  )

  test("the glyphs are 24 pt and every button keeps a 44 pt target", () => {
    expect(mapControlIconSize).toBe(24)
    const buttons = renderControls().root.findAllByType("Pressable" as never)
    expect(buttons).toHaveLength(3)
    for (const button of buttons) {
      const style = flat(button.props.style)
      expect(style.width).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
      expect(style.height).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    }
  })

  test("the locate spinner takes the control colour", () => {
    const dark = buildTheme("dark")
    const spinner = renderControls(true).root.findByType("ActivityIndicator" as never)
    expect(spinner.props.color).toBe(dark.visual.mapControl.icon)
  })
})

describe("the globe of the Explorer: the basemap swipe mode (Phase 28, UI-SPEC section 1)", () => {
  const globe = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAllByType("Pressable" as never)[0]
  const dots = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAll(
      (node) => typeof node.type === "string" && node.props.testID === "map-basemap-dot",
    )

  test("without basemapMode (the parcel picker) the globe is today's toggle, with no dot", () => {
    const tree = renderControls()
    const button = globe(tree)
    expect(button.props.accessibilityLabel).toBe(
      fr.offlineMap.basemap.a11y.switchTo(fr.offlineMap.basemap.satellite),
    )
    expect(button.props.accessibilityHint).toBeUndefined()
    expect(button.props.accessibilityState).toBeUndefined()
    expect(button.props.accessibilityValue).toBeUndefined()
    expect(dots(tree)).toHaveLength(0)
  })

  test("an explicit toggle mode ignores the swipe props", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <MapTopControls
          top={60}
          basemap="map"
          basemapMode="toggle"
          swipeModeOn
          basemapDot
          onToggleBasemap={jest.fn()}
        />,
      )
    })
    expect(globe(tree).props.accessibilityLabel).toBe(
      fr.offlineMap.basemap.a11y.switchTo(fr.offlineMap.basemap.satellite),
    )
    expect(dots(tree)).toHaveLength(0)
  })

  test("swipe mode: the label, hint and expanded state name the mode, not a basemap", () => {
    const off = globe(renderSwipeControls())
    expect(off.props.accessibilityLabel).toBe(fr.mapLayers.basemap.buttonA11y)
    expect(off.props.accessibilityLabel).toBe("Changer de fond de carte")
    expect(off.props.accessibilityHint).toBe(fr.mapLayers.basemap.buttonHint)
    expect(off.props.accessibilityState).toEqual({ expanded: false, disabled: false })
    expect(off.props.accessibilityValue).toBeUndefined()
    const on = globe(renderSwipeControls({ swipeModeOn: true }))
    expect(on.props.accessibilityState).toEqual({ expanded: true, disabled: false })
  })

  test("swipe mode: earth-outline while Plan is displayed, map-outline for every other base", () => {
    const glyph = (basemap: "map" | "satellite") =>
      renderSwipeControls({ basemap }).root.findAllByType("Ionicons" as never)[0].props.name
    expect(glyph("map")).toBe("earth-outline")
    expect(glyph("satellite")).toBe("map-outline")
  })

  test("the dot: 8 pt, 11 pt from the top-right corner, with the value 'fond modifié'", () => {
    const tree = renderSwipeControls({ basemapDot: true })
    const dot = tree.root.find((node) => node.props.testID === "map-basemap-dot")
    const style = flat(dot.props.style)
    expect(style).toMatchObject({ width: 8, height: 8, top: 11, right: 11, position: "absolute" })
    expect(style.backgroundColor).toBe(buildTheme("dark").visual.tab.dot)
    expect(dot.props.accessibilityElementsHidden).toBe(true)
    expect(globe(tree).props.accessibilityValue).toEqual({
      text: fr.mapLayers.basemap.buttonActiveValue,
    })
    expect(fr.mapLayers.basemap.buttonActiveValue).toBe("fond modifié")
  })

  test("no dot while the base is the saved one", () => {
    const tree = renderSwipeControls({ basemapDot: false })
    expect(dots(tree)).toHaveLength(0)
  })

  test("pressing the globe calls the handler, also while the swipe mode is on", () => {
    const onToggle = jest.fn()
    const tree = renderSwipeControls({ swipeModeOn: true, basemapDot: true }, onToggle)
    act(() => globe(tree).props.onPress())
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(globe(tree).props.disabled).toBeFalsy()
  })

  test("disabled while comparing: ignores presses, says disabled, glyph at 40 %, dot kept", () => {
    const tree = renderSwipeControls({ basemapDisabled: true, basemapDot: true })
    const button = globe(tree)
    expect(button.props.testID).toBe("map-globe-button")
    expect(button.props.disabled).toBe(true)
    expect(button.props.accessibilityState).toEqual({ expanded: false, disabled: true })
    const glyph = tree.root.findAllByType("Ionicons" as never)[0]
    expect(flat(glyph.props.style).opacity).toBe(brandInteraction.disabledOpacity)
    expect(brandInteraction.disabledOpacity).toBe(0.4)
    expect(dots(tree)).toHaveLength(1)
  })

  test("enabled, the globe has its test id, is not disabled and its glyph is not dimmed", () => {
    const tree = renderSwipeControls({ swipeModeOn: true })
    expect(globe(tree).props.testID).toBe("map-globe-button")
    expect(globe(tree).props.disabled).toBe(false)
    expect(tree.root.findAllByType("Ionicons" as never)[0].props.style).toBeUndefined()
  })

  test("the picker's globe ignores basemapDisabled", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <MapTopControls top={60} basemap="map" basemapDisabled onToggleBasemap={jest.fn()} />,
      )
    })
    expect(globe(tree).props.disabled).toBe(false)
    expect(globe(tree).props.accessibilityState).toBeUndefined()
    expect(tree.root.findAllByType("Ionicons" as never)[0].props.style).toBeUndefined()
  })

  test("the capsule keeps the map control glass in both schemes, whatever the mode", () => {
    for (const scheme of ["light", "dark"] as const) {
      mockScheme.current = scheme
      const theme = scheme === "dark" ? buildTheme("dark") : defaultTheme
      const surface = renderSwipeControls({ swipeModeOn: true }).root.findByType(
        "GlassSurface" as never,
      )
      expect(surface.props.surface).toEqual(theme.visual.mapControl.glass)
    }
  })
})
