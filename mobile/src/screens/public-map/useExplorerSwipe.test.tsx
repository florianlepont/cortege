import React from "react"
import renderer, { act } from "react-test-renderer"

const mockAnnounce = jest.fn()
jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: (text: string) => mockAnnounce(text) },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
}))

jest.mock("../../ui/feedback", () => ({
  feedback: {
    selection: jest.fn(),
    impact: { light: jest.fn(), medium: jest.fn() },
  },
}))

const mockFocus = { value: true }
jest.mock("../../ui/useScreenFocus", () => ({ useScreenFocus: () => mockFocus.value }))
jest.mock("./MapChips", () => ({ MAP_PILL_HEIGHT: 40 }))

const mockStack = { wipe: "wipe", comparison: true }
jest.mock("./map-stack-mode", () => ({
  get WIPE_PRESENTATION() {
    return mockStack.wipe
  },
  get COMPARISON_BUILT() {
    return mockStack.comparison
  },
  LEFT_MAP_ANDROID_VIEW: "texture",
  SIDE_WIPE: "wipe",
}))

// The side change (neighbour search, wipe, cover) is useSideStep's own test: here it is scripted.
const mockSideStep: {
  stepping: unknown
  canStep: jest.Mock
  step: jest.Mock
  onStyleLoaded: jest.Mock
} = { stepping: null, canStep: jest.fn(), step: jest.fn(), onStyleLoaded: jest.fn() }
const mockSideStepParams: unknown[] = []
jest.mock("./useSideStep", () => ({
  useSideStep: (params: unknown) => {
    mockSideStepParams.push(params)
    return mockSideStep
  },
}))

// The second map's camera sync. It keeps its identity.
const mockSyncs: { cameraRef: { current: null }; syncFrom: jest.Mock }[] = []
jest.mock("./MapStack", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    useMapSync: () =>
      ReactRef.useMemo(() => {
        const sync = { cameraRef: { current: null }, syncFrom: jest.fn() }
        mockSyncs.push(sync)
        return sync
      }, []),
  }
})

// The controller (zones, hints, zone haptics) is 28-13's own test: here it is a scripted object.
const mockController: { current: Record<string, unknown> } = { current: {} }
jest.mock("./useBasemapSwipe", () => ({
  useBasemapSwipe: (params: unknown) => {
    mockControllerParams.push(params)
    return mockController.current
  },
}))
const mockControllerParams: unknown[] = []

// The immersive progress values and the platform rule are useImmersive's own test: here they are scripted.
const mockImmersive = {
  window: { value: 0 },
  buttons: { value: 1 },
  applies: true,
  onCalls: [] as boolean[],
}
jest.mock("./useImmersive", () => ({
  useImmersive: (on: boolean) => {
    mockImmersive.onCalls.push(on)
    return { window: mockImmersive.window, buttons: mockImmersive.buttons }
  },
  immersiveApplies: () => mockImmersive.applies,
}))

const mockClip = { lineX: { value: 0 }, clipLeft: { value: 0 }, clipRight: { value: 0 } }
const mockCurtainOptions: Record<string, unknown>[] = []
jest.mock("./useCurtainClip", () => ({
  useCurtainClip: (options: Record<string, unknown>) => {
    mockCurtainOptions.push(options)
    return mockClip
  },
}))

import { feedback } from "../../ui/feedback"
import type { BaseLayerKey } from "../../map/layers"
import {
  INITIAL_MAP_LAYERS_STATE,
  displayedBase,
  layerOfSide,
  secondMapLayer,
  type CompareState,
  type MapLayersState,
} from "./map-layers-state"
import { useExplorerSwipe, type ExplorerSwipe, type ExplorerSwipeInput } from "./useExplorerSwipe"
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

const tick = feedback.selection as jest.Mock
const medium = feedback.impact.medium as jest.Mock

const WIDTH = 400
const HEIGHT = 800
const REGION = { latitude: 48.4, longitude: 2.7, latitudeDelta: 0.02, longitudeDelta: 0.01 }
const controllerClip = { clipLeft: { value: 1 }, clipRight: { value: 2 } }

type Wipe = { side: "full"; incoming: BaseLayerKey } | null

