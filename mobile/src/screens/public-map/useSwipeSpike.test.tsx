import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
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
    for (const name of ["runOnJS", "minDistance"]) gesture[name] = () => gesture
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

const mockFlag = { on: true }
jest.mock("../../app/feature-flags", () => ({ isSwipeSpikeEnabled: () => mockFlag.on }))
jest.mock("../../hooks/useMapStyle", () => ({
  useMapStyle: (basemap: string) => ({
    mapStyle: basemap === "map" ? "plan-style" : "sat-style",
    cadastreInStyle: false,
  }),
}))
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  return { ...actual, useBrandTheme: () => actual.defaultTheme }
})

import type { NativeSyntheticEvent } from "react-native"
import type { ViewStateChangeEvent } from "@maplibre/maplibre-react-native"
import { cameraMocks } from "../../../test/maplibre.mock"
import { defaultTheme } from "../../app/theme"
import { boundsFromRegion } from "../../map/maplibre/regions"
import { MapStack } from "./MapStack"
import { SPIKE_PHOTOS_STYLE } from "./SpikeStacks"
import { useSwipeSpike, type SwipeSpike } from "./useSwipeSpike"

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
  jest.useFakeTimers()
  mockFlag.on = true
  cameraMocks.jumpTo.mockClear()
})

afterEach(() => {
  jest.useRealTimers()
})

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

const WIDTH = 400
const REGION = { latitude: 48.4, longitude: 2.69, latitudeDelta: 0.02, longitudeDelta: 0.03 }

let latest!: SwipeSpike

function Harness({ basemap }: { basemap: "map" | "satellite" }) {
  latest = useSwipeSpike({ width: WIDTH, height: 800, initialRegion: REGION, basemap })
  return latest.overlay
}

type Handlers = Record<"onBegin" | "onUpdate" | "onEnd", (event: unknown) => void>

function mount(basemap: "map" | "satellite" = "map") {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(<Harness basemap={basemap} />)
  })
  return tree
}

function handlersOf(tree: ReactTestRenderer, testID: string): Handlers {
  const detector = tree.root
    .findAllByType("GestureDetector" as never)
    .find((node) => node.findAll((child) => child.props.testID === testID).length > 0)
  if (!detector) throw new Error(`no gesture detector around ${testID}`)
  return (detector.props.gesture as { handlers: Handlers }).handlers
}
const swipe = (tree: ReactTestRenderer) => handlersOf(tree, "spike-swipe-surface")
const line = (tree: ReactTestRenderer) => handlersOf(tree, "spike-line-handle")

const stacks = (tree: ReactTestRenderer): ReactTestInstance[] => tree.root.findAllByType(MapStack)
const clipOf = (stack: ReactTestInstance) => [
  (stack.props.clipLeft as { value: number }).value,
  (stack.props.clipRight as { value: number }).value,
]
const styleOf = (stack: ReactTestInstance) => stack.props.mapStyle

function settle() {
  act(() => {
    jest.advanceTimersByTime(1000)
  })
}

function swipeMode(tree: ReactTestRenderer) {
  act(() => latest.toggleSwipe())
  return swipe(tree)
}

function wipe(handlers: Handlers, from: number, to: number) {
  act(() => handlers.onBegin({ x: from, y: 100 }))
  act(() => handlers.onUpdate({ x: to, y: 100, translationX: to - from, translationY: 0 }))
}
function release(handlers: Handlers) {
  act(() => handlers.onEnd({}))
  settle()
}

/** A comparison with Plan on the left and Satellite on the right, the line at `x`. */
function compare(tree: ReactTestRenderer, x = 200) {
  const handlers = swipeMode(tree)
  wipe(handlers, 300, x)
  release(handlers)
  return handlers
}

describe("flag off", () => {
  test("the driver is inert: no overlay, no canvas props, nothing to toggle", () => {
    mockFlag.on = false
    const tree = mount()
    expect(latest.active).toBe(false)
    expect(latest.mapCanvasProps).toEqual({})
    expect(latest.overlay).toBeNull()
    expect(() => latest.toggleSwipe()).not.toThrow()
    expect(tree.toJSON()).toBeNull()
  })
})

