import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../app/theme"
import { DEFAULT_RING_SIZE, FactorProgressRing, STROKE_WIDTH } from "./FactorProgressRing"

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
  }
})

function render(props: Partial<React.ComponentProps<typeof FactorProgressRing>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<FactorProgressRing progress={0} complete={false} {...props} />)
  })
  return tree!
}

describe("FactorProgressRing (FLOW-06: ring morphs into a check mark)", () => {
  test("renders an SVG ring, not a check mark, while incomplete", () => {
    const tree = render({ progress: 0.5, complete: false })
    const circles = tree.root.findAll((n) => (n.type as unknown) === "Circle")
    expect(circles).toHaveLength(2)
    expect(tree.root.findAll((n) => (n.type as unknown) === "Ionicons")).toHaveLength(0)
  })

  test("renders a check mark instead of a ring once complete", () => {
    const tree = render({ progress: 1, complete: true })
    expect(tree.root.findAll((n) => (n.type as unknown) === "Circle")).toHaveLength(0)
  })

  test("an error tone is distinct from the empty and complete tones", () => {
    const empty = render({ progress: 0, complete: false, hasError: false })
    const error = render({ progress: 0, complete: false, hasError: true })
    const strokeOf = (tree: renderer.ReactTestRenderer) =>
      tree.root.findAll((n) => (n.type as unknown) === "Circle")[1].props.stroke
    expect(strokeOf(empty)).not.toBe(strokeOf(error))
  })
})

describe("FactorProgressRing score tokens (12.2-15, D-16)", () => {
  const score = defaultTheme.visual.score
  const circles = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAll((n) => (n.type as unknown) === "Circle")

  test("the track is visual.score.track and the arc in progress visual.score.neutral", () => {
    const tree = render({ progress: 0.5, complete: false })
    const [track, arc] = circles(tree)
    expect(track.props.stroke).toBe(score.track)
    expect(arc.props.stroke).toBe(score.neutral)
  })

  test("the complete check is visual.score.high, the darker moss in light", () => {
    const tree = render({ progress: 1, complete: true })
    const icon = tree.root.findAll((n) => n.props.name === "checkmark-circle-outline")[0]
    expect(icon.props.color).toBe(score.high)
    expect(score.high).toBe("#728A2D")
  })

  test("an invalid factor keeps the error tone", () => {
    const tree = render({ progress: 0.3, complete: false, hasError: true })
    expect(circles(tree)[1].props.stroke).toBe(defaultTheme.fieldState.error.icon)
  })

  test("size and stroke keep their values", () => {
    expect(DEFAULT_RING_SIZE).toBe(28)
    expect(STROKE_WIDTH).toBe(3)
    const svg = render({ progress: 0.5, complete: false }).root.findAll(
      (n) => (n.type as unknown) === "Svg",
    )[0]
    expect(svg.props.width).toBe(28)
    expect(circles(render({ progress: 0.5, complete: false, size: 20 }))[0].props.strokeWidth).toBe(
      3,
    )
  })
})