function setController(wipe: Wipe = null, overrides: Record<string, unknown> = {}) {
  mockController.current = {
    gesture: { gesture: true },
    wipe,
    ...controllerClip,
    zone: null,
    hintText: null,
    fingerDown: false,
    indicatorLayer: "map",
    introHintVisible: false,
    skippedVisible: false,
    compareAvailable: true,
    next: jest.fn(),
    previous: jest.fn(),
    compareNext: jest.fn(),
    done: jest.fn(),
    ...overrides,
  }
}

type Setup = {
  base?: BaseLayerKey
  swipeMode?: boolean
  compare?: CompareState | null
  loadingBase?: BaseLayerKey | null
}

function makeLayers({
  base = "map",
  swipeMode = false,
  compare = null,
  loadingBase = null,
}: Setup = {}): MapLayers {
  const state: MapLayersState = { ...INITIAL_MAP_LAYERS_STATE, swipeMode, compare, loadingBase }
  return {
    state,
    displayedBase: displayedBase(state, base),
    secondMapLayer: secondMapLayer(state),
    shownBases: [],
    globeDot: false,
    overlayDot: false,
    layerOfSide: (side) => layerOfSide(state, base, side),
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

// Plan on the left (A), Photos 1950 on the right (B), drawn by the second map; the Explorer keeps Plan.
const compareRight: CompareState = {
  sideA: "map",
  sideB: "photos-1950",
  secondSide: "right",
  x: 220,
}
// Photos 1950 on the left (A) drawn by the second map, Plan on the right (B) kept by the Explorer.
const compareLeft: CompareState = {
  sideA: "photos-1950",
  sideB: "map",
  secondSide: "left",
  x: 180,
}

const jumpTo = jest.fn()
const cameraRef = { current: { jumpTo } } as unknown as ExplorerSwipeInput["cameraRef"]
const closePanels = jest.fn()

type Extra = {
  isAvailable?: (key: string) => boolean
  noticesTop?: number
}

function inputFor(layers: MapLayers, extra: Extra = {}): ExplorerSwipeInput {
  return {
    layers: {
      layers,
      isAvailable: extra.isAvailable ?? (() => true),
      capsuleTop: 58,
      noticesTop: extra.noticesTop ?? 58,
    } as unknown as ExplorerSwipeInput["layers"],
    cameraRef,
    region: REGION,
    closePanels,
    windowTop: 60,
    windowBottom: 140,
  }
}

const result: { current: ExplorerSwipe | null } = { current: null }
const out = () => result.current as ExplorerSwipe

function Probe({ input }: { input: ExplorerSwipeInput }) {
  result.current = useExplorerSwipe(input)
  return null
}

let tree: renderer.ReactTestRenderer

function mount(layers: MapLayers, extra: Extra = {}) {
  act(() => {
    tree = renderer.create(<Probe input={inputFor(layers, extra)} />)
  })
}

function update(layers: MapLayers, extra: Extra = {}) {
  act(() => {
    tree.update(<Probe input={inputFor(layers, extra)} />)
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  mockStack.wipe = "wipe"
  mockStack.comparison = true
  mockFocus.value = true
  mockSyncs.length = 0
  mockControllerParams.length = 0
  mockCurtainOptions.length = 0
  mockImmersive.onCalls.length = 0
  mockImmersive.applies = true
  result.current = null
  setController()
})

afterEach(() => {
  act(() => tree?.unmount())
  jest.useRealTimers()
})

const lastCurtain = () => mockCurtainOptions[mockCurtainOptions.length - 1]

describe("free map, no comparison", () => {
  test("the map is the Explorer's own: nothing frozen, locked or hidden, no stacked map", () => {
    mount(makeLayers())
    expect(out().mapCanvasProps).toEqual({
      frozen: false,
      onViewChange: undefined,
      rotationLocked: false,
      hideMarkers: false,
      androidView: "texture",
    })
    expect(out().layersView.second).toBeNull()
    expect(out().layersView.comparing).toBe(false)
    expect(out().layersView.leftLayer).toBeNull()
    expect(out().quitPillVisible).toBe(false)
    expect(out().noticesTop).toBe(58)
    expect(jumpTo).not.toHaveBeenCalled()
  })

  test("the controller gets the layers, the width and the number of layers the cycle skips", () => {
    mount(makeLayers(), { isAvailable: (key) => key === "map" || key === "satellite" })
    expect(mockControllerParams[0]).toMatchObject({ width: WIDTH })
    expect((mockControllerParams[0] as { skippedCount: number }).skippedCount).toBe(3)
  })

  test("the controller's outputs reach the view untouched, and the skipped pill flag too", () => {
    setController(null, { hintText: "Lâchez pour comparer", skippedVisible: true })
    mount(makeLayers({ swipeMode: true }))
    const { controller } = out().layersView
    expect(controller).toBe(mockController.current)
    expect(controller.hintText).toBe("Lâchez pour comparer")
    expect(out().skippedVisible).toBe(true)
    expect(out().layersView).toMatchObject({ width: WIDTH, height: HEIGHT, initialRegion: REGION })
  })
})

describe("the swipe mode", () => {
  test("freezes the map, puts it north up once, and leaves the notices at the top", () => {
    mount(makeLayers({ swipeMode: true }))
    expect(out().mapCanvasProps.frozen).toBe(true)
    expect(jumpTo).toHaveBeenCalledTimes(1)
    expect(jumpTo).toHaveBeenCalledWith({ center: [2.7, 48.4], bearing: 0, pitch: 0 })
    // The swipe mode's info row is at the bottom: the notices keep their own top.
    expect(out().noticesTop).toBe(58)
  })

  test("never lifts the notices above their own top (a chip row lower than the stack)", () => {
    mount(makeLayers({ swipeMode: true }), { noticesTop: 400 })
    expect(out().noticesTop).toBe(400)
  })

  test("the globe closes the panels, then toggles the swipe mode", () => {
    const layers = makeLayers()
    mount(layers)
    act(() => out().toggleSwipe())
    expect(closePanels).toHaveBeenCalledTimes(1)
    expect(layers.actions.toggleSwipe).toHaveBeenCalledTimes(1)
    expect(closePanels.mock.invocationCallOrder[0]).toBeLessThan(
      (layers.actions.toggleSwipe as jest.Mock).mock.invocationCallOrder[0],
    )
  })

  test("opening a panel, or losing the screen's focus, ends the swipe mode and nothing else", () => {
    const layers = makeLayers({ swipeMode: true })
    mount(layers)
    act(() => out().onPanelOpen())
    expect(layers.actions.exitSwipe).toHaveBeenCalledTimes(1)
    expect(layers.actions.quitCompare).not.toHaveBeenCalled()
    mockFocus.value = false
    update(layers)
    expect(layers.actions.exitSwipe).toHaveBeenCalledTimes(2)
  })

  test("a focused screen does not exit by itself", () => {
    const layers = makeLayers({ swipeMode: true })
    mount(layers)
    expect(layers.actions.exitSwipe).not.toHaveBeenCalled()
  })
})

describe("a full wipe, its cover and the comparison it turns into", () => {
  test("the incoming layer is the second map, cut by the controller's strip", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    const second = out().layersView.second
    expect(second?.layer).toBe("satellite")
    expect(second?.clipLeft).toBe(controllerClip.clipLeft)
    expect(second?.clipRight).toBe(controllerClip.clipRight)
    expect(second?.cameraRef).toBe(mockSyncs[0].cameraRef)
    expect(typeof out().mapCanvasProps.onViewChange).toBe("function")
  })

  test("the Explorer map's view reaches the stacked maps", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    const event = { nativeEvent: { center: [1, 2], zoom: 12 } }
    act(() => out().mapCanvasProps.onViewChange?.(event as never))
    // The second and the third map each have a sync; both follow the Explorer map.
    expect(mockSyncs).toHaveLength(2)
    for (const sync of mockSyncs) expect(sync.syncFrom).toHaveBeenCalledWith(event)
  })

  test("with an instant presentation no stacked map is mounted during a gesture", () => {
    mockStack.wipe = "instant"
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    expect(out().layersView.second).toBeNull()
    expect(out().mapCanvasProps.onViewChange).toBeUndefined()
  })

  test("a committed base stays covered by the stacked map until the Explorer map has loaded it", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    setController(null)
    update(makeLayers({ swipeMode: true, base: "satellite", loadingBase: "satellite" }))
    const second = out().layersView.second
    expect(second?.layer).toBe("satellite")
    expect(second?.clipLeft).toBe(controllerClip.clipLeft)
    act(() => out().onBaseStyleLoaded())
    expect(out().layersView.second).toBeNull()
    expect(out().mapCanvasProps.onViewChange).toBeUndefined()
  })

  test("the cover also goes when the layers state says the Explorer map is done", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    setController(null)
    update(makeLayers({ swipeMode: true, base: "satellite", loadingBase: "satellite" }))
    expect(out().layersView.second).not.toBeNull()
    update(makeLayers({ swipeMode: true, base: "satellite", loadingBase: null }))
    expect(out().layersView.second).toBeNull()
  })

  test("a cover nobody reports on is dropped after a while", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    setController(null)
    const covered = makeLayers({ swipeMode: true, base: "satellite", loadingBase: "satellite" })
    update(covered)
    act(() => {
      jest.advanceTimersByTime(7999)
    })
    expect(out().layersView.second).not.toBeNull()
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(out().layersView.second).toBeNull()
  })

  test("a cancelled wipe leaves nothing mounted", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    setController(null)
    update(makeLayers({ swipeMode: true }))
    expect(out().layersView.second).toBeNull()
  })

  test("a release in the middle turns the wipe's map into the curtain's second map", () => {
    setController({ side: "full", incoming: "photos-1950" })
    const free = makeLayers({ swipeMode: true })
    mount(free)
    setController(null)
    update(makeLayers({ compare: compareRight }))
    const second = out().layersView.second
    expect(second?.layer).toBe("photos-1950")
    expect(second?.clipLeft).toBe(mockClip.clipLeft)
    expect(second?.clipRight).toBe(mockClip.clipRight)
    // The same camera sync: the map was not remounted for a new one.
    expect(second?.cameraRef).toBe(mockSyncs[0].cameraRef)
    expect(out().layersView.comparing).toBe(true)
    expect(out().layersView.leftLayer).toBe("map")
    expect(out().layersView.rightLayer).toBe("photos-1950")
    expect(out().layersView.lineX).toBe(mockClip.lineX)
  })

  test("the curtain gets the comparison, the width and a right slide", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(lastCurtain()).toMatchObject({
      compare: compareRight,
      width: WIDTH,
      phase: "active",
      leaveTo: "right",
    })
    expect(typeof lastCurtain().onLeft).toBe("function")
  })

  test("a comparison started on a finger release: north up again, markers hidden, map free", () => {
    mount(makeLayers({ swipeMode: true }))
    expect(jumpTo).toHaveBeenCalledTimes(1)
    expect(out().mapCanvasProps.frozen).toBe(true)
    // The layers state ends the swipe mode in the same change as it starts the comparison.
    update(makeLayers({ compare: compareRight }))
    expect(jumpTo).toHaveBeenCalledTimes(2)
    expect(jumpTo).toHaveBeenLastCalledWith({ center: [2.7, 48.4], bearing: 0, pitch: 0 })
    expect(out().mapCanvasProps).toMatchObject({
      frozen: false,
      rotationLocked: true,
      hideMarkers: true,
    })
    expect(out().layersView.swipeMode).toBe(false)
  })

  test("a new comparison drops a cover left over from before", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    setController(null)
    update(makeLayers({ swipeMode: true, base: "satellite", loadingBase: "satellite" }))
    update(makeLayers({ base: "satellite", compare: compareRight }))
    update(makeLayers({ base: "satellite" }))
    expect(out().layersView.second).toBeNull()
  })

  test("with the comparison not built nothing of the curtain exists", () => {
    mockStack.comparison = false
    mount(makeLayers({ compare: compareRight }))
    expect(out().layersView.comparing).toBe(false)
    expect(out().layersView.second).toBeNull()
    expect(out().quitPillVisible).toBe(false)
    expect(out().mapCanvasProps).toMatchObject({ rotationLocked: false, hideMarkers: false })
    expect(lastCurtain().compare).toBeNull()
  })
})

