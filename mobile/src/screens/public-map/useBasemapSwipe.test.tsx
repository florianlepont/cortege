import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

const mockScreenReader = {
  enabled: false,
  listener: null as null | ((on: boolean) => void),
  remove: jest.fn(),
  announce: jest.fn(),
}
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: { position: "absolute" } },
    AccessibilityInfo: {
      isScreenReaderEnabled: () => Promise.resolve(mockScreenReader.enabled),
      addEventListener: (_name: string, listener: (on: boolean) => void) => {
        mockScreenReader.listener = listener
        return { remove: mockScreenReader.remove }
      },
      announceForAccessibility: (text: string) => mockScreenReader.announce(text),
    },
  }
})

// A recorder for `Gesture.Pan()`: the chain returns itself and keeps the handlers.
jest.mock("react-native-gesture-handler", () => {
  const ReactRef = require("react") as typeof import("react")
  function pan() {
    const gesture: Record<string, unknown> & {
      handlers: Record<string, (...args: unknown[]) => void>
    } = { handlers: {} }
    for (const name of ["runOnJS", "minDistance"]) gesture[name] = () => gesture
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

// `withTiming` records its target and configuration, and keeps its completion callback so a test
// can finish the animation.
const mockTimings: { to: number; config: Record<string, unknown> }[] = []
const mockCompletions: (() => void)[] = []
jest.mock("react-native-reanimated", () => ({
  ...(jest.requireActual("react-native-reanimated") as object),
  withTiming: (to: number, config: Record<string, unknown>, done?: (finished: boolean) => void) => {
    mockTimings.push({ to, config })
    if (done) mockCompletions.push(() => done(true))
    return to
  },
}))

const mockStack = { wipe: "wipe", comparison: true }
jest.mock("./map-stack-mode", () => ({
  get WIPE_PRESENTATION() {
    return mockStack.wipe
  },
  get COMPARISON_BUILT() {
    return mockStack.comparison
  },
}))

jest.mock("../../ui/feedback", () => ({
  feedback: {
    selection: jest.fn(),
    impact: { light: jest.fn(), medium: jest.fn() },
  },
}))

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { feedback } from "../../ui/feedback"
import type { BaseLayerKey } from "../../map/layers"
import { HINT_MS, IDLE_MS, SETTLE_MS } from "../../map/swipe-machine"
import { INITIAL_MAP_LAYERS_STATE } from "./map-layers-state"
import { SwipeSurface } from "./SwipeSurface"
import { playHapticCue, useBasemapSwipe, type BasemapSwipe } from "./useBasemapSwipe"
import type { MapLayers } from "./useMapLayersState"

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
  jest.clearAllMocks()
  mockTimings.length = 0
  mockCompletions.length = 0
  mockStack.wipe = "wipe"
  mockStack.comparison = true
  mockScreenReader.enabled = false
  mockScreenReader.listener = null
  windowInputs = {}
  setReducedMotion(false)
})

afterEach(() => {
  jest.useRealTimers()
})

const WIDTH = 400
const medium = feedback.impact.medium as jest.Mock
const tick = feedback.selection as jest.Mock

type Setup = {
  base?: BaseLayerKey
  swipeMode?: boolean
}

function makeLayers({ base = "map", swipeMode = true }: Setup = {}): MapLayers {
  return {
    state: { ...INITIAL_MAP_LAYERS_STATE, swipeMode },
    displayedBase: base,
    secondMapLayer: null,
    shownBases: [base],
    globeDot: false,
    overlayDot: false,
    layerOfSide: () => base,
    actions: {
      enterSwipe: jest.fn(),
      exitSwipe: jest.fn(),
      toggleSwipe: jest.fn(),
      commitBase: jest.fn(),
      startCompare: jest.fn(),
      setSide: jest.fn(),
      quitCompare: jest.fn(),
      toggleOverlay: jest.fn(),
      setParcels: jest.fn(),
      styleLoaded: jest.fn(),
      styleFailed: jest.fn(),
    },
  }
}

type Handlers = Record<
  "onBegin" | "onUpdate" | "onEnd" | "onFinalize",
  (event: unknown, success?: boolean) => void
>

let layers: MapLayers
let available: (key: BaseLayerKey) => boolean
let skipped = 0
let latest!: BasemapSwipe
// The receded window of the immersive effect: absent unless a test sets it.
let windowInputs: { windowProgress?: { value: number }; windowApplied?: boolean } = {}

function Harness() {
  latest = useBasemapSwipe({
    layers,
    width: WIDTH,
    isAvailable: available,
    skippedCount: skipped,
    ...windowInputs,
  } as Parameters<typeof useBasemapSwipe>[0])
  return null
}

// The tree of the last `mount`, for tests that change the availability afterwards.
let mounted: ReactTestRenderer | null = null
function mountedTree(): ReactTestRenderer {
  if (mounted === null) throw new Error("no tree mounted")
  return mounted
}

function mount(setup: Setup = {}): ReactTestRenderer {
  layers = makeLayers(setup)
  available = () => true
  skipped = 0
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(<Harness />)
  })
  mounted = tree
  return tree
}

