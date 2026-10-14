import {
  ROUTE_RULE_CASES,
  routeQuestionsFor,
  validateSurveyRoute,
  type RouteAnswers,
} from "@cortege/ibp-domain"
import {
  buildRouteRecord,
  guideReducer,
  initialGuideModel,
  selectGuideView,
  type GuideAction,
  type RouteGuideModel,
} from "./route-guide-model"

// Phase 30 (plan 30-17): the model of the route step is pure. Every rule decision (which questions,
// which parcours, which zone, which advice) is the package's; these tests prove the model asks the
// package and keeps the observer's answers, never that it knows a threshold (U-02).

const start = (prefill: number | null = null) => initialGuideModel({ surfaceHaPrefill: prefill })

function run(actions: GuideAction[], from: RouteGuideModel = start()): RouteGuideModel {
  return actions.reduce(guideReducer, from)
}

const surface = (text: string): GuideAction[] => [
  { type: "setSurfaceText", text },
  { type: "commitSurface" },
]
const hom = (value: "homogeneous" | "heterogeneous"): GuideAction => ({
  type: "answer",
  id: "homogeneity",
  value,
})
const hard = (value: boolean): GuideAction => ({ type: "answer", id: "difficulty", value })
const narrow = (value: boolean): GuideAction => ({ type: "answer", id: "narrow", value })

describe("initialGuideModel", () => {
  it("opens on the surface card with the estimate prefilled and flagged as estimated", () => {
    const view = selectGuideView(start(2.4))
    expect(view.rows).toEqual([])
    expect(view.open).toEqual({
      id: "surface",
      text: "2,4",
      error: null,
      estimated: true,
      unknown: false,
      subStand: false,
    })
    expect(view.canUse).toBe(false)
    expect(view.selection).toBeNull()
  })

  it("opens the surface card empty and flagged unknown without a prefill", () => {
    for (const prefill of [null, 0, -3, Number.NaN, 6000]) {
      const view = selectGuideView(start(prefill))
      expect(view.open).toMatchObject({ id: "surface", text: "", estimated: false, unknown: true })
    }
  })

  it("treats a missing params object as no prefill", () => {
    expect(selectGuideView(initialGuideModel()).open).toMatchObject({ unknown: true })
  })
})

describe("surface card", () => {
  it("does not advance on an invalid text and sets the package's error code", () => {
    const cases: [string, string][] = [
      ["", "surface_missing"],
      ["   ", "surface_missing"],
      ["abc", "surface_invalid"],
      ["0", "surface_invalid"],
      ["0,004", "surface_invalid"],
      ["5000,5", "surface_invalid"],
    ]
    for (const [text, error] of cases) {
      const model = run(surface(text))
      const view = selectGuideView(model)
      expect(view.open).toMatchObject({ id: "surface", error })
      expect(view.rows).toEqual([])
      expect(model.surfaceHa).toBeNull()
    }
  })

  it("clears the error when the text changes", () => {
    const model = run([...surface("abc"), { type: "setSurfaceText", text: "2" }])
    expect(selectGuideView(model).open).toMatchObject({ error: null, text: "2" })
  })

  it("validates on blur without committing", () => {
    const bad = run([{ type: "setSurfaceText", text: "x" }, { type: "validateSurface" }])
    expect(selectGuideView(bad).open).toMatchObject({ error: "surface_invalid" })
    const good = run([{ type: "setSurfaceText", text: "2,4" }, { type: "validateSurface" }])
    expect(good.surfaceHa).toBeNull()
    expect(selectGuideView(good).open).toMatchObject({ error: null })
  })

  it("accepts a decimal comma or dot and keeps two decimals", () => {
    expect(run(surface("2,456")).surfaceHa).toBe(2.46)
    expect(run(surface("2.4")).surfaceHa).toBe(2.4)
  })

  it("confirming the untouched estimate collapses it to a row marked estimated", () => {
    const model = run([{ type: "commitSurface" }], start(2.4))
    const view = selectGuideView(model)
    expect(view.rows).toEqual([{ id: "surface", hectares: 2.4, estimated: true }])
    expect(view.open).toMatchObject({ id: "homogeneity" })
  })

  it("a corrected estimate is a plain answer, not an estimate", () => {
    const model = run(surface("3"), start(2.4))
    expect(selectGuideView(model).rows).toEqual([{ id: "surface", hectares: 3, estimated: false }])
  })

  it("receives a late prefill only while the card is untouched", () => {
    const late = run([{ type: "receivePrefill", surfaceHa: 4.2 }])
    expect(selectGuideView(late).open).toMatchObject({ text: "4,2", estimated: true })
    const typed = run([
      { type: "setSurfaceText", text: "1" },
      { type: "receivePrefill", surfaceHa: 4.2 },
    ])
    expect(selectGuideView(typed).open).toMatchObject({ text: "1", estimated: false })
    const known = run([{ type: "receivePrefill", surfaceHa: 7 }], start(2.4))
    expect(selectGuideView(known).open).toMatchObject({ text: "2,4" })
    const none = start()
    expect(guideReducer(none, { type: "receivePrefill", surfaceHa: null })).toBe(none)
    expect(guideReducer(none, { type: "receivePrefill", surfaceHa: -1 })).toBe(none)
  })

  it("reopening the surface keeps the committed text and collapses the open card", () => {
    const model = run([...surface("2,4"), { type: "reopen", id: "surface" }])
    const view = selectGuideView(model)
    expect(view.open).toMatchObject({ id: "surface", text: "2,4" })
    expect(view.rows).toEqual([])
  })
})

