import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import { createFakeNavigation } from "../../test/fake-navigation"
import { brandMotion } from "../app/brand-tokens"
import type { LocalSurvey } from "../storage/types"
import { LIST_ENTRANCE_GRACE_MS } from "../ui/useListEntrance"
import { ENTRANCE_REWIND_DELAY_MS } from "../ui/useFocusEntrance"
import { SurveyListScreen } from "./SurveyListScreen"
import type { SurveyListScreenProps } from "./survey-list/types"

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

// The real navigation package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})

// The FlatList mock renders its rows during the screen's first render, like the real list does, so
// the entrance hook still sees the first mount. It records the props it was given.
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  const FlatList = (props: {
    data: unknown[]
    renderItem: (info: { item: unknown; index: number }) => React.ReactNode
    keyExtractor: (item: unknown) => string
    windowSize?: number
    removeClippedSubviews?: boolean
    ListHeaderComponent?: React.ReactElement
    ListFooterComponent?: React.ReactElement | null
  }) =>
    ReactRef.createElement(
      "FlatList",
      {
        windowSize: props.windowSize,
        removeClippedSubviews: props.removeClippedSubviews,
        footer: props.ListFooterComponent,
        header: props.ListHeaderComponent,
      },
      props.data.map((item, index) =>
        ReactRef.createElement(
          ReactRef.Fragment,
          { key: props.keyExtractor(item) },
          props.renderItem({ item, index }),
        ),
      ),
    )
  return {
    FlatList,
    RefreshControl: mockComponent("RefreshControl"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { ios?: unknown }) => options.ios },
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 68 }))
jest.mock("./survey-list/SurveyRow", () => ({ SurveyRow: "SurveyRow" }))
jest.mock("./survey-list/ListEmptyState", () => ({ ListEmptyState: "ListEmptyState" }))
jest.mock("./survey-list/ListSummaryCard", () => ({ ListSummaryCard: "ListSummaryCard" }))
jest.mock("./survey-list/list-chrome", () => ({
  ListTitleBar: "ListTitleBar",
  SectionTitle: "SectionTitle",
}))

import * as reanimated from "../../test/react-native-reanimated.mock"

let tree: ReactTestRenderer

function survey(id: string, status: string, updatedAt: string): LocalSurvey {
  return {
    id,
    site_name: `Site ${id}`,
    status,
    visibility: "private",
    sync_version: 1,
    sync_state: "synced",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: updatedAt,
    completion_rate: 30,
  }
}

function makeProps(overrides: Partial<SurveyListScreenProps> = {}): SurveyListScreenProps {
  return {
    surveys: [
      survey("a", "draft", "2026-10-03T00:00:00.000Z"),
      survey("b", "submitted", "2026-10-02T00:00:00.000Z"),
    ],
    selectedSurveyId: null,
    surveyDetails: {},
    showTitleBar: false,
    onDeleteSurvey: jest.fn(),
    onOpenCreateSurvey: jest.fn(),
    onOpenSearch: jest.fn(),
    onOpenSurvey: jest.fn(),
    ...overrides,
  }
}

function mount(props: SurveyListScreenProps) {
  act(() => {
    tree = renderer.create(<SurveyListScreen {...props} />)
  })
  return tree.root
}

// A row wrapped by the real `EntranceView` carries the entrance style (opacity and translateY).
const wrappers = (root: renderer.ReactTestInstance) =>
  root.findAll(
    (node) =>
      (node.type as unknown) === "View" &&
      [node.props.style].flat().some((style) => style && "opacity" in style),
  )

const withDelaySpy = jest.spyOn(reanimated, "withDelay")
let now = 1_000_000
let nowSpy: jest.SpyInstance

beforeEach(() => {
  now = 1_000_000
  nowSpy = jest.spyOn(Date, "now").mockImplementation(() => now)
})

afterEach(() => {
  act(() => tree.unmount())
  reanimated.setReducedMotion(false)
  withDelaySpy.mockClear()
  nowSpy.mockRestore()
})

