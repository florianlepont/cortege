import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { brandMotion } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"
import * as reanimated from "../../test/react-native-reanimated.mock"
import { RipplePressable, computePressWave } from "./RipplePressable"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

type SharedValue = { value: number }

const SURFACE = { width: 320, height: 72 }
const drawnRadius = Math.hypot(SURFACE.width, SURFACE.height)

let tree: ReactTestRenderer | undefined
let sharedValues: SharedValue[] = []
let timings: Array<{ toValue: number; config: Record<string, unknown> }> = []

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  sharedValues = []
  timings = []
  const actualSharedValue = reanimated.useSharedValue
  jest.spyOn(reanimated, "useSharedValue").mockImplementation(((initial: number) => {
    const sharedValue = actualSharedValue(initial)
    sharedValues.push(sharedValue)
    return sharedValue
  }) as typeof reanimated.useSharedValue)
  jest.spyOn(reanimated, "withTiming").mockImplementation(((
    toValue: number,
    config: Record<string, unknown>,
  ) => {
    timings.push({ toValue, config })
    return toValue
  }) as typeof reanimated.withTiming)
})

afterEach(() => {
  if (tree) act(() => tree?.unmount())
  tree = undefined
  reanimated.setReducedMotion(false)
  jest.restoreAllMocks()
})

function mount(props: { onPress?: () => void; onPressIn?: () => void; laidOut?: boolean } = {}) {
  const { laidOut = true, ...pressProps } = props
  act(() => {
    tree = renderer.create(
      <RipplePressable accessibilityLabel="Ligne" testID="row" {...pressProps}>
        <React.Fragment />
      </RipplePressable>,
    )
  })
  if (laidOut) {
    const layer = tree!.root.findByProps({ testID: "ripple-layer" })
    act(() => layer.props.onLayout({ nativeEvent: { layout: SURFACE } }))
  }
  // The four shared values of the latest render, in the order the component declares them.
  const [translateX, translateY, scale, opacity] = sharedValues.slice(-4)
  const pressable = () => tree!.root.findByType("Pressable" as never)
  const pressIn = (locationX?: number, locationY?: number) =>
    act(() => pressable().props.onPressIn({ nativeEvent: { locationX, locationY } }))
  return { translateX, translateY, scale, opacity, pressable, pressIn }
}

describe("computePressWave", () => {
  it("starts at the touch point and grows to the farthest corner", () => {
    const wave = computePressWave({ x: 40, y: 20, ...SURFACE, reduced: false })
    expect(wave.translateX).toBe(40)
    expect(wave.translateY).toBe(20)
    // farthest corner of a 320 x 72 surface from (40, 20) is the bottom right one
    expect(wave.toScale * drawnRadius).toBeCloseTo(Math.hypot(280, 52))
    expect(wave.fromScale * drawnRadius).toBeCloseTo(brandMotion.pressWave.startRadius)
    expect(wave.toScale).toBeLessThanOrEqual(1)
    expect(wave.fromScale).toBeLessThan(wave.toScale)
  })

  it("reaches the other side when the touch is near the right edge", () => {
    const wave = computePressWave({ x: 300, y: 60, ...SURFACE, reduced: false })
    expect(wave.toScale * drawnRadius).toBeCloseTo(Math.hypot(300, 60))
  })

  it("keeps a touch outside the surface on its edge", () => {
    const wave = computePressWave({ x: -30, y: 999, ...SURFACE, reduced: false })
    expect([wave.translateX, wave.translateY]).toEqual([0, SURFACE.height])
  })

  it("starts from the centre when the press carries no touch point", () => {
    const wave = computePressWave({ x: undefined, y: Number.NaN, ...SURFACE, reduced: false })
    expect([wave.translateX, wave.translateY]).toEqual([SURFACE.width / 2, SURFACE.height / 2])
  })

  it("covers the whole surface from its centre at once under Reduce Motion", () => {
    const wave = computePressWave({ x: 40, y: 20, ...SURFACE, reduced: true })
    expect(wave).toEqual({
      translateX: SURFACE.width / 2,
      translateY: SURFACE.height / 2,
      fromScale: 1,
      toScale: 1,
    })
    // a circle of the drawn radius around the centre reaches every corner
    expect(drawnRadius).toBeGreaterThan(Math.hypot(SURFACE.width, SURFACE.height) / 2)
  })
})