function rerender(tree: ReactTestRenderer, setup: Setup) {
  layers = makeLayers(setup)
  act(() => tree.update(<Harness />))
}

const handlers = (): Handlers => (latest.gesture as unknown as { handlers: Handlers }).handlers

const begin = (x: number, y = 100) => act(() => handlers().onBegin({ x, y }))
const move = (x: number, y = 100) => act(() => handlers().onUpdate({ x, y }))
const lift = () => {
  act(() => handlers().onEnd({}, true))
  act(() => handlers().onFinalize({}, true))
}
/** Finishes the animation the release started. */
const finishSettle = () => act(() => mockCompletions.at(-1)?.())

describe("playHapticCue", () => {
  test("the detent is a medium impact, the tick a selection, null nothing", () => {
    playHapticCue("detent")
    expect(medium).toHaveBeenCalledTimes(1)
    expect(tick).not.toHaveBeenCalled()
    playHapticCue("tick")
    expect(tick).toHaveBeenCalledTimes(1)
    expect(medium).toHaveBeenCalledTimes(1)
    playHapticCue(null)
    expect(medium).toHaveBeenCalledTimes(1)
    expect(tick).toHaveBeenCalledTimes(1)
  })
})

describe("entering", () => {
  test("announces the layer, shows the intro hint for HINT_MS and the skipped notice", async () => {
    layers = makeLayers({ swipeMode: false })
    available = () => true
    skipped = 2
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<Harness />)
    })
    expect(latest.introHintVisible).toBe(false)
    expect(latest.skippedVisible).toBe(false)
    expect(mockScreenReader.announce).not.toHaveBeenCalled()
    rerender(tree, { swipeMode: true })
    expect(mockScreenReader.announce).toHaveBeenCalledWith("Changement de fond. Plan, aujourd'hui.")
    expect(latest.introHintVisible).toBe(true)
    expect(latest.skippedVisible).toBe(true)
    act(() => {
      jest.advanceTimersByTime(HINT_MS - 1)
    })
    expect(latest.introHintVisible).toBe(true)
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(latest.introHintVisible).toBe(false)
    expect(latest.skippedVisible).toBe(false)
  })

  test("no skipped notice when every layer is available", () => {
    mount()
    expect(latest.introHintVisible).toBe(true)
    expect(latest.skippedVisible).toBe(false)
  })

  test("leaving the mode drops the gesture and everything drawn", () => {
    const tree = mount()
    begin(380)
    move(330)
    expect(latest.wipe).not.toBeNull()
    rerender(tree, { swipeMode: false })
    expect(latest.wipe).toBeNull()
    expect(latest.fingerDown).toBe(false)
    expect(latest.hintText).toBeNull()
    expect(latest.introHintVisible).toBe(false)
    lift()
    expect(layers.actions.startCompare).not.toHaveBeenCalled()
  })
})

