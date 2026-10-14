import {
  UNCAPPED_PRESETS,
  UNCAPPABLE_FACTORS,
  defaultCountingFor,
  validateSurveyRoute,
} from "@cortege/ibp-domain"
import type { SurveyRoute } from "@cortege/ibp-domain"
import type { RoutePick } from "../../navigation/types"
import {
  buildEditedRecord,
  buildPick,
  chooseReducer,
  hasUncappedDetailData,
  initialChooseModel,
  presetOfFactors,
  selectChooseView,
  standOfRecord,
  type ChooseAction,
  type RouteChooseModel,
} from "./route-choose-model"

function run(model: RouteChooseModel, ...actions: ChooseAction[]): RouteChooseModel {
  return actions.reduce(chooseReducer, model)
}

const blank = (standHa: number | null = 8) => initialChooseModel({ standHa })

const guideRecord: SurveyRoute = {
  version: 1,
  method: "partial_strip",
  counting: "capped",
  zone_surface_ha: 1.6,
  complement: { done: true, total_surface_ha: 8 },
  guide: {
    chosen_by: "guide",
    suggested: { method: "partial_strip", counting: "capped" },
    answers: { surface_ha: 8, homogeneity: "heterogeneous", difficulty: true },
  },
}

describe("initialChooseModel", () => {
  test("starts with no parcours and cannot be used", () => {
    const model = blank()
    expect(model.method).toBeNull()
    expect(model.counting).toBe("capped")
    expect(selectChooseView(model).canUse).toBe(false)
    expect(buildPick(model)).toBeNull()
    expect(buildEditedRecord(model, null)).toBeNull()
  })

  test("starts on the preselected selection with the details it carries", () => {
    const preselect: RoutePick = {
      method: "partial_plot",
      counting: "uncapped",
      uncapped_factors: ["C", "A", "E"],
      details: { zoneText: "1,2", complementDone: false, totalText: "" },
    }
    const model = initialChooseModel({ preselect, standHa: 8, suggested: null })
    expect(model).toMatchObject({
      method: "partial_plot",
      counting: "uncapped",
      factors: ["A", "C", "E"],
      preset: "custom",
      zoneText: "1,2",
      complementDone: false,
    })
    // A relevé déplafonné is the observer's own choice, so a parcours change keeps it.
    expect(model.countingTouched).toBe(true)
  })

  test("a preselected selection without details starts from the package's zone", () => {
    const preselect: RoutePick = { method: "full", counting: "capped", uncapped_factors: [] }
    const model = initialChooseModel({ preselect, standHa: 2.4 })
    expect(model.zoneText).toBe("2,4")
    expect(selectChooseView(model).canUse).toBe(true)
  })

  test("the preselection wins over the record, and a recognised preset is named", () => {
    const preselect: RoutePick = {
      method: "full",
      counting: "uncapped",
      uncapped_factors: [...UNCAPPED_PRESETS.mature],
    }
    const model = initialChooseModel({ preselect, record: guideRecord, standHa: 3 })
    expect(model.method).toBe("full")
    expect(model.preset).toBe("mature")
  })

  test("starts on the recorded route in edit mode and keeps its suggestion and answers", () => {
    const model = initialChooseModel({ record: guideRecord, standHa: 8 })
    expect(model).toMatchObject({
      method: "partial_strip",
      counting: "capped",
      zoneText: "1,6",
      complementDone: true,
      totalText: "8",
      homogeneity: "heterogeneous",
      suggested: { method: "partial_strip", counting: "capped" },
    })
    expect(selectChooseView(model).canUse).toBe(true)
  })

  test("a recorded route without a complement or factors loads cleanly", () => {
    const record: SurveyRoute = {
      version: 1,
      method: "full",
      counting: "uncapped",
      uncapped_factors: ["C", "D", "E"],
      zone_surface_ha: 2.5,
      guide: { chosen_by: "observer" },
    }
    const model = initialChooseModel({ record, standHa: null })
    expect(model.preset).toBe("minimum")
    expect(model.complementDone).toBe(false)
    expect(model.totalText).toBe("")
    expect(model.answers).toEqual({})
    const partial: SurveyRoute = {
      ...record,
      method: "partial_plot",
      counting: "capped",
      uncapped_factors: undefined,
      complement: { done: false },
    }
    expect(initialChooseModel({ record: partial, standHa: null }).totalText).toBe("")
  })
})