describe("swipe mode", () => {
  test("the globe toggle freezes and unfreezes the Explorer map", () => {
    const tree = mount()
    expect(latest.active).toBe(true)
    expect(latest.mapCanvasProps.frozen).toBe(false)
    expect(tree.root.findAll((n) => n.props.testID === "spike-swipe-surface")).toHaveLength(0)
    act(() => latest.toggleSwipe())
    expect(latest.mapCanvasProps.frozen).toBe(true)
    expect(tree.root.findAll((n) => n.props.testID === "spike-swipe-surface")).not.toHaveLength(0)
    act(() => latest.toggleSwipe())
    expect(latest.mapCanvasProps.frozen).toBe(false)
    expect(tree.root.findAll((n) => n.props.testID === "spike-swipe-surface")).toHaveLength(0)
  })

  test("a gesture that arrives while the mode is off does nothing", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    act(() => latest.toggleSwipe())
    wipe(handlers, 300, 100)
    expect(stacks(tree)).toHaveLength(0)
    release(handlers)
    expect(stacks(tree)).toHaveLength(0)
  })

  test("a release with no gesture, and an update with no begin, do nothing", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    act(() => handlers.onUpdate({ x: 100, y: 0, translationX: -200 }))
    act(() => handlers.onEnd({}))
    expect(stacks(tree)).toHaveLength(0)
  })

  test("under 6 pt of movement nothing mounts, and a tap changes nothing", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    act(() => handlers.onBegin({ x: 300, y: 100 }))
    act(() => handlers.onUpdate({ translationX: -4 }))
    expect(stacks(tree)).toHaveLength(0)
    release(handlers)
    expect(stacks(tree)).toHaveLength(0)
    expect(latest.mapCanvasProps.rotationLocked).toBe(false)
  })

  test("a swipe mounts the next layer clipped between the finger and the right edge", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    act(() => handlers.onBegin({ x: 300, y: 100 }))
    act(() => handlers.onUpdate({ translationX: -100, x: 200 }))
    expect(stacks(tree)).toHaveLength(1)
    expect(clipOf(stacks(tree)[0])).toEqual([200, 400])
    expect(styleOf(stacks(tree)[0])).toBe("sat-style")
    act(() => handlers.onUpdate({ translationX: -150, x: 150 }))
    expect(clipOf(stacks(tree)[0])).toEqual([150, 400])
  })

  test("dragging right uncovers the previous layer from the left edge", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 100, 150)
    expect(stacks(tree)).toHaveLength(1)
    expect(clipOf(stacks(tree)[0])).toEqual([0, 150])
    // Plan wraps to the 1950 photographs.
    expect(styleOf(stacks(tree)[0])).toBe(SPIKE_PHOTOS_STYLE)
  })

  test("reversing the drag swaps the incoming layer", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 200, 150)
    expect(styleOf(stacks(tree)[0])).toBe("sat-style")
    act(() => handlers.onUpdate({ x: 260, translationX: 60 }))
    expect(styleOf(stacks(tree)[0])).toBe(SPIKE_PHOTOS_STYLE)
    expect(clipOf(stacks(tree)[0])).toEqual([0, 260])
  })

  test("the Satellite underlay cycles the same way", () => {
    const tree = mount("satellite")
    const handlers = swipeMode(tree)
    wipe(handlers, 300, 200)
    expect(styleOf(stacks(tree)[0])).toBe(SPIKE_PHOTOS_STYLE)
  })

  test("a release under 0.2 springs back and unmounts the incoming map after the settle", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 380, 340)
    expect(stacks(tree)).toHaveLength(1)
    act(() => handlers.onEnd({}))
    expect(stacks(tree)).toHaveLength(1)
    act(() => {
      jest.advanceTimersByTime(240)
    })
    expect(stacks(tree)).toHaveLength(0)
    expect(latest.mapCanvasProps.rotationLocked).toBe(false)
  })

  test("a release over 0.8 makes the incoming layer the shown one", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 300, 40)
    act(() => handlers.onEnd({}))
    settle()
    // The shown layer is now a full-width cover over the Plan underlay.
    expect(stacks(tree)).toHaveLength(1)
    expect(clipOf(stacks(tree)[0])).toEqual([0, 400])
    expect(styleOf(stacks(tree)[0])).toBe("sat-style")
    // Swiping on from Satellite uncovers the photographs.
    wipe(handlers, 300, 100)
    expect(styleOf(stacks(tree).at(-1) as ReactTestInstance)).toBe(SPIKE_PHOTOS_STYLE)
  })

  test("returning to the underlay layer drops the cover", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 300, 40)
    release(handlers)
    wipe(handlers, 100, 380)
    release(handlers)
    expect(stacks(tree)).toHaveLength(0)
  })

  test("toggling the mode off mid-gesture drops the incoming map", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 300, 200)
    expect(stacks(tree)).toHaveLength(1)
    act(() => latest.toggleSwipe())
    expect(stacks(tree)).toHaveLength(0)
    release(handlers)
    expect(stacks(tree)).toHaveLength(0)
  })

  test("pending timers are cleared on unmount", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 380, 340)
    act(() => handlers.onEnd({}))
    act(() => tree.unmount())
    expect(() => jest.advanceTimersByTime(1000)).not.toThrow()
  })
})

