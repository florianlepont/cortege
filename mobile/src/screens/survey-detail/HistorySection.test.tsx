import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../i18n"
import { HistorySection } from "./HistorySection"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
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
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})
jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title }: { title: string }) =>
      ReactRef.createElement("AppSectionHeader", { title }),
  }
})
jest.mock("../../ui/AppNotice", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppNotice: ({ message }: { message: string }) =>
      ReactRef.createElement("AppNotice", { message }),
  }
})

const mockFetchParcelSurveyHistory = jest.fn()
jest.mock("../../api/ibp-api", () => ({
  fetchParcelSurveyHistory: (...args: unknown[]) => mockFetchParcelSurveyHistory(...args),
}))

let tree: ReactTestRenderer

async function mount(props: React.ComponentProps<typeof HistorySection>): Promise<void> {
  await act(async () => {
    tree = renderer.create(<HistorySection {...props} />)
  })
}

const BASE_PROPS = {
  apiUrl: "http://localhost:3000",
  accessToken: "access-token",
  parcelId: "75056000AB0001",
  currentSurveyId: "current",
  currentScores: { ibp_peuplement_gestion: 20, ibp_contexte: 10, ibp_total: 30 },
  currentFactorResults: {
    A: {
      factor_id: "A",
      observed_value_raw: 5,
      selected_class: "S5" as const,
      score_points: 5,
      warnings: [],
    },
  },
}

afterEach(() => {
  jest.clearAllMocks()
})

describe("HistorySection", () => {
  test("renders nothing without a resolvable parcel id", async () => {
    await mount({ ...BASE_PROPS, parcelId: null })
    expect(tree.toJSON()).toBeNull()
    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
  })

  test("shows a notice when this is the parcel's first submitted survey", async () => {
    mockFetchParcelSurveyHistory.mockResolvedValue({ parcel_id: "p1", items: [] })
    await mount(BASE_PROPS)
    const notice = tree.root.findByType("AppNotice" as never) as ReactTestInstance
    expect(notice.props.message).toBe(fr.surveyDetail.versionHistory.none)
  })

  test("shows the total/factor deltas against the latest previous version, and lists it", async () => {
    mockFetchParcelSurveyHistory.mockResolvedValue({
      parcel_id: "p1",
      items: [
        {
          survey_id: "previous-1",
          observation_year: 2025,
          version_number: 1,
          scores: { ibp_peuplement_gestion: 15, ibp_contexte: 12, ibp_total: 27 },
          factor_results: {
            A: {
              factor_id: "A",
              observed_value_raw: 3,
              selected_class: "S2" as const,
              score_points: 3,
              warnings: [],
            },
          },
          submitted_at: "2025-06-01T00:00:00.000Z",
        },
      ],
    })
    await mount(BASE_PROPS)

    expect(mockFetchParcelSurveyHistory).toHaveBeenCalledWith(
      "http://localhost:3000",
      "access-token",
      "75056000AB0001",
    )
    const texts = tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    expect(texts).toContain(fr.surveyDetail.versionHistory.sinceLatest)
    expect(texts).toContain(fr.parcelHistory.delta.total(3))
    expect(texts).toContain(fr.parcelHistory.delta.stand(5))
    expect(texts).toContain(fr.parcelHistory.delta.context(-2))
    expect(texts).toContain(fr.surveyDetail.versionHistory.factorDelta("A", "+2"))
    expect(texts).toContain(fr.parcelHistory.entry({ year: 2025, version: 1, isLatest: false }))
  })

  test("excludes the current survey itself from the previous-versions list", async () => {
    mockFetchParcelSurveyHistory.mockResolvedValue({
      parcel_id: "p1",
      items: [
        {
          survey_id: "current",
          observation_year: 2026,
          version_number: 2,
          scores: BASE_PROPS.currentScores,
          factor_results: BASE_PROPS.currentFactorResults,
          submitted_at: "2026-06-01T00:00:00.000Z",
        },
      ],
    })
    await mount(BASE_PROPS)
    const notice = tree.root.findByType("AppNotice" as never) as ReactTestInstance
    expect(notice.props.message).toBe(fr.surveyDetail.versionHistory.none)
  })
})
