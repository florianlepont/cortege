import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import { useScreenFocus } from "./useScreenFocus"

// The real package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})

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

type Listener = () => void

function createFakeNavigation(initiallyFocused: boolean) {
  const listeners: Record<string, Listener[]> = { focus: [], blur: [] }
  const unsubscribes: jest.Mock[] = []
  const navigation = {
    isFocused: () => initiallyFocused,
    addListener: (event: string, listener: Listener) => {
      listeners[event].push(listener)
      const unsubscribe = jest.fn()
      unsubscribes.push(unsubscribe)
      return unsubscribe
    },
  }
  const emit = (event: "focus" | "blur") => listeners[event].forEach((listener) => listener())
  return { navigation, emit, unsubscribes }
}

function renderFocus(navigation?: ReturnType<typeof createFakeNavigation>["navigation"]) {
  const seen: boolean[] = []
  function Probe() {
    seen.push(useScreenFocus())
    return null
  }
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      navigation ? (
        <NavigationContext.Provider value={navigation as never}>
          <Probe />
        </NavigationContext.Provider>
      ) : (
        <Probe />
      ),
    )
  })
  return { tree: tree!, last: () => seen[seen.length - 1] }
}

describe("useScreenFocus", () => {
  test("is true outside a navigator", () => {
    expect(renderFocus().last()).toBe(true)
  })

  test("starts from the navigation focus state", () => {
    const { navigation } = createFakeNavigation(false)
    expect(renderFocus(navigation).last()).toBe(false)
  })

  test("follows the focus and blur events", () => {
    const { navigation, emit } = createFakeNavigation(false)
    const probe = renderFocus(navigation)
    act(() => emit("focus"))
    expect(probe.last()).toBe(true)
    act(() => emit("blur"))
    expect(probe.last()).toBe(false)
  })

  test("unsubscribes both listeners on unmount", () => {
    const { navigation, unsubscribes } = createFakeNavigation(true)
    const probe = renderFocus(navigation)
    expect(unsubscribes).toHaveLength(2)
    act(() => probe.tree.unmount())
    unsubscribes.forEach((unsubscribe) => expect(unsubscribe).toHaveBeenCalledTimes(1))
  })
})