describe("leaving a comparison by an edge", () => {
  test("keeping the layer the Explorer map draws ends it at once, no cover, one tick", () => {
    const layers = makeLayers({ compare: compareRight })
    mount(layers)
    act(() => out().layersView.onEdgeExit("A"))
    expect(layers.actions.quitCompare).toHaveBeenCalledWith("A")
    expect(tick).toHaveBeenCalledTimes(1)
    expect(medium).not.toHaveBeenCalled()
    update(makeLayers())
    expect(out().layersView.second).toBeNull()
    // The same on the other geometry: B is the Explorer's when the second map draws the left side.
    const other = makeLayers({ compare: compareLeft })
    update(other)
    act(() => out().layersView.onEdgeExit("B"))
    expect(other.actions.quitCompare).toHaveBeenCalledWith("B")
    update(makeLayers())
    expect(out().layersView.second).toBeNull()
  })

  test("keeping the second map's layer keeps it covering until the Explorer map has loaded it", () => {
    const layers = makeLayers({ compare: compareRight })
    mount(layers)
    act(() => out().layersView.onEdgeExit("B"))
    expect(layers.actions.quitCompare).toHaveBeenCalledWith("B")
    expect(tick).toHaveBeenCalledTimes(1)
    // The comparison is over; the second map still draws the kept layer, full width.
    update(makeLayers({ base: "photos-1950" }))
    expect(out().layersView.second?.layer).toBe("photos-1950")
    expect(out().layersView.second?.clipLeft).toBe(mockClip.clipLeft)
    expect(lastCurtain()).toMatchObject({ compare: null, phase: "covering" })
    act(() => out().onBaseStyleLoaded())
    expect(out().layersView.second).toBeNull()
    expect(lastCurtain().phase).toBe("active")
  })

  test("the same with the second map on the left, keeping A", () => {
    const layers = makeLayers({ compare: compareLeft })
    mount(layers)
    act(() => out().layersView.onEdgeExit("A"))
    expect(layers.actions.quitCompare).toHaveBeenCalledWith("A")
    update(makeLayers({ base: "photos-1950" }))
    expect(out().layersView.second?.layer).toBe("photos-1950")
  })

  test("without a comparison an edge exit does nothing, and plays nothing", () => {
    const layers = makeLayers()
    mount(layers)
    act(() => out().layersView.onEdgeExit("A"))
    expect(layers.actions.quitCompare).not.toHaveBeenCalled()
    expect(tick).not.toHaveBeenCalled()
  })

  test("an exit zone shows the quit hint, leaving it clears it; the hook plays no haptic for it", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(out().layersView.quitHint).toBeNull()
    act(() => out().layersView.onExitZone("B"))
    expect(out().layersView.quitHint).toBe("Lâchez pour quitter la comparaison")
    act(() => out().layersView.onExitZone("A"))
    expect(out().layersView.quitHint).toBe("Lâchez pour quitter la comparaison")
    act(() => out().layersView.onExitZone(null))
    expect(out().layersView.quitHint).toBeNull()
    expect(tick).not.toHaveBeenCalled()
    expect(medium).not.toHaveBeenCalled()
  })

  test("the end of the comparison clears the hint, and a new one does not inherit it", () => {
    mount(makeLayers({ compare: compareRight }))
    act(() => out().layersView.onExitZone("B"))
    update(makeLayers())
    expect(out().layersView.quitHint).toBeNull()
    update(makeLayers({ compare: compareRight }))
    expect(out().layersView.quitHint).toBeNull()
  })

  test("the drag of the grabber is reported to the tags, and the comparison ending clears it", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(out().layersView.lineDragging).toBe(false)
    act(() => out().layersView.onLineDragging(true))
    expect(out().layersView.lineDragging).toBe(true)
    act(() => out().layersView.onLineDragging(false))
    expect(out().layersView.lineDragging).toBe(false)
    act(() => out().layersView.onLineDragging(true))
    update(makeLayers())
    expect(out().layersView.lineDragging).toBe(false)
  })

  test("without a comparison an exit zone shows nothing", () => {
    mount(makeLayers())
    act(() => out().layersView.onExitZone("A"))
    expect(out().layersView.quitHint).toBeNull()
  })
})

