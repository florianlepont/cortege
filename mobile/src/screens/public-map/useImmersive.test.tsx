import React from "react"
import renderer, { act } from "react-test-renderer"

const mockPlatform: { OS: string } = { OS: "ios" }
jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatform.OS
    },
  },
}))

const mockView: { value: "surface" | "texture" } = { value: "texture" }
jest.mock("./map-stack-mode", () => ({
  get LEFT_MAP_ANDROID_VIEW() {
    return mockView.value
  },
}))

// The shared Reanimated mock, with recording timings, delays and cancellations. A timing records its
// target, its config and the easing's control points, and returns an object tagged with them so a
// `withDelay` can record what it wraps.
type Timing = { to: number; config: Record<string, unknown> }
const mockTimings: Timing[] = []
const mockDelays: { delay: number; inner: unknown }[] = []
const mockCancel = jest.fn()
jest.mock("react-native-reanimated", () => {
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as Record<
    string,
    unknown
  >
  return {
    ...shared,
    __esModule: true,
    Easing: { ...(shared.Easing as object), bezier: (...points: number[]) => ({ bezier: points }) },
    withTiming: (to: number, config: Record<string, unknown>) => {
      mockTimings.push({ to, config })
      return to
    },
    withDelay: (delay: number, inner: unknown) => {
      mockDelays.push({ delay, inner })
      return inner
    },
    cancelAnimation: (value: unknown) => mockCancel(value),
  }
})

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { brandMotion } from "../../app/brand-tokens"
import {
  FINAL_STATE_SLACK_MS,
  immersiveApplies,
  useImmersive,
  type Immersive,
} from "./useImmersive"
import { BUTTON_FADE_IN_DELAY_MS, IMMERSIVE_IN_MS, IMMERSIVE_OUT_MS } from "../../map/swipe-machine"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  mockTimings.length = 0
  mockDelays.length = 0
  mockCancel.mockClear()
  mockPlatform.OS = "ios"
  mockView.value = "texture"
  setReducedMotion(false)
})

afterEach(() => {
  setReducedMotion(false)
})

let latest!: Immersive
function Probe({ on }: { on: boolean }) {
  latest = useImmersive(on)
  return null
}

function mount(on: boolean) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<Probe on={on} />)
  })
  return tree
}
const setOn = (tree: renderer.ReactTestRenderer, on: boolean) =>
  act(() => tree.update(<Probe on={on} />))

const values = () => [latest.window.value, latest.buttons.value]
const SYSTEM = "system"

describe("immersiveApplies", () => {
  it("is true on iOS and on an Android texture map view", () => {
    expect(immersiveApplies()).toBe(true)
    mockPlatform.OS = "android"
    expect(immersiveApplies()).toBe(true)
  })

  it("is false on an Android surface map view only", () => {
    mockPlatform.OS = "android"
    mockView.value = "surface"
    expect(immersiveApplies()).toBe(false)
    mockPlatform.OS = "ios"
    expect(immersiveApplies()).toBe(true)
  })
})

describe("useImmersive, a lost timing", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("leaving: if the fade-in never lands, the final state is written after the timings' time", () => {
    const tree = mount(true)
    act(() => tree.update(<Probe on={false} />))
    // The animation was lost: the value is left at the receded state.
    latest.window.value = 1
    latest.buttons.value = 0
    act(() => {
      jest.advanceTimersByTime(
        IMMERSIVE_OUT_MS + BUTTON_FADE_IN_DELAY_MS + FINAL_STATE_SLACK_MS - 1,
      )
    })
    expect(latest.buttons.value).toBe(0)
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(latest.window.value).toBe(0)
    expect(latest.buttons.value).toBe(1)
  })

  it("entering: the final receded state is written after the timings' time", () => {
    const tree = mount(false)
    act(() => tree.update(<Probe on />))
    latest.window.value = 0.2
    latest.buttons.value = 0.8
    act(() => {
      jest.advanceTimersByTime(IMMERSIVE_IN_MS + BUTTON_FADE_IN_DELAY_MS + FINAL_STATE_SLACK_MS)
    })
    expect(latest.window.value).toBe(1)
    expect(latest.buttons.value).toBe(0)
  })

  it("a quick on/off/on keeps only the last settle: no write for a state that was left", () => {
    const tree = mount(false)
    act(() => tree.update(<Probe on />))
    act(() => tree.update(<Probe on={false} />))
    act(() => tree.update(<Probe on />))
    act(() => {
      jest.advanceTimersByTime(10_000)
    })
    expect(latest.window.value).toBe(1)
    expect(latest.buttons.value).toBe(0)
  })
})

describe("useImmersive", () => {
  it("starts full size with the buttons shown, without an animation", () => {
    mount(false)
    expect(values()).toEqual([0, 1])
    expect(mockTimings).toEqual([])
  })

  it("starts receded with the buttons hidden when mounted on, without an animation", () => {
    mount(true)
    expect(values()).toEqual([1, 0])
    expect(mockTimings).toEqual([])
  })

  it("entering: the window recedes in 360 ms (decelerate), the buttons fade out in 160 ms", () => {
    const tree = mount(false)
    setOn(tree, true)
    expect(mockTimings).toEqual([
      {
        to: 1,
        config: {
          duration: 360,
          easing: { bezier: brandMotion.easings.decelerate },
          reduceMotion: SYSTEM,
        },
      },
      { to: 0, config: { duration: 160, reduceMotion: SYSTEM } },
    ])
    expect(mockDelays).toEqual([])
    expect(values()).toEqual([1, 0])
  })

  it("leaving: the window returns in 240 ms (standard), the buttons fade in after 80 ms", () => {
    const tree = mount(true)
    setOn(tree, false)
    expect(mockTimings).toEqual([
      {
        to: 0,
        config: {
          duration: 240,
          easing: { bezier: brandMotion.easings.standard },
          reduceMotion: SYSTEM,
        },
      },
      { to: 1, config: { duration: 160, reduceMotion: SYSTEM } },
    ])
    expect(mockDelays).toEqual([{ delay: 80, inner: 1 }])
    expect(values()).toEqual([0, 1])
  })

  it("does not restart an animation when nothing changed", () => {
    const tree = mount(false)
    setOn(tree, false)
    expect(mockTimings).toEqual([])
  })

  it("under Reduce Motion the final state is set at once, in and out", () => {
    setReducedMotion(true)
    const tree = mount(false)
    expect(values()).toEqual([0, 1])
    setOn(tree, true)
    expect(values()).toEqual([1, 0])
    setOn(tree, false)
    expect(values()).toEqual([0, 1])
    expect(mockTimings).toEqual([])
    expect(mockDelays).toEqual([])
  })

  it("switching Reduce Motion on while receded puts the final state at once", () => {
    const tree = mount(true)
    setReducedMotion(true)
    setOn(tree, true)
    expect(values()).toEqual([1, 0])
    expect(mockTimings).toEqual([])
  })

  it("cancels both animations when it unmounts", () => {
    const tree = mount(false)
    const { window, buttons } = latest
    mockCancel.mockClear()
    act(() => tree.unmount())
    expect(mockCancel).toHaveBeenCalledWith(window)
    expect(mockCancel).toHaveBeenCalledWith(buttons)
  })
})
