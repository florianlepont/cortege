import React from "react"
import renderer, { act } from "react-test-renderer"
import type { LocalSurvey } from "../../storage"
import type { SurveyQueuePayload } from "../../storage/types"
import { countFilledFactors } from "../../app/ibp-scoring"
import { useLocalDraftSummary, type LocalDraftSummary } from "./useLocalDraftSummary"

jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (o: { ios?: unknown }) => o.ios },
}))

const mockGetLocalSurveyDraft = jest.fn()
jest.mock("../../storage", () => ({
  getLocalSurveyDraft: (...args: unknown[]) => mockGetLocalSurveyDraft(...args),
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

// The draft of 12.2-14: four context slots and six factors, which payload_completion (71) made
// Accueil read as 7 while the detail said 6 (the sqlite completion test checks the stored column).
const DRAFT: SurveyQueuePayload = {
  id: "s1",
  sync_version: 1,
  site_name: "Lisière de la Marne",
  region_version: "ACA",
  vegetation_stage: "collineen",
  parcel_ids: ["ab12"],
  factors: {
    A: { native_genus_count: 5 },
    B: { strata_count: 3, covered_autochthonous_percent: 60 },
    C: { bmg_count: 2, bmm_count: 2, surface_ha: 1 },
    D: { bmg_count: 0, bmm_count: 2, surface_ha: 1 },
    E: { tgb_count: 6, gb_count: 0, surface_ha: 1 },
    F: { trees_per_ha: 9 },
  },
}

const SURVEY = { id: "s1", site_name: "Lisière de la Marne", updated_at: "t" } as LocalSurvey

async function read(): Promise<LocalDraftSummary> {
  let result!: LocalDraftSummary
  function Probe() {
    result = useLocalDraftSummary(SURVEY)
    return null
  }
  await act(async () => {
    renderer.create(<Probe />)
  })
  return result
}

describe("useLocalDraftSummary factor count (12.2-14)", () => {
  test("missing factors is ten minus the shared count, the one the stored list column holds", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue(DRAFT)

    const summary = await read()

    expect(summary.missingFactorCount).toBe(4)
    expect(10 - (summary.missingFactorCount ?? 0)).toBe(countFilledFactors(DRAFT))
  })

  test("a factor with a value the package cannot read is missing", async () => {
    const draft = { ...DRAFT, factors: { ...DRAFT.factors, B: { strata_count: "abc" } } }
    mockGetLocalSurveyDraft.mockResolvedValue(draft)

    const summary = await read()

    expect(summary.missingFactorCount).toBe(5)
    expect(10 - (summary.missingFactorCount ?? 0)).toBe(countFilledFactors(draft))
  })
})

describe("useLocalDraftSummary annotations (phase 27, D-13, D-14)", () => {
  test("a factor note and a doubt are read from the payload and put on their entries", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue({
      ...DRAFT,
      factors: {
        ...DRAFT.factors,
        annotations: { C: { note: "souches" }, D: { doubt: true } },
      },
    })

    const summary = await read()

    expect(summary.annotations).toEqual({ C: { note: "souches" }, D: { doubt: true } })
    const entry = (code: string) => summary.factorEntries.find(([key]) => key === code)?.[1]
    expect(entry("C")?.note).toBe("souches")
    expect(entry("C")?.doubt).toBeUndefined()
    expect(entry("D")?.doubt).toBe(true)
    expect(entry("A")?.doubt).toBeUndefined()
    expect(entry("A")?.note).toBeUndefined()
  })

  test("the annotations never move a score or the factor count", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue(DRAFT)
    const plain = await read()
    mockGetLocalSurveyDraft.mockResolvedValue({
      ...DRAFT,
      factors: {
        ...DRAFT.factors,
        annotations: { A: { doubt: true, note: "n" }, J: { doubt: true } },
      },
    })
    const annotated = await read()

    expect(annotated.scores).toEqual(plain.scores)
    expect(annotated.missingFactorCount).toBe(plain.missingFactorCount)
    expect(
      annotated.factorEntries.map(([code, e]) => [code, e.score_points, e.selected_class]),
    ).toEqual(plain.factorEntries.map(([code, e]) => [code, e.score_points, e.selected_class]))
  })

  test("a draft without annotations has an empty container", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue(DRAFT)

    expect((await read()).annotations).toEqual({})
  })
})

describe("useLocalDraftSummary hasRoute (phase 30, O-19)", () => {
  const ROUTE = {
    version: 1,
    method: "full",
    counting: "capped",
    zone_surface_ha: 2.5,
    guide: { chosen_by: "observer" },
  } as const

  test("a draft with a valid route has one", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue({ ...DRAFT, survey_route: ROUTE })

    expect((await read()).hasRoute).toBe(true)
  })

  test("a draft without route, or with a damaged one, has none", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue(DRAFT)
    expect((await read()).hasRoute).toBe(false)

    mockGetLocalSurveyDraft.mockResolvedValue({
      ...DRAFT,
      survey_route: { ...ROUTE, method: "typological" },
    })
    expect((await read()).hasRoute).toBe(false)
  })

  test("a draft that is not found has none", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue(null)

    expect((await read()).hasRoute).toBe(false)
  })
})
