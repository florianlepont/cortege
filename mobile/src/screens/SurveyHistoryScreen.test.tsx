import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import type { ParcelSurveyHistoryResult } from "../hooks/useParcelSurveyHistory"
import type { LocalSurvey } from "../storage/types"
import { FrameLargeTitleContext } from "../ui/frame-large-title"
import { SurveyHistoryScreen } from "./SurveyHistoryScreen"
import type { SurveyHistoryScreenProps } from "./survey-detail/screen-props"
import { PAGE_END_MARGIN } from "./survey-detail/useSubPageContent"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    ScrollView: mockComponent("ScrollView"),
    RefreshControl: mockComponent("RefreshControl"),
    Text: mockComponent("Text"),
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../ui/PageTitle", () => ({ PageTitle: "PageTitle" }))
jest.mock("../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../ui/Skeleton", () => ({ SkeletonRow: "SkeletonRow" }))
jest.mock("./survey-detail/ParcelHistoryView", () => ({ ParcelHistoryView: "ParcelHistoryView" }))

const mockParcelIds: string[] = ["75056000AB0001"]
jest.mock("./survey-detail/useSurveyDetailData", () => ({
  useSurveyDetailData: () => ({ detail: undefined, parcelIds: mockParcelIds }),
}))

let mockOffline = false
jest.mock("../hooks/useIsOffline", () => ({ useIsOffline: () => mockOffline }))

const mockHistoryHook = jest.fn()
jest.mock("../hooks/useParcelSurveyHistory", () => ({
  useParcelSurveyHistory: (...args: unknown[]) => mockHistoryHook(...args),
}))

import { fr } from "../i18n"
import { ownItem, V32 } from "../../test/parcel-history-fixtures"

const page = fr.parcelHistory.page
const reload = jest.fn()

function historyState(overrides: Partial<ParcelSurveyHistoryResult> = {}) {
  return { items: [], loading: false, error: false, offline: false, reload, ...overrides }
}

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

const onOpenSurvey = jest.fn()

function render(
  largeTitle = false,
  overrides: Partial<SurveyHistoryScreenProps> = {},
): renderer.ReactTestRenderer {
  const props = {
    apiUrl: "http://api",
    accessToken: "token-1",
    selectedSurvey: { id: "survey-1", status: "draft" } as unknown as LocalSurvey,
    surveyDetails: {},
    detailsLoadingSurveyId: null,
    onOpenSurvey,
    ...overrides,
  } as unknown as SurveyHistoryScreenProps
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FrameLargeTitleContext.Provider value={largeTitle}>
        <SurveyHistoryScreen {...props} />
      </FrameLargeTitleContext.Provider>,
    )
  })
  return tree
}

const types = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findByType("ScrollView" as never)
    .children.map((child) => (child as { type: unknown }).type)

/** The scroll view receives the RefreshControl as an element prop (the mock does not draw it). */
const refreshProps = (tree: renderer.ReactTestRenderer) =>
  tree.root.findByType("ScrollView" as never).props.refreshControl.props

beforeEach(() => {
  mockOffline = false
  mockParcelIds.splice(0, mockParcelIds.length, "75056000AB0001")
  mockHistoryHook.mockReset()
  mockHistoryHook.mockReturnValue(historyState())
  reload.mockReset()
  onOpenSurvey.mockReset()
})

