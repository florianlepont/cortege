import React from "react"
import renderer, { act } from "react-test-renderer"

const mockAnnounce = jest.fn()
jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: (text: string) => mockAnnounce(text) },
}))

jest.mock("../../ui/feedback", () => ({
  feedback: {
    selection: jest.fn(),
    impact: { light: jest.fn(), medium: jest.fn() },
  },
}))

const mockStack = { sideWipe: "wipe" }
jest.mock("./map-stack-mode", () => ({
  get SIDE_WIPE() {
    return mockStack.sideWipe
  },
}))

// The shared Reanimated mock, with shared values that keep their identity across renders (the real
// ones do) and a `withTiming` that records its target, configuration and completion callback. A
// timing assigned to a shared value is an animation that has not moved yet: the value keeps what it
// had (the strip's start), as on a device at the first frame.
type Timing = { to: number; config: Record<string, unknown>; done?: (finished?: boolean) => void }
const mockTimings: Timing[] = []
const mockCancelled: unknown[] = []
jest.mock("react-native-reanimated", () => {
  const ReactRef = require("react") as typeof import("react")
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as Record<
    string,
    unknown
  >
  return {
    ...shared,
    __esModule: true,
    useSharedValue: <T,>(initial: T) =>
      ReactRef.useRef(
        (() => {
          let held = initial
          return {
            get value() {
              return held
            },
            set value(next: T) {
              if (!(next as { animation?: boolean })?.animation) held = next
            },
          }
        })(),
      ).current,
    withTiming: (to: number, config: Record<string, unknown>, done?: Timing["done"]) => {
      mockTimings.push({ to, config, done })
      return { animation: true }
    },
    cancelAnimation: (value: unknown) => mockCancelled.push(value),
  }
})

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import type { BaseLayerKey } from "../../map/layers"
import { feedback } from "../../ui/feedback"
import {
  INITIAL_MAP_LAYERS_STATE,
  displayedBase,
  layerOfSide,
  secondMapLayer,
  type CompareState,
  type MapLayersState,
} from "./map-layers-state"
import { useSideStep, type SideStep } from "./useSideStep"
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
  mockTimings.length = 0
  mockCancelled.length = 0
  mockAnnounce.mockClear()
  mockStack.sideWipe = "wipe"
  ;(feedback.selection as jest.Mock).mockClear()
  setReducedMotion(false)
})

afterEach(() => {
  setReducedMotion(false)
  jest.useRealTimers()
})

const WIDTH = 400
const selection = feedback.selection as jest.Mock

function makeLayers(compare: CompareState | null): MapLayers {
  const state: MapLayersState = { ...INITIAL_MAP_LAYERS_STATE, compare }
  return {
    state,
    displayedBase: displayedBase(state, "map"),
    secondMapLayer: secondMapLayer(state),
    shownBases: [],
    globeDot: false,
    overlayDot: false,
    layerOfSide: (side) => layerOfSide(state, "map", side),
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

// Plan on the left (A), Satellite on the right (B) drawn by the second map.
const planSatellite: CompareState = {
  sideA: "map",
  sideB: "satellite",
  secondSide: "right",
  x: 200,
}
// The same sides, the Explorer map drawing the right one (the second map draws the left one).
const satellitePlan: CompareState = {
  sideA: "satellite",
  sideB: "map",
  secondSide: "left",
  x: 200,
}

const result: { current: SideStep | null } = { current: null }
const out = () => result.current as SideStep

function Probe(props: {
  layers: MapLayers
  isAvailable?: (key: BaseLayerKey) => boolean
  width?: number
}) {
  result.current = useSideStep({
    layers: props.layers,
    isAvailable: props.isAvailable ?? (() => true),
    width: props.width ?? WIDTH,
  })
  return null
}

const mounted: renderer.ReactTestRenderer[] = []

afterEach(() => {
  // Unmount first, so no cover timer outlives its test.
  for (const tree of mounted.splice(0)) act(() => tree.unmount())
})

function mount(layers: MapLayers, isAvailable?: (key: BaseLayerKey) => boolean) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<Probe layers={layers} isAvailable={isAvailable} />)
  })
  mounted.push(tree)
  return {
    tree,
    update: (next: MapLayers, available = isAvailable) =>
      act(() => tree.update(<Probe layers={next} isAvailable={available} />)),
  }
}

