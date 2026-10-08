import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../test/react-native-reanimated.mock"
import {
  defaultBlocks,
  FLOW_LINES,
  flowMotion,
  type ForestTextBlock,
  layLine,
  MIST_DISCS,
  mistMotion,
  textEllipse,
} from "../app/forest-aurora-shape"
import { buildTextShield, forestAurora } from "../app/forest-aurora-tokens"
import { discPose, flowOffset, planMist } from "../app/forest-motion"
import { ScreenCoverContext } from "./screen-cover-context"
import { ForestAurora } from "./ForestAurora"

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
const TITLE: ForestTextBlock = { x: 16, y: 16, width: 200, height: 52 }
const SEGMENTS: ForestTextBlock = { x: 16, y: 120, width: 328, height: 6 }
const BLOCKS = [TITLE, SEGMENTS]
const plan = planMist(SEED)

const noopUnsubscribe = () => undefined
const fakeNavigation = (focused: boolean) =>
  ({ isFocused: () => focused, addListener: () => noopUnsubscribe }) as never

type Options = {
  focused?: boolean
  covered?: boolean
  blocks?: ForestTextBlock[] | null
  shield?: "standard" | "score"
  seed?: number | null
}

function element(options: Options) {
  const { focused, covered = false, shield } = options
  const blocks = "blocks" in options ? options.blocks : BLOCKS
  const seed = options.seed === null ? undefined : (options.seed ?? SEED)
  const aurora = (
    <ScreenCoverContext.Provider value={covered}>
      <ForestAurora blocks={blocks} shield={shield} seed={seed} testID="aurora" />
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

describe("ForestAurora (12.2-19: the owner's mist and flowing contours)", () => {
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

  test("nothing is drawn before the card is laid out, nor while its text is measured", () => {
    expect(byTestID(render({}, false), "forest-aurora-layers")).toHaveLength(0)
    expect(byTestID(render({ blocks: null }), "forest-aurora-layers")).toHaveLength(0)
    expect(byTestID(render(), "forest-aurora-layers")).toHaveLength(1)
  })

  test("without blocks the text is taken to fill the left `textReach` of the card", () => {
    expect(defaultBlocks(BOX)).toEqual([
      { x: 0, y: 0, width: BOX.width * forestAurora.textReach, height: BOX.height },
    ])
    const shields = byTestID(render({ blocks: undefined }), "forest-shield")
    const e = textEllipse(defaultBlocks(BOX)[0])
    expect(shields).toHaveLength(1)
    expect(flat(shields[0].props.style)).toMatchObject({ left: e.cx - e.rx, width: 2 * e.rx })
  })

  test("the same size laid out again changes nothing; a new size lays the lines anew", () => {
    const tree = render()
    const before = byTestID(tree, "forest-flow-base").map((line) => line.props.d)
    layout(tree)
    expect(byTestID(tree, "forest-flow-base").map((line) => line.props.d)).toEqual(before)
    layout(tree, { width: 300, height: 150 })
    expect(byTestID(tree, "forest-flow-base")[0].props.d).toBe(
      layLine(FLOW_LINES[0], { width: 300, height: 150 }).d,
    )
  })

  test("three soft discs crossing the card, fading to nothing at the rim", () => {
    const discs = byTestID(render(), "forest-mist-disc")
    expect(discs).toHaveLength(3)
    discs.forEach((disc, index) => {
      const shape = MIST_DISCS[index]
      const tone = forestAurora[shape.key]
      expect(flat(disc.props.style)).toMatchObject({
        position: "absolute",
        left: 0,
        top: 0,
        width: shape.size,
        height: shape.size,
      })
      // Transforms only.
      expect(Object.keys(disc.props.style[2])).toEqual(["transform"])
      const [gradient] = byType(disc, "RadialGradient")
      expect(
        byType(gradient, "Stop").map((stop) => [stop.props.stopColor, stop.props.stopOpacity]),
      ).toEqual([
        [tone.colour, tone.peak],
        [tone.colour, 0],
      ])
      const [circle] = byType(disc, "Circle")
      expect(circle.props.fill).toBe(`url(#${gradient.props.id})`)
      // Centred where its drift starts, drawn at random per mount, in the card's points.
      const pose = discPose(plan.discs[index].start, shape, BOX.width, BOX.height)
      const [x, y, scale] = disc.props.style[2].transform
      expect(x.translateX + shape.size / 2).toBeCloseTo(pose.x)
      expect(y.translateY + shape.size / 2).toBeCloseTo(pose.y)
      expect(scale.scale).toBeCloseTo(pose.scale)
    })
  })

  test("layered: the mist, the lines over the whole card, then a shield per block of text", () => {
    const [layers] = byTestID(render(), "forest-aurora-layers")
    const order = layers
      .findAll((n) => typeof n.type === "string" && typeof n.props.testID === "string")
      .map((n) => n.props.testID)
      .filter((testID) => ["forest-mist-disc", "forest-flow", "forest-shield"].includes(testID))
    expect(order).toEqual([
      "forest-mist-disc",
      "forest-mist-disc",
      "forest-mist-disc",
      "forest-flow",
      "forest-shield",
      "forest-shield",
    ])
    const [flow] = byTestID(render(), "forest-flow")
    expect(flow.props).toMatchObject({
      width: BOX.width,
      height: BOX.height,
      viewBox: `0 0 ${BOX.width} ${BOX.height}`,
    })
    expect(flat(flow.props.style)).toMatchObject({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  test("each block gets a soft ellipse of shield, gradients only, no flat fill anywhere", () => {
    const tree = render({ shield: "score" })
    const shields = byTestID(tree, "forest-shield")
    BLOCKS.forEach((block, index) => {
      const e = textEllipse(block)
      expect(flat(shields[index].props.style)).toEqual({
        position: "absolute",
        left: e.cx - e.rx,
        top: e.cy - e.ry,
        width: 2 * e.rx,
        height: 2 * e.ry,
        experimental_backgroundImage: buildTextShield("score", e.inner),
      })
    })
    for (const node of tree.root.findAll((n) => typeof n.type === "string")) {
      expect(flat(node.props.style).backgroundColor).toBeUndefined()
    }
    const standard = byTestID(render(), "forest-shield")[0]
    expect(flat(standard.props.style).experimental_backgroundImage).toBe(
      buildTextShield("standard", textEllipse(TITLE).inner),
    )
  })

  test("the lines fade behind each block of text through a soft mask, down to its floor", () => {
    const tree = render()
    const [mask] = byType(tree.root, "Mask")
    const [shown] = byType(mask, "Rect")
    expect(shown.props).toMatchObject({
      x: 0,
      y: 0,
      width: BOX.width,
      height: BOX.height,
      fill: forestAurora.lines.shown,
    })
    const holes = byTestID(tree, "forest-flow-hole")
    expect(holes).toHaveLength(BLOCKS.length)
    BLOCKS.forEach((block, index) => {
      const e = textEllipse(block)
      expect(holes[index].props).toMatchObject({ cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry })
      const gradientId = /url\(#(.*)\)/.exec(holes[index].props.fill)![1]
      const gradient = tree.root.find(
        (n) => n.props.id === gradientId && (n.type as unknown) === "RadialGradient",
      )
      expect(
        byType(gradient, "Stop").map((stop) => [stop.props.offset, stop.props.stopOpacity]),
      ).toEqual([
        [0, 1 - forestAurora.lines.floor],
        [e.inner, 1 - forestAurora.lines.floor],
        [1, 0],
      ])
    })
    const [group] = byType(tree.root, "G")
    expect(group.props.mask).toBe(`url(#${mask.props.id})`)
    expect(
      group.findAll((n) => n.props.testID === "forest-flow-light" && typeof n.type === "string"),
    ).toHaveLength(3)
  })

  test("three faint lines across the card, each with a bright dash and its glow flowing", () => {
    const tree = render()
    const lines = forestAurora.lines
    const laid = FLOW_LINES.map((points) => layLine(points, BOX))
    const bases = byTestID(tree, "forest-flow-base")
    expect(bases.map((base) => base.props.d)).toEqual(laid.map(({ d }) => d))
    for (const base of bases) {
      expect(base.props).toMatchObject({
        stroke: lines.base,
        strokeOpacity: lines.baseOpacity,
        strokeWidth: lines.width,
        fill: "none",
      })
    }
    const glows = byTestID(tree, "forest-flow-glow")
    const lights = byTestID(tree, "forest-flow-light")
    lights.forEach((light, index) => {
      const { pattern } = laid[index]
      expect(light.props).toMatchObject({ stroke: lines.light, strokeOpacity: lines.lightOpacity })
      expect(glows[index].props).toMatchObject({ stroke: lines.glow, strokeWidth: lines.glowWidth })
      for (const path of [light, glows[index]]) {
        expect(path.props.strokeDasharray).toEqual([flowMotion.dash, pattern - flowMotion.dash])
        expect(path.props.animatedProps.strokeDashoffset).toBeCloseTo(
          flowOffset(plan.flows[index].start, pattern),
        )
      }
    })
  })

  test("while visible: endless linear loops on the UI thread, and a fade in", () => {
    const tree = render({ focused: true })
    // Three discs and six flowing paths' three phases.
    expect(withRepeatSpy).toHaveBeenCalledTimes(6)
    for (const call of withRepeatSpy.mock.calls) {
      const [, count, reverse, , reduceMotion] = call as unknown[]
      expect([count, reverse, reduceMotion]).toEqual([-1, false, reanimated.ReduceMotion.System])
    }
    expect(timingConfigs().map((config) => config?.duration)).toEqual(
      expect.arrayContaining([
        ...plan.discs.map((disc) => 2 * disc.legMs),
        ...plan.flows.map((flow) => flow.periodMs),
        mistMotion.revealMs,
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
    const expected = planMist(Math.floor(0.5 * 2147483647))
    const [first] = byTestID(tree, "forest-mist-disc")
    expect(first.props.style[2].transform[0].translateX + MIST_DISCS[0].size / 2).toBeCloseTo(
      discPose(expected.discs[0].start, MIST_DISCS[0], BOX.width, BOX.height).x,
    )
  })

  test("not while the screen is hidden or covered: everything stops where it is", () => {
    for (const options of [{ focused: false }, { covered: true }]) {
      const tree = render(options)
      expect(byTestID(tree, "forest-mist-disc")).toHaveLength(3)
      expect(byTestID(tree, "forest-flow-light")).toHaveLength(3)
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
    expect(withRepeatSpy).toHaveBeenCalledTimes(6)
  })

  test("under Reduce Motion: discs at rest, the lines drawn without their flowing light", () => {
    reanimated.setReducedMotion(true)
    const tree = render({ focused: true })
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(withTimingSpy).not.toHaveBeenCalled()
    expect(byTestID(tree, "forest-flow-base")).toHaveLength(3)
    expect(byTestID(tree, "forest-flow-light")).toHaveLength(0)
    expect(byTestID(tree, "forest-flow-glow")).toHaveLength(0)
    const [layers] = byTestID(tree, "forest-aurora-layers")
    expect(layers.props.style[1]).toEqual({ opacity: 1 })
    byTestID(tree, "forest-mist-disc").forEach((disc, index) => {
      const shape = MIST_DISCS[index]
      const [x, y, scale] = disc.props.style[2].transform
      expect(x.translateX + shape.size / 2).toBeCloseTo(BOX.width * shape.from[0])
      expect(y.translateY + shape.size / 2).toBeCloseTo(BOX.height * shape.from[1])
      expect(scale.scale).toBe(1)
    })
  })
})
