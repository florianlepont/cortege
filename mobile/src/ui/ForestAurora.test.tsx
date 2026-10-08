import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../test/react-native-reanimated.mock"
import {
  AURORA_DISCS,
  TRACE_PATHS,
  TRACE_TOTAL_MS,
  TRACE_VIEWBOX,
  traceMotion,
} from "../app/forest-aurora-shape"
import { forestAurora, forestShieldImage } from "../app/visual-tokens"
import { ScreenCoverContext } from "./screen-cover-context"
import { breathOpacity, discPose, ForestAurora, pingPong, traceOffset } from "./ForestAurora"

// The real package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
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

type TimingConfig = { duration?: number; reduceMotion?: string }
const timingConfigs = () =>
  withTimingSpy.mock.calls.map((call) => (call as unknown[])[1] as TimingConfig | undefined)

const withRepeatSpy = jest.spyOn(reanimated, "withRepeat")
const withTimingSpy = jest.spyOn(reanimated, "withTiming")
const withDelaySpy = jest.spyOn(reanimated, "withDelay")
const cancelSpy = jest.spyOn(reanimated, "cancelAnimation")

afterEach(() => {
  reanimated.setReducedMotion(false)
  for (const spy of [withRepeatSpy, withTimingSpy, withDelaySpy, cancelSpy]) spy.mockClear()
})

const noopUnsubscribe = () => undefined
const fakeNavigation = (focused: boolean) =>
  ({ isFocused: () => focused, addListener: () => noopUnsubscribe }) as never

type Options = { focused?: boolean; covered?: boolean; traceStart?: number | null }

function element(options: Options) {
  const { focused, covered = false } = options
  const traceStart = "traceStart" in options ? options.traceStart : 214
  const aurora = (
    <ScreenCoverContext.Provider value={covered}>
      <ForestAurora traceStart={traceStart} testID="aurora" />
    </ScreenCoverContext.Provider>
  )
  return focused === undefined ? (
    aurora
  ) : (
    <NavigationContext.Provider value={fakeNavigation(focused)}>
      {aurora}
    </NavigationContext.Provider>
  )
}

function render(options: Options = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(element(options))
  })
  return tree!
}

type Node = renderer.ReactTestInstance
const byTestID = (tree: renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll((n) => n.props.testID === testID && typeof n.type === "string")
const byType = (root: Node, type: string) => root.findAll((n) => (n.type as unknown) === type)
const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flat))
    : ((style as Record<string, unknown> | null) ?? {})
const paths = (tree: renderer.ReactTestRenderer) => byType(tree.root, "Path")

