import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import type { LocalSurvey } from "../storage/types"
import { FrameLargeTitleContext } from "../ui/frame-large-title"
import { SurveyScoreScreen } from "./SurveyScoreScreen"
import { PAGE_END_MARGIN } from "./survey-detail/useSubPageContent"
import type { SurveyScoreScreenProps } from "./survey-detail/screen-props"

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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("../ui/AppCard", () => ({ AppCard: "AppCard" }))
jest.mock("../ui/PageTitle", () => ({ PageTitle: "PageTitle" }))
jest.mock("../ui/FactorBarsChart", () => ({
  FactorBarsChart: "FactorBarsChart",
  factorPointsFromEntries: (entries: Array<[string, { score_points: number | null }]>) =>
    Object.fromEntries(entries.map(([key, value]) => [key, value.score_points])),
}))
jest.mock("./survey-detail/ScoreBreakdown", () => ({ ScoreBreakdown: "ScoreBreakdown" }))
jest.mock("./survey-detail/FactorsList", () => ({ FactorsList: "FactorsList" }))
jest.mock("./survey-detail/useSurveyDetailData", () => ({
  useSurveyDetailData: () => ({
    displayedScores: { ibp_total: 30, ibp_peuplement_gestion: 20, ibp_contexte: 10 },
    displayedFactorEntries: [
      ["A", { score_points: 3 }],
      ["B", { score_points: null }],
      ["not-a-factor", { score_points: 1 }],
    ],
    showFactorLoadingHint: false,
    canEditSurvey: true,
  }),
}))

const survey = { id: "s1" } as unknown as LocalSurvey

function render(largeTitle = false): ReactTestRenderer {
  const props = {
    selectedSurvey: survey,
    surveyDetails: {},
    detailsLoadingSurveyId: null,
    onOpenFactor: jest.fn(),
  } as unknown as SurveyScoreScreenProps
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FrameLargeTitleContext.Provider value={largeTitle}>
        <SurveyScoreScreen {...props} />
      </FrameLargeTitleContext.Provider>,
    )
  })
  return tree as ReactTestRenderer
}

describe("SurveyScoreScreen (variant I)", () => {
  test("renders title, breakdown, a glass card with the ten bars, then the factor rows, in that order", () => {
    const tree = render()
    const scroll = tree.root.findByType("ScrollView" as never)
    const order = scroll.children.map((child) => (child as { type: unknown }).type)
    expect(order).toEqual(["PageTitle", "ScoreBreakdown", "AppCard", "FactorsList"])
    const card = tree.root.findByType("AppCard" as never)
    expect(card.props.variant).toBe("glass")
    const chart = tree.root.findByType("FactorBarsChart" as never)
    expect(chart.props.animate).toBe(true)
    expect(chart.props.entries).toEqual({ A: 3, B: null, "not-a-factor": 1 })
  })

  test("the factor rows stay the way to open a factor", () => {
    const tree = render()
    const list = tree.root.findByType("FactorsList" as never)
    expect(list.props.canEditSurvey).toBe(true)
    expect(typeof list.props.onOpenFactor).toBe("function")
  })
})

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

describe("bottom clearance above the tab bar", () => {
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