describe("SurveyHistoryScreen", () => {
  test("shows the title, the subtitle, then the loaded history and no change log", () => {
    mockHistoryHook.mockReturnValue(
      historyState({ items: [ownItem("s0", { ibp_method_version: V32 })] }),
    )
    const tree = render()
    expect(types(tree)).toEqual(["PageTitle", "Text", "ParcelHistoryView"])
    expect(tree.root.findByType("Text" as never).props.children).toBe(page.subtitle)
    const view = tree.root.findByType("ParcelHistoryView" as never)
    expect(view.props.variant).toBe("own")
    expect(view.props.onOpenSurvey).toBe(onOpenSurvey)
    expect(view.props.entries).toHaveLength(1)
    expect(view.props.entries[0]).toMatchObject({ surveyId: "s0", isCurrent: false })
  })

  test("marks the open survey as the current entry", () => {
    mockHistoryHook.mockReturnValue(historyState({ items: [ownItem("survey-1")] }))
    const view = render().root.findByType("ParcelHistoryView" as never)
    expect(view.props.entries[0].isCurrent).toBe(true)
  })

  test("calls the hook with the parcel, the offline flag and the status of the survey", () => {
    render()
    expect(mockHistoryHook).toHaveBeenCalledWith(
      "http://api",
      "token-1",
      "75056000AB0001",
      false,
      "draft",
    )
  })

  test("without a parcel: the no-parcel notice and a null parcel id for the hook", () => {
    mockParcelIds.splice(0, mockParcelIds.length)
    const tree = render()
    const notice = tree.root.findByType("AppNotice" as never)
    expect(notice.props).toMatchObject({ tone: "info", message: page.noParcel })
    expect(mockHistoryHook.mock.calls[0][2]).toBeNull()
    expect(tree.root.findAllByType("ParcelHistoryView" as never)).toHaveLength(0)
  })

  test("offline from the network hook: the warning notice", () => {
    mockOffline = true
    const notice = render().root.findByType("AppNotice" as never)
    expect(notice.props).toMatchObject({ tone: "warning", message: page.offline })
    expect(mockHistoryHook.mock.calls[0][3]).toBe(true)
  })

  test("offline reported by the history hook: the warning notice", () => {
    mockHistoryHook.mockReturnValue(historyState({ offline: true }))
    const notice = render().root.findByType("AppNotice" as never)
    expect(notice.props).toMatchObject({ tone: "warning", message: page.offline })
  })

  test("error: the danger notice with the reload action", () => {
    mockHistoryHook.mockReturnValue(historyState({ error: true }))
    const notice = render().root.findByType("AppNotice" as never)
    expect(notice.props).toMatchObject({ tone: "danger", message: fr.parcelHistory.loadFailed })
    expect(notice.props.action.label).toBe(page.reload)
    notice.props.action.onPress()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  test("first load: a glass card with three skeleton rows and a spoken label", () => {
    mockHistoryHook.mockReturnValue(historyState({ loading: true }))
    const tree = render()
    expect(tree.root.findAllByType("SkeletonRow" as never)).toHaveLength(3)
    const card = tree.root.findAll(
      (n: ReactTestInstance) => n.props.accessibilityLabel === fr.parcelHistory.loading,
    )[0]
    expect(card.props.accessibilityLiveRegion).toBe("polite")
    expect(tree.root.findAllByType("ParcelHistoryView" as never)).toHaveLength(0)
  })

  test("no access token yet: the skeleton, never the first-survey view", () => {
    const tree = render(false, { accessToken: null })
    expect(tree.root.findAllByType("SkeletonRow" as never)).toHaveLength(3)
    expect(tree.root.findAllByType("ParcelHistoryView" as never)).toHaveLength(0)
  })

  test("pull to refresh reloads; it spins only while loading with content on screen", () => {
    const idle = refreshProps(render())
    expect(idle.refreshing).toBe(false)
    idle.onRefresh()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(idle.tintColor).toEqual(expect.any(String))

    mockHistoryHook.mockReturnValue(historyState({ loading: true }))
    expect(refreshProps(render()).refreshing).toBe(false)

    mockHistoryHook.mockReturnValue(historyState({ loading: true, items: [ownItem("s0")] }))
    const tree = render()
    expect(refreshProps(tree).refreshing).toBe(true)
    // The previous content stays while it reloads.
    expect(tree.root.findAllByType("ParcelHistoryView" as never)).toHaveLength(1)
  })

  test("the scroll content ends above the floating tab bar, with a margin", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(90 + PAGE_END_MARGIN)
    expect(padding).toBeGreaterThanOrEqual(90)
  })
})

describe("under the native large title (12.2-17)", () => {
  test("iOS insets the page: automatic insets, only the margin under the last item", () => {
    const scroll = render(true).root.findByType("ScrollView" as never)
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("automatic")
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(PAGE_END_MARGIN)
  })

  test("elsewhere the page keeps its own insets", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("never")
  })
})