describe("Quitter la comparaison", () => {
  test("shows exactly while comparing, level with the capsule", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(out().quitPillVisible).toBe(true)
    expect(out().noticesTop).toBe(58 + 40 + 8)
    update(makeLayers())
    expect(out().quitPillVisible).toBe(false)
    update(makeLayers({ swipeMode: true }))
    expect(out().quitPillVisible).toBe(false)
  })

  test("the map is free in a comparison: not frozen, rotation locked, markers hidden", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(out().mapCanvasProps).toMatchObject({
      frozen: false,
      rotationLocked: true,
      hideMarkers: true,
    })
    expect(typeof out().mapCanvasProps.onViewChange).toBe("function")
  })

  test("slides the line to the right edge, then keeps side A; one tick", () => {
    const layers = makeLayers({ compare: compareRight })
    mount(layers)
    act(() => out().quit())
    expect(tick).toHaveBeenCalledTimes(1)
    expect(layers.actions.quitCompare).not.toHaveBeenCalled()
    expect(lastCurtain().phase).toBe("leaving")
    act(() => (lastCurtain().onLeft as () => void)())
    expect(layers.actions.quitCompare).toHaveBeenCalledTimes(1)
    expect(layers.actions.quitCompare).toHaveBeenCalledWith("A")
    expect(lastCurtain().phase).toBe("active")
    expect(tick).toHaveBeenCalledTimes(1)
  })

  test("side A drawn by the Explorer map: nothing to cover once the line is out", () => {
    mount(makeLayers({ compare: compareRight }))
    act(() => out().quit())
    act(() => (lastCurtain().onLeft as () => void)())
    update(makeLayers())
    expect(out().layersView.second).toBeNull()
  })

  test("side A drawn by the second map: it covers the width until the Explorer map has loaded it", () => {
    mount(makeLayers({ compare: compareLeft }))
    act(() => out().quit())
    act(() => (lastCurtain().onLeft as () => void)())
    update(makeLayers({ base: "photos-1950" }))
    expect(out().layersView.second?.layer).toBe("photos-1950")
    expect(lastCurtain().phase).toBe("covering")
    act(() => out().onBaseStyleLoaded())
    expect(out().layersView.second).toBeNull()
  })

  test("a comparison that ends meanwhile stops the slide", () => {
    mount(makeLayers({ compare: compareRight }))
    act(() => out().quit())
    expect(lastCurtain().phase).toBe("leaving")
    update(makeLayers())
    expect(lastCurtain().phase).toBe("active")
  })

  test("without a comparison it does nothing and plays nothing", () => {
    mount(makeLayers())
    act(() => out().quit())
    expect(tick).not.toHaveBeenCalled()
    expect(lastCurtain().phase).toBe("active")
  })
})