describe("ForestAurora (12.2-19 fourth round: sketch 010, A + F)", () => {
  test("decoration only: never touched, hidden from screen readers, over the whole card", () => {
    const [layer] = byTestID(render(), "aurora")
    expect(layer.props.pointerEvents).toBe("none")
    expect(layer.props.accessibilityElementsHidden).toBe(true)
    expect(layer.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(flat(layer.props.style)).toEqual({
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
  })

  test("three soft discs, moss, teal and ochre, drawn once as radial gradients", () => {
    const tree = render()
    const discs = byTestID(tree, "forest-aurora-disc")
    expect(discs.map((disc) => disc.props.style[1].width)).toEqual(AURORA_DISCS.map((d) => d.size))
    discs.forEach((disc, index) => {
      const shape = AURORA_DISCS[index]
      const tone = forestAurora[shape.key]
      expect(flat(disc.props.style)).toMatchObject({ position: "absolute", ...shape.anchor })
      // Transforms only: no size or colour is animated.
      expect(Object.keys(disc.props.style[2])).toEqual(["transform"])
      const [gradient] = byType(disc, "RadialGradient")
      const stops = byType(gradient, "Stop")
      expect(stops.map((stop) => stop.props.stopColor)).toEqual(stops.map(() => tone.colour))
      expect(stops[0].props.stopOpacity).toBe(tone.peak)
      // Soft to nothing at the rim: no hard edge, no runtime blur.
      expect(stops[stops.length - 1].props.stopOpacity).toBe(0)
      const [circle] = byType(disc, "Circle")
      expect(circle.props.fill).toBe(`url(#${gradient.props.id})`)
      expect(circle.props.r).toBe(shape.size / 2)
    })
    // The discs rest where they were drawn.
    expect(discs[0].props.style[2].transform).toEqual([
      { translateX: 0 },
      { translateY: 0 },
      { scale: 1 },
    ])
  })

  test("a shield over the discs and under the text, then the contours", () => {
    const [layer] = byTestID(render(), "aurora")
    const order = layer
      .findAll((n) => typeof n.type === "string" && typeof n.props.testID === "string")
      .map((n) => n.props.testID)
      .filter((testID) => testID !== "aurora")
    expect(order).toEqual([
      "forest-aurora-disc",
      "forest-aurora-disc",
      "forest-aurora-disc",
      "forest-aurora-shield",
      "forest-trace",
    ])
    const [shield] = byTestID(render(), "forest-aurora-shield")
    expect(flat(shield.props.style).experimental_backgroundImage).toBe(forestShieldImage)
  })

  test("the contours are drawn right of the text column only, and not before it is known", () => {
    expect(byTestID(render({ traceStart: null }), "forest-trace").length).toBe(0)
    expect(byTestID(render({ traceStart: undefined }), "forest-trace").length).toBe(0)
    const tree = render({ traceStart: 214 })
    const [trace] = byTestID(tree, "forest-trace")
    expect(flat(trace.props.style)).toMatchObject({ position: "absolute", left: 214, right: 0 })
    const [svg] = byType(trace, "Svg")
    expect(svg.props.viewBox).toBe(`0 0 ${TRACE_VIEWBOX.width} ${TRACE_VIEWBOX.height}`)
    // The fade starts at the column's end, whatever the area's shape.
    expect(svg.props.preserveAspectRatio).toBe("xMinYMax slice")
  })

  test("four thin lines, faint, fading in from the left", () => {
    const tree = render()
    const lines = paths(tree)
    expect(lines.map((line) => line.props.d)).toEqual([...TRACE_PATHS])
    for (const line of lines) {
      expect(line.props.strokeWidth).toBe(1)
      expect(line.props.fill).toBe("none")
      expect(line.props.strokeDasharray).toEqual([traceMotion.dash, traceMotion.dash])
    }
    const gradients = byType(tree.root, "LinearGradient")
    expect(gradients.map((g) => g.props.id)).toEqual(["forest-trace-light", "forest-trace-deep"])
    for (const gradient of gradients) {
      expect(gradient.props.x1).toBe(0)
      expect(gradient.props.x2).toBe(TRACE_VIEWBOX.width * traceMotion.fadeEnd)
      const [from, to] = byType(gradient, "Stop")
      expect(from.props.stopOpacity).toBe(0)
      expect(to.props.stopOpacity).toBe(forestAurora.trace.maxOpacity)
    }
    expect(forestAurora.trace.maxOpacity).toBeLessThanOrEqual(0.35)
    expect(lines.map((line) => line.props.stroke)).toEqual([
      "url(#forest-trace-light)",
      "url(#forest-trace-deep)",
      "url(#forest-trace-light)",
      "url(#forest-trace-deep)",
    ])
  })

  test("while visible: three drifts and a breathing on the UI thread, the lines traced once", () => {
    const tree = render({ focused: true })
    // Three discs and the breathing: endless linear phases, guarded by Reduce Motion.
    expect(withRepeatSpy).toHaveBeenCalledTimes(4)
    for (const call of withRepeatSpy.mock.calls) {
      const [, count, reverse, , reduceMotion] = call as unknown[]
      expect([count, reverse, reduceMotion]).toEqual([-1, false, reanimated.ReduceMotion.System])
    }
    const durations = timingConfigs().map((config) => config?.duration)
    expect(durations).toEqual(
      expect.arrayContaining([
        ...AURORA_DISCS.map((disc) => 2 * disc.halfCycleMs),
        2 * traceMotion.breatheHalfMs,
        TRACE_TOTAL_MS,
      ]),
    )
    for (const config of timingConfigs()) {
      expect(config?.reduceMotion).toBe(reanimated.ReduceMotion.System)
    }
    // The breathing waits for the tracing to end.
    expect(withDelaySpy).toHaveBeenCalledWith(TRACE_TOTAL_MS, expect.anything())
    // Before the tracing runs the lines are hidden.
    for (const line of paths(tree)) {
      expect(line.props.animatedProps.strokeDashoffset).toBe(traceMotion.dash)
    }
    cancelSpy.mockClear()
    act(() => tree.unmount())
    expect(cancelSpy).toHaveBeenCalled()
  })

  test("not while the screen is hidden or covered: everything stops where it is", () => {
    for (const options of [{ focused: false }, { covered: true }]) {
      const tree = render(options)
      expect(byTestID(tree, "forest-aurora-disc")).toHaveLength(3)
      expect(paths(tree)).toHaveLength(4)
    }
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(withTimingSpy).not.toHaveBeenCalled()
  })

  test("when the screen comes back the motion goes on", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(element({ covered: true }))
    })
    expect(withRepeatSpy).not.toHaveBeenCalled()
    act(() => tree!.update(element({ covered: false })))
    expect(withRepeatSpy).toHaveBeenCalledTimes(4)
  })

  test("under Reduce Motion: the discs rest, the lines are drawn and still", () => {
    reanimated.setReducedMotion(true)
    const tree = render({ focused: true })
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(withTimingSpy).not.toHaveBeenCalled()
    for (const line of paths(tree)) expect(line.props.animatedProps.strokeDashoffset).toBe(0)
    const [trace] = byTestID(tree, "forest-trace")
    expect(trace.props.style[2]).toEqual({ opacity: 1 })
    for (const disc of byTestID(tree, "forest-aurora-disc")) {
      expect(disc.props.style[2].transform[0].translateX).toBeCloseTo(0)
    }
  })
})