describe("standOfRecord", () => {
  test("reads the answered surface, the zone of a full parcours, or the done complement", () => {
    expect(standOfRecord(guideRecord)).toBe(8)
    const full: SurveyRoute = { ...guideRecord, method: "full", guide: { chosen_by: "observer" } }
    expect(standOfRecord(full)).toBe(1.6)
    const bare: SurveyRoute = { ...guideRecord, guide: { chosen_by: "observer" } }
    expect(standOfRecord(bare)).toBe(8)
    expect(standOfRecord({ ...bare, complement: { done: false } })).toBeNull()
    expect(standOfRecord({ ...bare, complement: { done: true } })).toBeNull()
  })
})

describe("chooseReducer: the parcours", () => {
  test("selecting a parcours sets the package's default mode (plafonné) and its details", () => {
    const model = run(blank(8), { type: "selectMethod", method: "full" })
    expect(model.counting).toBe(defaultCountingFor("full"))
    expect(model.counting).toBe("capped")
    expect(model.zoneText).toBe("8")
    expect(selectChooseView(model).canUse).toBe(true)
  })

  test("a partial parcours has no zone to propose without the homogeneity, and needs one typed", () => {
    const model = run(blank(8), { type: "selectMethod", method: "partial_plot" })
    expect(model.zoneText).toBe("")
    expect(model.complementDone).toBe(true)
    expect(model.totalText).toBe("8")
    expect(selectChooseView(model).canUse).toBe(false)
    const typed = run(model, {
      type: "setDetails",
      value: { zoneText: "1,2", complementDone: true, totalText: "8" },
    })
    expect(selectChooseView(typed).canUse).toBe(true)
  })

  test("the same parcours again changes nothing", () => {
    const model = run(blank(), { type: "selectMethod", method: "full" })
    expect(chooseReducer(model, { type: "selectMethod", method: "full" })).toBe(model)
  })

  test("a changed parcours keeps a touched mode and the typed details of the same kind", () => {
    const model = run(
      blank(8),
      { type: "selectMethod", method: "partial_strip" },
      { type: "setDetails", value: { zoneText: "1,3", complementDone: false, totalText: "" } },
      { type: "selectCounting", counting: "uncapped" },
      { type: "selectMethod", method: "partial_plot" },
    )
    expect(model.counting).toBe("uncapped")
    expect(model.zoneText).toBe("1,3")
    expect(model.complementDone).toBe(false)
  })

  test("leaving a partial parcours for the full one starts again from the stand", () => {
    const model = run(
      blank(8),
      { type: "selectMethod", method: "partial_strip" },
      { type: "setDetails", value: { zoneText: "1,3", complementDone: true, totalText: "8" } },
      { type: "selectMethod", method: "full" },
    )
    expect(model.zoneText).toBe("8")
    expect(model.complementDone).toBe(false)
  })

  test("details typed before any parcours is chosen are kept", () => {
    const model = run(
      blank(null),
      { type: "setDetails", value: { zoneText: "3", complementDone: false, totalText: "" } },
      { type: "selectMethod", method: "full" },
    )
    expect(model.zoneText).toBe("3")
    expect(selectChooseView(model).canUse).toBe(true)
  })

  test("an unknown stand surface leaves the zone to be typed, offline included", () => {
    const model = run(blank(null), { type: "selectMethod", method: "full" })
    expect(model.zoneText).toBe("")
    expect(model.complementDone).toBe(false)
    expect(selectChooseView(model).canUse).toBe(false)
    const typed = run(model, {
      type: "setDetails",
      value: { zoneText: "2,5", complementDone: false, totalText: "" },
    })
    expect(selectChooseView(typed).canUse).toBe(true)
  })

  test("a partial parcours with an unknown stand does not look at the rest by default", () => {
    const model = run(blank(null), { type: "selectMethod", method: "partial_strip" })
    expect(model.complementDone).toBe(false)
  })
})

