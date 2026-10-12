import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: { position: "absolute" } },
  }
})

// A recorder for `Gesture.Pan()`: the chain returns itself and keeps the three handlers.
jest.mock("react-native-gesture-handler", () => {
  const ReactRef = require("react") as typeof import("react")
  function pan() {
    const gesture: Record<string, unknown> & {
      handlers: Record<string, (event: unknown) => void>
    } = { handlers: {} }
    for (const name of ["onBegin", "onUpdate", "onEnd"]) {
      gesture[name] = (handler: (event: unknown) => void) => {
        gesture.handlers[name] = handler
        return gesture
      }
    }
    return gesture
  }
  return {
    Gesture: { Pan: pan },
    GestureDetector: ({ gesture, children }: { gesture: unknown; children?: React.ReactNode }) =>
      ReactRef.createElement("GestureDetector", { gesture }, children),
  }
})

// The shared Reanimated mock, with a recording `withTiming` that keeps its completion callback and
// a recording `cancelAnimation`.
const mockTimings: { to: number; config: Record<string, unknown>; done?: (f?: boolean) => void }[] =
  []
const mockCancel = jest.fn()
jest.mock("react-native-reanimated", () => {
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as Record<
    string,
    unknown
  >
  return {
    ...shared,
    __esModule: true,
    withTiming: (
      to: number,
      config: Record<string, unknown>,
      done?: (finished?: boolean) => void,
    ) => {
      mockTimings.push({ to, config, done })
      return to
    },
    cancelAnimation: (value: unknown) => mockCancel(value),
  }
})

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
const mockFeedback = { selection: jest.fn(), light: jest.fn(), medium: jest.fn() }
jest.mock("../../ui/feedback", () => ({
  feedback: {
    selection: () => mockFeedback.selection(),
    impact: { light: () => mockFeedback.light(), medium: () => mockFeedback.medium() },
  },
}))

import type { SharedValue } from "react-native-reanimated"
import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { CurtainHandle, knobCenterY, type CurtainHandleProps } from "./CurtainHandle"
import { CurtainSideTags } from "./CurtainSideTags"
import { useCurtainClip, type CurtainClip, type UseCurtainClipOptions } from "./useCurtainClip"

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

beforeEach(() => {
  mockTimings.length = 0
  mockCancel.mockClear()
  for (const fn of Object.values(mockFeedback)) fn.mockClear()
  setReducedMotion(false)
})

afterEach(() => {
  setReducedMotion(false)
})

const shared = (value: number) => ({ value }) as unknown as SharedValue<number> & { value: number }
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

const WIDTH = 400

describe("useCurtainClip", () => {
  let latest!: CurtainClip

  function Probe(props: UseCurtainClipOptions) {
    latest = useCurtainClip(props)
    return null
  }

  function mount(props: UseCurtainClipOptions) {
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<Probe {...props} />)
    })
    return tree
  }

  const strip = () => [latest.clipLeft.value, latest.clipRight.value]

  test("a second map on the right is clipped from the line to the right edge", () => {
    mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH })
    expect(latest.lineX.value).toBe(200)
    expect(strip()).toEqual([200, 400])
  })

  test("a second map on the left is clipped from the left edge to the line", () => {
    mount({ compare: { secondSide: "left", x: 200 }, width: WIDTH })
    expect(strip()).toEqual([0, 200])
  })

  test("the line is kept 22 pt from each edge", () => {
    mount({ compare: { secondSide: "right", x: 5 }, width: WIDTH })
    expect(latest.lineX.value).toBe(22)
    mount({ compare: { secondSide: "right", x: 395 }, width: WIDTH })
    expect(latest.lineX.value).toBe(378)
  })

  test("without a comparison the line is parked on the right edge with nothing of the second map", () => {
    mount({ compare: null, width: WIDTH })
    expect(latest.lineX.value).toBe(400)
    expect(strip()).toEqual([400, 400])
  })

  test("a new line position from the state moves the line", () => {
    const tree = mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH })
    act(() => {
      tree.update(<Probe compare={{ secondSide: "right", x: 260 }} width={WIDTH} />)
    })
    expect(latest.lineX.value).toBe(260)
    expect(strip()).toEqual([260, 400])
  })

  test("covering gives the second map the full width", () => {
    mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH, phase: "covering" })
    expect(strip()).toEqual([0, 400])
    mount({ compare: { secondSide: "left", x: 200 }, width: WIDTH, phase: "covering" })
    expect(strip()).toEqual([0, 400])
  })

  test("leaving slides the line to the right edge in 240 ms, then reports once", () => {
    const onLeft = jest.fn()
    mount({
      compare: { secondSide: "right", x: 200 },
      width: WIDTH,
      phase: "leaving",
      leaveTo: "right",
      onLeft,
    })
    expect(mockTimings).toHaveLength(1)
    expect(mockTimings[0].to).toBe(400)
    expect(mockTimings[0].config).toMatchObject({ duration: 240, reduceMotion: "system" })
    expect(latest.lineX.value).toBe(400)
    expect(onLeft).not.toHaveBeenCalled()
    mockTimings[0].done?.(true)
    mockTimings[0].done?.(true)
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  test("leaving defaults to the right edge and can go to the left one", () => {
    mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH, phase: "leaving" })
    expect(mockTimings[0].to).toBe(400)
    mount({
      compare: { secondSide: "right", x: 200 },
      width: WIDTH,
      phase: "leaving",
      leaveTo: "left",
    })
    expect(mockTimings[1].to).toBe(0)
  })

  test("an interrupted slide never reports the line as left", () => {
    const onLeft = jest.fn()
    mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH, phase: "leaving", onLeft })
    mockTimings[0].done?.(false)
    expect(onLeft).not.toHaveBeenCalled()
  })

  test("leaving stops the slide when it ends or the screen goes", () => {
    const tree = mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH, phase: "leaving" })
    act(() => tree.unmount())
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })

  test("under Reduce Motion the line jumps to the edge and reports at once", () => {
    setReducedMotion(true)
    const onLeft = jest.fn()
    mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH, phase: "leaving", onLeft })
    expect(mockTimings).toHaveLength(0)
    expect(latest.lineX.value).toBe(400)
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  test("leaving without a listener is harmless under Reduce Motion", () => {
    setReducedMotion(true)
    expect(() =>
      mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH, phase: "leaving" }),
    ).not.toThrow()
  })

  test("going back to active allows the next departure to report again", () => {
    const onLeft = jest.fn()
    const props = { compare: { secondSide: "right" as const, x: 200 }, width: WIDTH, onLeft }
    const tree = mount({ ...props, phase: "leaving" })
    mockTimings[0].done?.(true)
    act(() => {
      tree.update(<Probe {...props} phase="active" />)
    })
    act(() => {
      tree.update(<Probe {...props} phase="leaving" />)
    })
    mockTimings[mockTimings.length - 1].done?.(true)
    expect(onLeft).toHaveBeenCalledTimes(2)
  })
})