describe("comparison", () => {
  test("a release in the middle keeps both layers behind a 4 pt line", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 300, 200)
    release(handlers)
    // Plan is the underlay, Satellite the right cover; the wipe has handed over to it.
    expect(stacks(tree)).toHaveLength(1)
    expect(clipOf(stacks(tree)[0])).toEqual([200, 400])
    expect(styleOf(stacks(tree)[0])).toBe("sat-style")
    expect(latest.mapCanvasProps).toMatchObject({ rotationLocked: true, hideMarkers: true })
    const handle = tree.root.findAll((n) => n.props.testID === "spike-line-handle")[0]
    expect(handle).toBeDefined()
    const colours = tree.root
      .findAll((n) => (n.type as unknown) === "View" && Array.isArray(n.props.style))
      .map((n) => flat(n.props.style).backgroundColor)
      .filter(Boolean)
    expect(colours).toEqual([
      defaultTheme.visual.curtain.edge,
      defaultTheme.visual.curtain.line,
      defaultTheme.visual.curtain.edge,
    ])
  })

  test("the line starts where the finger let go, kept 22 pt from the edges", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 300, 300)
    wipe(handlers, 300, 290)
    release(handlers)
    expect(clipOf(stacks(tree)[0])).toEqual([290, 400])
    const near = mount()
    const nearHandlers = swipeMode(near)
    wipe(nearHandlers, 380, 330)
    release(nearHandlers)
    expect(stacks(near)).toHaveLength(0)
  })

  test("a swipe from the left edge keeps the incoming layer on the left", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 100, 300)
    release(handlers)
    // Photographs on the left of the line, Plan (the underlay) on the right.
    expect(stacks(tree)).toHaveLength(1)
    expect(clipOf(stacks(tree)[0])).toEqual([0, 300])
    expect(styleOf(stacks(tree)[0])).toBe(SPIKE_PHOTOS_STYLE)
  })

  test("a swipe on the right side wipes a third map in within that side", () => {
    const tree = mount()
    const handlers = compare(tree)
    wipe(handlers, 300, 250)
    // The right cover and the third map; the Explorer map is the underlay.
    expect(stacks(tree)).toHaveLength(2)
    const third = stacks(tree)[1]
    expect(clipOf(third)).toEqual([250, 400])
    expect(styleOf(third)).toBe(SPIKE_PHOTOS_STYLE)
  })

  test("a swipe on the left side stays left of the line and skips the right layer", () => {
    const tree = mount()
    const handlers = compare(tree)
    wipe(handlers, 100, 60)
    const third = stacks(tree).at(-1) as ReactTestInstance
    expect(clipOf(third)).toEqual([60, 200])
    // Next after Plan is Satellite, which is on the right: the photographs come instead.
    expect(styleOf(third)).toBe(SPIKE_PHOTOS_STYLE)
  })

  test("a side swipe past a third of the side commits the new layer on that side", () => {
    const tree = mount()
    const handlers = compare(tree)
    wipe(handlers, 300, 210)
    release(handlers)
    expect(stacks(tree)).toHaveLength(1)
    expect(styleOf(stacks(tree)[0])).toBe(SPIKE_PHOTOS_STYLE)
    expect(clipOf(stacks(tree)[0])).toEqual([200, 400])
  })

  test("a left side commit covers the left of the line", () => {
    const tree = mount()
    const handlers = compare(tree)
    wipe(handlers, 100, 10)
    release(handlers)
    const left = stacks(tree).find((stack) => clipOf(stack)[0] === 0) as ReactTestInstance
    expect(styleOf(left)).toBe(SPIKE_PHOTOS_STYLE)
    expect(clipOf(left)).toEqual([0, 200])
  })

  test("a side swipe under a third springs back and keeps the comparison", () => {
    const tree = mount()
    const handlers = compare(tree)
    wipe(handlers, 390, 380)
    release(handlers)
    expect(stacks(tree)).toHaveLength(1)
    expect(styleOf(stacks(tree)[0])).toBe("sat-style")
  })

  test("the line follows the finger and stays 22 pt from each edge", () => {
    const tree = mount()
    compare(tree)
    const handlers = line(tree)
    act(() => handlers.onBegin({}))
    act(() => handlers.onUpdate({ translationX: 60 }))
    expect(clipOf(stacks(tree)[0])[0]).toBe(260)
    act(() => handlers.onUpdate({ translationX: -9999 }))
    expect(clipOf(stacks(tree)[0])[0]).toBe(22)
    act(() => handlers.onUpdate({}))
    expect(clipOf(stacks(tree)[0])[0]).toBe(200)
  })

  test("releasing the line in the middle keeps the comparison", () => {
    const tree = mount()
    compare(tree)
    const handlers = line(tree)
    act(() => handlers.onBegin({}))
    act(() => handlers.onUpdate({ translationX: 50 }))
    act(() => handlers.onEnd({}))
    expect(tree.root.findAll((n) => n.props.testID === "spike-line-handle")).not.toHaveLength(0)
  })

  test("dragging the line to the left edge ends the comparison on the right layer", () => {
    const tree = mount()
    compare(tree)
    const handlers = line(tree)
    act(() => handlers.onBegin({}))
    act(() => handlers.onUpdate({ translationX: -9999 }))
    act(() => handlers.onEnd({}))
    expect(tree.root.findAll((n) => n.props.testID === "spike-line-handle")).toHaveLength(0)
    expect(latest.mapCanvasProps).toMatchObject({ rotationLocked: false, hideMarkers: false })
    expect(stacks(tree)).toHaveLength(1)
    expect(clipOf(stacks(tree)[0])).toEqual([0, 400])
    expect(styleOf(stacks(tree)[0])).toBe("sat-style")
    // A late line event after the comparison ended is ignored.
    act(() => handlers.onEnd({}))
    expect(stacks(tree)).toHaveLength(1)
  })

  test("dragging the line to the right edge ends the comparison on the left layer", () => {
    const tree = mount()
    compare(tree)
    const handlers = line(tree)
    act(() => handlers.onBegin({}))
    act(() => handlers.onUpdate({ translationX: 9999 }))
    act(() => handlers.onEnd({}))
    expect(tree.root.findAll((n) => n.props.testID === "spike-line-handle")).toHaveLength(0)
    // Plan, the underlay, is what stays.
    expect(stacks(tree)).toHaveLength(0)
  })
})

