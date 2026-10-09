import { readFileSync } from "fs"
import { join } from "path"
import React from "react"
import renderer, { act } from "react-test-renderer"
import type { CommunitySurveyDetail } from "@cortege/ibp-domain"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { CommunitySurveyState } from "../../hooks/useCommunitySurvey"
import { fr } from "../../i18n"
import { FrameLargeTitleContext } from "../../ui/frame-large-title"
import { PAGE_END_MARGIN } from "../survey-detail/useSubPageContent"
import { CommunityHistoryScreen } from "./CommunityHistoryScreen"

const t = fr.communitySurvey

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
  const mockComponent = (name: string) => {
    const Component = ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
    Component.displayName = name
    return Component
  }
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios" },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 44 }))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../../ui/PageTitle", () => ({ PageTitle: "PageTitle" }))
jest.mock("../survey-detail/ParcelHistoryView", () => ({ ParcelHistoryView: "ParcelHistoryView" }))

const history = [
  {
    survey_id: "s-1",
    site_name: "Bois du Premier",
    author_name: "Alix",
    observation_year: 2025,
    version_number: 1,
    ibp_total: 24,
    submitted_at: "2025-06-10T09:00:00.000Z",
    is_current: false,
  },
  {
    survey_id: "s-2",
    site_name: "Bois du Second",
    author_name: "Camille",
    observation_year: 2026,
    version_number: 2,
    ibp_total: 31,
    submitted_at: "2026-09-28T09:41:00.000Z",
    is_current: true,
  },
]

const detail = (): CommunitySurveyDetail => ({
  survey_id: "s-2",
  site_name: "Bois du Second",
  author_name: "Camille",
  submitted_at: "2026-09-28T09:41:00.000Z",
  observation_year: 2026,
  version_number: 2,
  region_version: null,
  vegetation_stage: null,
  ibp_method_version: IBP_METHOD_V3_2,
  ibp_cas: 2,
  ibp_cas3_scale: false,
  scores: { ibp_total: 31, ibp_peuplement_gestion: 22, ibp_contexte: 9 },
  factor_results: {},
  parcel_ids: ["75101AB0123"],
  display_location: null,
  history,
})

const state = (overrides: Partial<CommunitySurveyState> = {}): CommunitySurveyState => ({
  detail: detail(),
  photos: [],
  status: "ready",
  photosFailed: false,
  reload: jest.fn(),
  ...overrides,
})

function render(current: CommunitySurveyState, largeTitle = false) {
  const onOpenSurvey = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FrameLargeTitleContext.Provider value={largeTitle}>
        <CommunityHistoryScreen state={current} onOpenSurvey={onOpenSurvey} />
      </FrameLargeTitleContext.Provider>,
    )
  })
  return { tree, onOpenSurvey }
}

const byType = (tree: renderer.ReactTestRenderer, type: string) =>
  tree.root.findAll((node) => (node.type as unknown) === type)
const texts = (tree: renderer.ReactTestRenderer): string[] =>
  byType(tree, "Text")
    .flatMap((node) => React.Children.toArray(node.props.children))
    .filter((child): child is string => typeof child === "string")

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

describe("CommunityHistoryScreen", () => {
  it("shows a spinner and the loading text while the survey loads", () => {
    const { tree } = render(state({ detail: null, status: "loading" }))
    expect(byType(tree, "ActivityIndicator")).toHaveLength(1)
    expect(texts(tree)).toContain(t.loading)
    expect(byType(tree, "ParcelHistoryView")).toHaveLength(0)
  })

  it("shows the error text and a retry button that reloads", () => {
    const reload = jest.fn()
    const { tree } = render(state({ detail: null, status: "error", reload }))
    expect(texts(tree)).toContain(t.error)
    const retry = byType(tree, "AppButton")[0]
    expect(retry.props.label).toBe(t.retry)
    act(() => retry.props.onPress())
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("shows the title, the subtitle and the community parcel history when ready", () => {
    const { tree, onOpenSurvey } = render(state())
    expect(byType(tree, "PageTitle")[0].props.children).toBe(fr.navigation.headers.communityHistory)
    expect(texts(tree)).toContain(fr.parcelHistory.page.subtitle)
    const view = byType(tree, "ParcelHistoryView")[0]
    expect(view.props.variant).toBe("community")
    expect(view.props.entries.map((entry: { total: number }) => entry.total)).toEqual([24, 31])
    expect(view.props.entries.map((entry: { isCurrent: boolean }) => entry.isCurrent)).toEqual([
      false,
      true,
    ])
    view.props.onOpenSurvey("s-1")
    expect(onOpenSurvey).toHaveBeenCalledWith("s-1")
  })

  it("insets the page for the native large title and clears the tab bar otherwise", () => {
    const large = byType(render(state(), true).tree, "ScrollView")[0]
    expect(large.props.contentInsetAdjustmentBehavior).toBe("automatic")
    expect(flattenStyle(large.props.contentContainerStyle).paddingBottom).toBe(PAGE_END_MARGIN)
    const plain = byType(render(state()).tree, "ScrollView")[0]
    expect(plain.props.contentInsetAdjustmentBehavior).toBe("never")
    expect(flattenStyle(plain.props.contentContainerStyle).paddingBottom).toBe(90 + PAGE_END_MARGIN)
  })

  it("never reaches the change log of another member's survey (T-24-06)", () => {
    const files = [
      join(__dirname, "CommunityHistoryScreen.tsx"),
      join(__dirname, "../../navigation/routes/CommunityHistoryRoute.tsx"),
    ]
    for (const file of files) {
      const source = readFileSync(file, "utf8")
      for (const forbidden of [
        "EventsTab",
        "SurveyJournal",
        "surveyJournal",
        "useSurveyDetailHeader",
        "surveyEvents",
        "unstable_headerRightItems",
        "headerRight",
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })
})
