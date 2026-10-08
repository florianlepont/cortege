import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../test/react-native-reanimated.mock"
import {
  AURORA_DISCS,
  auroraRoam,
  resolveZone,
  TRACE_PATHS,
  TRACE_VIEWBOX,
  traceMotion,
} from "../app/forest-aurora-shape"
import {
  auroraCore,
  forestAurora,
  forestShield,
  forestShieldLayers,
} from "../app/forest-aurora-tokens"
import { discPoseAt, planAurora, traceLineOffset } from "../app/forest-motion"
import { ScreenCoverContext } from "./screen-cover-context"
import { type AuroraZone, ForestAurora } from "./ForestAurora"

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
const withRepeatSpy = jest.spyOn(reanimated, "withRepeat")
const withTimingSpy = jest.spyOn(reanimated, "withTiming")
const cancelSpy = jest.spyOn(reanimated, "cancelAnimation")
const timingConfigs = () =>
  withTimingSpy.mock.calls.map((call) => (call as unknown[])[1] as TimingConfig | undefined)

afterEach(() => {
  reanimated.setReducedMotion(false)
  for (const spy of [withRepeatSpy, withTimingSpy, cancelSpy]) spy.mockClear()
})

const SEED = 1234
const BOX = { width: 360, height: 150 }
const ZONE: AuroraZone = { left: 214, bottom: 110 }
const plan = planAurora(SEED, AURORA_DISCS)

const noopUnsubscribe = () => undefined
const fakeNavigation = (focused: boolean) =>
  ({ isFocused: () => focused, addListener: () => noopUnsubscribe }) as never

type Options = {
  focused?: boolean
  covered?: boolean
  zone?: AuroraZone | null
  shield?: "standard" | "score"
  seed?: number | null
}

function element(options: Options) {
  const { focused, covered = false, shield } = options
  const zone = "zone" in options ? options.zone : ZONE
  const seed = options.seed === null ? undefined : (options.seed ?? SEED)
  const aurora = (
    <ScreenCoverContext.Provider value={covered}>
      <ForestAurora zone={zone} shield={shield} seed={seed} testID="aurora" />
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

type Node = renderer.ReactTestInstance
const byTestID = (tree: renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll((n) => n.props.testID === testID && typeof n.type === "string")
const byType = (root: Node, type: string) => root.findAll((n) => (n.type as unknown) === type)
const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flat))
    : ((style as Record<string, unknown> | null) ?? {})

function layout(tree: renderer.ReactTestRenderer, box = BOX) {
  const [layer] = byTestID(tree, "aurora")
  act(() => layer.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, ...box } } }))
}

function render(options: Options = {}, laidOut = true) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(element(options))
  })
  if (laidOut) layout(tree!)
  return tree!
}

const paths = (tree: renderer.ReactTestRenderer) => byType(tree.root, "Path")