describe("the side change", () => {
  const stepping = {
    side: "right",
    layer: "etat-major",
    clipLeft: { value: 200 },
    clipRight: { value: 400 },
  }

  beforeEach(() => {
    mockSideStep.stepping = null
    mockSideStep.canStep = jest.fn(() => true)
    mockSideStep.step = jest.fn()
    mockSideStep.onStyleLoaded = jest.fn()
    mockSideStepParams.length = 0
  })

  test("it is given the layers state, the availability and the width", () => {
    const layers = makeLayers({ compare: compareRight })
    const isAvailable = (key: string) => key !== "etat-major"
    mount(layers, { isAvailable })
    expect(mockSideStepParams.at(-1)).toMatchObject({ layers, isAvailable, width: WIDTH })
  })

  test("the tags get the step rule and the step action of the side change", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(out().layersView.canStep).toBe(mockSideStep.canStep)
    expect(out().layersView.onStep).toBe(mockSideStep.step)
  })

  test("there is no third map without a side change", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(out().layersView.third).toBeNull()
  })

  test("a side change under way mounts the third map with its strip and its own camera sync", () => {
    mockSideStep.stepping = stepping
    mount(makeLayers({ compare: compareRight }))
    const { second, third } = out().layersView
    expect(third).toMatchObject({
      layer: "etat-major",
      clipLeft: stepping.clipLeft,
      clipRight: stepping.clipRight,
    })
    // Neither stacked map shares the camera ref of the other.
    expect(third?.cameraRef).not.toBe(second?.cameraRef)
    expect(third?.cameraRef).toBe(mockSyncs[mockSyncs.length - 1].cameraRef)
  })

  test("both stacked maps follow the Explorer map while a side change shows the third", () => {
    mockSideStep.stepping = stepping
    mount(makeLayers({ compare: compareRight }))
    const onViewChange = out().mapCanvasProps.onViewChange as (event: unknown) => void
    const event = { nativeEvent: { center: [2.7, 48.4], zoom: 12 } }
    onViewChange(event)
    const used = mockSyncs.filter((sync) => sync.syncFrom.mock.calls.length > 0)
    expect(used).toHaveLength(2)
    for (const sync of used) expect(sync.syncFrom).toHaveBeenCalledWith(event)
  })

  test("the third map alone is enough to follow the Explorer map", () => {
    mockSideStep.stepping = stepping
    mount(makeLayers())
    expect(out().mapCanvasProps.onViewChange).toBeDefined()
  })

  test("the Explorer map's style load goes to the side change and drops a cover", () => {
    mount(makeLayers({ compare: compareRight }))
    act(() => out().onBaseStyleLoaded())
    expect(mockSideStep.onStyleLoaded).toHaveBeenCalledWith("base")
  })

  test("the second map's style load goes to the side change only", () => {
    mount(makeLayers({ compare: compareRight }))
    act(() => out().onSecondStyleLoaded())
    expect(mockSideStep.onStyleLoaded).toHaveBeenCalledWith("second")
    expect(mockSideStep.onStyleLoaded).toHaveBeenCalledTimes(1)
  })

  test("a side change plays no haptic here: the side step owns it", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(tick).not.toHaveBeenCalled()
    expect(mockAnnounce).not.toHaveBeenCalled()
  })
})

