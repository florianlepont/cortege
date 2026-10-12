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

const mockStack = { wipe: "wipe", comparison: true, side: "wipe" }
jest.mock("./map-stack-mode", () => ({
  get WIPE_PRESENTATION() {
    return mockStack.wipe
  },
  get COMPARISON_BUILT() {
    return mockStack.comparison
  },
  get SIDE_WIPE() {
    return mockStack.side
  },
  LEFT_MAP_ANDROID_VIEW: "texture",
}))

// Two stacked-map syncs per render, the second map's first. They keep their identity.
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

type Wipe = { side: "full" | "left" | "right"; incoming: BaseLayerKey } | null

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
      moveLine: jest.fn(),
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
  mockStack.side = "wipe"
  mockFocus.value = true
  mockSyncs.length = 0
  mockControllerParams.length = 0
  mockCurtainOptions.length = 0
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
    expect(out().layersView.third).toBeNull()
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
  test("freezes the map, puts it north up once, and moves the notices below the swipe stack", () => {
    mount(makeLayers({ swipeMode: true }))
    expect(out().mapCanvasProps.frozen).toBe(true)
    expect(jumpTo).toHaveBeenCalledTimes(1)
    expect(jumpTo).toHaveBeenCalledWith({ center: [2.7, 48.4], bearing: 0, pitch: 0 })
    // Before the stack is measured: an estimate; then the drawn height.
    expect(out().noticesTop).toBe(58 + 100 + 8)
    act(() => out().layersView.onTopControlHeight(132))
    expect(out().noticesTop).toBe(58 + 132 + 8)
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
    expect(out().layersView.third).toBeNull()
    expect(typeof out().mapCanvasProps.onViewChange).toBe("function")
  })

  test("the Explorer map's view reaches the stacked maps", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    const event = { nativeEvent: { center: [1, 2], zoom: 12 } }
    act(() => out().mapCanvasProps.onViewChange?.(event as never))
    expect(mockSyncs[0].syncFrom).toHaveBeenCalledWith(event)
    expect(mockSyncs[1].syncFrom).toHaveBeenCalledWith(event)
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
    // Another style loading does not matter; the Explorer's own does.
    act(() => out().onSecondStyleLoaded())
    expect(out().layersView.second).not.toBeNull()
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
    update(makeLayers({ swipeMode: true, compare: compareRight }))
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

  test("a comparison started on a finger release: north up again, markers hidden, silently", () => {
    mount(makeLayers({ swipeMode: true }))
    expect(jumpTo).toHaveBeenCalledTimes(1)
    update(makeLayers({ swipeMode: true, compare: compareRight }))
    expect(jumpTo).toHaveBeenCalledTimes(2)
    expect(jumpTo).toHaveBeenLastCalledWith({ center: [2.7, 48.4], bearing: 0, pitch: 0 })
    expect(out().mapCanvasProps).toMatchObject({
      frozen: true,
      rotationLocked: true,
      hideMarkers: true,
    })
  })

  test("a new comparison drops a cover left over from before", () => {
    setController({ side: "full", incoming: "satellite" })
    mount(makeLayers({ swipeMode: true }))
    setController(null)
    update(makeLayers({ swipeMode: true, base: "satellite", loadingBase: "satellite" }))
    update(makeLayers({ swipeMode: true, base: "satellite", compare: compareRight }))
    update(makeLayers({ swipeMode: true, base: "satellite" }))
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

describe("a side wipe", () => {
  test("mounts the third map, cut by the controller's strip, over the curtain's second map", () => {
    setController({ side: "left", incoming: "etat-major" })
    mount(makeLayers({ swipeMode: true, compare: compareRight }))
    expect(out().layersView.second?.layer).toBe("photos-1950")
    expect(out().layersView.second?.clipLeft).toBe(mockClip.clipLeft)
    const third = out().layersView.third
    expect(third?.layer).toBe("etat-major")
    expect(third?.clipLeft).toBe(controllerClip.clipLeft)
    expect(third?.cameraRef).toBe(mockSyncs[1].cameraRef)
  })

  test("with an instant side presentation no third map is mounted", () => {
    mockStack.side = "instant"
    setController({ side: "left", incoming: "etat-major" })
    mount(makeLayers({ swipeMode: true, compare: compareRight }))
    expect(out().layersView.third).toBeNull()
    expect(out().layersView.second).not.toBeNull()
  })

  test("a committed side the Explorer map draws stays covered until the Explorer map has loaded it", () => {
    setController({ side: "left", incoming: "etat-major" })
    mount(makeLayers({ swipeMode: true, compare: compareRight }))
    setController(null)
    update(makeLayers({ swipeMode: true, compare: { ...compareRight, sideA: "etat-major" } }))
    expect(out().layersView.third?.layer).toBe("etat-major")
    // The second map loading is not what this side waits for.
    act(() => out().onSecondStyleLoaded())
    expect(out().layersView.third).not.toBeNull()
    act(() => out().onBaseStyleLoaded())
    expect(out().layersView.third).toBeNull()
  })

  test("a committed side the second map draws stays covered until the second map has loaded it", () => {
    setController({ side: "right", incoming: "carte-1950" })
    mount(makeLayers({ swipeMode: true, compare: compareRight }))
    setController(null)
    update(makeLayers({ swipeMode: true, compare: { ...compareRight, sideB: "carte-1950" } }))
    expect(out().layersView.third?.layer).toBe("carte-1950")
    act(() => out().onBaseStyleLoaded())
    expect(out().layersView.third).not.toBeNull()
    act(() => out().onSecondStyleLoaded())
    expect(out().layersView.third).toBeNull()
  })

  test("a cancelled side wipe, or a side that changed back, leaves no third map", () => {
    setController({ side: "left", incoming: "etat-major" })
    mount(makeLayers({ swipeMode: true, compare: compareRight }))
    setController(null)
    update(makeLayers({ swipeMode: true, compare: compareRight }))
    expect(out().layersView.third).toBeNull()
  })

  test("a side cover is not kept once the comparison is gone", () => {
    setController({ side: "left", incoming: "etat-major" })
    mount(makeLayers({ swipeMode: true, compare: compareRight }))
    setController(null)
    update(makeLayers({ swipeMode: true, compare: { ...compareRight, sideA: "etat-major" } }))
    expect(out().layersView.third).not.toBeNull()
    update(makeLayers({ swipeMode: true }))
    expect(out().layersView.third).toBeNull()
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

  test("a line released away from the edges is just reported: no haptic", () => {
    const layers = makeLayers({ compare: compareRight })
    mount(layers)
    act(() => out().layersView.onMoveLine(250))
    expect(layers.actions.moveLine).toHaveBeenCalledWith(250)
    expect(tick).not.toHaveBeenCalled()
    expect(medium).not.toHaveBeenCalled()
  })
})

describe("Quitter la comparaison", () => {
  test("shows only while comparing with the swipe mode off, level with the capsule", () => {
    mount(makeLayers({ compare: compareRight }))
    expect(out().quitPillVisible).toBe(true)
    expect(out().noticesTop).toBe(58 + 40 + 8)
    update(makeLayers({ compare: compareRight, swipeMode: true }))
    expect(out().quitPillVisible).toBe(false)
    update(makeLayers())
    expect(out().quitPillVisible).toBe(false)
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

describe("the handle's side actions (accessibility)", () => {
  test("change one side to its neighbour, never the other side's layer, with one tick", () => {
    const layers = makeLayers({ compare: compareRight })
    mount(layers)
    act(() => out().layersView.onSideAction("left", 1))
    // Left is Plan: the next is Satellite.
    expect(layers.actions.setSide).toHaveBeenCalledWith("A", "satellite")
    expect(tick).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith("Satellite, aujourd'hui")
    act(() => out().layersView.onSideAction("right", -1))
    // Right is Photos 1950: the previous is Carte de 1950.
    expect(layers.actions.setSide).toHaveBeenLastCalledWith("B", "carte-1950")
    act(() => out().layersView.onSideAction("left", -1))
    // Left is Plan: the previous wraps to Photos 1950, which the right side shows: skipped.
    expect(layers.actions.setSide).toHaveBeenLastCalledWith("A", "carte-1950")
  })

  test("a side with no other layer to go to is left alone", () => {
    const layers = makeLayers({ compare: compareRight })
    mount(layers, { isAvailable: (key) => key === "map" || key === "photos-1950" })
    act(() => out().layersView.onSideAction("left", 1))
    expect(layers.actions.setSide).not.toHaveBeenCalled()
    expect(tick).not.toHaveBeenCalled()
    expect(mockAnnounce).not.toHaveBeenCalled()
  })
})

describe("the actions after the controller", () => {
  test("it adds no zone rule: the line and its release are the only haptics it plays", () => {
    mount(makeLayers({ swipeMode: true, compare: compareRight }))
    act(() => out().layersView.onMoveLine(100))
    expect(tick).not.toHaveBeenCalled()
    expect(medium).not.toHaveBeenCalled()
  })
})
