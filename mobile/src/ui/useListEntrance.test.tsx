import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import { brandMotion } from "../app/brand-tokens"
import { createFakeNavigation } from "../../test/fake-navigation"
import { ScreenCoverContext } from "./screen-cover-context"
import { LIST_ENTRANCE_GRACE_MS, useListEntrance } from "./useListEntrance"

// The real navigation package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})
jest.mock("react-native", () => ({
  FlatList: "FlatList",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}))

import { setReducedMotion } from "../../test/react-native-reanimated.mock"

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

let now = 1_000_000
let nowSpy: jest.SpyInstance

beforeEach(() => {
  now = 1_000_000
  nowSpy = jest.spyOn(Date, "now").mockImplementation(() => now)
})

afterEach(() => {
  nowSpy.mockRestore()
  setReducedMotion(false)
})

function mountList(options: { navigation?: unknown; covered?: boolean } = {}) {
  const probe: { canAnimate?: (index: number) => boolean } = {}
  function List() {
    probe.canAnimate = useListEntrance()
    return null
  }
  const element = (covered: boolean) => (
    <ScreenCoverContext.Provider value={covered}>
      {options.navigation ? (
        <NavigationContext.Provider value={options.navigation as never}>
          <List />
        </NavigationContext.Provider>
      ) : (
        <List />
      )}
    </ScreenCoverContext.Provider>
  )
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(element(options.covered ?? false))
  })
  return {
    canAnimate: (index: number) => probe.canAnimate!(index),
    setCovered: (covered: boolean) => act(() => tree!.update(element(covered))),
    unmount: () => act(() => tree!.unmount()),
  }
}

describe("useListEntrance (12.2-11 fix)", () => {
  test("rows 0 to 7 may animate when the list mounts, row 8 and beyond may not", () => {
    const list = mountList({ covered: true })
    for (let index = 0; index < brandMotion.staggerMax; index += 1) {
      expect(list.canAnimate(index)).toBe(true)
    }
    expect(list.canAnimate(brandMotion.staggerMax)).toBe(false)
    expect(list.canAnimate(40)).toBe(false)
    list.unmount()
  })

  test("rows that mount while the screen is covered or unfocused still join, however late", () => {
    const { navigation, emit } = createFakeNavigation(false)
    const list = mountList({ navigation })
    now += 60_000
    // Mounted at launch, seen a minute later: the rows are still waiting for their entrance.
    expect(list.canAnimate(2)).toBe(true)
    emit("focus")
    emit("blur")
    now += 60_000
    expect(list.canAnimate(2)).toBe(true)
    list.unmount()
  })

  test("a row mounted within the grace period after the screen became visible joins", () => {
    const list = mountList()
    now += LIST_ENTRANCE_GRACE_MS - 1
    expect(list.canAnimate(0)).toBe(true)
    list.unmount()
  })

  test("a row remounted after the grace period, as scrolling does, does not animate", () => {
    const list = mountList()
    now += LIST_ENTRANCE_GRACE_MS
    expect(list.canAnimate(0)).toBe(false)
    expect(list.canAnimate(7)).toBe(false)
    list.unmount()
  })

  test("the screen becoming visible starts the grace period", () => {
    const list = mountList({ covered: true })
    now += 60_000
    list.setCovered(false)
    expect(list.canAnimate(1)).toBe(true)
    now += LIST_ENTRANCE_GRACE_MS
    expect(list.canAnimate(1)).toBe(false)
    list.unmount()
  })

  test("nothing animates under Reduce Motion", () => {
    setReducedMotion(true)
    const list = mountList({ covered: true })
    expect(list.canAnimate(0)).toBe(false)
    list.unmount()
  })
})
