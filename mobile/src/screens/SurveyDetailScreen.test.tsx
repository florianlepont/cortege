import { readFileSync } from "node:fs"
import { join } from "node:path"
import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { notificationAsync } from "../../test/expo-haptics.mock"
import type { LocalSurvey } from "../storage/types"
import { SurveyDetailScreen } from "./SurveyDetailScreen"
import type { SurveyDetailScreenProps } from "./survey-detail/screen-props"

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

afterEach(() => {
  notificationAsync.mockClear()
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
    Alert: { alert: jest.fn() },
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/dev-tools", () => ({ shouldShowDevTools: () => false }))
jest.mock("../app/survey-pdf-export", () => ({ exportAndShareSurveyPdf: jest.fn() }))
jest.mock("./survey-screen-helpers", () => ({ selectPreviewCandidates: () => [] }))
jest.mock("../ui/AppActionSheet", () => ({ AppActionSheet: "AppActionSheet" }))
jest.mock("../ui/AppGroupedList", () => ({ AppGroupedList: "AppGroupedList" }))
jest.mock("../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("./survey-detail/DebugTab", () => ({ DebugTab: "DebugTab" }))
jest.mock("./survey-detail/DetailActions", () => ({ DetailActions: "DetailActions" }))
jest.mock("./survey-detail/FinishBar", () => ({ FinishBar: "FinishBar" }))
jest.mock("./survey-detail/ParcelMapCard", () => ({ ParcelMapCard: "ParcelMapCard" }))
jest.mock("./survey-detail/SurveyOfflineMapRow", () => ({
  SurveyOfflineMapRow: "SurveyOfflineMapRow",
}))
jest.mock("./survey-detail/PhotosStrip", () => ({ PhotosStrip: "PhotosStrip" }))
jest.mock("./survey-detail/ScoreCard", () => ({ ScoreCard: "ScoreCard" }))
jest.mock("./survey-detail/SummaryHeader", () => ({ SummaryHeader: "SummaryHeader" }))
jest.mock("./survey-detail/useSurveyDetailHeader", () => ({ useSurveyDetailHeader: jest.fn() }))
jest.mock("./survey-detail/summary-state", () => ({
  resolveStatusLine: () => ({ status: "Brouillon", sync: "x", syncTone: "ok" }),
  resolveFinishCta: () => ({ kind: "hidden" }),
}))
jest.mock("./survey-detail/useSurveyDetailData", () => ({
  useSurveyDetailData: () => ({
    detail: undefined,
    displayedScores: { ibp_total: 30, ibp_peuplement_gestion: 20, ibp_contexte: 10 },
    displayedFactorEntries: [
      ["A", { score_points: 3 }],
      ["B", { score_points: null }],
      ["not-a-factor", { score_points: 1 }],
    ],
    useLocalDraftView: true,
    canEditSurvey: true,
    canFinishNow: false,
    isComplete: false,
    filledFactorCount: 2,
    nextFactor: "A",
    localDraftMeta: null,
    scoringContext: { ibp_method_version: null, ibp_cas: null },
    activeSiteName: "Parcelle A",
    parcelIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  }),
}))

function makeSurvey(status: string): LocalSurvey {
  return { id: "survey-1", status } as LocalSurvey
}

function makeProps(status: string): SurveyDetailScreenProps {
  return {
    apiUrl: "http://api",
    accessToken: null,
    navigation: {} as never,
    selectedSurvey: makeSurvey(status),
    selectedSurveyAttachments: [],
    surveyDetails: {},
    detailsLoadingSurveyId: null,
    surveyEvents: {},
    onTakePhoto: jest.fn(),
    onPickPhoto: jest.fn(),
    onDeleteAttachment: jest.fn(),
    onDeleteSurvey: jest.fn(),
    onSubmitSurvey: jest.fn(),
    onRetrySurvey: jest.fn(),
    onDiscardSurvey: jest.fn(),
    onRenameSurvey: jest.fn(),
    onOpenContext: jest.fn(),
    onOpenParcels: jest.fn(),
    onOpenScore: jest.fn(),
    onOpenFactor: jest.fn(),
    onOpenHistory: jest.fn(),
  }
}

function mount(status: string): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<SurveyDetailScreen {...makeProps(status)} />)
  })
  return tree!
}

function update(tree: ReactTestRenderer, status: string): void {
  act(() => {
    tree.update(<SurveyDetailScreen {...makeProps(status)} />)
  })
}

const byType = (tree: ReactTestRenderer, type: string): ReactTestInstance[] =>
  tree.root.findAll((n) => (n.type as unknown) === type)

describe("SurveyDetailScreen summary", () => {
  test("has no factor bar chart and no glass card: the chart lives on the score page only (D-24)", () => {
    const tree = mount("draft")
    expect(byType(tree, "FactorBarsChart")).toHaveLength(0)
    expect(byType(tree, "AppCard")).toHaveLength(0)
    const scroll = byType(tree, "ScrollView")[0]
    const order = scroll.children.map((child) => String((child as ReactTestInstance).type))
    // The score card is followed straight by the photos.
    expect(order.indexOf("PhotosStrip")).toBe(order.indexOf("ScoreCard") + 1)
  })

  test("the source of the summary no longer imports the chart", () => {
    const source = readFileSync(join(__dirname, "SurveyDetailScreen.tsx"), "utf8")
    expect(source).not.toContain("FactorBarsChart")
    expect(source).not.toContain("factorPointsFromEntries")
  })

  test("keeps the one bottom button and the three rows", () => {
    const tree = mount("draft")
    expect(byType(tree, "FinishBar")).toHaveLength(1)
    expect(byType(tree, "AppGroupedList")[0].props.sections[0].rows).toHaveLength(3)
  })

  test("the score card pulses and the haptic fires when a submit succeeds, not on mount", () => {
    const tree = mount("draft")
    expect(byType(tree, "ScoreCard")[0].props.pulseTrigger).toBe(0)
    expect(notificationAsync).not.toHaveBeenCalled()

    update(tree, "submitted")
    expect(byType(tree, "ScoreCard")[0].props.pulseTrigger).toBe(1)
    expect(notificationAsync).toHaveBeenCalledTimes(1)

    update(tree, "synced")
    expect(byType(tree, "ScoreCard")[0].props.pulseTrigger).toBe(1)
    expect(notificationAsync).toHaveBeenCalledTimes(1)
  })
})
