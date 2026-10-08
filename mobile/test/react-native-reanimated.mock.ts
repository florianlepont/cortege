import { FlatList, ScrollView, Text as RNText, View as RNView } from "react-native"

// Minimal Jest mock (this project's ts-jest setup has no jsdom/RN preset, so the real package's
// native-binding initialization can't run — see 13-04-SUMMARY.md). Covers only the API surface
// this app actually calls: shared values resolve synchronously, `useAnimatedStyle` runs its
// factory immediately, springs land on their target value with no animation, and the "Animated"
// host components are the plain (or per-test mocked) `react-native` ones, like the official
// upstream mock does — a test that replaces `react-native`'s `FlatList` (e.g. for a windowing
// proof) transparently replaces `Animated.FlatList` too, since this re-exports whatever
// `require("react-native")` currently resolves to.

type SharedValue<T> = { value: T }

export function useSharedValue<T>(initial: T): SharedValue<T> {
  return { value: initial }
}

export function useAnimatedStyle<T>(factory: () => T): T {
  return factory()
}

let reducedMotion = false

// Flips what the mocked `useReducedMotion()` returns, so a test can exercise every reduced-motion
// branch. Tests import it by relative path (for example `../../test/react-native-reanimated.mock`):
// Jest resolves that path to the same module instance as the mapped `react-native-reanimated`, so
// the flag is shared. Reset it to false in `afterEach`.
export function setReducedMotion(value: boolean): void {
  reducedMotion = value
}

export function useReducedMotion(): boolean {
  return reducedMotion
}

export function useAnimatedProps<T>(factory: () => T): T {
  return factory()
}

export function useDerivedValue<T>(factory: () => T): SharedValue<T> {
  return { value: factory() }
}

export function withDelay<T>(_delayMs: number, animation: T): T {
  return animation
}

export function withSequence<T>(...animations: T[]): T {
  return animations[animations.length - 1]
}

export function useAnimatedReaction(): void {}

export function interpolateColor(_value: number, _input: number[], output: string[]): string {
  return output[output.length - 1]
}

export function runOnJS<F>(fn: F): F {
  return fn
}

export function withSpring<T>(toValue: T): T {
  return toValue
}

export function withTiming<T>(toValue: T): T {
  return toValue
}

export function withRepeat<T>(toValue: T): T {
  return toValue
}

export function cancelAnimation(): void {}

const easingIdentity = (value?: unknown): unknown => value
export const Easing = {
  ease: easingIdentity,
  linear: easingIdentity,
  in: (fn: unknown) => fn,
  out: (fn: unknown) => fn,
  inOut: (fn: unknown) => fn,
  bezier: () => easingIdentity,
  cubic: easingIdentity,
  quad: easingIdentity,
}

type ScrollHandler = (event: { contentOffset: { x: number; y: number } }) => void
type ScrollHandlers = ScrollHandler | { onScroll?: ScrollHandler }

export function useAnimatedScrollHandler(handlers: ScrollHandlers) {
  const onScroll = typeof handlers === "function" ? handlers : handlers?.onScroll
  return (event: { nativeEvent: { contentOffset: { x: number; y: number } } }) => {
    onScroll?.(event.nativeEvent)
  }
}

export const Extrapolation = { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" } as const

export const ReduceMotion = { System: "system", Always: "always", Never: "never" } as const

// Layout-animation and entering/exiting builders (`FadeIn.duration(...).reduceMotion(...)`, etc.):
// a chainable stub is enough since this environment doesn't actually run layout animations.
type ChainableBuilder = { [method: string]: (...args: unknown[]) => ChainableBuilder }
function createChainableBuilder(): ChainableBuilder {
  const builder: ChainableBuilder = new Proxy(
    {},
    {
      get: () => () => builder,
    },
  )
  return builder
}

export const FadeIn = createChainableBuilder()
export const FadeInDown = createChainableBuilder()
export const FadeInUp = createChainableBuilder()
export const ZoomIn = createChainableBuilder()
export const FadeOut = createChainableBuilder()
export const LinearTransition = createChainableBuilder()
export const SlideInDown = createChainableBuilder()
export const SlideOutDown = createChainableBuilder()

export function interpolate(
  value: number,
  inputRange: number[],
  outputRange: number[],
  _extrapolate?: unknown,
): number {
  if (value <= inputRange[0]) return outputRange[0]
  if (value >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1]
  for (let i = 0; i < inputRange.length - 1; i += 1) {
    const [x0, x1] = [inputRange[i], inputRange[i + 1]]
    if (value >= x0 && value <= x1) {
      const [y0, y1] = [outputRange[i], outputRange[i + 1]]
      const ratio = x1 === x0 ? 0 : (value - x0) / (x1 - x0)
      return y0 + ratio * (y1 - y0)
    }
  }
  return outputRange[outputRange.length - 1]
}

const Animated = {
  View: RNView,
  Text: RNText,
  ScrollView,
  FlatList,
  createAnimatedComponent: <C>(component: C): C => component,
}

export default Animated
