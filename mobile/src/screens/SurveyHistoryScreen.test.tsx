import React from "react"
import renderer, { act } from "react-test-renderer"
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
jest.mock("../ui/PageTitle", () => ({ PageTitle: "PageTitle" }))
jest.mock("./survey-detail/EventsTab", () => ({ EventsTab: "EventsTab" }))
jest.mock("./survey-detail/HistorySection", () => ({ HistorySection: "HistorySection" }))
jest.mock("./survey-detail/useSurveyDetailData", () => ({
  useSurveyDetailData: () => ({ detail: undefined, parcelIds: ["75056000AB0001"] }),
}))

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(largeTitle = false): renderer.ReactTestRenderer {
  const props = {
    apiUrl: "http://api",
    accessToken: null,
    selectedSurvey: { id: "survey-1" } as unknown as LocalSurvey,
    surveyDetails: {},
    detailsLoadingSurveyId: null,
    surveyEvents: {},
    eventsLoadingSurveyId: null,
    onLoadSurveyEvents: jest.fn(),
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

describe("SurveyHistoryScreen", () => {
  test("shows the title, the steps of the survey, then the earlier surveys of the parcel", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    const order = scroll.children.map((child) => (child as { type: unknown }).type)
    expect(order).toEqual(["PageTitle", "EventsTab", "HistorySection"])
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
