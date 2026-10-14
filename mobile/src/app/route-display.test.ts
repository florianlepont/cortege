import type { RouteAnswers, SurveyRoute } from "@cortege/ibp-domain"
import { fr } from "../i18n"
import { routeAnswersSentence, routeDisplayRows, routeShortLabel } from "./route-display"

// Phase 30 (plan 30-11, spec section 9): the rows of the "Parcours utilisé" display, one builder for
// the Contexte card and the PDF block.

const GUIDE_ANSWERS: RouteAnswers = {
  surface_ha: 8,
  homogeneity: "homogeneous",
  difficulty: false,
  narrow: false,
}

const FULL: SurveyRoute = {
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 2.4,
  guide: { chosen_by: "observer" },
}

const PARTIAL_PLOT: SurveyRoute = {
  version: 1,
  method: "partial_plot",
  counting: "capped",
  zone_surface_ha: 1.2,
  complement: { done: true, total_surface_ha: 8 },
  guide: {
    chosen_by: "guide",
    suggested: { method: "partial_plot", counting: "capped" },
    answers: GUIDE_ANSWERS,
  },
}

const UNCAPPED_STRIP: SurveyRoute = {
  version: 1,
  method: "partial_strip",
  counting: "uncapped",
  uncapped_factors: ["A", "B", "F"],
  zone_surface_ha: 1.6,
  complement: { done: false },
  guide: { chosen_by: "observer", suggested: { method: "partial_strip", counting: "capped" } },
}

const ids = (rows: { id: string }[]) => rows.map((row) => row.id)

describe("routeDisplayRows detail", () => {
  test("a parcours en plein: parcours, mode, surface and choice, nothing else", () => {
    expect(routeDisplayRows(FULL, "detail")).toEqual([
      { id: "method", caption: "Parcours", value: "Parcours en plein" },
      { id: "counting", caption: "Mode de relevé", value: "Relevé plafonné" },
      { id: "zone", caption: "Surface décrite", value: "2,4 ha" },
      { id: "choice", caption: "Choix", value: "Choisi par vous" },
    ])
  })

  test("a parcours partiel advised by the guide shows the rest of the stand and the answers", () => {
    expect(routeDisplayRows(PARTIAL_PLOT, "detail")).toEqual([
      { id: "method", caption: "Parcours", value: "Parcours partiel par placette" },
      { id: "counting", caption: "Mode de relevé", value: "Relevé plafonné" },
      { id: "zone", caption: "Surface décrite", value: "1,2 ha" },
      {
        id: "complement",
        caption: "Reste du peuplement",
        value: "Regardé rapidement, surface totale évaluée 8 ha",
      },
      { id: "choice", caption: "Choix", value: "Conseillé par l'app d'après vos réponses" },
      {
        id: "answers",
        caption: "Vos réponses",
        value: "Peuplement de 8 ha, homogène, facile à observer, large",
      },
    ])
  })

  test("a relevé déplafonné lists the factors with their letter and title", () => {
    const rows = routeDisplayRows(UNCAPPED_STRIP, "detail")
    expect(ids(rows)).toEqual(["method", "counting", "factors", "zone", "complement", "choice"])
    expect(rows[1].value).toBe("Relevé déplafonné")
    expect(rows[2]).toEqual({
      id: "factors",
      caption: "Facteurs comptés en entier",
      value: "A Essences autochtones, B Structure verticale, F Dendromicrohabitats",
    })
    expect(rows[4].value).toBe("Non regardé")
  })

  test("a relevé déplafonné with no list of factors (never recorded) shows no factors row", () => {
    const rows = routeDisplayRows({ ...UNCAPPED_STRIP, uncapped_factors: undefined }, "detail")
    expect(ids(rows)).not.toContain("factors")
  })

  test("a complement marked done with no total reads as not looked at", () => {
    const rows = routeDisplayRows({ ...PARTIAL_PLOT, complement: { done: true } }, "detail")
    expect(rows.find((row) => row.id === "complement")?.value).toBe("Non regardé")
  })

  test("the old words of the draft never appear in a row", () => {
    const text = [FULL, PARTIAL_PLOT, UNCAPPED_STRIP]
      .flatMap((route) => routeDisplayRows(route, "detail"))
      .map((row) => `${row.caption} ${row.value}`)
      .join(" ")
    expect(text).not.toContain("Comptage")
    expect(text).not.toContain("Éléments comptés")
  })
})

describe("routeDisplayRows pdf", () => {
  test("the captions are those of the PDF catalogue", () => {
    const rows = routeDisplayRows(PARTIAL_PLOT, "pdf")
    expect(rows.map((row) => row.caption)).toEqual([
      fr.surveyExport.route.parcours,
      fr.surveyExport.route.counting,
      fr.surveyExport.route.zone,
      fr.surveyExport.route.complement,
      fr.surveyExport.route.choice,
    ])
  })

  test("no answers row: the choice sentence carries the answers", () => {
    const rows = routeDisplayRows(PARTIAL_PLOT, "pdf")
    expect(ids(rows)).not.toContain("answers")
    expect(rows[rows.length - 1].value).toBe(
      "Conseillé par l'application d'après vos réponses : peuplement de 8 ha, homogène, facile à observer, large.",
    )
  })

  test("the observer's own choice is said in one sentence", () => {
    const rows = routeDisplayRows(UNCAPPED_STRIP, "pdf")
    expect(rows[rows.length - 1].value).toBe("Choisi directement par l'observateur.")
    expect(ids(rows)).toContain("factors")
  })

  test("a guide choice with no answers still reads as the application's advice", () => {
    const route: SurveyRoute = {
      ...PARTIAL_PLOT,
      guide: { chosen_by: "guide", suggested: { method: "partial_plot", counting: "capped" } },
    }
    const rows = routeDisplayRows(route, "pdf")
    expect(rows[rows.length - 1].value).toBe("Conseillé par l'application.")
  })

  test("the rows are plain strings, markup is left to the PDF block to escape", () => {
    for (const row of routeDisplayRows(PARTIAL_PLOT, "pdf")) expect(typeof row.value).toBe("string")
  })
})

describe("routeAnswersSentence", () => {
  test("the surface alone", () => {
    expect(routeAnswersSentence({ surface_ha: 0.8 })).toBe("Peuplement de 0,8 ha")
  })

  test("every closed answer", () => {
    expect(
      routeAnswersSentence({
        surface_ha: 12.5,
        homogeneity: "heterogeneous",
        difficulty: true,
        narrow: true,
        experience: "beginner",
        hours_available: 3,
      }),
    ).toBe(
      "Peuplement de 12,5 ha, varié, difficile à observer, étroit, IBP nouveau pour vous, 3 heures disponibles",
    )
  })

  test("a regular experience says nothing, a short time is singular", () => {
    expect(
      routeAnswersSentence({ surface_ha: 2, experience: "regular", hours_available: 1.5 }),
    ).toBe("Peuplement de 2 ha, 1,5 heure disponible")
  })

  test("a piece of a subdivided stand says so", () => {
    expect(
      routeAnswersSentence({ surface_ha: 6, subdivided: true, homogeneity: "homogeneous" }),
    ).toBe("Morceau de 6 ha, peuplement découpé en sous-peuplements, homogène")
    expect(routeAnswersSentence({ surface_ha: 6, subdivided: false })).toBe("Peuplement de 6 ha")
  })
})

describe("routeShortLabel", () => {
  test("is the name of the parcours", () => {
    expect(routeShortLabel(FULL)).toBe("Parcours en plein")
    expect(routeShortLabel(UNCAPPED_STRIP)).toBe("Parcours partiel par bande")
  })
})
