import React from "react"
import renderer, { act } from "react-test-renderer"
import { useAppBottomTabBarHeight, useTabBarClearance } from "./useAppBottomTabBarHeight"

let mockBottomInset = 0
const mockNativeContext = (
  jest.requireMock("react-native-bottom-tabs") as {
    BottomTabBarHeightContext: React.Context<number | undefined>
  }
).BottomTabBarHeightContext
const mockJsContext = (
  jest.requireMock("@react-navigation/bottom-tabs") as {
    BottomTabBarHeightContext: React.Context<number | undefined>
  }
).BottomTabBarHeightContext

jest.mock("react-native", () => ({
  Platform: { OS: "android", select: (options: { default?: number }) => options.default },
}))
jest.mock("react-native-bottom-tabs", () => ({
  BottomTabBarHeightContext: (require("react") as typeof import("react")).createContext<
    number | undefined
  >(undefined),
}))
jest.mock("@react-navigation/bottom-tabs", () => ({
  BottomTabBarHeightContext: (require("react") as typeof import("react")).createContext<
    number | undefined
  >(undefined),
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: mockBottomInset }),
}))

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalConsoleError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

type Tree = { native?: number; js?: number }

function read(tree: Tree, hook: () => number): number {
  let value = -1
  function Probe() {
    value = hook()
    return null
  }
  let node: React.ReactElement = <Probe />
  if (tree.js !== undefined) {
    node = <mockJsContext.Provider value={tree.js}>{node}</mockJsContext.Provider>
  }
  if (tree.native !== undefined) {
    node = <mockNativeContext.Provider value={tree.native}>{node}</mockNativeContext.Provider>
  }
  act(() => {
    renderer.create(node)
  })
  return value
}

describe("the tab bar height a screen must clear", () => {
  beforeEach(() => {
    mockBottomInset = 34
  })

  test("the native bar floats over the page: its measured height is cleared", () => {
    expect(read({ native: 83 }, () => useAppBottomTabBarHeight(84))).toBe(83)
    expect(read({ native: 83 }, useTabBarClearance)).toBe(83)
  })

  test("the native bar clears at least the home indicator", () => {
    mockBottomInset = 90
    expect(read({ native: 83 }, useTabBarClearance)).toBe(90)
  })

  test("the JS bar stays in the layout flow: the screen ends above it, nothing to clear", () => {
    expect(read({ js: 72 }, () => useAppBottomTabBarHeight(68))).toBe(0)
    expect(read({ js: 72 }, useTabBarClearance)).toBe(0)
  })

  test("with no tab navigator, or a native bar not yet measured, the fallback applies", () => {
    expect(read({}, () => useAppBottomTabBarHeight(68))).toBe(68)
    expect(read({ native: 0 }, () => useAppBottomTabBarHeight(84))).toBe(84)
    expect(read({}, useTabBarClearance)).toBe(Math.max(68, 34))
  })
})