describe("visible questions equal routeQuestionsFor", () => {
  const stands: [number, RouteAnswers["homogeneity"], boolean | undefined, boolean | undefined][] =
    [
      [0.5, undefined, undefined, undefined],
      [1, undefined, undefined, undefined],
      [5, "heterogeneous", false, undefined],
      [5, "homogeneous", false, true],
      [10, "heterogeneous", undefined, undefined],
      [20, "homogeneous", true, undefined],
    ]
  it.each(stands)("at %s ha", (ha, homogeneity, difficulty, narrowAnswer) => {
    const actions: GuideAction[] = [...surface(String(ha).replace(".", ","))]
    if (homogeneity) actions.push(hom(homogeneity))
    if (difficulty !== undefined) actions.push(hard(difficulty))
    if (narrowAnswer !== undefined) actions.push(narrow(narrowAnswer))
    const view = selectGuideView(run(actions))
    const answers = {
      surface_ha: ha,
      ...(homogeneity ? { homogeneity } : {}),
      ...(difficulty !== undefined ? { difficulty } : {}),
      ...(narrowAnswer !== undefined ? { narrow: narrowAnswer } : {}),
    }
    const wanted = routeQuestionsFor(answers).filter((id) => id !== "refine")
    const open = view.open !== null && view.open.id !== "largeStand" ? [view.open.id] : []
    const shown = [...view.rows.map((row) => row.id), ...open].filter((id) => id !== "largeStand")
    // Answered rows come in the package's order, the open card is the first unanswered question.
    expect([...shown].sort()).toEqual([...wanted].sort())
  })
})