describe("chooseReducer: the mode and the factors", () => {
  const withMethod = () => run(blank(), { type: "selectMethod", method: "full" })

  test("the mode is plafonné for every parcours until the observer picks déplafonné", () => {
    for (const method of ["full", "partial_strip", "partial_plot"] as const) {
      expect(run(blank(), { type: "selectMethod", method }).counting).toBe("capped")
    }
  })

  test("choosing déplafonné starts from the preset Tous les facteurs", () => {
    const model = run(withMethod(), { type: "selectCounting", counting: "uncapped" })
    expect(model.preset).toBe("all_factors")
    expect(model.factors).toEqual(UNCAPPED_PRESETS.all_factors)
    expect(model.factors).not.toContain("H")
    expect(selectChooseView(model).canUse).toBe(true)
  })

  test("choosing the mode already chosen only marks it touched", () => {
    const model = run(withMethod(), { type: "selectCounting", counting: "capped" })
    expect(model.counting).toBe("capped")
    expect(model.countingTouched).toBe(true)
  })

  test("each preset sets the chips from the package", () => {
    const base = run(withMethod(), { type: "selectCounting", counting: "uncapped" })
    for (const preset of ["mature", "always_max", "minimum", "all_factors"] as const) {
      const model = run(base, { type: "selectPreset", preset })
      expect(model.preset).toBe(preset)
      expect(model.factors).toEqual(
        UNCAPPABLE_FACTORS.filter((factor) => UNCAPPED_PRESETS[preset].includes(factor)),
      )
    }
  })

  test("touching a chip switches the preset to custom, in factor order", () => {
    const base = run(withMethod(), { type: "selectCounting", counting: "uncapped" })
    const model = run(
      base,
      { type: "selectPreset", preset: "minimum" },
      { type: "toggleFactor", factor: "A" },
    )
    expect(model.preset).toBe("custom")
    expect(model.factors).toEqual(["A", "C", "D", "E"])
    expect(run(model, { type: "toggleFactor", factor: "A" }).factors).toEqual(["C", "D", "E"])
  })

  test("removing the last factor blocks the use with the missing-factor flag", () => {
    const base = run(
      withMethod(),
      { type: "selectCounting", counting: "uncapped" },
      { type: "selectPreset", preset: "minimum" },
    )
    const emptied = run(
      base,
      { type: "toggleFactor", factor: "C" },
      { type: "toggleFactor", factor: "D" },
      { type: "toggleFactor", factor: "E" },
    )
    const view = selectChooseView(emptied)
    expect(view.factorsMissing).toBe(true)
    expect(view.canUse).toBe(false)
    expect(buildPick(emptied)).toBeNull()
  })

  test("Choisir moi-même starts empty like the package's custom preset", () => {
    const base = run(withMethod(), { type: "selectCounting", counting: "uncapped" })
    const model = run(base, { type: "selectPreset", preset: "custom" })
    expect(model.factors).toEqual([])
    expect(selectChooseView(model).factorsMissing).toBe(true)
  })

  test("the factors are not asked in plafonné", () => {
    expect(selectChooseView(withMethod()).factorsMissing).toBe(false)
  })

  test("the advice says the uncapped mode takes longer, and gives a duration from the zone", () => {
    const capped = selectChooseView(withMethod())
    expect(capped.advice.advice).toEqual(["duration"])
    expect(capped.advice.estimated_minutes).toEqual({ min: 120, max: 160 })
    const uncapped = selectChooseView(
      run(withMethod(), { type: "selectCounting", counting: "uncapped" }),
    )
    expect(uncapped.advice.advice).toContain("uncapped_longer")
  })

  test("the advice exists before any parcours is chosen", () => {
    const view = selectChooseView(run(blank(), { type: "selectCounting", counting: "uncapped" }))
    expect(view.advice.advice).toContain("uncapped_longer")
  })

  test("the recorded difficulty answer feeds the duration", () => {
    const view = selectChooseView(initialChooseModel({ record: guideRecord, standHa: 8 }))
    expect(view.advice.estimated_minutes).toEqual({ min: 40, max: 48 })
  })
})