describe("CurtainHandle", () => {
  type Handlers = Record<"onBegin" | "onUpdate" | "onEnd", (event?: unknown) => void>

  function setup(over: Partial<CurtainHandleProps> = {}, lineX = shared(200)) {
    const props: CurtainHandleProps = {
      lineX,
      width: WIDTH,
      height: 800,
      leftName: "Plan",
      rightName: "Photos 1950",
      onMoveLine: jest.fn(),
      onEdgeExit: jest.fn(),
      onSideAction: jest.fn(),
      onQuit: jest.fn(),
      ...over,
    }
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<CurtainHandle {...props} />)
    })
    const handlers = (
      tree.root.findByType("GestureDetector" as never).props.gesture as { handlers: Handlers }
    ).handlers
    const strip = () => tree.root.findByProps({ testID: "curtain-handle" })
    return { tree, props, handlers, strip, lineX }
  }

  const drag = (handlers: Handlers, translationX: number) => {
    act(() => handlers.onBegin())
    act(() => handlers.onUpdate({ translationX }))
  }
  const fire = (strip: () => { props: Record<string, unknown> }, actionName: string) =>
    act(() => {
      ;(strip().props.onAccessibilityAction as (event: unknown) => void)({
        nativeEvent: { actionName },
      })
    })
  const valueText = (strip: () => { props: Record<string, unknown> }) =>
    (strip().props.accessibilityValue as { text: string }).text

  test("the knob helper puts the knob at 32 % of the window height", () => {
    expect(knobCenterY(800)).toBe(256)
  })

  test("dragging writes the clamped line position as the finger moves", () => {
    const { handlers, lineX } = setup()
    drag(handlers, 100)
    expect(lineX.value).toBe(300)
    drag(handlers, 500)
    expect(lineX.value).toBe(378)
    drag(handlers, -500)
    expect(lineX.value).toBe(22)
  })

  test("a release away from the edges reports the position and refreshes the value", () => {
    const { handlers, props, strip } = setup()
    drag(handlers, 100)
    act(() => handlers.onEnd())
    expect(props.onMoveLine).toHaveBeenCalledWith(300)
    expect(props.onEdgeExit).not.toHaveBeenCalled()
    expect(valueText(strip)).toBe("Plan à gauche, Photos 1950 à droite, séparation à 75 %")
  })

  test("a release in the outer fifth on the left quits keeping the right layer", () => {
    const { handlers, props } = setup()
    drag(handlers, -150)
    act(() => handlers.onEnd())
    expect(props.onEdgeExit).toHaveBeenCalledWith("B")
    expect(props.onMoveLine).not.toHaveBeenCalled()
  })

  test("a release in the outer fifth on the right quits keeping the left layer", () => {
    const { handlers, props } = setup()
    drag(handlers, 150)
    act(() => handlers.onEnd())
    expect(props.onEdgeExit).toHaveBeenCalledWith("A")
    expect(props.onMoveLine).not.toHaveBeenCalled()
  })

  test("dragging plays no haptic", () => {
    const { handlers } = setup()
    drag(handlers, 120)
    act(() => handlers.onEnd())
    expect(mockFeedback.selection).not.toHaveBeenCalled()
    expect(mockFeedback.light).not.toHaveBeenCalled()
    expect(mockFeedback.medium).not.toHaveBeenCalled()
  })

  test("the strip is adjustable with the label, the hint and the value naming both sides", () => {
    const { strip } = setup()
    const props = strip().props
    expect(props.accessibilityRole).toBe("adjustable")
    expect(props.accessibilityLabel).toBe("Séparation de la comparaison")
    expect(props.accessibilityHint).toBe(fr.mapLayers.compare.handleA11yHint)
    expect(valueText(strip)).toBe("Plan à gauche, Photos 1950 à droite, séparation à 50 %")
    expect(props.accessibilityActions).toEqual([
      { name: "increment" },
      { name: "decrement" },
      { name: "leftNext", label: "Fond suivant à gauche" },
      { name: "leftPrevious", label: "Fond précédent à gauche" },
      { name: "rightNext", label: "Fond suivant à droite" },
      { name: "rightPrevious", label: "Fond précédent à droite" },
      { name: "quit", label: "Quitter la comparaison" },
    ])
  })

  test("increment moves the line by 10 points of the width", () => {
    const { strip, props, lineX } = setup()
    fire(strip, "increment")
    expect(lineX.value).toBe(240)
    expect(props.onMoveLine).toHaveBeenLastCalledWith(240)
    expect(valueText(strip)).toBe("Plan à gauche, Photos 1950 à droite, séparation à 60 %")
  })

  test("decrement moves it back", () => {
    const { strip, props, lineX } = setup()
    fire(strip, "decrement")
    expect(lineX.value).toBe(160)
    expect(props.onMoveLine).toHaveBeenLastCalledWith(160)
    expect(valueText(strip)).toBe("Plan à gauche, Photos 1950 à droite, séparation à 40 %")
  })

  test("the steps stop 22 pt from the edges", () => {
    const high = setup({}, shared(370))
    fire(high.strip, "increment")
    expect(high.lineX.value).toBe(378)
    const low = setup({}, shared(30))
    fire(low.strip, "decrement")
    expect(low.lineX.value).toBe(22)
  })

  test("the side actions name the side and the direction", () => {
    const { strip, props } = setup()
    fire(strip, "leftNext")
    fire(strip, "leftPrevious")
    fire(strip, "rightNext")
    fire(strip, "rightPrevious")
    expect(props.onSideAction).toHaveBeenNthCalledWith(1, "left", 1)
    expect(props.onSideAction).toHaveBeenNthCalledWith(2, "left", -1)
    expect(props.onSideAction).toHaveBeenNthCalledWith(3, "right", 1)
    expect(props.onSideAction).toHaveBeenNthCalledWith(4, "right", -1)
  })

  test("Quitter la comparaison calls onQuit, an unknown action does nothing", () => {
    const { strip, props, lineX } = setup()
    fire(strip, "quit")
    expect(props.onQuit).toHaveBeenCalledTimes(1)
    fire(strip, "activate")
    expect(props.onQuit).toHaveBeenCalledTimes(1)
    expect(props.onMoveLine).not.toHaveBeenCalled()
    expect(lineX.value).toBe(200)
  })

  test("the value follows a new width", () => {
    const { tree, props, strip } = setup()
    act(() => {
      tree.update(<CurtainHandle {...props} width={500} />)
    })
    expect(valueText(strip)).toBe("Plan à gauche, Photos 1950 à droite, séparation à 40 %")
  })

  test("the strip is 44 pt wide and follows the line", () => {
    const { strip } = setup()
    const style = flat(strip().props.style)
    expect(style.width).toBe(44)
    expect(style.left).toBe(178)
    expect(style.top).toBe(0)
    expect(style.height).toBe(800)
  })

  test("the line is 4 pt: a 2 pt core between two graphite edges", () => {
    const { tree } = setup()
    const { curtain } = defaultTheme.visual
    const colours = tree.root
      .findAll((node) => (node.type as unknown) === "View" && !!flat(node.props.style).width)
      .map((node) => flat(node.props.style))
    const line = colours.find((style) => style.width === 4)
    expect(line).toBeDefined()
    expect(colours.filter((style) => style.width === 1).map((s) => s.backgroundColor)).toEqual([
      curtain.edge,
      curtain.edge,
    ])
    expect(colours.find((style) => style.width === 2)?.backgroundColor).toBe(curtain.line)
  })

  test("the knob is a 44 pt glass circle with the swap glyph at 32 % of the height", () => {
    const { tree } = setup()
    const knob = tree.root.findByType("GlassSurface" as never)
    const style = flat(knob.props.style)
    expect(style).toMatchObject({ width: 44, height: 44, borderRadius: 22, top: 234 })
    expect(knob.props.surface).toBe(defaultTheme.visual.mapControl.glass)
    const glyph = tree.root.findByType("Ionicons" as never)
    expect(glyph.props).toMatchObject({
      name: "swap-horizontal-outline",
      size: 22,
      color: defaultTheme.visual.mapControl.icon,
    })
  })

  test("the line can start under the top safe area", () => {
    const { tree, strip } = setup({ lineTop: 60 })
    const style = flat(strip().props.style)
    expect(style).toMatchObject({ top: 60, height: 740 })
    expect(flat(tree.root.findByType("GlassSurface" as never).props.style).top).toBe(174)
  })
})

