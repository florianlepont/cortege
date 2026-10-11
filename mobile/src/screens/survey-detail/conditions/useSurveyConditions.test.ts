import React from "react"
import renderer, { act } from "react-test-renderer"
import type { LocalSurvey } from "../../../storage"
import { useSurveyConditions, type SurveyConditions } from "./useSurveyConditions"

const mockGetLocalSurveyDraft = jest.fn()
jest.mock("../../../storage", () => ({
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

afterEach(() => {
  mockGetLocalSurveyDraft.mockReset()
})

const survey = (updatedAt: string): LocalSurvey =>
  ({ id: "s1", site_name: "Lisière", updated_at: updatedAt }) as LocalSurvey

function mount() {
  const seen: SurveyConditions[] = []
  function Probe({ current }: { current: LocalSurvey }) {
    seen.push(useSurveyConditions(current))
    return null
  }
  let tree!: renderer.ReactTestRenderer
  const render = async (current: LocalSurvey) => {
    await act(async () => {
      const element = React.createElement(Probe, { current })
      if (tree) tree.update(element)
      else tree = renderer.create(element)
    })
  }
  return { seen, render, last: () => seen[seen.length - 1] }
}

describe("useSurveyConditions", () => {
  test("starts not loaded, then returns the note, the weather and the parcel ids", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue({
      survey_note: "Sol frais",
      weather: { sky: "cloudy", temperature_c: 14.5, source: "meteo_france" },
      parcel_ids: ["p1", "p2"],
    })
    const probe = mount()

    await probe.render(survey("t1"))

    expect(probe.seen[0]).toEqual({ note: null, weather: null, parcelIds: [], loaded: false })
    expect(probe.last()).toEqual({
      note: "Sol frais",
      weather: { sky: "cloudy", temperature_c: 14.5, source: "meteo_france" },
      parcelIds: ["p1", "p2"],
      loaded: true,
    })
  })

  test("a missing draft gives a loaded section with no note and no weather", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue(null)
    const probe = mount()

    await probe.render(survey("t1"))

    expect(probe.last()).toEqual({ note: null, weather: null, parcelIds: [], loaded: true })
  })

  test("a draft without note, weather or a list of parcels reads as empty values", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue({ survey_note: null, parcel_ids: "oops" })
    const probe = mount()

    await probe.render(survey("t1"))

    expect(probe.last()).toEqual({ note: null, weather: null, parcelIds: [], loaded: true })
  })

  test("a failed read leaves the section usable with empty values", async () => {
    mockGetLocalSurveyDraft.mockRejectedValue(new Error("db closed"))
    const probe = mount()

    await probe.render(survey("t1"))

    expect(probe.last().loaded).toBe(true)
    expect(probe.last().note).toBeNull()
  })

  test("reads again when the survey row changes", async () => {
    mockGetLocalSurveyDraft.mockResolvedValueOnce({ survey_note: "avant" })
    const probe = mount()
    await probe.render(survey("t1"))

    mockGetLocalSurveyDraft.mockResolvedValueOnce({ survey_note: "après" })
    await probe.render(survey("t2"))

    expect(mockGetLocalSurveyDraft).toHaveBeenCalledTimes(2)
    expect(probe.last().note).toBe("après")
  })

  test("a read overtaken by a newer one is dropped", async () => {
    let resolveFirst!: (value: unknown) => void
    mockGetLocalSurveyDraft.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve)),
    )
    mockGetLocalSurveyDraft.mockResolvedValueOnce({ survey_note: "récent" })
    const probe = mount()
    await probe.render(survey("t1"))
    await probe.render(survey("t2"))

    await act(async () => {
      resolveFirst({ survey_note: "ancien" })
    })

    expect(probe.last().note).toBe("récent")
  })
})