describe("chooseReducer: values kept when going back to plafonné", () => {
  const uncapped = (hasDetailData: boolean) =>
    run(
      initialChooseModel({ standHa: 8, hasDetailData }),
      { type: "selectMethod", method: "full" },
      { type: "selectCounting", counting: "uncapped" },
    )

  test("says the values are kept when detail data exists, and removes the factors from the pick", () => {
    const model = run(uncapped(true), { type: "selectCounting", counting: "capped" })
    const view = selectChooseView(model)
    expect(view.keptValuesNotice).toBe(true)
    expect(buildPick(model)).toMatchObject({ counting: "capped", uncapped_factors: [] })
  })

  test("says nothing without detail data", () => {
    const model = run(uncapped(false), { type: "selectCounting", counting: "capped" })
    expect(selectChooseView(model).keptValuesNotice).toBe(false)
  })

  test("the line goes away when déplafonné is chosen again", () => {
    const model = run(
      uncapped(true),
      { type: "selectCounting", counting: "capped" },
      { type: "selectCounting", counting: "uncapped" },
    )
    expect(selectChooseView(model).keptValuesNotice).toBe(false)
  })
})

describe("zone checks", () => {
  test("a zone above the stand or an empty one blocks, an over-half partial zone only warns", () => {
    const partial = run(blank(8), { type: "selectMethod", method: "partial_strip" })
    const set = (zoneText: string) =>
      selectChooseView(
        run(partial, {
          type: "setDetails",
          value: { zoneText, complementDone: true, totalText: "8" },
        }),
      )
    expect(set("9").canUse).toBe(false)
    expect(set("9").zoneIssues).toContain("zone_above_stand")
    expect(set("").canUse).toBe(false)
    expect(set("0,001").canUse).toBe(false)
    const warned = set("5")
    expect(warned.zoneIssues).toContain("partial_over_half")
    expect(warned.canUse).toBe(true)
  })

  test("a done complement needs a total no smaller than the zone", () => {
    const partial = run(blank(8), { type: "selectMethod", method: "partial_strip" })
    const withTotal = (totalText: string) =>
      selectChooseView(
        run(partial, {
          type: "setDetails",
          value: { zoneText: "1,5", complementDone: true, totalText },
        }),
      )
    expect(withTotal("").canUse).toBe(false)
    expect(withTotal("1").zoneIssues).toContain("complement_below_zone")
    expect(withTotal("1").canUse).toBe(false)
    expect(withTotal("8").canUse).toBe(true)
  })
})

describe("buildPick", () => {
  test("carries the parcours, the mode, the factors and the details", () => {
    const model = run(
      blank(8),
      { type: "selectMethod", method: "partial_plot" },
      { type: "setDetails", value: { zoneText: "1,2", complementDone: true, totalText: "8" } },
      { type: "selectCounting", counting: "uncapped" },
      { type: "selectPreset", preset: "minimum" },
    )
    expect(buildPick(model)).toEqual({
      method: "partial_plot",
      counting: "uncapped",
      uncapped_factors: ["C", "D", "E"],
      details: { zoneText: "1,2", complementDone: true, totalText: "8" },
    })
  })
})