describe("the wipe and its zones", () => {
  test("zones, hints and cues follow the machine as the finger moves", () => {
    mount()
    begin(380)
    expect(latest.fingerDown).toBe(true)
    expect(latest.hintText).toBeNull()
    move(375)
    expect(latest.wipe).toBeNull()
    expect(latest.hintText).toBeNull()
    expect(latest.zone).toBeNull()

    move(330)
    expect(latest.wipe).toEqual({ side: "full", incoming: "satellite" })
    expect(latest.zone).toBe("cancel")
    expect(latest.hintText).toBe("Lâchez pour revenir")
    expect(latest.indicatorLayer).toBe("satellite")
    expect(latest.clipLeft.value).toBe(330)
    expect(latest.clipRight.value).toBe(WIDTH)
    expect(medium).not.toHaveBeenCalled()
    expect(tick).not.toHaveBeenCalled()

    move(240)
    expect(latest.zone).toBe("compare")
    expect(latest.hintText).toBe("Lâchez pour comparer")
    expect(medium).toHaveBeenCalledTimes(1)

    move(272)
    move(256)
    move(272)
    expect(latest.zone).toBe("compare")
    expect(latest.hintText).toBe("Lâchez pour comparer")
    expect(medium).toHaveBeenCalledTimes(1)
    expect(tick).not.toHaveBeenCalled()

    move(100)
    expect(latest.zone).toBe("commit")
    expect(latest.hintText).toBe("Lâchez pour changer de fond")
    expect(tick).toHaveBeenCalledTimes(1)

    move(240)
    expect(latest.zone).toBe("compare")
    expect(medium).toHaveBeenCalledTimes(2)
    expect(tick).toHaveBeenCalledTimes(1)
  })

  test("reversing the drag swaps the incoming layer", () => {
    mount()
    begin(200)
    move(150)
    expect(latest.wipe?.incoming).toBe("satellite")
    move(260)
    expect(latest.wipe).toEqual({ side: "full", incoming: "photos-1950" })
    expect(latest.clipLeft.value).toBe(0)
    expect(latest.clipRight.value).toBe(260)
  })

  test("the hint and the zone go with the finger", () => {
    mount()
    begin(380)
    move(330)
    expect(latest.hintText).not.toBeNull()
    act(() => handlers().onFinalize({}, false))
    expect(latest.fingerDown).toBe(false)
    expect(latest.hintText).toBeNull()
    expect(latest.zone).toBeNull()
  })
})

describe("the release", () => {
  test("in the compare zone it opens the comparison at the release x", () => {
    mount()
    begin(380)
    move(240)
    medium.mockClear()
    lift()
    expect(layers.actions.startCompare).toHaveBeenCalledTimes(1)
    expect(layers.actions.startCompare).toHaveBeenCalledWith({
      sideA: "map",
      sideB: "satellite",
      x: 240,
    })
    expect(medium).toHaveBeenCalledTimes(1)
    expect(tick).not.toHaveBeenCalled()
    expect(mockScreenReader.announce).toHaveBeenLastCalledWith(
      "Comparaison : Plan à gauche, Satellite à droite.",
    )
    expect(latest.wipe).toBeNull()
    expect(latest.fingerDown).toBe(false)
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
  })

  test("dragging right puts the incoming layer on the left", () => {
    mount()
    begin(20)
    move(160)
    lift()
    expect(layers.actions.startCompare).toHaveBeenCalledWith({
      sideA: "photos-1950",
      sideB: "map",
      x: 160,
    })
    expect(mockScreenReader.announce).toHaveBeenLastCalledWith(
      "Comparaison : Photos aériennes à gauche, Plan à droite.",
    )
  })

  test("in the commit zone the strip settles to full width, then the base changes", () => {
    mount()
    begin(380)
    move(100)
    tick.mockClear()
    lift()
    expect(mockTimings).toEqual([
      { to: 0, config: expect.objectContaining({ duration: SETTLE_MS, reduceMotion: "system" }) },
      { to: WIDTH, config: expect.objectContaining({ duration: SETTLE_MS }) },
    ])
    expect(tick).toHaveBeenCalledTimes(1)
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
    // The indicator keeps the incoming layer until the base changes.
    expect(latest.indicatorLayer).toBe("satellite")
    expect(latest.hintText).toBeNull()
    finishSettle()
    expect(layers.actions.commitBase).toHaveBeenCalledTimes(1)
    expect(layers.actions.commitBase).toHaveBeenCalledWith("satellite")
    expect(mockScreenReader.announce).toHaveBeenLastCalledWith("Satellite, aujourd'hui")
    expect(latest.wipe).toBeNull()
    // The guard timer finds the work done.
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(layers.actions.commitBase).toHaveBeenCalledTimes(1)
  })

  test("a completion that never comes is applied by the guard timer", () => {
    mount()
    begin(380)
    move(100)
    lift()
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(SETTLE_MS + 200)
    })
    expect(layers.actions.commitBase).toHaveBeenCalledWith("satellite")
  })

  test("a new touch applies the outcome still settling", () => {
    mount()
    begin(380)
    move(100)
    lift()
    begin(380)
    expect(layers.actions.commitBase).toHaveBeenCalledWith("satellite")
    expect(latest.wipe).toBeNull()
    finishSettle()
    expect(layers.actions.commitBase).toHaveBeenCalledTimes(1)
  })

  test("in the cancel zone the strip springs back and nothing changes", () => {
    mount()
    begin(380)
    move(240)
    move(330)
    medium.mockClear()
    tick.mockClear()
    lift()
    expect(mockTimings.map((timing) => timing.to)).toEqual([WIDTH, WIDTH])
    expect(medium).not.toHaveBeenCalled()
    expect(tick).not.toHaveBeenCalled()
    expect(latest.wipe).not.toBeNull()
    finishSettle()
    expect(latest.wipe).toBeNull()
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
    expect(layers.actions.startCompare).not.toHaveBeenCalled()
    expect(layers.actions.setSide).not.toHaveBeenCalled()
    expect(latest.indicatorLayer).toBe("map")
  })

  test("a started gesture the system cancels springs back", () => {
    mount()
    begin(380)
    move(100)
    tick.mockClear()
    act(() => handlers().onEnd({}, false))
    expect(tick).not.toHaveBeenCalled()
    finishSettle()
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
  })

  test("a started gesture that ends in finalize alone is cancelled", () => {
    mount()
    begin(380)
    move(240)
    act(() => handlers().onFinalize({}, false))
    finishSettle()
    expect(layers.actions.startCompare).not.toHaveBeenCalled()
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
  })

  test("a vertical drag changes nothing", () => {
    mount()
    begin(200, 100)
    move(200, 300)
    lift()
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
  })

  test("events without a gesture do nothing", () => {
    mount()
    act(() => handlers().onUpdate({ x: 100, y: 0 }))
    act(() => handlers().onEnd({}, true))
    act(() => handlers().onFinalize({}, true))
    expect(latest.wipe).toBeNull()
  })

  test("a touch while the mode is off is ignored", () => {
    mount({ swipeMode: false })
    begin(380)
    move(100)
    expect(latest.fingerDown).toBe(false)
    expect(latest.wipe).toBeNull()
  })

  test("an update without coordinates keeps the last position", () => {
    mount()
    begin(380)
    act(() => handlers().onUpdate({}))
    expect(latest.wipe).toBeNull()
    move(330)
    act(() => handlers().onUpdate({}))
    expect(latest.zone).toBe("cancel")
  })
})