describe("replay of the package's decision table", () => {
  const examples = ROUTE_RULE_CASES.flatMap((ruleCase) =>
    ruleCase.examples.flatMap((example) =>
      example.kind === "recommend" ? [{ id: ruleCase.id, example }] : [],
    ),
  )

  it("has examples to replay", () => {
    expect(examples.length).toBeGreaterThan(30)
  })

  it.each(examples.map(({ id, example }) => [id, example] as const))(
    "%s: the model agrees with the package",
    (_id, example) => {
      const answers = example.answers
      const actions: GuideAction[] = []
      if (typeof answers.surface_ha === "number" && answers.surface_ha > 0) {
        actions.push(...surface(String(answers.surface_ha).replace(".", ",")))
      } else {
        actions.push(...surface("x"))
      }
      if (answers.homogeneity) actions.push(hom(answers.homogeneity))
      if (answers.difficulty !== undefined) actions.push(hard(answers.difficulty))
      if (answers.narrow !== undefined) actions.push(narrow(answers.narrow))
      if (example.choice?.largeStandOption) {
        actions.push({ type: "chooseLargeStandOption", option: example.choice.largeStandOption })
      }
      if (answers.experience) {
        actions.push({ type: "setRefine", field: "experience", value: answers.experience })
      }
      if (answers.hours_available !== undefined) {
        actions.push({
          type: "setRefine",
          field: "hours",
          text: String(answers.hours_available).replace(".", ","),
        })
      }
      const model = run(actions)
      if (example.choice?.largeStandOption === "subdivide") return
      const view = selectGuideView(model)
      expect(view.recommendation.status).toBe(example.expect.status)
      if (view.recommendation.status === "route" && example.expect.status === "route") {
        expect(view.recommendation.method).toBe(example.expect.method)
        expect(view.selection).toMatchObject({
          source: "suggestion",
          method: example.expect.method,
          counting: view.recommendation.counting,
          zoneHa: view.recommendation.zone_surface_ha,
        })
        expect(view.chosenBy).toBe("guide")
        expect(view.open).toBeNull()
        const record = buildRouteRecord(model)
        expect(record).not.toBeNull()
        expect(validateSurveyRoute(record)).toEqual([])
        expect(record?.guide.suggested).toEqual({
          method: view.recommendation.method,
          counting: view.recommendation.counting,
        })
      }
      if (view.recommendation.status === "options") {
        expect(view.open).toMatchObject({ id: "largeStand", selected: "subdivide" })
        expect(view.canUse).toBe(false)
      }
    },
  )
})

describe("routine paths (taps counted)", () => {
  it("2.4 ha, varied, easy: three answers reach canUse (four taps with the final button)", () => {
    const steps: GuideAction[] = [{ type: "commitSurface" }, hom("heterogeneous"), hard(false)]
    let model = start(2.4)
    const usable: boolean[] = []
    for (const step of steps) {
      model = guideReducer(model, step)
      usable.push(selectGuideView(model).canUse)
    }
    expect(usable).toEqual([false, false, true])
    const view = selectGuideView(model)
    expect(view.selection).toMatchObject({ method: "full", counting: "capped", zoneHa: 2.4 })
    expect(view.chosenBy).toBe("guide")
    expect(buildRouteRecord(model)).toEqual({
      version: 1,
      method: "full",
      counting: "capped",
      zone_surface_ha: 2.4,
      guide: {
        chosen_by: "guide",
        suggested: { method: "full", counting: "capped" },
        answers: { surface_ha: 2.4, homogeneity: "heterogeneous", difficulty: false },
      },
    })
  })

  it("0.8 ha: the confirmation of the surface alone reaches canUse (two taps with the button)", () => {
    const model = run([{ type: "commitSurface" }], start(0.8))
    const view = selectGuideView(model)
    expect(view.canUse).toBe(true)
    expect(view.open).toBeNull()
    expect(view.rows).toEqual([{ id: "surface", hectares: 0.8, estimated: true }])
    expect(buildRouteRecord(model)?.guide.answers).toEqual({ surface_ha: 0.8 })
  })

  it("4 ha, homogeneous, easy, wide: four answers (five taps with the button)", () => {
    const model = run(
      [{ type: "commitSurface" }, hom("homogeneous"), hard(false), narrow(false)],
      start(4),
    )
    expect(selectGuideView(model).canUse).toBe(true)
    expect(selectGuideView(model).selection).toMatchObject({ method: "partial_plot" })
  })
})

