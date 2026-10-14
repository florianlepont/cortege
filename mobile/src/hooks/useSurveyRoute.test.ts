import type { SurveyRoute } from "@cortege/ibp-domain"
import React from "react"
import renderer, { act } from "react-test-renderer"
import type { LocalSurvey } from "../storage/types"
import { useSurveyRoute, type SurveyRouteState } from "./useSurveyRoute"

const mockGetLocalSurveyDraft = jest.fn()
jest.mock("../storage/surveys", () => ({
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

const ROUTE: SurveyRoute = {
  version: 1,
  method: "partial_strip",
  counting: "uncapped",
  uncapped_factors: ["A", "C"],
  zone_surface_ha: 12,
  complement: { done: true, total_surface_ha: 14.5 },
  guide: { chosen_by: "guide", suggested: { method: "partial_strip", counting: "uncapped" } },
}

const survey = (updatedAt: string, id = "s1"): LocalSurvey =>
  ({ id, site_name: "Lisière", updated_at: updatedAt }) as LocalSurvey

function mount() {
  const seen: SurveyRouteState[] = []
  function Probe({ current }: { current: LocalSurvey | null }) {
    seen.push(useSurveyRoute(current))
    return null
  }
  let tree!: renderer.ReactTestRenderer
  const render = async (current: LocalSurvey | null) => {
    await act(async () => {
      const element = React.createElement(Probe, { current })
      if (tree) tree.update(element)
      else tree = renderer.create(element)
    })
  }
  return { seen, render, last: () => seen[seen.length - 1] }
}

describe("useSurveyRoute", () => {
  test("starts not loaded, then returns the route of the local payload", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue({ survey_route: ROUTE })
    const probe = mount()

    await probe.render(survey("t1"))

    expect(probe.seen[0]).toEqual({ route: null, loaded: false })
    expect(probe.last()).toEqual({ route: ROUTE, loaded: true })
    expect(mockGetLocalSurveyDraft).toHaveBeenCalledWith("s1")
  })

  test("a draft without a route, or a missing draft, gives a loaded null route", async () => {
    mockGetLocalSurveyDraft.mockResolvedValueOnce({ site_name: "x" })
    const probe = mount()
    await probe.render(survey("t1"))
    expect(probe.last()).toEqual({ route: null, loaded: true })

    mockGetLocalSurveyDraft.mockResolvedValueOnce(null)
    await probe.render(survey("t2"))
    expect(probe.last()).toEqual({ route: null, loaded: true })
  })

  test("a damaged stored route reads as null (T-30-21)", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue({ survey_route: { version: 1, method: "nope" } })
    const probe = mount()

    await probe.render(survey("t1"))

    expect(probe.last()).toEqual({ route: null, loaded: true })
  })

  test("a failed read gives a loaded null route", async () => {
    mockGetLocalSurveyDraft.mockRejectedValue(new Error("db closed"))
    const probe = mount()

    await probe.render(survey("t1"))

    expect(probe.last()).toEqual({ route: null, loaded: true })
  })

  test("a null survey gives a loaded null route without reading", async () => {
    const probe = mount()

    await probe.render(null)

    expect(probe.seen.every((state) => state.loaded && state.route === null)).toBe(true)
    expect(mockGetLocalSurveyDraft).not.toHaveBeenCalled()
  })

  test("reads again when the survey row changes", async () => {
    mockGetLocalSurveyDraft.mockResolvedValueOnce({ survey_route: ROUTE })
    const probe = mount()
    await probe.render(survey("t1"))

    mockGetLocalSurveyDraft.mockResolvedValueOnce({
      survey_route: { ...ROUTE, zone_surface_ha: 13 },
    })
    await probe.render(survey("t2"))

    expect(mockGetLocalSurveyDraft).toHaveBeenCalledTimes(2)
    expect(probe.last().route?.zone_surface_ha).toBe(13)
  })

  test("does not read again for a render with the same id and updated_at", async () => {
    mockGetLocalSurveyDraft.mockResolvedValue({ survey_route: ROUTE })
    const probe = mount()
    await probe.render(survey("t1"))
    await probe.render(survey("t1"))

    expect(mockGetLocalSurveyDraft).toHaveBeenCalledTimes(1)
  })

  test("never returns the route of another survey while the new one loads", async () => {
    mockGetLocalSurveyDraft.mockResolvedValueOnce({ survey_route: ROUTE })
    const probe = mount()
    await probe.render(survey("t1", "a"))
    expect(probe.last().route).toEqual(ROUTE)

    let resolveB!: (value: unknown) => void
    mockGetLocalSurveyDraft.mockImplementationOnce(
      () => new Promise((resolve) => (resolveB = resolve)),
    )
    await probe.render(survey("t1", "b"))
    expect(probe.last()).toEqual({ route: null, loaded: false })

    await act(async () => {
      resolveB({ survey_route: { ...ROUTE, zone_surface_ha: 3 } })
    })
    expect(probe.last().route?.zone_surface_ha).toBe(3)
  })

  test("a read overtaken by a newer one is dropped", async () => {
    let resolveFirst!: (value: unknown) => void
    mockGetLocalSurveyDraft.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve)),
    )
    mockGetLocalSurveyDraft.mockResolvedValueOnce({
      survey_route: { ...ROUTE, zone_surface_ha: 7 },
    })
    const probe = mount()
    await probe.render(survey("t1"))
    await probe.render(survey("t2"))

    await act(async () => {
      resolveFirst({ survey_route: ROUTE })
    })

    expect(probe.last().route?.zone_surface_ha).toBe(7)
  })
})
