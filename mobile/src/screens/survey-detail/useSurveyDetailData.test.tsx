import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorAnnotations } from "@cortege/ibp-domain"
import type { SurveyDetailResponse } from "../../app/types"
import type { LocalSurvey } from "../../storage"
import { useSurveyDetailData, type SurveyDetailData } from "./useSurveyDetailData"
import type { LocalDraftSummary } from "./useLocalDraftSummary"

jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (o: { ios?: unknown }) => o.ios },
}))
jest.mock("./ScoringContextEditor", () => ({ resolveScoringContext: () => ({}) }))

let mockLocalDraft: LocalDraftSummary
jest.mock("./useLocalDraftSummary", () => ({
  NOT_FILLED_CLASS: "Not filled",
  useLocalDraftSummary: () => mockLocalDraft,
}))

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

const SURVEY = { id: "s1", site_name: "Bois", status: "submitted", created_at: "t" } as LocalSurvey

function detailWith(factors: Record<string, unknown> | undefined): SurveyDetailResponse {
  return {
    id: "s1",
    factors,
    factor_results: {
      B: { selected_class: "S1", score_points: 3, warnings: [] },
      A: { selected_class: "S2", score_points: 4, warnings: [] },
    },
    scores: { ibp_total: 7, ibp_peuplement_gestion: 7, ibp_contexte: 0 },
  } as unknown as SurveyDetailResponse
}

function localDraft(annotations: FactorAnnotations): LocalDraftSummary {
  return {
    scores: null,
    factorEntries: [],
    annotations,
    submitReady: null,
    hasRoute: false,
    missingFactorCount: null,
    meta: null,
  }
}

function read(detail: SurveyDetailResponse, survey: LocalSurvey = SURVEY): SurveyDetailData {
  let result!: SurveyDetailData
  function Probe() {
    result = useSurveyDetailData(survey, { s1: detail }, null)
    return null
  }
  act(() => {
    renderer.create(<Probe />)
  })
  return result
}

describe("useSurveyDetailData factor annotations (phase 27, D-13)", () => {
  test("a submitted survey takes the doubt and the note of the server factors", () => {
    mockLocalDraft = localDraft({ B: { note: "local" } })

    const data = read(detailWith({ annotations: { A: { doubt: true, note: "serveur" } } }))
    const byCode = Object.fromEntries(data.displayedFactorEntries)

    expect(data.displayedFactorEntries.map(([code]) => code)).toEqual(["A", "B"])
    expect(byCode.A.doubt).toBe(true)
    expect(byCode.A.note).toBe("serveur")
    expect(byCode.B.note).toBeUndefined()
  })

  test("without server annotations the local payload's are used", () => {
    mockLocalDraft = localDraft({ B: { doubt: true } })

    const byCode = Object.fromEntries(read(detailWith(undefined)).displayedFactorEntries)

    expect(byCode.B.doubt).toBe(true)
    expect(byCode.A.doubt).toBeUndefined()
  })

  test("annotations never change the points or the class", () => {
    mockLocalDraft = localDraft({})
    const plain = read(detailWith(undefined)).displayedFactorEntries
    const annotated = read(
      detailWith({ annotations: { A: { doubt: true }, B: { note: "x" } } }),
    ).displayedFactorEntries

    expect(annotated.map(([c, e]) => [c, e.score_points, e.selected_class])).toEqual(
      plain.map(([c, e]) => [c, e.score_points, e.selected_class]),
    )
  })
})

describe("useSurveyDetailData finish gate (phase 30, O-19)", () => {
  const DRAFT_SURVEY = {
    id: "s1",
    site_name: "Bois",
    status: "draft",
    sync_blocked: 0,
    created_at: "t",
  } as LocalSurvey

  test("a complete draft can be finished only with a route", () => {
    mockLocalDraft = { ...localDraft({}), submitReady: true, hasRoute: true }
    expect(read(detailWith(undefined), DRAFT_SURVEY).canFinishNow).toBe(true)

    mockLocalDraft = { ...localDraft({}), submitReady: true, hasRoute: false }
    expect(read(detailWith(undefined), DRAFT_SURVEY).canFinishNow).toBe(false)
  })
})