describe("changing an answer", () => {
  it("reopening an answered row opens it and collapses the open card", () => {
    const model = run([
      ...surface("2,4"),
      hom("heterogeneous"),
      { type: "reopen", id: "homogeneity" },
    ])
    const view = selectGuideView(model)
    expect(view.open).toMatchObject({ id: "homogeneity", selected: "heterogeneous" })
    expect(view.rows.map((row) => row.id)).toEqual(["surface"])
  })

  it("a new needed question opens, and answers no longer needed are kept but not recorded", () => {
    let model = run([...surface("2,4"), hom("homogeneous"), hard(false), narrow(true)])
    expect(selectGuideView(model).selection).toMatchObject({ method: "partial_strip" })
    expect(buildRouteRecord(model)?.guide.answers).toMatchObject({ narrow: true })

    // Hard to observe: the strip is imposed, the width question is no longer needed.
    model = guideReducer(model, hard(true))
    let view = selectGuideView(model)
    expect(view.selection).toMatchObject({ method: "partial_strip" })
    expect(view.rows.map((row) => row.id)).toEqual(["surface", "homogeneity", "difficulty"])
    expect(buildRouteRecord(model)?.guide.answers).toEqual({
      surface_ha: 2.4,
      homogeneity: "homogeneous",
      difficulty: true,
    })

    // Back to easy: the earlier width answer is still there, nothing is asked again.
    model = guideReducer(model, hard(false))
    view = selectGuideView(model)
    expect(view.open).toBeNull()
    expect(buildRouteRecord(model)?.guide.answers).toMatchObject({ narrow: true })
  })

  it("answering a reopened question opens the first still unanswered one", () => {
    let model = run([...surface("2,4"), hom("heterogeneous")])
    expect(selectGuideView(model).open).toMatchObject({ id: "difficulty" })
    model = run([{ type: "reopen", id: "homogeneity" }, hom("homogeneous")], model)
    expect(selectGuideView(model).open).toMatchObject({ id: "difficulty" })
  })

  it("falls back to the first unanswered question when the requested one is no longer asked", () => {
    const model = run([...surface("2,4"), hom("homogeneous"), { type: "reopen", id: "narrow" }])
    // narrow is not asked yet (difficulty is unanswered): the open card is the first missing one.
    expect(selectGuideView(model).open).toMatchObject({ id: "difficulty" })
  })

  it("a different surface drops the typed zone and the large-stand choice", () => {
    let model = run([...surface("12"), hom("homogeneous"), hard(false), narrow(false)])
    model = guideReducer(model, { type: "setZoneText", text: "2" })
    expect(selectGuideView(model).selection?.zoneHa).toBe(2)
    model = run([{ type: "reopen", id: "surface" }, ...surface("13")], model)
    expect(selectGuideView(model).selection?.zoneHa).toBe(1.3)
  })
})

describe("above the subdivision bound (R-11b, O-03)", () => {
  it("offers subdivide (pre-selected) and partial, with no parcours until one is chosen", () => {
    const model = run([...surface("15"), hom("heterogeneous")])
    const view = selectGuideView(model)
    expect(view.recommendation.status).toBe("options")
    expect(view.open).toEqual({
      id: "largeStand",
      options: ["subdivide", "partial"],
      preselected: "subdivide",
      selected: "subdivide",
    })
    expect(view.selection).toBeNull()
    expect(view.canUse).toBe(false)
    expect(view.chosenBy).toBeNull()
    expect(buildRouteRecord(model)).toBeNull()
  })

  it("partial goes on with the questions the partial parcours needs", () => {
    let model = run([
      ...surface("25"),
      hom("homogeneous"),
      { type: "chooseLargeStandOption", option: "partial" },
    ])
    let view = selectGuideView(model)
    expect(view.open).toMatchObject({ id: "difficulty" })
    expect(view.rows.map((row) => row.id)).toEqual(["surface", "homogeneity", "largeStand"])
    model = run([hard(false), narrow(true)], model)
    view = selectGuideView(model)
    expect(view.selection).toMatchObject({ method: "partial_strip", zoneHa: 2.5 })
    const record = buildRouteRecord(model)
    expect(record?.guide.answers).toEqual({
      surface_ha: 25,
      homogeneity: "homogeneous",
      difficulty: false,
      narrow: true,
    })
    expect(validateSurveyRoute(record)).toEqual([])
  })

  it("the partial choice can be reopened and the preselection shows the recorded choice", () => {
    const model = run([
      ...surface("15"),
      hom("heterogeneous"),
      { type: "chooseLargeStandOption", option: "partial" },
      { type: "reopen", id: "largeStand" },
    ])
    expect(selectGuideView(model).open).toMatchObject({ id: "largeStand", selected: "partial" })
  })

  it("an unreached large-stand request falls back to the first missing question", () => {
    const model = run([...surface("3"), { type: "reopen", id: "largeStand" }])
    expect(selectGuideView(model).open).toMatchObject({ id: "homogeneity" })
  })

  it("subdivide reopens the surface for one morceau and records subdivided", () => {
    let model = run([
      ...surface("15"),
      hom("heterogeneous"),
      { type: "chooseLargeStandOption", option: "subdivide" },
    ])
    let view = selectGuideView(model)
    expect(view.open).toMatchObject({ id: "surface", text: "", subStand: true })
    expect(view.rows).toEqual([])
    model = run([...surface("3"), hom("heterogeneous"), hard(false)], model)
    view = selectGuideView(model)
    expect(view.selection).toMatchObject({ method: "full", zoneHa: 3 })
    expect(buildRouteRecord(model)?.guide.answers).toEqual({
      surface_ha: 3,
      homogeneity: "heterogeneous",
      difficulty: false,
      subdivided: true,
    })
  })

  it("a piece that is still above the bound offers the two options again; partial clears subdivided", () => {
    let model = run([
      ...surface("15"),
      hom("heterogeneous"),
      { type: "chooseLargeStandOption", option: "subdivide" },
      ...surface("14"),
      hom("heterogeneous"),
    ])
    expect(selectGuideView(model).open).toMatchObject({ id: "largeStand" })
    model = run([{ type: "chooseLargeStandOption", option: "partial" }], model)
    expect(model.subdivided).toBe(false)
    expect(selectGuideView(model).selection).toMatchObject({ method: "partial_strip" })
  })
})