const strip = () => [out().stepping?.clipLeft.value, out().stepping?.clipRight.value]
const finishTiming = (index = mockTimings.length - 1, finished = true) =>
  act(() => mockTimings[index].done?.(finished))

describe("canStep", () => {
  it("is true when another layer is available for the side", () => {
    mount(makeLayers(planSatellite))
    expect(out().canStep("left")).toBe(true)
    expect(out().canStep("right")).toBe(true)
  })

  it("leaves out the other side's layer and the unavailable ones", () => {
    mount(makeLayers(planSatellite), (key) => key === "map" || key === "satellite")
    expect(out().canStep("left")).toBe(false)
    expect(out().canStep("right")).toBe(false)
    mount(makeLayers(planSatellite), (key) => key !== "etat-major" && key !== "photos-1950")
    expect(out().canStep("left")).toBe(true)
  })

  it("is false without a comparison", () => {
    mount(makeLayers(null))
    expect(out().canStep("left")).toBe(false)
  })
})

describe("step", () => {
  it("wipes the next layer into the right half and sets the side once the timing is done", () => {
    const layers = makeLayers(planSatellite)
    mount(layers)
    act(() => out().step("right", 1))
    expect(selection).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith("Côté droit : Carte d'état-major, 1820-1866")
    expect(out().stepping).toMatchObject({ side: "right", layer: "etat-major" })
    expect(strip()).toEqual([400, 400])
    expect(mockTimings).toHaveLength(1)
    expect(mockTimings[0].to).toBe(200)
    expect(mockTimings[0].config).toMatchObject({ duration: 240, reduceMotion: "system" })
    expect(typeof mockTimings[0].config.easing).toBe("function")
    expect(layers.actions.setSide).not.toHaveBeenCalled()
    finishTiming()
    expect(layers.actions.setSide).toHaveBeenCalledTimes(1)
    expect(layers.actions.setSide).toHaveBeenCalledWith("B", "etat-major")
    expect(out().stepping).toMatchObject({ side: "right", layer: "etat-major" })
    expect(layers.actions.commitBase).not.toHaveBeenCalled()
  })

  it("enters the previous layer from the half's left bound on the left side", () => {
    const layers = makeLayers(planSatellite)
    mount(layers)
    act(() => out().step("left", -1))
    // Plan, going back from the start of the cycle, wraps to the last layer; Satellite is excluded.
    expect(out().stepping).toMatchObject({ side: "left", layer: "photos-1950" })
    expect(mockAnnounce).toHaveBeenCalledWith("Côté gauche : Photos aériennes, 1950-1965")
    expect(strip()).toEqual([0, 0])
    expect(mockTimings[0].to).toBe(200)
    finishTiming()
    expect(layers.actions.setSide).toHaveBeenCalledWith("A", "photos-1950")
  })

  it("never puts the other side's layer on this side and skips the unavailable layers", () => {
    const layers = makeLayers({ ...planSatellite, sideB: "etat-major" })
    mount(layers, (key) => key !== "carte-1950")
    act(() => out().step("left", 1))
    // Next after Plan is Satellite, then the state map: Satellite is free (the right side holds
    // the state map), so it is taken.
    expect(out().stepping?.layer).toBe("satellite")
    finishTiming()
    act(() => out().onStyleLoaded("second"))
    act(() => out().onStyleLoaded("base"))
    act(() => out().step("right", 1))
    // After the state map: Carte 1950 is unavailable, Photos 1950 is taken.
    expect(out().stepping?.layer).toBe("photos-1950")
  })

  it("covers the half until the second map has loaded the new style", () => {
    mount(makeLayers(planSatellite))
    act(() => out().step("right", 1))
    finishTiming()
    act(() => out().onStyleLoaded("base"))
    expect(out().stepping).not.toBeNull()
    act(() => out().onStyleLoaded("second"))
    expect(out().stepping).toBeNull()
  })

  it("covers the half until the Explorer map has loaded it when that map draws the side", () => {
    mount(makeLayers(satellitePlan))
    act(() => out().step("right", 1))
    finishTiming()
    act(() => out().onStyleLoaded("second"))
    expect(out().stepping).not.toBeNull()
    act(() => out().onStyleLoaded("base"))
    expect(out().stepping).toBeNull()
  })

  it("ignores a style load while the wipe is still running", () => {
    mount(makeLayers(planSatellite))
    act(() => out().step("right", 1))
    act(() => out().onStyleLoaded("second"))
    act(() => out().onStyleLoaded("base"))
    expect(out().stepping).not.toBeNull()
  })

  it("drops the cover after 8 s without a load", () => {
    jest.useFakeTimers()
    mount(makeLayers(planSatellite))
    act(() => out().step("right", 1))
    finishTiming()
    act(() => {
      jest.advanceTimersByTime(7999)
    })
    expect(out().stepping).not.toBeNull()
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(out().stepping).toBeNull()
  })

  it("does nothing while another step is running, then accepts a new one", () => {
    mount(makeLayers(planSatellite))
    act(() => out().step("right", 1))
    act(() => out().step("left", 1))
    act(() => out().step("right", -1))
    expect(selection).toHaveBeenCalledTimes(1)
    expect(mockTimings).toHaveLength(1)
    finishTiming()
    act(() => out().step("left", 1))
    expect(mockTimings).toHaveLength(1)
    act(() => out().onStyleLoaded("second"))
    expect(out().stepping).toBeNull()
    act(() => out().step("left", 1))
    expect(mockTimings).toHaveLength(2)
    expect(selection).toHaveBeenCalledTimes(2)
  })

  it("does nothing, and plays nothing, with no candidate", () => {
    const layers = makeLayers(planSatellite)
    mount(layers, (key) => key === "map" || key === "satellite")
    act(() => out().step("right", 1))
    act(() => out().step("left", -1))
    expect(selection).not.toHaveBeenCalled()
    expect(mockAnnounce).not.toHaveBeenCalled()
    expect(mockTimings).toHaveLength(0)
    expect(out().stepping).toBeNull()
    expect(layers.actions.setSide).not.toHaveBeenCalled()
  })

  it("does nothing without a comparison", () => {
    const layers = makeLayers(null)
    mount(layers)
    act(() => out().step("right", 1))
    expect(selection).not.toHaveBeenCalled()
    expect(layers.actions.setSide).not.toHaveBeenCalled()
  })

  it("sets the side at once under Reduce Motion, with the same haptic and announcement", () => {
    setReducedMotion(true)
    const layers = makeLayers(planSatellite)
    mount(layers)
    act(() => out().step("right", 1))
    expect(layers.actions.setSide).toHaveBeenCalledWith("B", "etat-major")
    expect(selection).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith("Côté droit : Carte d'état-major, 1820-1866")
    expect(out().stepping).toBeNull()
    expect(mockTimings).toHaveLength(0)
    // The next one is not blocked.
    act(() => out().step("right", 1))
    expect(layers.actions.setSide).toHaveBeenCalledTimes(2)
  })

  it("sets the side at once when the side wipe is switched off", () => {
    mockStack.sideWipe = "instant"
    const layers = makeLayers(planSatellite)
    mount(layers)
    act(() => out().step("left", 1))
    expect(layers.actions.setSide).toHaveBeenCalledWith("A", "etat-major")
    expect(out().stepping).toBeNull()
    expect(mockTimings).toHaveLength(0)
  })

  it("an interrupted timing sets nothing", () => {
    const layers = makeLayers(planSatellite)
    mount(layers)
    act(() => out().step("right", 1))
    finishTiming(0, false)
    expect(layers.actions.setSide).not.toHaveBeenCalled()
  })

  it("the comparison ending drops the step, stops the timing and ignores its late end", () => {
    const layers = makeLayers(planSatellite)
    const { update } = mount(layers)
    act(() => out().step("right", 1))
    expect(out().stepping).not.toBeNull()
    update(makeLayers(null))
    expect(out().stepping).toBeNull()
    expect(mockCancelled.length).toBeGreaterThan(0)
    finishTiming()
    expect(layers.actions.setSide).not.toHaveBeenCalled()
    expect(out().stepping).toBeNull()
  })

  it("a new comparison can step again after the previous one ended mid-step", () => {
    const { update } = mount(makeLayers(planSatellite))
    act(() => out().step("right", 1))
    update(makeLayers(null))
    update(makeLayers(planSatellite))
    act(() => out().step("left", 1))
    expect(mockTimings).toHaveLength(2)
  })
})
