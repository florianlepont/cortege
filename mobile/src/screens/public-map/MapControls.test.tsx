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
    dark: actual.buildTheme("automatic", "dark", () => {}),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandInteraction } from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
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
      const theme = scheme === "dark" ? buildTheme("automatic", "dark", () => {}) : defaultTheme
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
    const dark = buildTheme("automatic", "dark", () => {})
    const spinner = renderControls(true).root.findByType("ActivityIndicator" as never)
    expect(spinner.props.color).toBe(dark.visual.mapControl.icon)
  })
})