describe("Reduce Motion and instant presentations", () => {
  test("Reduce Motion draws no strip, keeps hints and haptics, applies at once", () => {
    setReducedMotion(true)
    mount()
    begin(380)
    move(330)
    expect(latest.wipe).toBeNull()
    expect(latest.hintText).toBe("Lâchez pour revenir")
    expect(latest.indicatorLayer).toBe("satellite")
    move(240)
    expect(latest.hintText).toBe("Lâchez pour comparer")
    expect(medium).toHaveBeenCalledTimes(1)
    move(100)
    expect(latest.hintText).toBe("Lâchez pour changer de fond")
    expect(tick).toHaveBeenCalledTimes(1)
    lift()
    expect(mockTimings).toHaveLength(0)
    expect(layers.actions.commitBase).toHaveBeenCalledWith("satellite")
    expect(tick).toHaveBeenCalledTimes(2)
  })

  test("Reduce Motion: a cancel and a comparison apply at once too", () => {
    setReducedMotion(true)
    mount()
    begin(380)
    move(330)
    lift()
    expect(latest.indicatorLayer).toBe("map")
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
    begin(380)
    move(240)
    lift()
    expect(layers.actions.startCompare).toHaveBeenCalledWith({
      sideA: "map",
      sideB: "satellite",
      x: 240,
    })
    expect(mockTimings).toHaveLength(0)
  })

  test("the instant presentation behaves the same for full-width wipes", () => {
    mockStack.wipe = "instant"
    mount()
    begin(380)
    move(100)
    expect(latest.wipe).toBeNull()
    lift()
    expect(layers.actions.commitBase).toHaveBeenCalledWith("satellite")
    expect(mockTimings).toHaveLength(0)
  })
})

describe("taps", () => {
  test("a tap without a comparison exits the mode", () => {
    mount()
    begin(200)
    move(203)
    lift()
    expect(layers.actions.exitSwipe).toHaveBeenCalledTimes(1)
  })

  test("a touch that never activated ends in finalize and is a tap too", () => {
    mount()
    begin(200)
    act(() => handlers().onFinalize({}, false))
    expect(layers.actions.exitSwipe).toHaveBeenCalledTimes(1)
  })
})

