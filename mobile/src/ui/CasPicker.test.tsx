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
    Switch: mockComponent("Switch"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppText", () => ({ AppText: "Text" }))
// The theme the picker reads, switchable per test (light by default).
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../app/theme", () => {
  const actual = jest.requireActual("../app/theme") as typeof import("../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("automatic", "dark", () => {}),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandColors } from "../app/brand-tokens"
import { contrastRatio } from "../app/contrast"
import { buildTheme, defaultTheme } from "../app/theme"
import { CasPicker } from "./CasPicker"

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

describe("CasPicker, dark pass (12.2-21)", () => {
  test.each([
    ["light", defaultTheme],
    ["dark", buildTheme("automatic", "dark", () => {})],
  ] as const)("the selected radio's check reads on its %s fill", (scheme, theme) => {
    mockScheme.current = scheme
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <CasPicker
          value={2}
          onChange={jest.fn()}
          cas3Scale={false}
          onCas3ScaleChange={jest.fn()}
        />,
      )
    })
    const checks = tree.root.findAllByType("Ionicons" as never)
    expect(checks).toHaveLength(1)
    expect(checks[0].props.color).toBe(theme.semanticColors.onCtaPrimary)
    // The filled radio is the primary action colour; its check is a 3:1 graphic at least.
    expect(
      contrastRatio(theme.semanticColors.onCtaPrimary, theme.semanticColors.ctaPrimary),
    ).toBeGreaterThanOrEqual(3)
    if (scheme === "dark") {
      // The white check it replaces was 2:1 on the dark scheme's light green.
      expect(contrastRatio(brandColors.white, theme.semanticColors.ctaPrimary)).toBeLessThan(3)
    } else {
      expect(theme.semanticColors.onCtaPrimary).toBe(brandColors.white)
    }
  })
})