describe("CurtainSideTags", () => {
  function mount(over: Partial<React.ComponentProps<typeof CurtainSideTags>> = {}) {
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <CurtainSideTags
          lineX={shared(200)}
          width={WIDTH}
          knobTop={256}
          leftName="Plan"
          rightName="Photos 1950"
          swipeMode={false}
          leftUnavailable={false}
          rightUnavailable={false}
          {...over}
        />,
      )
    })
    const tag = (side: "left" | "right") => tree.root.findByProps({ testID: `curtain-tag-${side}` })
    return { tree, tag }
  }

  const textsOf = (node: { findAllByType: (type: never) => { props: { children?: unknown } }[] }) =>
    node.findAllByType("Text" as never).map((text) => text.props.children)
  const glyphsOf = (node: { findAllByType: (type: never) => { props: { name?: string } }[] }) =>
    node.findAllByType("Ionicons" as never).map((glyph) => glyph.props.name)

  test("each tag names its layer", () => {
    const { tag } = mount()
    expect(textsOf(tag("left"))).toEqual(["Plan"])
    expect(textsOf(tag("right"))).toEqual(["Photos 1950"])
  })

  test("the tags sit 30 pt from the line at the knob height, with room for the name", () => {
    const { tag } = mount()
    const left = flat(tag("left").props.style)
    const right = flat(tag("right").props.style)
    expect(left).toMatchObject({ right: 230, maxWidth: 156, opacity: 1, top: 240, height: 32 })
    expect(right).toMatchObject({ left: 230, maxWidth: 156, opacity: 1, top: 240 })
  })

  test("a tag with under 72 pt of room fades out in 160 ms", () => {
    const { tag } = mount({ lineX: shared(60) })
    expect(flat(tag("left").props.style).opacity).toBe(0)
    expect(flat(tag("right").props.style).opacity).toBe(1)
    expect(mockTimings.some((timing) => timing.to === 0)).toBe(true)
    expect(mockTimings[0].config).toMatchObject({ duration: 160, reduceMotion: "system" })
  })

  test("chevrons round the name while the swipe mode is on", () => {
    const off = mount()
    expect(glyphsOf(off.tag("left"))).toEqual([])
    const on = mount({ swipeMode: true })
    expect(glyphsOf(on.tag("left"))).toEqual(["chevron-back-outline", "chevron-forward-outline"])
    expect(glyphsOf(on.tag("right"))).toEqual(["chevron-back-outline", "chevron-forward-outline"])
  })

  test("an unavailable side wears the cloud-offline glyph before its name", () => {
    const { tag } = mount({ rightUnavailable: true, swipeMode: true })
    expect(glyphsOf(tag("left"))).not.toContain("cloud-offline-outline")
    expect(glyphsOf(tag("right"))).toEqual([
      "cloud-offline-outline",
      "chevron-back-outline",
      "chevron-forward-outline",
    ])
    const { tag: plain } = mount({ leftUnavailable: true })
    expect(glyphsOf(plain("left"))).toEqual(["cloud-offline-outline"])
  })

  test("the tags take no touch and are hidden from accessibility", () => {
    const { tag } = mount()
    for (const side of ["left", "right"] as const) {
      expect(tag(side).props.pointerEvents).toBe("none")
      expect(tag(side).props.accessibilityElementsHidden).toBe(true)
      expect(tag(side).props.importantForAccessibility).toBe("no-hide-descendants")
    }
  })

  test("the pill is the map control glass", () => {
    const { tree } = mount()
    const pill = tree.root.findAllByType("GlassSurface" as never)[0]
    expect(pill.props.surface).toBe(defaultTheme.visual.mapControl.glass)
    expect(flat(pill.props.style)).toMatchObject({ height: 32, paddingHorizontal: 12 })
  })
})
