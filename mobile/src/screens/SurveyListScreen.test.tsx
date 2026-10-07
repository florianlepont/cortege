import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import type { LocalSurvey } from "../storage/types"
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
jest.mock("./survey-list/list-chrome", () => ({
  IntroStats: "IntroStats",
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
    attachmentsBySurvey: {},
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

const wrappers = (root: renderer.ReactTestInstance) =>
  root.findAll((node) => (node.type as unknown) === "View" && "entering" in node.props)

afterEach(() => {
  act(() => tree.unmount())
  reanimated.setReducedMotion(false)
})

describe("SurveyListScreen (12.2-11)", () => {
  test("keeps the virtualisation settings", () => {
    const list = mount(makeProps()).findByType("FlatList" as never)
    expect(list.props.windowSize).toBe(7)
    expect(list.props.removeClippedSubviews).toBe(true)
  })

  test("wraps each survey row in an entering view and hands it its list index", () => {
    const root = mount(makeProps())
    // 0 is the "À terminer" header, 1 the draft, 2 the "Terminés" header, 3 the submitted survey.
    const rows = root.findAllByType("SurveyRow" as never)
    expect(rows.map((row) => row.props.index)).toEqual([1, 3])
    expect(wrappers(root)).toHaveLength(2)
    for (const wrapper of wrappers(root)) expect(wrapper.props.entering).toBeDefined()
  })

  test("section headers are not wrapped in an entering view", () => {
    const root = mount(makeProps())
    expect(root.findAllByType("SectionTitle" as never)).toHaveLength(2)
    expect(wrappers(root)).toHaveLength(2)
  })

  test("a row past the eighth gets no entrance, and none at all under Reduce Motion", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      survey(`s${i}`, "draft", `2026-10-0${i % 9}T00:00:00.000Z`),
    )
    const root = mount(makeProps({ surveys: many }))
    const entering = wrappers(root).map((wrapper) => wrapper.props.entering !== undefined)
    // The header takes index 0, so rows 1 to 7 animate and rows 8 and 9 do not.
    expect(entering).toEqual([true, true, true, true, true, true, true, false, false, false])
    act(() => tree.unmount())
    reanimated.setReducedMotion(true)
    const reduced = mount(makeProps())
    expect(wrappers(reduced).every((wrapper) => wrapper.props.entering === undefined)).toBe(true)
  })

  test("shows the empty state, and no figures, without surveys", () => {
    const list = mount(makeProps({ surveys: [] })).findByType("FlatList" as never)
    expect(list.props.footer).not.toBeNull()
    expect(
      (list.props.header as React.ReactElement<{ children: unknown[] }>).props.children,
    ).toEqual([null, null])
  })
})
