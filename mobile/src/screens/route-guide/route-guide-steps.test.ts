import {
  canStepBack,
  currentOpen,
  guideReducer,
  initialGuideModel,
  screensOf,
  selectGuideView,
  type GuideAction,
  type RouteGuideModel,
} from "./route-guide-model"

// Phase 30, one question a screen (owner's review 2026-10-14): "Suivant" walks the needed questions
// one at a time and ends on the result, "back" returns one question at a time through an explicit
// trail kept in the model, and nothing here touches navigation.

const start = (prefill: number | null = null) => initialGuideModel({ surfaceHaPrefill: prefill })
const run = (actions: GuideAction[], from: RouteGuideModel = start()): RouteGuideModel =>
  actions.reduce(guideReducer, from)

const NEXT: GuideAction = { type: "next" }
const BACK: GuideAction = { type: "back" }
const surface = (text: string): GuideAction[] => [{ type: "setSurfaceText", text }, NEXT]
const hom = (value: "homogeneous" | "heterogeneous"): GuideAction => ({
  type: "answer",
  id: "homogeneity",
  value,
})
const hard = (value: boolean): GuideAction => ({ type: "answer", id: "difficulty", value })
const narrow = (value: boolean): GuideAction => ({ type: "answer", id: "narrow", value })
const screenOf = (model: RouteGuideModel) => selectGuideView(model).screen

describe("the screens of the route step", () => {
  it("starts on the surface question, with nothing to go back to", () => {
    const view = selectGuideView(start(2.4))
    expect(view.screen).toBe("surface")
    expect(view.canStepBack).toBe(false)
    expect(guideReducer(start(2.4), BACK)).toEqual(start(2.4))
  })

  it("an answer only selects: the screen stays until Suivant", () => {
    const model = run([...surface("3"), hom("homogeneous")])
    expect(screenOf(model)).toBe("homogeneity")
    expect(selectGuideView(model).canNext).toBe(true)
    expect(screenOf(run([NEXT], model))).toBe("difficulty")
  })

  it("Suivant waits for an answer", () => {
    const model = run([...surface("3")])
    expect(screenOf(model)).toBe("homogeneity")
    expect(selectGuideView(model).canNext).toBe(false)
    expect(run([NEXT], model)).toEqual(model)
  })

  it("an invalid surface keeps the screen and shows the error", () => {
    const model = run(surface("abc"))
    expect(screenOf(model)).toBe("surface")
    expect(selectGuideView(model).open).toMatchObject({ error: "surface_invalid" })
    expect(canStepBack(model)).toBe(false)
  })

  it("walks to the result when no question is left", () => {
    const model = run([...surface("0,8")])
    expect(screenOf(model)).toBe("result")
    expect(selectGuideView(model).open).toBeNull()
    expect(selectGuideView(model).canUse).toBe(true)
  })

  it("goes through every needed question, then the result", () => {
    let model = run([...surface("3"), hom("homogeneous"), NEXT, hard(false), NEXT])
    expect(screenOf(model)).toBe("narrow")
    model = run([narrow(false), NEXT], model)
    expect(screenOf(model)).toBe("result")
  })
})

describe("back, one question at a time", () => {
  const atNarrow = () =>
    run([...surface("3"), hom("homogeneous"), NEXT, hard(false), NEXT, narrow(true)])

  it("returns to the previous question and keeps its answer", () => {
    let model = atNarrow()
    model = run([BACK], model)
    expect(screenOf(model)).toBe("difficulty")
    expect(selectGuideView(model).open).toMatchObject({ id: "difficulty", selected: false })
    model = run([BACK], model)
    expect(selectGuideView(model).open).toMatchObject({
      id: "homogeneity",
      selected: "homogeneous",
    })
    model = run([BACK], model)
    expect(screenOf(model)).toBe("surface")
    expect(selectGuideView(model).open).toMatchObject({ text: "3" })
    expect(selectGuideView(model).canStepBack).toBe(false)
  })

  it("from the result goes back to the last question", () => {
    const model = run([NEXT], atNarrow())
    expect(screenOf(model)).toBe("result")
    expect(selectGuideView(model).canStepBack).toBe(true)
    const back = run([BACK], model)
    expect(selectGuideView(back).open).toMatchObject({ id: "narrow", selected: true })
  })

  it("does not move on the first question and does not write anything", () => {
    const model = run(surface("3"))
    const first = run([BACK], model)
    expect(screenOf(first)).toBe("surface")
    expect(guideReducer(first, BACK)).toBe(first)
  })

  it("keeps the surface typed when going back to it", () => {
    const model = run([...surface("3"), BACK, { type: "setSurfaceText", text: "3,5" }])
    expect(selectGuideView(model).open).toMatchObject({ id: "surface", text: "3,5" })
  })

  it("changing an earlier answer recomputes the needed questions and skips the ones dropped", () => {
    // 3 ha homogeneous, easy, narrow: partial strip. Back to the surface, over 5 ha: no difficulty asked.
    let model = atNarrow()
    model = run([BACK, BACK, BACK, ...surface("0,8")], model)
    expect(screenOf(model)).toBe("result")
    expect(screensOf(model)).toEqual(["surface"])
    // The trail holds questions no longer needed: back goes to the one still needed.
    model = run([BACK], model)
    expect(screenOf(model)).toBe("surface")
  })

  it("an earlier answer changed adds a question after it, which Suivant then reaches", () => {
    let model = run([...surface("3"), hom("heterogeneous"), NEXT, hard(true), NEXT])
    expect(screenOf(model)).toBe("result")
    model = run([BACK, BACK, hom("homogeneous"), NEXT], model)
    expect(screenOf(model)).toBe("difficulty")
  })
})

describe("the large stand screen", () => {
  const atLarge = () => run([...surface("15"), hom("heterogeneous"), NEXT])

  it("is its own screen after the homogeneity question, with Suivant disabled until a pick", () => {
    const model = atLarge()
    expect(screensOf(model)).toEqual(["surface", "homogeneity", "largeStand"])
    expect(screenOf(model)).toBe("largeStand")
    expect(selectGuideView(model).canNext).toBe(false)
    expect(run([NEXT], model)).toEqual(model)
    const picked = run([{ type: "pickLargeStand", option: "partial" }], model)
    expect(selectGuideView(picked).canNext).toBe(true)
    expect(selectGuideView(picked).open).toMatchObject({ selected: "partial" })
  })

  it("partial goes on to the questions the partial parcours needs, back returns to the choice", () => {
    let model = run([{ type: "pickLargeStand", option: "partial" }, NEXT], atLarge())
    expect(screenOf(model)).toBe("result")
    model = run([BACK], model)
    expect(screenOf(model)).toBe("largeStand")
    expect(selectGuideView(model).open).toMatchObject({ selected: "partial" })
  })

  it("subdividing reopens the surface for the piece, with nothing to go back to", () => {
    const model = run([{ type: "pickLargeStand", option: "subdivide" }, NEXT], atLarge())
    const view = selectGuideView(model)
    expect(view.open).toMatchObject({ id: "surface", subStand: true, text: "" })
    expect(view.canStepBack).toBe(false)
    expect(model.subdivided).toBe(true)
  })
})

describe("a parcours picked in the chooser", () => {
  it("leads to the result and back returns to the question that was open", () => {
    const model = run([{ type: "applyPick", pick: { method: "full", counting: "capped" } }])
    expect(screenOf(model)).toBe("result")
    expect(currentOpen(model)).toBeNull()
    const back = run([BACK], model)
    expect(screenOf(back)).toBe("surface")
  })
})
