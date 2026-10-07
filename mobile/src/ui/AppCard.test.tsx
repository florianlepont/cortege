import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandRadius } from "../app/brand-tokens"
import { buildTheme, defaultTheme } from "../app/theme"
import { AppCard } from "./AppCard"

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
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

jest.mock("./GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
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

function render(props: Partial<React.ComponentProps<typeof AppCard>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppCard {...props}>{null}</AppCard>)
  })
  const root = tree!.root
  const view = root.findAll((n) => (n.type as unknown) === "View")[0]
  const surface = root.findAll((n) => (n.type as unknown) === "GlassSurface")[0]
  return { view, surface }
}

describe("AppCard", () => {
  test.each([
    ["light", defaultTheme],
    ["dark", buildTheme("dark", "dark", () => {})],
  ])("variant glass draws the translucent card of variant I (%s)", (_name, theme) => {
    mockTheme = theme
    const style = flatten(render({ variant: "glass" }).view.props.style)
    expect(style).toMatchObject({
      backgroundColor: theme.visual.glass.cardFill,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      boxShadow: theme.visual.glass.cardShadow,
      borderRadius: brandRadius.card,
      borderCurve: "continuous",
    })
    expect(brandRadius.card).toBe(22)
    expect(style).not.toHaveProperty("elevation")
    expect(style).not.toHaveProperty("shadowOpacity")
  })

  test("the boolean glass prop still renders the blurred surface", () => {
    const { view, surface } = render({ glass: true, variant: "glass" })
    expect(view).toBeUndefined()
    expect(surface).toBeDefined()
    expect(flatten(surface.props.style).borderColor).toBe(
      defaultTheme.componentColors.card.panelBorder,
    )
  })

  test("variant panel is unchanged", () => {
    const style = flatten(render({ variant: "panel" }).view.props.style)
    expect(style.backgroundColor).toBe(defaultTheme.colors.panel)
    expect(style).not.toHaveProperty("boxShadow")
    expect(style).not.toHaveProperty("borderWidth")
  })

  test("padding and style overrides apply", () => {
    const style = flatten(render({ padding: 7, style: { margin: 3 } }).view.props.style)
    expect(style).toMatchObject({ padding: 7, margin: 3 })
  })
})
