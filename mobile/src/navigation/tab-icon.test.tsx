/**
 * The JS tab bar icon (D-08): the decorative moss dot under the active glyph is hidden from
 * accessibility (T-12.2-13), the tab label carries the selected state.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  StyleSheet: { create: <T,>(value: T): T => value },
  View: "View",
}))

import { buildTheme, defaultTheme } from "../app/theme"
import { jsTabScreenOptions } from "./tab-config"

type StyleObject = Record<string, unknown>

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

function renderIcon(theme: typeof defaultTheme, focused: boolean) {
  const { tabBarIcon } = jsTabScreenOptions(theme, { route: { name: "surveys" } })
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<>{tabBarIcon({ color: "#123456", size: 24, focused })}</>)
  })
  const views = tree!.root.findAllByType("View" as unknown as React.ComponentType)
  const dot = views.find((view) => view.props.importantForAccessibility === "no")
  if (!dot) throw new Error("dot view not found")
  const style = ([] as StyleObject[])
    .concat(dot.props.style)
    .reduce((merged, next) => ({ ...merged, ...next }), {})
  return { dot, style }
}

describe("JsTabIcon", () => {
  test.each(["light", "dark"] as const)(
    "%s: the focused icon shows the moss dot with its glow",
    (scheme) => {
      const theme = buildTheme(scheme)
      const { style } = renderIcon(theme, true)
      expect(style.backgroundColor).toBe(theme.visual.tab.dot)
      expect(style.boxShadow).toBe(theme.visual.tab.dotShadow)
      expect(style).toMatchObject({ width: 4, height: 4 })
    },
  )

  test("an unfocused icon keeps the space with a transparent dot and no glow", () => {
    const { style } = renderIcon(defaultTheme, false)
    expect(style.backgroundColor).toBe("transparent")
    expect(style).not.toHaveProperty("boxShadow")
  })

  test("the dot is hidden from accessibility in both states", () => {
    for (const focused of [true, false]) {
      const { dot } = renderIcon(defaultTheme, focused)
      expect(dot.props.importantForAccessibility).toBe("no")
      expect(dot.props.accessibilityElementsHidden).toBe(true)
    }
  })
})
