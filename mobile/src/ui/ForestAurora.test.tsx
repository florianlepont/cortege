import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../test/react-native-reanimated.mock"
import {
  FLOW_PATHS,
  FLOW_VIEWBOX,
  flowMotion,
  MIST_DISCS,
  mistMotion,
  resolveZone,
} from "../app/forest-aurora-shape"
import {
  buildBandShield,
  buildColumnShield,
  forestAurora,
  forestShield,
  forestVeilImage,
} from "../app/forest-aurora-tokens"
import { discPose, flowOffset, planMist } from "../app/forest-motion"
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
const plan = planMist(SEED)

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
    expect(resolveZone(BOX, { left: -4, bottom: 400 })).toEqual({
      left: 0,
      bottom: BOX.height,
      right: BOX.width,
      height: BOX.height,
    })
    const [flow] = byTestID(render({ zone: undefined }), "forest-flow")
    expect(flat(flow.props.style).left).toBe(BOX.width * forestAurora.textReach)
  })

  test("the same size laid out again changes nothing; a new size moves the lines' area", () => {
    const tree = render()
    const before = byTestID(tree, "forest-flow")[0].props.style
    layout(tree)
    expect(byTestID(tree, "forest-flow")[0].props.style).toEqual(before)
    layout(tree, { width: 300, height: 150 })
    expect(flat(byTestID(tree, "forest-flow")[0].props.style).width).toBe(
      300 - (ZONE.left as number),
    )
  })

  test("three soft discs at the sketch's places, fading to nothing at the rim", () => {
    const discs = byTestID(render(), "forest-mist-disc")
    expect(discs).toHaveLength(3)
    discs.forEach((disc, index) => {
      const shape = MIST_DISCS[index]
      const tone = forestAurora[shape.key]
      expect(flat(disc.props.style)).toMatchObject({
        position: "absolute",
        width: shape.size,
        height: shape.size,
        ...shape.anchor,
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
      // Where its drift starts, drawn at random per mount.
      const pose = discPose(plan.discs[index].start, shape)
      const [x, y, scale] = disc.props.style[2].transform
      expect(x.translateX).toBeCloseTo(pose.translateX)
      expect(y.translateY).toBeCloseTo(pose.translateY)
      expect(scale.scale).toBeCloseTo(pose.scale)
    })
  })

  test("layered as the sketch: mist, lines, veil, then the shield", () => {
    const [layers] = byTestID(render(), "forest-aurora-layers")
    const order = layers
      .findAll((n) => typeof n.type === "string" && typeof n.props.testID === "string")
      .map((n) => n.props.testID)
      .filter(
        (testID) =>
          ![
            "forest-aurora-layers",
            "forest-flow-base",
            "forest-flow-glow",
            "forest-flow-light",
          ].includes(testID),
      )
    expect(order).toEqual([
      "forest-mist-disc",
      "forest-mist-disc",
      "forest-mist-disc",
      "forest-flow",
      "forest-veil",
      "forest-shield-column",
      "forest-shield-band",
    ])
    const [veil] = byTestID(render(), "forest-veil")
    expect(flat(veil.props.style)).toMatchObject({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      experimental_backgroundImage: forestVeilImage,
    })
  })

  test("the shield is gradients over the whole width and from above the band, no solid layer", () => {
    const tree = render({ shield: "score" })
    const [column] = byTestID(tree, "forest-shield-column")
    expect(flat(column.props.style)).toEqual({
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      experimental_backgroundImage: buildColumnShield("score", BOX.width, ZONE.left),
    })
    const [band] = byTestID(tree, "forest-shield-band")
    const top = (ZONE.bottom as number) - forestShield.feather
    expect(flat(band.props.style)).toEqual({
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      top,
      experimental_backgroundImage: buildBandShield("score", BOX.height - top),
    })
    // No layer anywhere carries a flat fill.
    for (const node of tree.root.findAll((n) => typeof n.type === "string")) {
      expect(flat(node.props.style).backgroundColor).toBeUndefined()
    }
  })

  test("the standard shield by default; no band for a card without text at its bottom", () => {
    const tree = render({ zone: { left: 200 } })
    expect(
      flat(byTestID(tree, "forest-shield-column")[0].props.style).experimental_backgroundImage,
    ).toBe(buildColumnShield("standard", BOX.width, 200))
    expect(byTestID(tree, "forest-shield-band")).toHaveLength(0)
    // A band right at the top starts its feather at the card's edge.
    const high = render({ zone: { left: 200, bottom: 20 } })
    expect(flat(byTestID(high, "forest-shield-band")[0].props.style).top).toBe(0)
  })

  test("the lines are in the clear zone only: right of the text, above the band", () => {
    const tree = render()
    const [flow] = byTestID(tree, "forest-flow")
    expect(flat(flow.props.style)).toEqual({
      position: "absolute",
      top: 0,
      left: ZONE.left,
      width: BOX.width - (ZONE.left as number),
      height: ZONE.bottom,
    })
    const [svg] = byType(flow, "Svg")
    expect(svg.props.viewBox).toBe(`0 0 ${FLOW_VIEWBOX.width} ${FLOW_VIEWBOX.height}`)
    expect(svg.props.preserveAspectRatio).toBe("xMinYMax slice")
  })

  test("three faint lines, each with a bright dash and its glow flowing along it", () => {
    const tree = render()
    const lines = forestAurora.lines
    const bases = byTestID(tree, "forest-flow-base")
    expect(bases.map((base) => base.props.d)).toEqual([...FLOW_PATHS])
    for (const base of bases) {
      expect(base.props).toMatchObject({
        stroke: lines.base,
        strokeOpacity: lines.baseOpacity,
        strokeWidth: lines.width,
        fill: "none",
      })
      expect(base.props.strokeDasharray).toBeUndefined()
    }
    const glows = byTestID(tree, "forest-flow-glow")
    const lights = byTestID(tree, "forest-flow-light")
    expect(lights.map((light) => light.props.d)).toEqual([...FLOW_PATHS])
    lights.forEach((light, index) => {
      expect(light.props).toMatchObject({
        stroke: lines.light,
        strokeOpacity: lines.lightOpacity,
        strokeWidth: lines.width,
      })
      expect(glows[index].props).toMatchObject({
        stroke: lines.glow,
        strokeOpacity: lines.glowOpacity,
        strokeWidth: lines.glowWidth,
      })
      for (const path of [light, glows[index]]) {
        expect(path.props.strokeDasharray).toEqual([flowMotion.dash, flowMotion.gap])
        expect(path.props.animatedProps.strokeDashoffset).toBeCloseTo(
          flowOffset(plan.flows[index].start),
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
    expect(first.props.style[2].transform[0].translateX).toBeCloseTo(
      discPose(expected.discs[0].start, MIST_DISCS[0]).translateX,
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
    for (const disc of byTestID(tree, "forest-mist-disc")) {
      const [x, y, scale] = disc.props.style[2].transform
      expect([x.translateX + 0, y.translateY + 0, scale.scale]).toEqual([0, 0, 1])
    }
  })
})