describe("the 'Pour affiner' answers (O-04)", () => {
  const base = [...surface("12"), hom("homogeneous"), hard(false), narrow(false)]

  it("never change the method, the counting or the zone", () => {
    const plain = selectGuideView(run(base))
    const variants: GuideAction[][] = [
      [{ type: "setRefine", field: "experience", value: "beginner" }],
      [{ type: "setRefine", field: "experience", value: "regular" }],
      [{ type: "setRefine", field: "hours", text: "0,5" }],
      [{ type: "setRefine", field: "hours", text: "24" }],
      [
        { type: "setRefine", field: "experience", value: "beginner" },
        { type: "setRefine", field: "hours", text: "1" },
      ],
    ]
    for (const variant of variants) {
      const view = selectGuideView(run([...base, ...variant]))
      expect(view.selection).toEqual(plain.selection)
      expect(view.recommendation).toMatchObject({
        method: (plain.recommendation as { method: string }).method,
        counting: "capped",
        zone_surface_ha: 1.2,
      })
      expect(view.canUse).toBe(true)
      expect(view.chosenBy).toBe("guide")
    }
  })

  it("only feed the advice", () => {
    const view = selectGuideView(
      run([
        ...base,
        { type: "setRefine", field: "experience", value: "beginner" },
        { type: "setRefine", field: "hours", text: "0,1" },
      ]),
    )
    expect(view.advice?.advice).toEqual(["duration", "time_short", "beginner"])
    expect(view.advice?.estimated_minutes).not.toBeNull()
  })

  it("are recorded when given, rounded, and left out otherwise", () => {
    const withRefine = buildRouteRecord(
      run([
        ...base,
        { type: "setRefine", field: "experience", value: "regular" },
        { type: "setRefine", field: "hours", text: "3,456" },
      ]),
    )
    expect(withRefine?.guide.answers).toMatchObject({
      experience: "regular",
      hours_available: 3.46,
    })
    expect(validateSurveyRoute(withRefine)).toEqual([])
    const without = buildRouteRecord(run(base))
    expect(without?.guide.answers).not.toHaveProperty("experience")
    expect(without?.guide.answers).not.toHaveProperty("hours_available")
  })

  it("an experience can be cleared and an unusable number of hours is flagged and not recorded", () => {
    let model = run([...base, { type: "setRefine", field: "experience", value: "beginner" }])
    model = run([{ type: "setRefine", field: "experience", value: undefined }], model)
    expect(selectGuideView(model).refine).toEqual({
      experience: undefined,
      hoursText: "",
      hoursInvalid: false,
      filled: false,
    })
    for (const text of ["abc", "0", "25"]) {
      const bad = run([{ type: "setRefine", field: "hours", text }], model)
      const view = selectGuideView(bad)
      expect(view.refine.hoursInvalid).toBe(true)
      expect(view.refine.filled).toBe(false)
      expect(buildRouteRecord(bad)?.guide.answers).not.toHaveProperty("hours_available")
    }
    const ok = selectGuideView(run([{ type: "setRefine", field: "hours", text: "2" }], model))
    expect(ok.refine).toMatchObject({ hoursInvalid: false, filled: true })
  })
})

