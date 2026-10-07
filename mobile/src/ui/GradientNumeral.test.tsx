import React from "react"
import renderer, { act } from "react-test-renderer"

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
    FlatList: mockComponent("FlatList"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

import { brandTypography } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"
import { numeralGeometry } from "../app/visual-tokens"
import { GradientNumeral, NUMERAL_RENDER_MODE } from "./GradientNumeral"

function render(props: Partial<React.ComponentProps<typeof GradientNumeral>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<GradientNumeral value={42} unit="/50" {...props} />)
  })
  return tree!
}

const byType = (tree: renderer.ReactTestRenderer, type: string) =>
  tree.root.findAll((n) => (n.type as unknown) === type)

describe("GradientNumeral", () => {
  test("the default mode is the exported constant, gradient today", () => {
    expect(NUMERAL_RENDER_MODE).toBe("gradient")
    expect(byType(render(), "Svg")).toHaveLength(1)
  })

  test("the text fill points at a gradient defined in the same Svg", () => {
    const tree = render()
    const gradient = byType(tree, "LinearGradient")[0]
    const text = byType(tree, "Text")[0]
    expect(gradient.props.id).toMatch(/^numeral-[A-Za-z0-9_-]+$/)
    expect(text.props.fill).toBe(`url(#${gradient.props.id})`)
    expect(gradient.props).toMatchObject({ x1: "0", y1: "0", x2: "0", y2: "1" })
    const stops = byType(tree, "Stop")
    expect(stops.map((s) => s.props.stopColor)).toEqual([
      defaultTheme.visual.forest.numeralTop,
      defaultTheme.visual.forest.numeralBottom,
    ])
  })

  test("two numerals get distinct gradient ids", () => {
    const ids = [render(), render()].map((tree) => byType(tree, "LinearGradient")[0].props.id)
    expect(new Set(ids).size).toBe(2)
  })

  test("the numeral is Sora Light 68 and the unit a sage TSpan", () => {
    const tree = render()
    const text = byType(tree, "Text")[0]
    expect(text.props.fontFamily).toBe(brandTypography.numeral.fontFamily)
    expect(text.props.fontFamily).toBe("Sora-Light")
    expect(text.props.fontSize).toBe(68)
    expect(text.props.y).toBe(numeralGeometry.baseline)
    const unit = byType(tree, "TSpan")[0]
    expect(unit.props.fontFamily).toBe(brandTypography.numeralUnit.fontFamily)
    expect(unit.props.fill).toBe(defaultTheme.visual.forest.sage)
    expect(unit.props.children).toBe("/50")
  })

  test("the Svg is sized from the digit count and hidden from assistive tech", () => {
    const svg = byType(render({ value: 7 }), "Svg")[0]
    expect(svg.props.width).toBe(numeralGeometry.digitWidth + numeralGeometry.unitWidth)
    expect(svg.props.height).toBe(numeralGeometry.height)
    expect(svg.props.accessibilityElementsHidden).toBe(true)
    expect(svg.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(byType(render({ value: 100 }), "Svg")[0].props.width).toBe(
      3 * numeralGeometry.digitWidth + numeralGeometry.unitWidth,
    )
  })

  test("solid mode renders text nodes in the fallback colour and no Svg", () => {
    const tree = render({ mode: "solid" })
    expect(byType(tree, "Svg")).toHaveLength(0)
    const [numeral, unit] = byType(tree, "Text")
    expect(flatten(numeral.props.style)).toMatchObject({
      color: defaultTheme.visual.forest.numeralFallback,
      fontFamily: "Sora-Light",
      fontSize: 68,
    })
    expect(flatten(unit.props.style).color).toBe(defaultTheme.visual.forest.sage)
    expect(numeral.props.accessible).toBe(false)
    expect(unit.props.accessible).toBe(false)
  })

  test("a null value renders nothing", () => {
    expect(render({ value: null }).toJSON()).toBeNull()
    expect(render({ value: null, mode: "solid" }).toJSON()).toBeNull()
  })
})