describe("the idle exit", () => {
  test("exits after IDLE_MS without a gesture", () => {
    mount()
    act(() => {
      jest.advanceTimersByTime(IDLE_MS - 1)
    })
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(layers.actions.exitSwipe).toHaveBeenCalledTimes(1)
  })

  test("does not fire while a finger is down, and restarts at the gesture end", () => {
    mount()
    act(() => {
      jest.advanceTimersByTime(IDLE_MS - 1000)
    })
    begin(380)
    move(360)
    act(() => {
      jest.advanceTimersByTime(IDLE_MS * 2)
    })
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
    lift()
    act(() => {
      jest.advanceTimersByTime(IDLE_MS - 1)
    })
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(layers.actions.exitSwipe).toHaveBeenCalledTimes(1)
  })

  test("never fires with a screen reader on", async () => {
    mockScreenReader.enabled = true
    layers = makeLayers()
    available = () => true
    await act(async () => {
      renderer.create(<Harness />)
    })
    act(() => {
      jest.advanceTimersByTime(IDLE_MS * 3)
    })
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
  })

  test("follows the screen reader switching on and off", () => {
    mount()
    act(() => mockScreenReader.listener?.(true))
    act(() => {
      jest.advanceTimersByTime(IDLE_MS * 2)
    })
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
    act(() => mockScreenReader.listener?.(false))
    act(() => {
      jest.advanceTimersByTime(IDLE_MS)
    })
    expect(layers.actions.exitSwipe).toHaveBeenCalledTimes(1)
  })

  test("stops on unmount", () => {
    const tree = mount()
    act(() => tree.unmount())
    expect(mockScreenReader.remove).toHaveBeenCalledTimes(1)
    act(() => {
      jest.advanceTimersByTime(IDLE_MS * 2)
    })
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
  })
})

describe("the accessibility actions", () => {
  test("next and previous commit the neighbour with a tick and announce it", () => {
    mount()
    act(() => latest.next())
    expect(layers.actions.commitBase).toHaveBeenLastCalledWith("satellite")
    expect(tick).toHaveBeenCalledTimes(1)
    expect(mockScreenReader.announce).toHaveBeenLastCalledWith("Satellite, aujourd'hui")
    act(() => latest.previous())
    expect(layers.actions.commitBase).toHaveBeenLastCalledWith("photos-1950")
    expect(mockScreenReader.announce).toHaveBeenLastCalledWith("Photos aériennes, 1950-1965")
    expect(tick).toHaveBeenCalledTimes(2)
  })

  test("an action restarts the idle timer", () => {
    mount()
    act(() => {
      jest.advanceTimersByTime(IDLE_MS - 1)
    })
    act(() => latest.next())
    act(() => {
      jest.advanceTimersByTime(IDLE_MS - 1)
    })
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
  })

  test("next skips the unavailable layers and does nothing when none is left", () => {
    mount()
    available = (key) => key === "map" || key === "carte-1950"
    rerender(mountedTree(), {})
    act(() => latest.next())
    expect(layers.actions.commitBase).toHaveBeenLastCalledWith("carte-1950")
    available = (key) => key === "map"
    rerender(mountedTree(), {})
    ;(layers.actions.commitBase as jest.Mock).mockClear()
    tick.mockClear()
    act(() => latest.next())
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
    expect(tick).not.toHaveBeenCalled()
    expect(latest.compareAvailable).toBe(false)
  })

  test("compareNext starts a comparison with the next layer, line at the middle", () => {
    mount()
    expect(latest.compareAvailable).toBe(true)
    act(() => latest.compareNext())
    expect(layers.actions.startCompare).toHaveBeenCalledWith({
      sideA: "map",
      sideB: "satellite",
      x: WIDTH / 2,
    })
    expect(medium).toHaveBeenCalledTimes(1)
    expect(mockScreenReader.announce).toHaveBeenLastCalledWith(
      "Comparaison : Plan à gauche, Satellite à droite.",
    )
  })

  test("compareNext is not offered when the comparison is not built", () => {
    mockStack.comparison = false
    mount()
    expect(latest.compareAvailable).toBe(false)
    act(() => latest.compareNext())
    expect(layers.actions.startCompare).not.toHaveBeenCalled()
    expect(medium).not.toHaveBeenCalled()
  })

  test("done leaves the swipe mode", () => {
    mount()
    act(() => latest.done())
    expect(layers.actions.exitSwipe).toHaveBeenCalledTimes(1)
  })
})