describe("aurora and tracing motion", () => {
  test("a disc drifts there and back, eased, seamless over each period of 2", () => {
    expect(pingPong(0)).toBe(0)
    expect(pingPong(0.5)).toBeCloseTo(0.5)
    expect(pingPong(1)).toBe(1)
    expect(pingPong(1.5)).toBeCloseTo(0.5)
    expect(pingPong(2)).toBe(0)
    expect(pingPong(3.25)).toBeCloseTo(pingPong(1.25))
    // Eased: slow at both ends.
    expect(pingPong(0.1)).toBeLessThan(0.1)
    expect(pingPong(0.9)).toBeGreaterThan(0.9)
  })

  test("its pose runs from its rest to the far end of its drift", () => {
    const [moss] = AURORA_DISCS
    expect(discPose(0, moss)).toEqual({ translateX: 0, translateY: 0, scale: 1 })
    expect(discPose(1, moss)).toEqual({
      translateX: moss.travel.x,
      translateY: moss.travel.y,
      scale: moss.travel.scale[1],
    })
  })

  test("the slow aurora of the sketch: 14 to 20 s one way, transforms only", () => {
    for (const disc of AURORA_DISCS) {
      expect(disc.halfCycleMs).toBeGreaterThanOrEqual(14000)
      expect(disc.halfCycleMs).toBeLessThanOrEqual(20000)
    }
    expect(new Set(AURORA_DISCS.map((disc) => disc.halfCycleMs)).size).toBe(3)
  })

  test("the lines are traced one after the other, each fully hidden then fully drawn", () => {
    expect(traceOffset(0, 0)).toBe(traceMotion.dash)
    expect(traceOffset(1, 3)).toBe(0)
    // When the first line is done the last one has only started.
    const firstDone = traceMotion.drawMs / TRACE_TOTAL_MS
    expect(traceOffset(firstDone, 0)).toBeCloseTo(0)
    expect(traceOffset(firstDone, 3)).toBeGreaterThan(traceMotion.dash / 2)
    expect(traceOffset(0.5, 1)).toBeLessThan(traceOffset(0.5, 2))
  })

  test("the breathing stays faint: from full strength down to a little over half", () => {
    expect(breathOpacity(0)).toBe(1)
    expect(breathOpacity(1)).toBeCloseTo(traceMotion.breatheLow)
    expect(traceMotion.breatheHalfMs).toBeGreaterThanOrEqual(6000)
  })

  test("the dash is longer than every line: a line is hidden whole before it is traced", () => {
    // Cubic segments only, so the control polygon bounds each line's length.
    for (const d of TRACE_PATHS) {
      const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
      expect(d).toMatch(/^M[\d\s.]+(C[\d\s.]+)+$/)
      let polygon = 0
      for (let i = 2; i < numbers.length; i += 2) {
        polygon += Math.hypot(numbers[i] - numbers[i - 2], numbers[i + 1] - numbers[i - 1])
      }
      expect(polygon).toBeLessThan(traceMotion.dash)
      // Inside the viewBox.
      for (let i = 0; i < numbers.length; i += 2) {
        expect(numbers[i]).toBeGreaterThanOrEqual(0)
        expect(numbers[i]).toBeLessThanOrEqual(TRACE_VIEWBOX.width)
        expect(numbers[i + 1]).toBeGreaterThanOrEqual(0)
        expect(numbers[i + 1]).toBeLessThanOrEqual(TRACE_VIEWBOX.height)
      }
    }
  })
})
