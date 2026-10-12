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

// A recorder for `Gesture.Pan()`: the chain returns itself and keeps the four handlers.
jest.mock("react-native-gesture-handler", () => {
  const ReactRef = require("react") as typeof import("react")
  function pan() {
    const gesture: Record<string, unknown> & {
      handlers: Record<string, (...args: unknown[]) => void>
    } = { handlers: {} }
    for (const name of ["onBegin", "onUpdate", "onEnd", "onFinalize"]) {
      gesture[name] = (handler: (...args: unknown[]) => void) => {
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

// The shared Reanimated mock, with a recording `withTiming` that keeps its completion callback
// (`mockHold.value` makes it return a fixed number, as an animation that has not moved yet) and a
// recording `cancelAnimation`.
const mockTimings: { to: number; config: Record<string, unknown>; done?: (f?: boolean) => void }[] =
  []
const mockHold: { value: number | null } = { value: null }
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
      return mockHold.value ?? to
    },
    cancelAnimation: (value: unknown) => mockCancel(value),
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
import { SPRINGBACK_MS } from "../../map/swipe-machine"
import {
  CompareGrabber,
  grabberCenterY,
  GRABBER_HIT,
  GRABBER_LENGTH,
  GRABBER_WIDTH,
  type CompareGrabberProps,
} from "./CompareGrabber"
import { CompareLine } from "./CompareLine"
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
  mockHold.value = null
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

  test("a comparison starts at the wipe front and eases to the centre in 240 ms", () => {
    mockHold.value = 300
    mount({ compare: { secondSide: "right", x: 300 }, width: WIDTH })
    // The animation has not moved yet: the line is where the front was.
    expect(latest.lineX.value).toBe(300)
    expect(mockTimings).toHaveLength(1)
    expect(mockTimings[0].to).toBe(200)
    expect(mockTimings[0].config).toMatchObject({ duration: 240, reduceMotion: "system" })
    mockHold.value = null
    const tree = mount({ compare: { secondSide: "right", x: 300 }, width: WIDTH })
    expect(latest.lineX.value).toBe(200)
    // Leaving the screen stops the easing.
    act(() => tree.unmount())
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })

  test("the front is kept 22 pt from each edge", () => {
    mockHold.value = -1
    mount({ compare: { secondSide: "right", x: 5 }, width: WIDTH })
    expect(latest.lineX.value).toBe(-1)
    mockHold.value = 22
    mount({ compare: { secondSide: "right", x: 5 }, width: WIDTH })
    expect(latest.lineX.value).toBe(22)
    expect(mockTimings.map((timing) => timing.to)).toEqual([200, 200])
  })

  test("under Reduce Motion the line is at the centre at once", () => {
    setReducedMotion(true)
    mount({ compare: { secondSide: "right", x: 300 }, width: WIDTH })
    expect(mockTimings).toHaveLength(0)
    expect(latest.lineX.value).toBe(200)
  })

  test("the strip of the second map is cut at the line, whichever side it is on", () => {
    mockHold.value = 300
    mount({ compare: { secondSide: "right", x: 300 }, width: WIDTH })
    expect(strip()).toEqual([300, 400])
    mount({ compare: { secondSide: "left", x: 300 }, width: WIDTH })
    expect(strip()).toEqual([0, 300])
  })

  test("without a comparison the line is parked on the right edge with nothing of the second map", () => {
    mount({ compare: null, width: WIDTH })
    expect(latest.lineX.value).toBe(400)
    expect(strip()).toEqual([400, 400])
    expect(mockTimings).toHaveLength(0)
  })

  test("the line is parked on a comparison that arrives later, then eases to the centre", () => {
    const tree = mount({ compare: null, width: WIDTH })
    mockHold.value = 300
    act(() => {
      tree.update(<Probe compare={{ secondSide: "right", x: 300 }} width={WIDTH} />)
    })
    expect(latest.lineX.value).toBe(300)
    expect(mockTimings.map((timing) => timing.to)).toEqual([200])
  })

  test("it never follows a later position of the state", () => {
    const tree = mount({ compare: { secondSide: "right", x: 300 }, width: WIDTH })
    act(() => {
      tree.update(<Probe compare={{ secondSide: "right", x: 260 }} width={WIDTH} />)
    })
    expect(latest.lineX.value).toBe(200)
    expect(mockTimings).toHaveLength(1)
  })

  test("a width change puts the line at the new centre at once", () => {
    const tree = mount({ compare: { secondSide: "right", x: 300 }, width: WIDTH })
    mockCancel.mockClear()
    act(() => {
      tree.update(<Probe compare={{ secondSide: "right", x: 300 }} width={500} />)
    })
    expect(mockCancel).toHaveBeenCalledTimes(1)
    expect(latest.lineX.value).toBe(250)
    expect(mockTimings).toHaveLength(1)
  })

  test("a comparison that ends and a new one that starts eases again", () => {
    const tree = mount({ compare: { secondSide: "right", x: 300 }, width: WIDTH })
    act(() => {
      tree.update(<Probe compare={null} width={WIDTH} />)
    })
    expect(latest.lineX.value).toBe(400)
    act(() => {
      tree.update(<Probe compare={{ secondSide: "left", x: 100 }} width={WIDTH} />)
    })
    expect(mockTimings.map((timing) => timing.to)).toEqual([200, 200])
  })

  test("covering gives the second map the full width", () => {
    mount({ compare: { secondSide: "right", x: 200 }, width: WIDTH, phase: "covering" })
    expect(strip()).toEqual([0, 400])
    mount({ compare: { secondSide: "left", x: 200 }, width: WIDTH, phase: "covering" })
    expect(strip()).toEqual([0, 400])
    expect(mockTimings).toHaveLength(0)
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

describe("CompareLine", () => {
  function mount(top?: number, lineX = shared(200)) {
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<CompareLine lineX={lineX} top={top} />)
    })
    const line = tree.root.findByProps({ testID: "compare-line" })
    return { tree, line }
  }

  test("it is 4 pt wide, from the top safe area to the bottom, and follows the line", () => {
    const { line } = mount(60)
    expect(flat(line.props.style)).toMatchObject({
      position: "absolute",
      top: 60,
      bottom: 0,
      width: 4,
      left: 198,
    })
  })

  test("it starts at the top by default", () => {
    const { line } = mount()
    expect(flat(line.props.style).top).toBe(0)
  })

  test("it is a 2 pt white core between two graphite edges", () => {
    const { tree } = mount()
    const { curtain } = defaultTheme.visual
    const parts = tree.root
      .findAll((node) => (node.type as unknown) === "View" && !!flat(node.props.style).width)
      .map((node) => flat(node.props.style))
    expect(parts.filter((style) => style.width === 1).map((s) => s.backgroundColor)).toEqual([
      curtain.edge,
      curtain.edge,
    ])
    expect(parts.find((style) => style.width === 2)?.backgroundColor).toBe(curtain.line)
  })

  test("it takes no touch and is hidden from accessibility", () => {
    const { line } = mount()
    expect(line.props.pointerEvents).toBe("none")
    expect(line.props.accessibilityElementsHidden).toBe(true)
    expect(line.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(line.props.accessible).toBeUndefined()
  })
})

describe("CompareGrabber", () => {
  type Handlers = Record<
    "onBegin" | "onUpdate" | "onEnd" | "onFinalize",
    (...args: unknown[]) => void
  >

  function setup(over: Partial<CompareGrabberProps> = {}, lineX = shared(200)) {
    const props: CompareGrabberProps = {
      lineX,
      width: WIDTH,
      height: 800,
      leftName: "Plan",
      rightName: "Photos 1950",
      onExitZone: jest.fn(),
      onEdgeExit: jest.fn(),
      onDragging: jest.fn(),
      ...over,
    }
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<CompareGrabber {...props} />)
    })
    const handlers = (
      tree.root.findByType("GestureDetector" as never).props.gesture as { handlers: Handlers }
    ).handlers
    const grabber = () => tree.root.findByProps({ testID: "compare-grabber" })
    return { tree, props, handlers, grabber, lineX }
  }

  const update = (handlers: Handlers, translationX: number) =>
    act(() => handlers.onUpdate({ translationX }))
  const begin = (handlers: Handlers) => act(() => handlers.onBegin())
  const fire = (grabber: () => { props: Record<string, unknown> }, actionName: string) =>
    act(() => {
      ;(grabber().props.onAccessibilityAction as (event: unknown) => void)({
        nativeEvent: { actionName },
      })
    })

  test("the helper puts the grabber at 32 % of the window height", () => {
    expect(grabberCenterY(800)).toBe(256)
    expect(grabberCenterY(667)).toBe(213)
    expect([GRABBER_HIT, GRABBER_WIDTH, GRABBER_LENGTH]).toEqual([44, 4, 36])
  })

  test("it is a 44 x 44 hit area centred on the line at 32 % of the height", () => {
    const { grabber } = setup()
    expect(flat(grabber().props.style)).toMatchObject({
      position: "absolute",
      width: 44,
      height: 44,
      left: 178,
      top: 234,
    })
  })

  test("it draws a white 4 x 36 bar inside a 1 pt graphite edge, with no glass and no icon", () => {
    const { tree } = setup()
    const { curtain } = defaultTheme.visual
    const views = tree.root
      .findAll((node) => (node.type as unknown) === "View")
      .map((node) => flat(node.props.style))
    const bar = views.find((style) => style.width === 4)
    expect(bar).toMatchObject({
      width: 4,
      height: 36,
      borderRadius: 2,
      backgroundColor: curtain.line,
    })
    const edge = views.find((style) => style.backgroundColor === curtain.edge)
    expect(edge).toMatchObject({ padding: 1, borderRadius: 3 })
    expect(tree.root.findAllByType("GlassSurface" as never)).toHaveLength(0)
    expect(tree.root.findAllByType("Ionicons" as never)).toHaveLength(0)
  })

  test("grabbing the line takes over a spring-back in progress", () => {
    const { handlers, lineX } = setup()
    begin(handlers)
    expect(mockCancel).toHaveBeenCalledWith(lineX)
  })

  test("entering the left zone ticks once and reports it, a further move in it plays nothing", () => {
    const { handlers, props, lineX } = setup()
    begin(handlers)
    update(handlers, -150)
    expect(lineX.value).toBe(50)
    expect(props.onExitZone).toHaveBeenCalledTimes(1)
    expect(props.onExitZone).toHaveBeenLastCalledWith("B")
    expect(mockFeedback.selection).toHaveBeenCalledTimes(1)
    update(handlers, -160)
    expect(lineX.value).toBe(40)
    expect(props.onExitZone).toHaveBeenCalledTimes(1)
    expect(mockFeedback.selection).toHaveBeenCalledTimes(1)
  })

  test("leaving the zone reports it and plays nothing, re-entering ticks again", () => {
    const { handlers, props } = setup()
    begin(handlers)
    update(handlers, -150)
    update(handlers, -50)
    expect(props.onExitZone).toHaveBeenCalledTimes(2)
    expect(props.onExitZone).toHaveBeenLastCalledWith(null)
    expect(mockFeedback.selection).toHaveBeenCalledTimes(1)
    update(handlers, -150)
    expect(props.onExitZone).toHaveBeenLastCalledWith("B")
    expect(mockFeedback.selection).toHaveBeenCalledTimes(2)
  })

  test("the right zone reports A, and jumping from one zone to the other ticks again", () => {
    const { handlers, props } = setup()
    begin(handlers)
    update(handlers, 150)
    expect(props.onExitZone).toHaveBeenLastCalledWith("A")
    update(handlers, -150)
    expect(props.onExitZone).toHaveBeenLastCalledWith("B")
    expect(mockFeedback.selection).toHaveBeenCalledTimes(2)
  })

  test("moving outside the zones plays nothing and reports nothing", () => {
    const { handlers, props, lineX } = setup()
    begin(handlers)
    update(handlers, 60)
    update(handlers, -60)
    expect(lineX.value).toBe(140)
    expect(props.onExitZone).not.toHaveBeenCalled()
    expect(mockFeedback.selection).not.toHaveBeenCalled()
  })

  test("the line is kept 22 pt from each edge", () => {
    const { handlers, lineX } = setup()
    begin(handlers)
    update(handlers, 500)
    expect(lineX.value).toBe(378)
    update(handlers, -500)
    expect(lineX.value).toBe(22)
  })

  test("a release outside the zones springs back to the centre in 240 ms with no haptic", () => {
    const { handlers, props } = setup()
    begin(handlers)
    update(handlers, 100)
    act(() => handlers.onEnd({}, true))
    expect(mockTimings).toHaveLength(1)
    expect(mockTimings[0].to).toBe(200)
    expect(mockTimings[0].config).toMatchObject({ duration: SPRINGBACK_MS, reduceMotion: "system" })
    expect(props.onEdgeExit).not.toHaveBeenCalled()
    expect(props.onExitZone).toHaveBeenCalledTimes(1)
    expect(props.onExitZone).toHaveBeenLastCalledWith(null)
    expect(mockFeedback.selection).not.toHaveBeenCalled()
    expect(mockFeedback.light).not.toHaveBeenCalled()
    expect(mockFeedback.medium).not.toHaveBeenCalled()
    // The gesture finalizes after its end: it must not spring back twice.
    act(() => handlers.onFinalize({}, true))
    expect(mockTimings).toHaveLength(1)
    expect(props.onExitZone).toHaveBeenCalledTimes(1)
  })

  test("a release in the left zone quits keeping the right layer", () => {
    const { handlers, props } = setup()
    begin(handlers)
    update(handlers, -150)
    act(() => handlers.onEnd({}, true))
    expect(props.onEdgeExit).toHaveBeenCalledTimes(1)
    expect(props.onEdgeExit).toHaveBeenCalledWith("B")
    expect(props.onExitZone).toHaveBeenLastCalledWith(null)
    expect(mockTimings).toHaveLength(0)
    act(() => handlers.onFinalize({}, true))
    expect(mockTimings).toHaveLength(0)
  })

  test("a release in the right zone quits keeping the left layer", () => {
    const { handlers, props } = setup()
    begin(handlers)
    update(handlers, 150)
    act(() => handlers.onEnd({}, true))
    expect(props.onEdgeExit).toHaveBeenCalledWith("A")
  })

  test("a cancelled gesture in a zone never exits: it springs back and reports no zone", () => {
    const { handlers, props } = setup()
    begin(handlers)
    update(handlers, -150)
    act(() => handlers.onEnd({}, false))
    expect(props.onEdgeExit).not.toHaveBeenCalled()
    expect(mockTimings).toHaveLength(0)
    act(() => handlers.onFinalize({}, false))
    expect(props.onEdgeExit).not.toHaveBeenCalled()
    expect(mockTimings).toHaveLength(1)
    expect(mockTimings[0].to).toBe(200)
    expect(props.onExitZone).toHaveBeenLastCalledWith(null)
    expect(mockFeedback.selection).toHaveBeenCalledTimes(1)
  })

  test("a touch that never became a drag leaves the line at the centre", () => {
    const { handlers, props, lineX } = setup()
    begin(handlers)
    act(() => handlers.onFinalize({}, false))
    expect(lineX.value).toBe(200)
    expect(mockTimings.map((timing) => timing.to)).toEqual([200])
    expect(props.onEdgeExit).not.toHaveBeenCalled()
  })

  test("it reports a drag from the touch down until the gesture ends, whatever the outcome", () => {
    const { handlers, props } = setup()
    expect(props.onDragging).not.toHaveBeenCalled()
    begin(handlers)
    expect(props.onDragging).toHaveBeenCalledTimes(1)
    expect(props.onDragging).toHaveBeenLastCalledWith(true)
    update(handlers, 20)
    act(() => handlers.onEnd({}, true))
    act(() => handlers.onFinalize({}, true))
    expect(props.onDragging).toHaveBeenCalledTimes(2)
    expect(props.onDragging).toHaveBeenLastCalledWith(false)
  })

  test("a cancelled gesture also ends the drag", () => {
    const { handlers, props } = setup()
    begin(handlers)
    act(() => handlers.onFinalize({}, false))
    expect(props.onDragging).toHaveBeenLastCalledWith(false)
  })

  test("the grabber is adjustable with a label, a hint, a value and two exit actions", () => {
    const { grabber } = setup()
    const props = grabber().props
    expect(props.accessible).toBe(true)
    expect(props.accessibilityRole).toBe("adjustable")
    expect(props.accessibilityLabel).toBe("Séparation de la comparaison")
    expect(props.accessibilityHint).toBe("Faites glisser vers un bord pour quitter la comparaison")
    expect(props.accessibilityValue).toEqual({ text: "Plan à gauche, Photos 1950 à droite" })
    expect(props.accessibilityActions).toEqual([
      { name: "increment", label: "Quitter en gardant le fond de gauche" },
      { name: "decrement", label: "Quitter en gardant le fond de droite" },
    ])
    expect(props.accessibilityHint).toBe(fr.mapLayers.compare.handleA11yHint)
  })

  test("increment quits keeping the left layer, decrement the right one", () => {
    const { grabber, props } = setup()
    fire(grabber, "increment")
    expect(props.onEdgeExit).toHaveBeenLastCalledWith("A")
    fire(grabber, "decrement")
    expect(props.onEdgeExit).toHaveBeenLastCalledWith("B")
    expect(props.onEdgeExit).toHaveBeenCalledTimes(2)
  })

  test("an unknown action does nothing", () => {
    const { grabber, props, lineX } = setup()
    fire(grabber, "activate")
    expect(props.onEdgeExit).not.toHaveBeenCalled()
    expect(lineX.value).toBe(200)
  })
})
