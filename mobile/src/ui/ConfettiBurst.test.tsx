jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  const value = () => ({ interpolate: jest.fn((config: unknown) => config) })
  const running = { start: jest.fn(), stop: jest.fn() }
  return {
    Animated: {
      Value: jest.fn(value),
      View: mockComponent("Animated.View"),
      timing: jest.fn(() => ({})),
      parallel: jest.fn(() => running),
      __running: running,
    },
    Easing: { in: (easing: unknown) => easing, quad: "quad" },
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 390, height: 800 }),
    View: mockComponent("View"),
  }
})

import renderer, { act } from "react-test-renderer"
import { Animated } from "react-native"
import { ConfettiBurst, buildConfettiPieces } from "./ConfettiBurst"

const running = (Animated as unknown as { __running: { start: jest.Mock; stop: jest.Mock } })
  .__running

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

afterAll(() => jest.restoreAllMocks())

beforeEach(() => {
  running.start.mockClear()
  running.stop.mockClear()
})

describe("buildConfettiPieces", () => {
  test("lays out the requested number of pieces, the same way every time", () => {
    const first = buildConfettiPieces(12)
    expect(first).toHaveLength(12)
    expect(buildConfettiPieces(12)).toEqual(first)
  })

  test("cycles the brand colours and alternates the spin", () => {
    const pieces = buildConfettiPieces(8)
    expect(pieces[0].color).toBe(pieces[6].color)
    expect(pieces[0].color).not.toBe(pieces[1].color)
    expect(pieces[0].spin).toBe(540)
    expect(pieces[1].spin).toBe(-540)
    for (const piece of pieces) {
      expect(piece.delayMs).toBeGreaterThanOrEqual(0)
      expect(piece.durationMs).toBeGreaterThanOrEqual(2600)
    }
  })
})

describe("ConfettiBurst", () => {
  test("draws one falling piece per confetti and starts them together", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<ConfettiBurst pieceCount={5} />)
    })
    expect(tree.root.findAllByType("Animated.View" as never)).toHaveLength(5)
    expect(running.start).toHaveBeenCalledTimes(1)
    act(() => tree.unmount())
    expect(running.stop).toHaveBeenCalledTimes(1)
  })

  test("takes no touch and is hidden from a screen reader", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<ConfettiBurst />)
    })
    const layer = tree.root.findByType("View" as never)
    expect(layer.props.pointerEvents).toBe("none")
    expect(layer.props.accessible).toBe(false)
    expect(tree.root.findAllByType("Animated.View" as never)).toHaveLength(30)
  })
})