describe("buildEditedRecord", () => {
  test("with no previous record the guide holds the observer's choice alone", () => {
    const model = run(
      blank(8),
      { type: "selectMethod", method: "full" },
      { type: "selectCounting", counting: "uncapped" },
    )
    const record = buildEditedRecord(model, null)
    expect(record).toEqual({
      version: 1,
      method: "full",
      counting: "uncapped",
      uncapped_factors: [...UNCAPPED_PRESETS.all_factors],
      zone_surface_ha: 8,
      guide: { chosen_by: "observer" },
    })
    expect(validateSurveyRoute(record)).toEqual([])
  })

  test("keeps the guide's answers and suggestion, and stays 'guide' on the suggested parcours", () => {
    const model = initialChooseModel({ record: guideRecord, standHa: 8 })
    const record = buildEditedRecord(model, guideRecord)
    expect(record).toEqual(guideRecord)
    expect(validateSurveyRoute(record)).toEqual([])
  })

  test("becomes 'observer' when the parcours or the mode differs from the suggestion", () => {
    const base = initialChooseModel({ record: guideRecord, standHa: 8 })
    const otherMethod = run(base, { type: "selectMethod", method: "partial_plot" })
    expect(buildEditedRecord(otherMethod, guideRecord)?.guide).toMatchObject({
      chosen_by: "observer",
      suggested: { method: "partial_strip", counting: "capped" },
      answers: guideRecord.guide.answers,
    })
    const uncapped = run(base, { type: "selectCounting", counting: "uncapped" })
    expect(buildEditedRecord(uncapped, guideRecord)?.guide.chosen_by).toBe("observer")
  })

  test("a previous record without a suggestion is an observer choice", () => {
    const previous: SurveyRoute = { ...guideRecord, guide: { chosen_by: "observer" } }
    const model = initialChooseModel({ record: previous, standHa: 8 })
    expect(buildEditedRecord(model, previous)?.guide).toEqual({ chosen_by: "observer" })
  })

  test("drops the complement of a full parcours and rounds the surfaces", () => {
    const model = run(
      initialChooseModel({ record: guideRecord, standHa: 8 }),
      { type: "selectMethod", method: "full" },
      { type: "setDetails", value: { zoneText: "7,999", complementDone: false, totalText: "" } },
    )
    const record = buildEditedRecord(model, guideRecord)
    expect(record?.zone_surface_ha).toBe(8)
    expect(record?.complement).toBeUndefined()
    expect(validateSurveyRoute(record)).toEqual([])
  })

  test("a complement not looked at is recorded as such", () => {
    const model = run(initialChooseModel({ record: guideRecord, standHa: 8 }), {
      type: "setDetails",
      value: { zoneText: "1,6", complementDone: false, totalText: "8" },
    })
    expect(buildEditedRecord(model, guideRecord)?.complement).toEqual({ done: false })
  })
})

describe("presetOfFactors and hasUncappedDetailData", () => {
  test("names a preset exactly or custom", () => {
    expect(presetOfFactors(["E", "D", "C"])).toBe("minimum")
    expect(presetOfFactors(["A"])).toBe("custom")
  })

  test("finds stored B cover or F counts, and nothing else", () => {
    expect(hasUncappedDetailData({ B: { strata_cover: { low: 30 } } })).toBe(true)
    expect(hasUncappedDetailData({ F: { dmh_counts: { dmh_01: 2 } } })).toBe(true)
    expect(hasUncappedDetailData({ B: { strata_cover: { low: 300 } } })).toBe(false)
    expect(hasUncappedDetailData({ A: {} })).toBe(false)
    expect(hasUncappedDetailData(null)).toBe(false)
    expect(hasUncappedDetailData("x")).toBe(false)
  })
})

describe("load and detailData", () => {
  test("load replaces the model but keeps what the phone said about the detail values", () => {
    const loaded = initialChooseModel({ record: guideRecord, standHa: 8 })
    const before = run(blank(), { type: "detailData", has: true })
    const after = chooseReducer(before, { type: "load", model: loaded })
    expect(after).toEqual({ ...loaded, hasDetailData: true })
    expect(after.method).toBe("partial_strip")
  })
})