describe("the observer's own choice of parcours", () => {
  const partialStand = [...surface("12"), hom("homogeneous"), hard(false), narrow(false)]

  it("a pick equal to the suggestion is still 'guide'", () => {
    const model = run([
      ...partialStand,
      { type: "applyPick", pick: { method: "partial_plot", counting: "capped" } },
    ])
    const view = selectGuideView(model)
    expect(view.selection?.source).toBe("pick")
    expect(view.chosenBy).toBe("guide")
  })

  it("any other pick is 'observer' and keeps the suggestion in the record", () => {
    const model = run([
      ...partialStand,
      { type: "applyPick", pick: { method: "full", counting: "capped" } },
    ])
    const view = selectGuideView(model)
    expect(view.chosenBy).toBe("observer")
    expect(view.selection).toMatchObject({ method: "full", zoneHa: 12, complement: null })
    const record = buildRouteRecord(model)
    expect(record).toMatchObject({
      method: "full",
      zone_surface_ha: 12,
      guide: { chosen_by: "observer", suggested: { method: "partial_plot", counting: "capped" } },
    })
    expect(record).not.toHaveProperty("complement")
    expect(validateSurveyRoute(record)).toEqual([])
  })

  it("an uncapped pick records its factors sorted, and needs at least one", () => {
    const pick = (uncappedFactors: ("A" | "C" | "J")[]): GuideAction => ({
      type: "applyPick",
      pick: { method: "partial_plot", counting: "uncapped", uncappedFactors },
    })
    const ok = run([...partialStand, pick(["J", "A", "C"])])
    expect(selectGuideView(ok).chosenBy).toBe("observer")
    expect(buildRouteRecord(ok)?.uncapped_factors).toEqual(["A", "C", "J"])
    const empty = run([...partialStand, pick([])])
    expect(selectGuideView(empty).canUse).toBe(false)
    expect(buildRouteRecord(empty)).toBeNull()
    const none = run([
      ...partialStand,
      { type: "applyPick", pick: { method: "partial_plot", counting: "uncapped" } },
    ])
    expect(selectGuideView(none).canUse).toBe(false)
    const capped = run([
      ...partialStand,
      {
        type: "applyPick",
        pick: { method: "partial_plot", counting: "capped", uncappedFactors: ["A"] },
      },
    ])
    expect(selectGuideView(capped).selection?.uncappedFactors).toEqual([])
    expect(selectGuideView(capped).chosenBy).toBe("guide")
  })

  it("a different counting is 'observer' even with the suggested parcours", () => {
    const model = run([
      ...partialStand,
      {
        type: "applyPick",
        pick: { method: "partial_plot", counting: "uncapped", uncappedFactors: ["A"] },
      },
    ])
    expect(selectGuideView(model).chosenBy).toBe("observer")
  })

  it("restoring the suggestion drops the pick and the typed values", () => {
    const model = run([
      ...partialStand,
      { type: "applyPick", pick: { method: "full", counting: "capped" } },
      { type: "setZoneText", text: "9" },
      { type: "restoreSuggestion" },
    ])
    const view = selectGuideView(model)
    expect(view.selection).toMatchObject({
      source: "suggestion",
      method: "partial_plot",
      zoneHa: 1.2,
    })
    expect(view.chosenBy).toBe("guide")
  })

  it("the quick path: no answer, the zone typed by hand, nothing needs the network", () => {
    const pickPlot: GuideAction = {
      type: "applyPick",
      pick: { method: "partial_plot", counting: "capped" },
    }
    let model = run([pickPlot])
    let view = selectGuideView(model)
    expect(view.selection).toMatchObject({ zoneHa: null, complement: { done: false } })
    expect(view.canUse).toBe(false)
    expect(view.zoneFieldText).toBe("")
    model = run([{ type: "setZoneText", text: "1,5" }], model)
    view = selectGuideView(model)
    expect(view.canUse).toBe(true)
    const record = buildRouteRecord(model)
    expect(record).toEqual({
      version: 1,
      method: "partial_plot",
      counting: "capped",
      zone_surface_ha: 1.5,
      complement: { done: false },
      guide: { chosen_by: "observer" },
    })
    expect(validateSurveyRoute(record)).toEqual([])
  })

  it("a pick of the full parcours with a known stand starts from the stand", () => {
    const model = run([
      ...surface("2,4"),
      { type: "applyPick", pick: { method: "full", counting: "capped" } },
    ])
    const view = selectGuideView(model)
    expect(view.selection).toMatchObject({ zoneHa: 2.4 })
    expect(view.zoneFieldText).toBe("2,4")
    expect(view.chosenBy).toBe("observer")
  })

  it("a partial pick with a known stand and answers starts from the suggested zone and complement", () => {
    const model = run([
      ...surface("12"),
      hom("homogeneous"),
      { type: "applyPick", pick: { method: "partial_strip", counting: "capped" } },
    ])
    expect(selectGuideView(model).selection).toMatchObject({
      zoneHa: 1.2,
      complement: { done: true, total_surface_ha: 12 },
    })
  })

  it("a partial pick whose homogeneity is not known invents no share", () => {
    const model = run([
      ...surface("12"),
      { type: "applyPick", pick: { method: "partial_strip", counting: "capped" } },
    ])
    expect(selectGuideView(model).selection?.zoneHa).toBeNull()
  })
})

