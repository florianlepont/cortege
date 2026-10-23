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
import {
  NEIGHBOURS,
  PLOT,
  fullWalkPoints,
  pointsAttribute,
  stripBand,
  stripWalkPoints,
} from "../../app/route-schema-geometry"
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
    // The trail and the halo under it, the same walk.
    expect(paths).toHaveLength(2)
    const [first] = fullWalkPoints()
    expect(String(paths[0].props.d).startsWith(`M${first[0]} ${first[1]}`)).toBe(true)
    expect(paths[1].props.d).toBe(paths[0].props.d)
    expect(byType("Circle").some((circle) => circle.props.animatedProps !== undefined)).toBe(true)
    expect(texts()).toEqual([])
  })

  test("the strip parcours highlights one band of the parcel with its width and the glance at the rest", () => {
    const { byType, texts } = mount("partial_strip")
    const band = pointsAttribute(stripBand())
    expect(byType("Polygon").filter((polygon) => polygon.props.points === band)).toHaveLength(2)
    expect(texts()).toEqual(
      expect.arrayContaining([fr.routeGuide.schema.stripWidth, fr.routeGuide.schema.restGlance]),
    )
  })

  test("every schema sits on the same map: the neighbouring parcels, the road and the parcel", () => {
    for (const method of ["full", "partial_strip", "partial_plot"] as const) {
      const { byType } = mount(method)
      const polygons = byType("Polygon")
      // The neighbours, the road, the parcel and its strong outline (the strip adds its band).
      expect(polygons.length).toBeGreaterThanOrEqual(NEIGHBOURS.length + 3)
      expect(byType("Line")).toHaveLength(1)
    }
  })

  test("the stand is drawn as a forest: many tree crowns, in the theme accent", () => {
    const crowns = mount("full")
      .byType("Circle")
      .filter((circle) => circle.props.animatedProps === undefined)
    expect(crowns.length).toBeGreaterThan(60)
    expect(new Set(crowns.map((crown) => crown.props.fillOpacity)).size).toBeGreaterThan(10)
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
    const dot = (method: "full" | "partial_strip") =>
      mount(method)
        .byType("Circle")
        .find((circle) => circle.props.r === 7)
    const fullEnd = fullWalkPoints().slice(-1)[0]
    const stripEnd = stripWalkPoints().slice(-1)[0]
    expect(dot("full")?.props.animatedProps).toMatchObject({ cx: fullEnd[0], cy: fullEnd[1] })
    expect(dot("partial_strip")?.props.animatedProps).toMatchObject({
      cx: stripEnd[0],
      cy: stripEnd[1],
    })
  })
})
