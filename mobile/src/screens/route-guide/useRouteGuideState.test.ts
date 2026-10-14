import React from "react"
import renderer, { act } from "react-test-renderer"
import { useRouteGuideState, type RouteGuideState } from "./useRouteGuideState"

// The hook is a thin shell over the pure model (route-guide-model.test.ts): these tests prove the
// dispatchers are stable, the view follows the actions and a late prefill reaches the card.

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

function mount(prefill: number | null) {
  const seen: RouteGuideState[] = []
  function Probe({ value }: { value: number | null }) {
    const state = useRouteGuideState({ surfaceHaPrefill: value })
    seen.push(state)
    return null
  }
  const element = (value: number | null) => React.createElement(Probe, { value })
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element(prefill))
  })
  return {
    seen,
    latest: () => seen[seen.length - 1],
    rerender: (value: number | null) => act(() => tree.update(element(value))),
  }
}

describe("useRouteGuideState", () => {
  it("opens on the surface card with the prefill and no record", () => {
    const { latest } = mount(2.4)
    expect(latest().view.open).toMatchObject({ id: "surface", text: "2,4", estimated: true })
    expect(latest().record).toBeNull()
  })

  it("follows the actions up to a record, with stable dispatchers", () => {
    const { latest, seen } = mount(2.4)
    const first = latest().actions
    act(() => latest().actions.commitSurface())
    act(() => latest().actions.answerHomogeneity("heterogeneous"))
    expect(latest().view.canUse).toBe(false)
    act(() => latest().actions.answerDifficulty(false))
    expect(latest().view.canUse).toBe(true)
    expect(latest().record).toMatchObject({ method: "full", zone_surface_ha: 2.4 })
    expect(seen.every((state) => state.actions === first)).toBe(true)
  })

  it("covers every dispatcher", () => {
    const { latest } = mount(null)
    act(() => latest().actions.setSurfaceText("12"))
    act(() => latest().actions.validateSurface())
    act(() => latest().actions.commitSurface())
    act(() => latest().actions.answerHomogeneity("homogeneous"))
    act(() => latest().actions.answerDifficulty(false))
    act(() => latest().actions.answerNarrow(false))
    act(() => latest().actions.setExperience("beginner"))
    act(() => latest().actions.setHoursText("2"))
    act(() => latest().actions.setZoneText("3"))
    act(() => latest().actions.setComplementDone(true))
    act(() => latest().actions.setTotalText("14"))
    expect(latest().record).toMatchObject({
      method: "partial_plot",
      zone_surface_ha: 3,
      complement: { done: true, total_surface_ha: 14 },
    })
    act(() => latest().actions.applyPick({ method: "full", counting: "capped" }))
    expect(latest().view.chosenBy).toBe("observer")
    act(() => latest().actions.restoreSuggestion())
    expect(latest().view.chosenBy).toBe("guide")
    act(() => latest().actions.reopen("surface"))
    expect(latest().view.open).toMatchObject({ id: "surface" })
    act(() => latest().actions.chooseLargeStandOption("partial"))
    expect(latest().view.recommendation.status).toBe("route")
  })

  it("takes a prefill that arrives after the first render while the card is untouched", () => {
    const { latest, rerender } = mount(null)
    expect(latest().view.open).toMatchObject({ unknown: true, text: "" })
    rerender(5.5)
    expect(latest().view.open).toMatchObject({ unknown: false, text: "5,5", estimated: true })
  })

  it("loads a recorded route into the step (edit mode)", () => {
    const { latest } = mount(null)
    act(() => latest().actions.setSurfaceText("2,4"))
    act(() => latest().actions.commitSurface())
    act(() => latest().actions.answerHomogeneity("heterogeneous"))
    act(() => latest().actions.answerDifficulty(false))
    const saved = latest().record
    expect(saved).not.toBeNull()
    const { latest: fresh } = mount(null)
    act(() => fresh().actions.loadRecord(saved as NonNullable<typeof saved>))
    expect(fresh().view.canUse).toBe(true)
    expect(fresh().record).toEqual(saved)
  })
})
