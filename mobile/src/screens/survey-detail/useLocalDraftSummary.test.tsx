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
