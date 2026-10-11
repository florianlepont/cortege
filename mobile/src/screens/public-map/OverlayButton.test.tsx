import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
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
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = { light: actual.defaultTheme, dark: actual.buildTheme("dark") }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { buildTheme, defaultTheme } from "../../app/theme"
import { mapControlIconSize } from "../../app/visual-tokens"
import { OverlayButton } from "./OverlayButton"

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
  mockScheme.current = "light"
})

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function render(props: Partial<React.ComponentProps<typeof OverlayButton>> = {}) {
  const onPress = props.onPress ?? jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <OverlayButton top={120} active={false} expanded={false} {...props} onPress={onPress} />,
    )
  })
  const button = tree.root.findByProps({ testID: "map-overlay-button" })
  return { tree, button, onPress }
}

describe("OverlayButton", () => {
  test.each(["light", "dark"] as const)(
    "%s: a 50 pt round glass button under the capsule with the layers glyph",
    (scheme) => {
      mockScheme.current = scheme
      const theme = scheme === "dark" ? buildTheme("dark") : defaultTheme
      const { tree, button } = render()
      expect(flat(button.props.style)).toMatchObject({
        position: "absolute",
        right: 14,
        top: 120,
        width: 50,
        height: 50,
      })
      const surface = tree.root.findByType("GlassSurface" as never)
      expect(surface.props.surface).toEqual(theme.visual.mapControl.glass)
      expect(flat(surface.props.style)).toMatchObject({
        width: 50,
        height: 50,
        borderRadius: 25,
        borderColor: theme.visual.mapControl.hairline,
      })
      const icon = tree.root.findByType("Ionicons" as never)
      expect(icon.props).toMatchObject({
        name: "layers-outline",
        size: mapControlIconSize,
        color: theme.visual.mapControl.icon,
      })
    },
  )

  test("names itself for a screen reader and reports the bubble state", () => {
    const closed = render().button
    expect(closed.props.accessibilityRole).toBe("button")
    expect(closed.props.accessibilityLabel).toBe("Superpositions : types de forêt et parcelles")
    expect(closed.props.accessibilityHint).toBe("Ouvre les réglages des superpositions")
    expect(closed.props.accessibilityState).toEqual({ expanded: false })
    expect(render({ expanded: true }).button.props.accessibilityState).toEqual({ expanded: true })
  })

  test("pressing calls onPress", () => {
    const { button, onPress } = render()
    act(() => {
      button.props.onPress()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("without the active flag: no dot and no accessibility value", () => {
    const { tree, button } = render({ active: false })
    expect(tree.root.findAllByProps({ testID: "map-overlay-dot" })).toHaveLength(0)
    expect(button.props.accessibilityValue).toBeUndefined()
  })

  test("with the active flag: an 8 pt dot 11 pt from the top-right, hidden from accessibility", () => {
    const { tree, button } = render({ active: true })
    const dot = tree.root.findByProps({ testID: "map-overlay-dot" })
    expect(flat(dot.props.style)).toMatchObject({
      top: 11,
      right: 11,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: defaultTheme.visual.tab.dot,
    })
    expect(dot.props.accessibilityElementsHidden).toBe(true)
    expect(dot.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(button.props.accessibilityValue).toEqual({ text: "réglages modifiés" })
  })
})