describe("camera follow", () => {
  function viewEvent(center: [number, number], zoom: number) {
    return {
      nativeEvent: {
        center,
        zoom,
        bearing: 12,
        pitch: 3,
        bounds: [center[0] - 0.02, center[1] - 0.01, center[0] + 0.02, center[1] + 0.01],
      },
    } as unknown as NativeSyntheticEvent<ViewStateChangeEvent>
  }

  test("every mounted stacked map jumps to the Explorer view, north up and flat", () => {
    const tree = mount()
    compare(tree)
    expect(typeof latest.mapCanvasProps.onViewChange).toBe("function")
    act(() => latest.mapCanvasProps.onViewChange?.(viewEvent([2.7, 48.41], 15.5)))
    expect(cameraMocks.jumpTo).toHaveBeenCalledTimes(1)
    expect(cameraMocks.jumpTo).toHaveBeenCalledWith({
      center: [2.7, 48.41],
      zoom: 15.5,
      bearing: 0,
      pitch: 0,
    })
  })

  test("a map mounted later starts on the last view the Explorer reported", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    act(() => latest.mapCanvasProps.onViewChange?.(viewEvent([2.7, 48.41], 15.5)))
    wipe(handlers, 300, 200)
    const camera = tree.root.findByType("Camera" as never)
    const expected = [2.68, 48.4, 2.72, 48.42]
    camera.props.initialViewState.bounds.forEach((value: number, index: number) =>
      expect(value).toBeCloseTo(expected[index], 6),
    )
  })

  test("without any view reported a stacked map starts on the initial region", () => {
    const tree = mount()
    const handlers = swipeMode(tree)
    wipe(handlers, 300, 200)
    const camera = tree.root.findByType("Camera" as never)
    expect(camera.props.initialViewState.bounds).toEqual(boundsFromRegion(REGION))
  })
})