describe("the described surface and the complement", () => {
  const stand = [...surface("15"), hom("homogeneous"), hard(false), narrow(false)]

  it("the zone and the complement start from the package's proposal", () => {
    const view = selectGuideView(run(stand))
    expect(view.selection).toMatchObject({
      zoneHa: 1.5,
      zoneDefaultHa: 1.5,
      complement: { done: true, total_surface_ha: 15 },
    })
    expect(view.zoneFieldText).toBe("1,5")
    expect(view.totalFieldText).toBe("15")
    expect(view.zoneIssues).toEqual([])
  })

  it("a zone over half of the stand is a warning, it does not block", () => {
    const view = selectGuideView(run([...stand, { type: "setZoneText", text: "9" }]))
    expect(view.zoneIssues).toEqual(["partial_over_half"])
    expect(view.canUse).toBe(true)
  })

  it("errors block the recording", () => {
    for (const text of ["20", "0", "x", "6000"]) {
      const view = selectGuideView(run([...stand, { type: "setZoneText", text }]))
      expect(view.canUse).toBe(false)
      expect(view.zoneIssues.length).toBeGreaterThan(0)
    }
    const total = selectGuideView(run([...stand, { type: "setTotalText", text: "1" }]))
    expect(total.zoneIssues).toContain("complement_below_zone")
    expect(total.canUse).toBe(false)
  })

  it("clearing a typed zone goes back to the proposal", () => {
    const view = selectGuideView(
      run([...stand, { type: "setZoneText", text: "9" }, { type: "setZoneText", text: null }]),
    )
    expect(view.selection?.zoneHa).toBe(1.5)
  })

  it("a complement not done records done false only; done again needs its total", () => {
    let model = run([...stand, { type: "setComplementDone", done: false }])
    expect(buildRouteRecord(model)?.complement).toEqual({ done: false })
    model = run(
      [
        { type: "setComplementDone", done: true },
        { type: "setTotalText", text: "abc" },
      ],
      model,
    )
    expect(selectGuideView(model).canUse).toBe(false)
    expect(selectGuideView(model).complementTotalMissing).toBe(true)
    model = run([{ type: "setTotalText", text: "20,5" }], model)
    expect(buildRouteRecord(model)?.complement).toEqual({ done: true, total_surface_ha: 20.5 })
    model = run([{ type: "setTotalText", text: null }], model)
    expect(buildRouteRecord(model)?.complement).toEqual({ done: true, total_surface_ha: 15 })
  })
})