describe("the actions after the controller", () => {
  test("it adds no zone rule: the exit tick of a release is the only haptic it plays", () => {
    mount(makeLayers({ compare: compareRight }))
    act(() => out().layersView.onExitZone("B"))
    expect(tick).not.toHaveBeenCalled()
    expect(medium).not.toHaveBeenCalled()
  })
})

describe("the immersive effect", () => {
  test("is off at rest: the buttons are not hidden and the controller gets the window", () => {
    mount(makeLayers())
    expect(mockImmersive.onCalls.every((on) => on === false)).toBe(true)
    expect(out().immersive).toEqual({
      window: mockImmersive.window,
      buttons: mockImmersive.buttons,
      applied: true,
      // 800 tall, 60 from the top, 140 from the bottom: 600 left, so 0.75, centred 40 up.
      target: { scaleX: expect.closeTo(0.825, 6), scaleY: 0.75, shiftY: -40 },
      buttonsHidden: false,
    })
    expect(mockControllerParams[0]).toMatchObject({
      windowProgress: mockImmersive.window,
      windowApplied: true,
      windowScale: expect.closeTo(0.825, 6),
    })
  })

  test("the swipe mode turns it on and hides the buttons", () => {
    mount(makeLayers({ swipeMode: true }))
    expect(mockImmersive.onCalls.every((on) => on === true)).toBe(true)
    expect(out().immersive.buttonsHidden).toBe(true)
  })

  test("the comparison never turns it on", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(mockImmersive.onCalls.every((on) => on === false)).toBe(true)
    expect(out().immersive.buttonsHidden).toBe(false)
  })

  test("the swipe mode ending (a compare release, Terminé) turns it off", () => {
    mount(makeLayers({ swipeMode: true }))
    update(makeLayers({ swipeMode: false, compare: compareRight }))
    expect(mockImmersive.onCalls.at(-1)).toBe(false)
    expect(out().immersive.buttonsHidden).toBe(false)
  })

  test("a platform that cannot clip the map keeps the window at full size (applied false)", () => {
    mockImmersive.applies = false
    mount(makeLayers({ swipeMode: true }))
    expect(out().immersive.applied).toBe(false)
    expect(out().immersive.buttonsHidden).toBe(true)
    expect(mockControllerParams[0]).toMatchObject({ windowApplied: false })
  })
})
