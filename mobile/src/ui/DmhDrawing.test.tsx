import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandRadius } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"
import { drawingFor, type DmhDrawingData } from "../app/dmh-guide/drawings"
import { DMH_DRAWING_RENDER_SCALE, DmhDrawing } from "./DmhDrawing"

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
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
    useColorScheme: () => "light",
  }
})

const FIXTURE: DmhDrawingData = {
  elements: [
    { kind: "path", d: "M10 10 L50 50 M60 60 h0.1", width: 6 },
    { kind: "ellipse", cx: 338, cy: 208, rx: 11, ry: 6, width: 4, rotate: [-40, 338, 208] },
    { kind: "ellipse", cx: 100, cy: 120, rx: 30, ry: 20, width: 5 },
    { kind: "circle", cx: 400, cy: 300, r: 9, width: 12 },
  ],
}

function render(drawing: DmhDrawingData | null, label = "Un dessin") {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<DmhDrawing drawing={drawing} accessibilityLabel={label} />)
  })
  return tree!
}

const byType = (tree: renderer.ReactTestRenderer, type: string) =>
  tree.root.findAll((n) => (n.type as unknown) === type)

describe("DmhDrawing", () => {
  test("renders nothing without data", () => {
    expect(render(null).toJSON()).toBeNull()
  })

  test("is one accessible image labelled by the caller, on a moss plate", () => {
    const tree = render(FIXTURE, "Une loge de pic dans un tronc")
    const [wrapper] = byType(tree, "View")
    expect(wrapper.props).toMatchObject({
      accessible: true,
      accessibilityRole: "image",
      accessibilityLabel: "Une loge de pic dans un tronc",
      testID: "dmh-drawing",
    })
    // The plate (B-C3): card radius, the icon tile moss, 16 pt around the drawing.
    expect(Object.assign({}, ...[wrapper.props.style].flat())).toMatchObject({
      width: "100%",
      borderRadius: brandRadius.card,
      padding: 16,
      backgroundColor: defaultTheme.visual.glass.iconTile,
    })
    expect(brandRadius.card).toBe(22)
  })

  test("the drawing inside the plate is 4:3 and at most 200 pt tall", () => {
    const [, frame] = byType(render(FIXTURE), "View")
    expect(frame.props.style).toMatchObject({
      width: "100%",
      aspectRatio: 800 / 600,
      maxHeight: 200,
    })
  })

  test("the Svg keeps the frame and hides its strokes from assistive tech", () => {
    const [svg] = byType(render(FIXTURE), "Svg")
    expect(svg.props).toMatchObject({
      viewBox: "0 0 800 600",
      preserveAspectRatio: "xMidYMid meet",
      importantForAccessibility: "no-hide-descendants",
      accessibilityElementsHidden: true,
    })
  })

  test("draws one shape per element in data order, from the delivered attributes", () => {
    const [svg] = byType(render(FIXTURE), "Svg")
    const shapes = svg.children.map((child) => (child as renderer.ReactTestInstance).props)
    const types = svg.children.map(
      (child) =>
        ((child as renderer.ReactTestInstance).type as { displayName?: string }).displayName,
    )
    expect(types).toEqual(["Path", "Ellipse", "Ellipse", "Circle"])
    expect(shapes[0].d).toBe("M10 10 L50 50 M60 60 h0.1")
    expect(shapes[1]).toMatchObject({
      cx: 338,
      cy: 208,
      rx: 11,
      ry: 6,
      transform: "rotate(-40 338 208)",
    })
    expect(shapes[2].transform).toBeUndefined()
    expect(shapes[3]).toMatchObject({ cx: 400, cy: 300, r: 9 })
  })

  test("every shape takes its own width times the render scale and the brand ink, round ends", () => {
    expect(DMH_DRAWING_RENDER_SCALE).toBe(1.5)
    const [svg] = byType(render(FIXTURE), "Svg")
    const widths = [6, 4, 5, 12]
    svg.children.forEach((child, index) => {
      expect((child as renderer.ReactTestInstance).props).toMatchObject({
        stroke: defaultTheme.semanticColors.ctaPrimary,
        fill: "none",
        strokeWidth: widths[index] * DMH_DRAWING_RENDER_SCALE,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      })
    })
  })

  test("the real drawing of group 8 renders every element, rotated ellipses with their transform", () => {
    const drawing = drawingFor("dmh_08")!
    const tree = render(drawing)
    const shapes = [...byType(tree, "Path"), ...byType(tree, "Ellipse"), ...byType(tree, "Circle")]
    expect(shapes).toHaveLength(drawing.elements.length)
    const rotated = drawing.elements.filter((e) => e.kind === "ellipse" && e.rotate)
    expect(rotated.length).toBeGreaterThan(0)
    const withTransform = byType(tree, "Ellipse").filter(
      (n) => typeof n.props.transform === "string",
    )
    expect(withTransform).toHaveLength(rotated.length)
  })

  test("is the same at every render", () => {
    expect(JSON.stringify(render(FIXTURE).toJSON())).toBe(JSON.stringify(render(FIXTURE).toJSON()))
  })
})
