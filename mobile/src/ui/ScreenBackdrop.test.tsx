import React from "react"
import renderer, { act } from "react-test-renderer"
import { buildTheme, defaultTheme } from "../app/theme"
import { ScreenBackdrop } from "./ScreenBackdrop"

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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    },
  }
})

let mockTheme = defaultTheme
jest.mock("../app/theme", () => ({
  ...jest.requireActual("../app/theme"),
  useBrandTheme: () => mockTheme,
}))

afterEach(() => {
  mockTheme = defaultTheme
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render() {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<ScreenBackdrop testID="backdrop" />)
  })
  return tree!.root.findAll((n) => (n.type as unknown) === "View")[0]
}

describe("ScreenBackdrop", () => {
  test("draws the two-halo backdrop of the scheme across the screen", () => {
    const view = render()
    expect(flatten(view.props.style)).toMatchObject({
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      experimental_backgroundImage: defaultTheme.visual.backdrop,
    })
    expect(view.props.testID).toBe("backdrop")
  })

  test("follows the dark scheme", () => {
    mockTheme = buildTheme("dark")
    expect(flatten(render().props.style).experimental_backgroundImage).toBe(
      mockTheme.visual.backdrop,
    )
    expect(mockTheme.visual.backdrop).not.toBe(defaultTheme.visual.backdrop)
  })

  test("is hidden from touch and from accessibility", () => {
    const view = render()
    expect(view.props.pointerEvents).toBe("none")
    expect(view.props.accessibilityElementsHidden).toBe(true)
    expect(view.props.importantForAccessibility).toBe("no-hide-descendants")
  })
})