describe("RipplePressable", () => {
  it("starts the wave at the touch point, grows it in 420 ms and fades it out", () => {
    const { translateX, translateY, scale, opacity, pressIn } = mount()
    pressIn(40, 20)

    expect([translateX.value, translateY.value]).toEqual([40, 20])
    expect(timings).toHaveLength(2)
    const [grow, fade] = timings
    expect(grow.toValue).toBeCloseTo(Math.hypot(280, 52) / drawnRadius)
    expect(grow.config.duration).toBe(420)
    expect(grow.config.reduceMotion).toBe(reanimated.ReduceMotion.System)
    expect(fade.toValue).toBe(0)
    expect(fade.config.duration).toBe(420)
    // the mocked timings land on their target, so the shared values end where the animation ends
    expect(scale.value).toBe(grow.toValue)
    expect(opacity.value).toBe(0)
  })

  it("makes the wave visible at the first frame, small, before it grows", () => {
    const first: Array<{ scale: number; opacity: number }> = []
    const { scale, opacity, pressIn } = mount()
    ;(reanimated.withTiming as jest.Mock).mockImplementation(((toValue: number) => {
      first.push({ scale: scale.value, opacity: opacity.value })
      return toValue
    }) as typeof reanimated.withTiming)
    pressIn(10, 10)
    expect(first[0].opacity).toBe(1)
    expect(first[0].scale * drawnRadius).toBeCloseTo(brandMotion.pressWave.startRadius)
  })

  it("restarts from the new touch point when pressed again", () => {
    const { translateX, translateY, pressIn } = mount()
    pressIn(40, 20)
    pressIn(200, 50)
    expect([translateX.value, translateY.value]).toEqual([200, 50])
    expect(timings).toHaveLength(4)
  })

  it("does not touch the press: onPress is the caller's own function and fires at once", () => {
    const onPress = jest.fn()
    const { pressable, pressIn } = mount({ onPress })
    expect(pressable().props.onPress).toBe(onPress)
    pressIn(40, 20)
    expect(onPress).not.toHaveBeenCalled()
    act(() => pressable().props.onPress())
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("still calls the caller's onPressIn, with or without a measured surface", () => {
    const onPressIn = jest.fn()
    mount({ onPressIn }).pressIn(1, 1)
    expect(onPressIn).toHaveBeenCalledTimes(1)
    act(() => tree?.unmount())

    const unmeasured = jest.fn()
    mount({ onPressIn: unmeasured, laidOut: false }).pressIn(1, 1)
    expect(unmeasured).toHaveBeenCalledTimes(1)
    expect(timings).toHaveLength(2)
  })

  it("starts no wave on a surface that has no size yet", () => {
    const { opacity, pressIn } = mount({ laidOut: false })
    pressIn(40, 20)
    expect(timings).toEqual([])
    expect(opacity.value).toBe(0)
  })

  it("keeps the measured size when the same layout is reported again", () => {
    const { pressIn } = mount()
    const layer = tree!.root.findByProps({ testID: "ripple-layer" })
    act(() => layer.props.onLayout({ nativeEvent: { layout: { ...SURFACE } } }))
    pressIn(40, 20)
    expect(timings).toHaveLength(2)
  })

  it("shows only a brief highlight fade under Reduce Motion, no travelling wave", () => {
    reanimated.setReducedMotion(true)
    const { translateX, translateY, scale, opacity, pressIn } = mount()
    pressIn(40, 20)

    expect([translateX.value, translateY.value]).toEqual([SURFACE.width / 2, SURFACE.height / 2])
    expect(scale.value).toBe(1)
    expect(timings).toHaveLength(1)
    expect(timings[0].toValue).toBe(0)
    expect(timings[0].config.duration).toBe(brandMotion.pressWave.reducedFadeMs)
    expect(timings[0].config.reduceMotion).toBe(reanimated.ReduceMotion.Never)
    expect(opacity.value).toBe(0)
  })

  it("draws a moss circle clipped to the surface radius, hidden from accessibility", () => {
    mount()
    const layer = tree!.root.findByProps({ testID: "ripple-layer" })
    expect(layer.props.style).toEqual([
      expect.objectContaining({ position: "absolute", overflow: "hidden" }),
      { borderRadius: 22 },
    ])
    expect(layer.props.accessibilityElementsHidden).toBe(true)
    expect(layer.props.importantForAccessibility).toBe("no-hide-descendants")
    const wave = layer.findByProps({ pointerEvents: "none" })
    const style = Object.assign({}, ...wave.props.style)
    expect(style.backgroundColor).toBe(defaultTheme.visual.pressWave)
    expect(style.width).toBe(drawnRadius * 2)
    expect(style.borderRadius).toBe(drawnRadius)
  })

  it("passes the accessibility props and testID to the pressable", () => {
    const { pressable } = mount()
    expect(pressable().props.accessibilityLabel).toBe("Ligne")
    expect(pressable().props.testID).toBe("row")
  })
})