describe("ForestAurora (12.2-19 fifth round: every forest card, continuous, stronger)", () => {
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

  test("nothing is drawn before the card is laid out, nor while its zone is measured", () => {
    expect(byTestID(render({}, false), "forest-aurora-layers")).toHaveLength(0)
    expect(byTestID(render({ zone: null }), "forest-aurora-layers")).toHaveLength(0)
    expect(byTestID(render(), "forest-aurora-layers")).toHaveLength(1)
  })

  test("without a zone the text column is taken to reach `textReach` of the card", () => {
    expect(resolveZone(BOX, undefined)).toEqual({
      left: BOX.width * forestAurora.textReach,
      bottom: BOX.height,
      right: BOX.width,
      height: BOX.height,
    })
    // A measured zone is kept inside the card.
    expect(resolveZone(BOX, { left: -4, bottom: 400 })).toEqual({
      left: 0,
      bottom: BOX.height,
      right: BOX.width,
      height: BOX.height,
    })
    const [trace] = byTestID(render({ zone: undefined }), "forest-trace")
    expect(flat(trace.props.style).left).toBe(BOX.width * forestAurora.textReach)
  })

  test("the same size laid out again changes nothing", () => {
    const tree = render()
    const before = byTestID(tree, "forest-trace")[0].props.style
    layout(tree)
    expect(byTestID(tree, "forest-trace")[0].props.style).toEqual(before)
    layout(tree, { width: 300, height: 150 })
    expect(flat(byTestID(tree, "forest-trace")[0].props.style).width).toBe(300 - ZONE.left)
  })

  test("three soft discs, moss, teal and ochre, larger, with a lighter heart", () => {
    const discs = byTestID(render(), "forest-aurora-disc")
    expect(discs).toHaveLength(3)
    expect(AURORA_DISCS.map((disc) => disc.size)).toEqual([312, 286, 220])
    discs.forEach((disc, index) => {
      const shape = AURORA_DISCS[index]
      const tone = forestAurora[shape.key]
      expect(flat(disc.props.style)).toMatchObject({
        position: "absolute",
        left: 0,
        top: 0,
        width: shape.size,
        height: shape.size,
      })
      // Only the transforms and the opacity are animated.
      expect(Object.keys(disc.props.style[2]).sort()).toEqual(["opacity", "transform"])
      const [gradient] = byType(disc, "RadialGradient")
      const stops = byType(gradient, "Stop")
      expect(stops.map((stop) => stop.props.stopColor)).toEqual([
        auroraCore(shape.key),
        ...stops.slice(1).map(() => tone.colour),
      ])
      expect(stops[0].props.stopOpacity).toBe(tone.peak)
      expect(stops[stops.length - 1].props.stopOpacity).toBe(0)
      const [circle] = byType(disc, "Circle")
      expect(circle.props.fill).toBe(`url(#${gradient.props.id})`)
      expect(circle.props.r).toBe(shape.size / 2)
    })
  })

  test("each disc sits where its random path starts, in the clear zone", () => {
    const discs = byTestID(render(), "forest-aurora-disc")
    const clear = resolveZone(BOX, ZONE)
    discs.forEach((disc, index) => {
      const shape = AURORA_DISCS[index]
      const pose = discPoseAt(plan.discs[index].start, plan.discs[index])
      const [x, y, scale] = disc.props.style[2].transform
      expect(x.translateX + shape.size / 2).toBeCloseTo(
        clear.left + pose.across * (clear.right - clear.left),
      )
      expect(y.translateY + shape.size / 2).toBeCloseTo(pose.down * clear.bottom)
      expect(scale.scale).toBeCloseTo(pose.scale)
      expect(disc.props.style[2].opacity).toBeCloseTo(pose.alpha)
    })
  })

  test("the shield covers the text column and the bottom band, fading into the clear zone", () => {
    const tree = render({ shield: "score" })
    const layers = forestShieldLayers.score
    const [column] = byTestID(tree, "forest-shield-column")
    expect(flat(column.props.style)).toMatchObject({
      position: "absolute",
      top: 0,
      left: 0,
      width: ZONE.left,
      height: ZONE.bottom,
      backgroundColor: layers.column,
    })
    const [columnFade] = byTestID(tree, "forest-shield-column-fade")
    expect(flat(columnFade.props.style)).toMatchObject({
      left: ZONE.left,
      width: forestShield.fade.column,
      height: ZONE.bottom,
      experimental_backgroundImage: layers.columnFade,
    })
    const [band] = byTestID(tree, "forest-shield-band")
    expect(flat(band.props.style)).toMatchObject({
      left: 0,
      right: 0,
      top: ZONE.bottom,
      bottom: 0,
      backgroundColor: layers.band,
    })
    const [bandFade] = byTestID(tree, "forest-shield-band-fade")
    expect(flat(bandFade.props.style)).toMatchObject({
      top: (ZONE.bottom as number) - forestShield.fade.band,
      height: forestShield.fade.band,
      experimental_backgroundImage: layers.bandFade,
    })
  })

  test("the standard shield by default; no band without one, no column without text", () => {
    const tree = render({ zone: { left: 200 } })
    expect(flat(byTestID(tree, "forest-shield-column")[0].props.style).backgroundColor).toBe(
      forestShieldLayers.standard.column,
    )
    expect(byTestID(tree, "forest-shield-band")).toHaveLength(0)
    const bare = render({ zone: { left: 0 } })
    expect(byTestID(bare, "forest-shield-column")).toHaveLength(0)
  })

  test("layered: discs, then the shield, then the contours", () => {
    const [layers] = byTestID(render(), "forest-aurora-layers")
    const order = layers
      .findAll((n) => typeof n.type === "string" && typeof n.props.testID === "string")
      .map((n) => n.props.testID)
      .filter((testID) => testID !== "forest-aurora-layers")
    expect(order).toEqual([
      "forest-aurora-disc",
      "forest-aurora-disc",
      "forest-aurora-disc",
      "forest-shield-column",
      "forest-shield-column-fade",
      "forest-shield-band-fade",
      "forest-shield-band",
      "forest-trace",
    ])
  })

  test("the contours are drawn in the clear zone only: right of the text, above the band", () => {
    const [trace] = byTestID(render(), "forest-trace")
    expect(flat(trace.props.style)).toEqual({
      position: "absolute",
      top: 0,
      left: ZONE.left,
      width: BOX.width - ZONE.left,
      height: ZONE.bottom,
    })
    const [svg] = byType(trace, "Svg")
    expect(svg.props.viewBox).toBe(`0 0 ${TRACE_VIEWBOX.width} ${TRACE_VIEWBOX.height}`)
    expect(svg.props.preserveAspectRatio).toBe("xMinYMax slice")
  })

  test("four thin faint lines fading in from the left, where their relay starts", () => {
    const tree = render()
    const lines = paths(tree)
    expect(lines.map((line) => line.props.d)).toEqual([...TRACE_PATHS])
    lines.forEach((line, index) => {
      expect(line.props.strokeWidth).toBe(forestAurora.trace.width)
      expect(line.props.fill).toBe("none")
      expect(line.props.strokeDasharray).toEqual([traceMotion.dash, traceMotion.dash])
      expect(line.props.animatedProps.strokeDashoffset).toBeCloseTo(
        traceLineOffset(plan.trace.start * plan.trace.loopMs, plan.trace.lines[index]),
      )
    })
    const gradients = byType(tree.root, "LinearGradient")
    expect(gradients.map((g) => g.props.id)).toEqual(["forest-trace-light", "forest-trace-deep"])
    for (const gradient of gradients) {
      expect(gradient.props.x2).toBe(TRACE_VIEWBOX.width * traceMotion.fadeEnd)
      const [from, to] = byType(gradient, "Stop")
      expect(from.props.stopOpacity).toBe(0)
      expect(to.props.stopOpacity).toBe(forestAurora.trace.maxOpacity)
    }
    expect(lines.map((line) => line.props.stroke)).toEqual([
      "url(#forest-trace-light)",
      "url(#forest-trace-deep)",
      "url(#forest-trace-light)",
      "url(#forest-trace-deep)",
    ])
  })

  test("while visible: endless loops on the UI thread, never one that stops, and a fade in", () => {
    const tree = render({ focused: true })
    // Three discs and the contours' relay: endless linear phases, guarded by Reduce Motion.
    expect(withRepeatSpy).toHaveBeenCalledTimes(4)
    for (const call of withRepeatSpy.mock.calls) {
      const [, count, reverse, , reduceMotion] = call as unknown[]
      expect([count, reverse, reduceMotion]).toEqual([-1, false, reanimated.ReduceMotion.System])
    }
    expect(timingConfigs().map((config) => config?.duration)).toEqual(
      expect.arrayContaining([
        ...AURORA_DISCS.map((disc) => disc.legs * disc.legMs),
        plan.trace.loopMs,
        auroraRoam.revealMs,
      ]),
    )
    for (const config of timingConfigs()) {
      expect(config?.reduceMotion).toBe(reanimated.ReduceMotion.System)
    }
    cancelSpy.mockClear()
    act(() => tree.unmount())
    expect(cancelSpy).toHaveBeenCalled()
  })

  test("a fresh random plan per mount when no seed is given", () => {
    const random = jest.spyOn(Math, "random").mockReturnValue(0.5)
    const tree = render({ seed: null })
    expect(random).toHaveBeenCalled()
    random.mockRestore()
    const expected = planAurora(Math.floor(0.5 * 2147483647), AURORA_DISCS)
    const [first] = byTestID(tree, "forest-aurora-disc")
    expect(first.props.style[2].opacity).toBeCloseTo(
      discPoseAt(expected.discs[0].start, expected.discs[0]).alpha,
    )
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
    layout(tree!)
    expect(withRepeatSpy).not.toHaveBeenCalled()
    act(() => tree!.update(element({ covered: false })))
    expect(withRepeatSpy).toHaveBeenCalledTimes(4)
  })

  test("under Reduce Motion: the discs rest, the lines are drawn and still, no fade", () => {
    reanimated.setReducedMotion(true)
    const tree = render({ focused: true })
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(withTimingSpy).not.toHaveBeenCalled()
    for (const line of paths(tree)) expect(line.props.animatedProps.strokeDashoffset).toBe(0)
    const [layers] = byTestID(tree, "forest-aurora-layers")
    expect(layers.props.style[1]).toEqual({ opacity: 1 })
    const discs = byTestID(tree, "forest-aurora-disc")
    discs.forEach((disc, index) => {
      const rest = discPoseAt(plan.discs[index].start, plan.discs[index])
      expect(disc.props.style[2].opacity).toBeCloseTo(rest.alpha)
    })
  })
})
