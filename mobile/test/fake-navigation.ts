import { act } from "react-test-renderer"

type Listener = () => void

/**
 * A stand-in for the `navigation` object of a screen, enough for `useScreenFocus`: `isFocused`,
 * and `focus` / `blur` listeners fired by `emit`. Provide it through the `NavigationContext` that
 * the test's `jest.mock("@react-navigation/native", ...)` factory exports (the real package is ESM
 * and cannot be loaded by this Jest setup).
 */
export function createFakeNavigation(initiallyFocused = true) {
  const listeners: Record<string, Listener[]> = { focus: [], blur: [] }
  let focused = initiallyFocused
  const navigation = {
    isFocused: () => focused,
    addListener: (event: string, listener: Listener) => {
      listeners[event].push(listener)
      return () => undefined
    },
  }
  const emit = (event: "focus" | "blur") => {
    focused = event === "focus"
    act(() => listeners[event].forEach((listener) => listener()))
  }
  return { navigation, emit }
}