describe("buildRouteRecord", () => {
  it("is null while the route is not usable", () => {
    expect(buildRouteRecord(start())).toBeNull()
    expect(buildRouteRecord(run(surface("2,4")))).toBeNull()
  })

  it("is canonical: rounded, with the needed answers only", () => {
    const record = buildRouteRecord(run([...surface("4,004"), hom("heterogeneous"), hard(false)]))
    expect(record?.zone_surface_ha).toBe(4)
    expect(validateSurveyRoute(record)).toEqual([])
    expect(record?.guide.answers).toEqual({
      surface_ha: 4,
      homogeneity: "heterogeneous",
      difficulty: false,
    })
  })
})

describe("loadRecord (edit mode of the route step, 30-20)", () => {
  const record = (model: RouteGuideModel) => {
    const route = buildRouteRecord(model)
    if (route === null) throw new Error("expected a route")
    return route
  }

  it("brings back the answers of a guide record: the same route, the same record", () => {
    const original = run([...surface("2,4"), hom("heterogeneous"), hard(false)])
    const saved = record(original)
    const loaded = run([{ type: "loadRecord", route: saved }], start(null))
    const view = selectGuideView(loaded)
    expect(view.rows.map((row) => row.id)).toEqual(["surface", "homogeneity", "difficulty"])
    expect(view.open).toBeNull()
    expect(view.chosenBy).toBe("guide")
    expect(view.canUse).toBe(true)
    expect(buildRouteRecord(loaded)).toEqual(saved)
  })

  it("keeps the experience and the hours and a typed zone and complement", () => {
    const original = run([
      ...surface("15"),
      hom("homogeneous"),
      hard(true),
      { type: "setRefine", field: "experience", value: "beginner" },
      { type: "setRefine", field: "hours", text: "3" },
      { type: "setZoneText", text: "3" },
      { type: "setComplementDone", done: true },
      { type: "setTotalText", text: "12" },
    ])
    const saved = record(original)
    const loaded = run([{ type: "loadRecord", route: saved }], start(null))
    expect(buildRouteRecord(loaded)).toEqual(saved)
    expect(selectGuideView(loaded).refine).toMatchObject({
      experience: "beginner",
      hoursText: "3",
      filled: true,
    })
  })

  it("brings back an observer's pick made on the quick path, with no answers", () => {
    const picked = run([
      { type: "applyPick", pick: { method: "full", counting: "capped" } },
      { type: "setZoneText", text: "1,5" },
    ])
    const saved = record(picked)
    expect(saved.guide.answers).toBeUndefined()
    const loaded = run([{ type: "loadRecord", route: saved }], start(null))
    const view = selectGuideView(loaded)
    expect(view.chosenBy).toBe("observer")
    expect(view.selection).toMatchObject({ method: "full", counting: "capped", zoneHa: 1.5 })
    expect(buildRouteRecord(loaded)).toEqual(saved)
  })

  it("brings back an uncapped pick with its factors", () => {
    const picked = run([
      {
        type: "applyPick",
        pick: { method: "full", counting: "uncapped", uncappedFactors: ["A", "B"] },
      },
      { type: "setZoneText", text: "2" },
    ])
    const saved = record(picked)
    const loaded = run([{ type: "loadRecord", route: saved }], start(null))
    expect(buildRouteRecord(loaded)?.uncapped_factors).toEqual(["A", "B"])
  })

  it("keeps a partial route chosen above the subdivision bound", () => {
    const original = run([
      ...surface("40"),
      hom("heterogeneous"),
      { type: "chooseLargeStandOption", option: "partial" },
      hard(false),
    ])
    const saved = record(original)
    const loaded = run([{ type: "loadRecord", route: saved }], start(null))
    expect(selectGuideView(loaded).recommendation.status).toBe("route")
    expect(buildRouteRecord(loaded)).toEqual(saved)
  })

  it("brings back a piece of a cut stand", () => {
    const original = run([
      ...surface("40"),
      hom("heterogeneous"),
      { type: "chooseLargeStandOption", option: "subdivide" },
      ...surface("6"),
      hom("heterogeneous"),
      hard(false),
    ])
    const saved = record(original)
    expect(saved.guide.answers?.subdivided).toBe(true)
    const loaded = run([{ type: "loadRecord", route: saved }], start(null))
    expect(buildRouteRecord(loaded)).toEqual(saved)
  })
})