function surveys(count: number): LocalSurvey[] {
  return Array.from({ length: count }, (_, i) =>
    survey(`s${i}`, "draft", `2026-10-0${i % 9}T00:00:00.000Z`),
  )
}

describe("SurveyListScreen (12.2-11)", () => {
  test("keeps the virtualisation settings", () => {
    const list = mount(makeProps()).findByType("FlatList" as never)
    expect(list.props.windowSize).toBe(7)
    expect(list.props.removeClippedSubviews).toBe(true)
  })

  test("wraps each survey row in an entrance view and hands it its list index", () => {
    const root = mount(makeProps())
    // 0 is the "À terminer" header, 1 the draft, 2 the "Terminés" header, 3 the submitted survey.
    const rows = root.findAllByType("SurveyRow" as never)
    expect(rows.map((row) => row.props.index)).toEqual([1, 3])
    expect(wrappers(root)).toHaveLength(2)
  })

  test("section headers are not wrapped in an entrance view", () => {
    const root = mount(makeProps())
    expect(root.findAllByType("SectionTitle" as never)).toHaveLength(2)
    expect(wrappers(root)).toHaveLength(2)
  })

  test("a row past the eighth gets no entrance, and none at all under Reduce Motion", () => {
    const root = mount(makeProps({ surveys: surveys(10) }))
    const rows = root.findAllByType("SurveyRow" as never)
    // The header takes index 0: rows 1 to 7 animate, rows 8 and 9 do not.
    expect(rows.map((row) => row.props.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(wrappers(root)).toHaveLength(7)
    act(() => tree.unmount())
    reanimated.setReducedMotion(true)
    const reduced = mount(makeProps())
    expect(wrappers(reduced)).toHaveLength(0)
  })

  test("the entrance starts when the screen gets the focus, not when the list mounts", () => {
    const { navigation, emit } = createFakeNavigation(false)
    act(() => {
      tree = renderer.create(
        <NavigationContext.Provider value={navigation as never}>
          <SurveyListScreen {...makeProps({ surveys: surveys(10) })} />
        </NavigationContext.Provider>,
      )
    })
    expect(wrappers(tree.root)).toHaveLength(7)
    // Unfocused (mounted at launch under the splash): rows 1 to 7 are only waiting, hidden.
    const delays = () => withDelaySpy.mock.calls.map(([delay]) => delay)
    expect(delays().every((delay) => delay === ENTRANCE_REWIND_DELAY_MS)).toBe(true)
    withDelaySpy.mockClear()
    now += 60_000
    emit("focus")
    // Focused: each of the seven rows starts its staggered slide, 40 ms apart.
    expect(delays()).toEqual([1, 2, 3, 4, 5, 6, 7].map((i) => i * brandMotion.staggerMs))
  })

  test("rows that mount after the entrance, as scrolling does, are shown at once", () => {
    const root = mount(makeProps({ surveys: surveys(3) }))
    expect(wrappers(root)).toHaveLength(3)
    now += LIST_ENTRANCE_GRACE_MS + 1
    // A survey added while the list is on screen mounts a new row at a low index: no entrance, and
    // the existing rows keep theirs (they are not remounted).
    act(() => tree.update(<SurveyListScreen {...makeProps({ surveys: surveys(4) })} />))
    expect(root.findAllByType("SurveyRow" as never)).toHaveLength(4)
    expect(wrappers(root)).toHaveLength(3)
  })

  test("shows the one summary card with the figures the screen already had (D-22)", () => {
    const list = mount(makeProps()).findByType("FlatList" as never)
    const header = list.props.header as React.ReactElement<{ children: React.ReactElement[] }>
    const card = header.props.children.find(Boolean) as React.ReactElement<{
      total: number
      toFinish: number
    }>
    expect(card.type).toBe("ListSummaryCard")
    expect(card.props).toEqual({ total: 2, toFinish: 1 })
  })

  test("shows the empty state, and no figures, without surveys", () => {
    const list = mount(makeProps({ surveys: [] })).findByType("FlatList" as never)
    expect(list.props.footer).not.toBeNull()
    expect(
      (list.props.header as React.ReactElement<{ children: unknown[] }>).props.children,
    ).toEqual([null, null])
  })
})
