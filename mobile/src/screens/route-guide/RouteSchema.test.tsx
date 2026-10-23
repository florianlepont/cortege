import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})

let mockVisible = true
jest.mock("../../ui/useScreenVisible", () => ({ useScreenVisible: () => mockVisible }))

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { PLOT, STRIP_BAND } from "../../app/route-schema-geometry"
import { fr } from "../../i18n"
import { RouteSchema } from "./RouteSchema"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterEach(() => {
  setReducedMotion(false)
  mockVisible = true
})

afterAll(() => {
  jest.restoreAllMocks()
})

function mount(method: "full" | "partial_strip" | "partial_plot") {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<RouteSchema method={method} />)
  })
  const byType = (type: string) => tree.root.findAll((node) => (node.type as unknown) === type)
  const texts = () =>
    byType("Text").flatMap((node) => React.Children.toArray(node.props.children) as string[])
  return { tree, byType, texts }
}

describe("RouteSchema", () => {
  test("each parcours has its own drawing, named for a screen reader", () => {
    const cases = [
      ["full", fr.routeGuide.schema.a11y.full],
      ["partial_strip", fr.routeGuide.schema.a11y.partialStrip],
      ["partial_plot", fr.routeGuide.schema.a11y.partialPlot],
    ] as const
    for (const [method, label] of cases) {
      const { byType } = mount(method)
      const svg = byType("Svg")[0]
      expect(svg.props.accessibilityRole).toBe("image")
      expect(svg.props.accessibilityLabel).toBe(label)
    }
  })

  test("the full parcours draws the whole walk and a dot at its head", () => {
    const { byType, texts } = mount("full")
    const paths = byType("Path")
    expect(paths).toHaveLength(1)
    expect(String(paths[0].props.d).startsWith("M48 38")).toBe(true)
    expect(byType("Circle")).toHaveLength(1)
    expect(texts()).toEqual([])
  })

  test("the strip parcours highlights one band with its width and the glance at the rest", () => {
    const { byType, texts } = mount("partial_strip")
    const rects = byType("Rect")
    expect(rects.some((rect) => rect.props.height === STRIP_BAND.height)).toBe(true)
    expect(texts()).toEqual(
      expect.arrayContaining([fr.routeGuide.schema.stripWidth, fr.routeGuide.schema.restGlance]),
    )
  })

  test("the plot parcours draws a circle of one hectare around the centre", () => {
    const { byType, texts } = mount("partial_plot")
    const circles = byType("Circle")
    expect(
      circles.some((circle) => circle.props.cx === PLOT.cx && circle.props.cy === PLOT.cy),
    ).toBe(true)
    expect(texts()).toContain(fr.routeGuide.schema.plotArea)
  })

  test("a drawing that cannot be seen rests on its finished picture", () => {
    mockVisible = false
    const disc = mount("partial_plot")
      .byType("Circle")
      .find((circle) => circle.props.fillOpacity === 0.3)
    expect(disc?.props.animatedProps.r).toBe(PLOT.radius)
  })

  test("under Reduce Motion the drawing stays on its finished picture", () => {
    setReducedMotion(true)
    const { byType } = mount("partial_plot")
    const disc = byType("Circle").find((circle) => circle.props.fillOpacity === 0.3)
    expect(disc?.props.animatedProps.r).toBe(PLOT.radius)
  })

  test("the strip and full dots end on the last corner when the picture is finished", () => {
    setReducedMotion(true)
    const full = mount("full").byType("Circle")[0]
    expect(full.props.animatedProps).toMatchObject({ cx: 48, cy: 158 })
    const strip = mount("partial_strip").byType("Circle")[0]
    expect(strip.props.animatedProps).toMatchObject({ cx: 256, cy: 91 })
  })
})
