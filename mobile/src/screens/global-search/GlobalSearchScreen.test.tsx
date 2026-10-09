import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../i18n"
import { ANNOUNCE_DELAY_MS, GlobalSearchScreen } from "./GlobalSearchScreen"
import type { SearchResultsProps } from "./SearchResults"

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

const mockAnnounce = jest.fn()
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    AccessibilityInfo: { announceForAccessibility: (text: string) => mockAnnounce(text) },
    Platform: { OS: "ios" },
    ScrollView: mockComponent("ScrollView"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({
  TAB_BAR_FALLBACK_HEIGHT: 84,
  useAppBottomTabBarHeight: () => 90,
}))
jest.mock("./SearchField", () => ({ SearchField: "SearchField" }))
jest.mock("./SearchResults", () => ({ SearchResults: "SearchResults" }))
jest.mock("./SearchStartPage", () => ({ SearchStartPage: "SearchStartPage" }))

let tree: ReactTestRenderer

const results = { normalized: "chene" } as unknown as SearchResultsProps

function screen(overrides: Partial<React.ComponentProps<typeof GlobalSearchScreen>> = {}) {
  return (
    <GlobalSearchScreen
      query="chene"
      onChangeText={jest.fn()}
      onSubmit={jest.fn()}
      onClear={jest.fn()}
      busy={false}
      active
      recents={["Fontainebleau"]}
      onOpenRecent={jest.fn()}
      onRemoveRecent={jest.fn()}
      onClearRecents={jest.fn()}
      results={results}
      settled
      resultCount={3}
      fieldRef={{ current: null }}
      scrollRef={{ current: null }}
      {...overrides}
    />
  )
}

function mount(overrides: Partial<React.ComponentProps<typeof GlobalSearchScreen>> = {}) {
  act(() => {
    tree = renderer.create(screen(overrides))
  })
}

function update(overrides: Partial<React.ComponentProps<typeof GlobalSearchScreen>> = {}) {
  act(() => tree.update(screen(overrides)))
}

beforeEach(() => {
  jest.useFakeTimers()
  mockAnnounce.mockClear()
})

afterEach(() => {
  act(() => tree?.unmount())
  jest.useRealTimers()
})

const wait = (ms = ANNOUNCE_DELAY_MS) => act(() => void jest.advanceTimersByTime(ms))

describe("GlobalSearchScreen", () => {
  test("shows the results when the query is active and the start page otherwise", () => {
    mount()
    expect(tree.root.findAllByType("SearchResults" as never)).toHaveLength(1)
    expect(tree.root.findAllByType("SearchStartPage" as never)).toHaveLength(0)
    update({ active: false, query: "c" })
    expect(tree.root.findAllByType("SearchResults" as never)).toHaveLength(0)
    const start = tree.root.findByType("SearchStartPage" as never)
    expect(start.props.recents).toEqual(["Fontainebleau"])
  })

  test("passes the field its text, spinner state and handlers", () => {
    const onSubmit = jest.fn()
    mount({ busy: true, onSubmit })
    const field = tree.root.findByType("SearchField" as never)
    expect(field.props.value).toBe("chene")
    expect(field.props.busy).toBe(true)
    expect(field.props.onSubmit).toBe(onSubmit)
  })

  test("announces the total once per settled query", () => {
    mount({ resultCount: 3 })
    expect(mockAnnounce).not.toHaveBeenCalled()
    wait()
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith(fr.search.announce.results({ count: 3 }))
    // The same query re-rendered (a count change after it settled) does not announce again.
    update({ resultCount: 4 })
    wait()
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
  })

  test("announces 'Aucun résultat' when nothing matched", () => {
    mount({ resultCount: 0 })
    wait()
    expect(mockAnnounce).toHaveBeenCalledWith(fr.search.announce.none)
  })

  test("waits for the groups to settle and for typing to pause", () => {
    mount({ settled: false })
    wait(5000)
    expect(mockAnnounce).not.toHaveBeenCalled()
    update({ settled: true })
    wait(ANNOUNCE_DELAY_MS - 1)
    expect(mockAnnounce).not.toHaveBeenCalled()
    // A new query before the delay ends cancels the pending announcement.
    update({ settled: true, results: { normalized: "chenes" } as unknown as SearchResultsProps })
    wait(ANNOUNCE_DELAY_MS - 1)
    expect(mockAnnounce).not.toHaveBeenCalled()
    wait(1)
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
  })

  test("announces a new query, and the same text again after the start page", () => {
    mount()
    wait()
    update({ results: { normalized: "hetre" } as unknown as SearchResultsProps })
    wait()
    expect(mockAnnounce).toHaveBeenCalledTimes(2)
    update({ active: false, query: "" })
    update({ active: true })
    wait()
    expect(mockAnnounce).toHaveBeenCalledTimes(3)
  })

  test("announces nothing while the start page shows", () => {
    mount({ active: false, query: "" })
    wait(2000)
    expect(mockAnnounce).not.toHaveBeenCalled()
  })
})