describe("no other layer offline", () => {
  test("the wipe does not start, no haptic plays, the hint says so", () => {
    mount()
    available = (key) => key === "map"
    rerender(mountedTree(), {})
    begin(380)
    move(330)
    expect(latest.wipe).toBeNull()
    expect(latest.zone).toBeNull()
    expect(latest.hintText).toBe("Aucun autre fond n'est disponible hors connexion ici.")
    expect(latest.indicatorLayer).toBe("map")
    move(100)
    expect(medium).not.toHaveBeenCalled()
    expect(tick).not.toHaveBeenCalled()
    lift()
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
  })
})

describe("the comparison is not built", () => {
  test("full-width wipes keep two zones and a release never compares", () => {
    mockStack.comparison = false
    mount()
    begin(380)
    move(330)
    expect(latest.hintText).toBe("Lâchez pour revenir")
    move(240)
    expect(latest.hintText).toBe("Lâchez pour changer de fond")
    expect(tick).toHaveBeenCalledTimes(1)
    expect(medium).not.toHaveBeenCalled()
    lift()
    finishSettle()
    expect(layers.actions.commitBase).toHaveBeenCalledWith("satellite")
    expect(layers.actions.startCompare).not.toHaveBeenCalled()
  })
})

describe("SwipeSurface", () => {
  test("fills the map area under the pan gesture", () => {
    mount()
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<SwipeSurface gesture={latest.gesture} />)
    })
    const detector = tree.root.findByType("GestureDetector" as never)
    expect(detector.props.gesture).toBe(latest.gesture)
    const surface = tree.root.findByProps({ testID: "swipe-surface" })
    expect(surface.props.style).toEqual({ position: "absolute" })
  })
})

describe("the receded window (immersive effect)", () => {
  test("a drag measured on the window at full progress reveals 0.5 and is in the compare zone", () => {
    windowInputs = { windowProgress: { value: 1 }, windowApplied: true }
    mount()
    // Screen x 388 is the window's right edge (window x 400), screen x 200 its centre.
    begin(388)
    move(330)
    expect(latest.wipe).toEqual({ side: "full", incoming: "satellite" })
    move(200)
    expect(latest.zone).toBe("compare")
    // The strip is cut in the window's own coordinates.
    expect(latest.clipLeft.value).toBeCloseTo(200, 5)
    expect(latest.clipRight.value).toBe(WIDTH)
    lift()
    expect(layers.actions.startCompare).toHaveBeenCalledTimes(1)
    const call = (layers.actions.startCompare as jest.Mock).mock.calls[0][0]
    expect(call.x).toBeCloseTo(200, 5)
  })

  test("mid-entrance the touch is measured with the scale shown at that frame", () => {
    const progress = { value: 0.5 }
    windowInputs = { windowProgress: progress, windowApplied: true }
    mount()
    // Scale 0.88: screen x 394 maps past the window's edge (clamped to 400), x 200 stays at 200.
    begin(394)
    move(340)
    expect(latest.wipe).not.toBeNull()
    move(297)
    expect(latest.clipLeft.value).toBeCloseTo((297 - 200) / 0.88 + 200, 5)
    // The entrance finishes: the same screen x now maps with the final scale.
    progress.value = 1
    move(297)
    expect(latest.clipLeft.value).toBeCloseTo((297 - 200) / 0.76 + 200, 5)
  })

  test("a touch in the margin counts as the nearest edge", () => {
    windowInputs = { windowProgress: { value: 1 }, windowApplied: true }
    mount()
    begin(399)
    move(100)
    // Screen 399 is beyond the window (clamped to 400): the drag runs from the right edge.
    expect(latest.wipe).toEqual({ side: "full", incoming: "satellite" })
    move(1)
    expect(latest.clipLeft.value).toBe(0)
  })

  test("a window that is not applied leaves every x as it is", () => {
    windowInputs = { windowProgress: { value: 1 }, windowApplied: false }
    mount()
    begin(380)
    move(330)
    expect(latest.clipLeft.value).toBe(330)
  })

  test("without a progress value every x is untouched", () => {
    windowInputs = { windowApplied: true }
    mount()
    begin(380)
    move(330)
    expect(latest.clipLeft.value).toBe(330)
  })
})
