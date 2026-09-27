import React from "react"

// Minimal Jest mock (this project's ts-jest setup has no jsdom/RN preset, so the real package's
// native-binding initialization can't run — see 04-03-SUMMARY.md). Covers only the API surface
// this app actually calls: shared values resolve synchronously, `useAnimatedStyle` runs its
// factory immediately, springs land on their target value with no animation.

type SharedValue<T> = { value: T }

export function useSharedValue<T>(initial: T): SharedValue<T> {
  return { value: initial }
}

export function useAnimatedStyle<T>(factory: () => T): T {
  return factory()
}

export function useReducedMotion(): boolean {
  return false
}

export function withSpring<T>(toValue: T): T {
  return toValue
}

export function withTiming<T>(toValue: T): T {
  return toValue
}

const create = (name: string) => {
  const Component = (props: Record<string, unknown>) =>
    React.createElement(name, props, props["children"] as React.ReactNode)
  Component.displayName = name
  return Component
}

const Animated = {
  View: create("Animated.View"),
  Text: create("Animated.Text"),
  createAnimatedComponent: <C>(component: C): C => component,
}

export default Animated
