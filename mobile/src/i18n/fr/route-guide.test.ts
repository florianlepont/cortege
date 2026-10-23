import { fr } from "../index"

// Phase 30 (plan 30-11): the catalogue of the route step. The text rules of the phase are checked
// here on every string of the new sections (the dash and abbreviation gates in src/__checks__ run
// on the whole catalogue): the words are those of the official method (O-12), no snake case token,
// units written out, no retired counting label, no sampling or group parcours (O-14, O-18), no
// skip text (O-19). The forbidden tokens are built from pieces so this file carries none of them.

type Leaf = { path: string; text: string }
type FunctionLeaf = { path: string; call: unknown }

function collect(node: unknown, path: string, texts: Leaf[], functions: FunctionLeaf[]): void {
  if (typeof node === "string") texts.push({ path, text: node })
  else if (typeof node === "function") functions.push({ path, call: node })
  else if (node !== null && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      collect(child, path === "" ? key : `${path}.${key}`, texts, functions)
    }
  }
}

const join = (...pieces: string[]) => pieces.join("")

// Every sentence the phase writes in the catalogue, by section (plan 30-11 tasks 1 and 2).
const SECTIONS: Record<string, unknown> = {
  routeGuide: fr.routeGuide,
  surveyDetailRoute: fr.surveyDetail.route,
  surveyDetailRouteRequired: fr.surveyDetail.cta.routeRequired,
  surveyExportRoute: fr.surveyExport.route,
  factorDetailCountingMode: fr.factorDetail.countingMode,
  validationRoute: fr.validation.route,
  syncErrorRouteRequired: fr.syncErrors.byCode.route_required,
  factorInputHintF: fr.labels.factorInputHints.F,
}

function walk(): { texts: Leaf[]; functions: FunctionLeaf[] } {
  const texts: Leaf[] = []
  const functions: FunctionLeaf[] = []
  for (const [name, section] of Object.entries(SECTIONS)) collect(section, name, texts, functions)
  return { texts, functions }
}

// Sample arguments of every function leaf. A function leaf with no entry here fails the test, so a
// new one cannot ship unrendered.
const SAMPLES: Record<string, () => string> = {
  "routeGuide.a11y.questionInfo": () => fr.routeGuide.a11y.questionInfo("La surface ?"),
  "routeGuide.questions.surface.value": () => fr.routeGuide.questions.surface.value("2,4"),
  "routeGuide.questions.surface.valueEstimated": () =>
    fr.routeGuide.questions.surface.valueEstimated("2,4"),
  "routeGuide.questions.refine.hoursValue": () =>
    `${fr.routeGuide.questions.refine.hoursValue({ hours: 1, text: "1" })}|${fr.routeGuide.questions.refine.hoursValue({ hours: 3, text: "3" })}`,
  "routeGuide.facts.hectares": () => fr.routeGuide.facts.hectares("2,4"),
  "routeGuide.advice.duration": () => fr.routeGuide.advice.duration({ range: "25 à 30 minutes" }),
  "routeGuide.advice.durationMinutes": () =>
    `${fr.routeGuide.advice.durationMinutes({ min: 25, max: 30 })}|${fr.routeGuide.advice.durationMinutes({ min: 1, max: 1 })}|${fr.routeGuide.advice.durationMinutes({ min: 30, max: 30 })}`,
  "routeGuide.advice.durationHours": () =>
    `${fr.routeGuide.advice.durationHours({ min: "2", max: "3" })}|${fr.routeGuide.advice.durationHours({ min: "2", max: "2" })}`,
  "routeGuide.details.fullLine": () => fr.routeGuide.details.fullLine("2,4"),
  "routeGuide.a11y.optionLabel": () =>
    fr.routeGuide.a11y.optionLabel({ label: "Oui", caption: "Une légende" }),
  "routeGuide.a11y.optionLabelTagged": () =>
    fr.routeGuide.a11y.optionLabelTagged({
      label: "Découper",
      tag: "Conseillé",
      caption: "Une légende",
    }),
  "routeGuide.a11y.suggestionCard": () =>
    fr.routeGuide.a11y.suggestionCard({
      eyebrow: "Parcours conseillé",
      route: "Parcours en plein",
      counting: "Relevé plafonné",
      hectares: "2,4",
    }),
  "routeGuide.details.countedLine": () => fr.routeGuide.details.countedLine("A, B"),
  "routeGuide.a11y.suggestionCardNoZone": () =>
    fr.routeGuide.a11y.suggestionCardNoZone({
      eyebrow: "Parcours choisi par vous",
      route: "Parcours en plein",
      counting: "Relevé plafonné",
    }),
  "routeGuide.a11y.suggestionChanged": () =>
    fr.routeGuide.a11y.suggestionChanged({
      route: "Parcours en plein",
      counting: "Relevé plafonné",
    }),
  "routeGuide.a11y.glossaryInfo": () => fr.routeGuide.a11y.glossaryInfo("Peuplement"),
  "surveyDetailRoute.factorItem": () =>
    fr.surveyDetail.route.factorItem({ letter: "B", title: "Structure verticale" }),
  "surveyDetailRoute.zoneValue": () => fr.surveyDetail.route.zoneValue("1,2"),
  "surveyDetailRoute.complementDone": () => fr.surveyDetail.route.complementDone("8"),
  "surveyDetailRoute.answerParts.standSurface": () =>
    fr.surveyDetail.route.answerParts.standSurface("8"),
  "surveyDetailRoute.answerParts.pieceSurface": () =>
    fr.surveyDetail.route.answerParts.pieceSurface("8"),
  "surveyDetailRoute.answerParts.hoursAvailable": () =>
    `${fr.surveyDetail.route.answerParts.hoursAvailable({ hours: 1, text: "1" })}|${fr.surveyDetail.route.answerParts.hoursAvailable({ hours: 3, text: "3" })}`,
  "surveyExportRoute.choiceGuide": () =>
    `${fr.surveyExport.route.choiceGuide({ answers: "peuplement de 8 ha" })}|${fr.surveyExport.route.choiceGuide({ answers: null })}`,
  "factorDetailCountingMode.zoneLine": () =>
    fr.factorDetail.countingMode.zoneLine({ hectares: "1,2" }),
  "factorDetailCountingMode.strataCounted": () =>
    `${fr.factorDetail.countingMode.strataCounted({ count: 1 })}|${fr.factorDetail.countingMode.strataCounted({ count: 3 })}`,
  "factorDetailCountingMode.strataFieldA11y": () =>
    fr.factorDetail.countingMode.strataFieldA11y({ label: "Très basse" }),
}

const ALLOWED_METHOD_WORDS = [join("méthode officielle de l", "'IBP"), join("Méthode", " IBP")]

const FORBIDDEN: { label: string; test: (text: string) => boolean }[] = [
  { label: "snake case token", test: (text) => /(^|[^\p{L}\p{N}_])[a-z]+_[a-z_]+/u.test(text) },
  {
    label: "official abbreviation of the forest owners' centre",
    test: (text) => text.includes(join("CN", "PF")),
  },
  {
    label: "abbreviation of dendromicrohabitat",
    test: (text) => new RegExp(`\\b${join("d", "mh")}\\b`, "i").test(text),
  },
  { label: "abbreviation Sg", test: (text) => new RegExp(`\\b${join("S", "g")}\\b`).test(text) },
  {
    label: "minutes or hours as a symbol",
    test: (text) => /(^|\s)(min|h)(\s|$|[.,;:])/.test(text),
  },
  {
    label: "word method applied to the parcours",
    test: (text) =>
      ALLOWED_METHOD_WORDS.reduce((rest, allowed) => rest.split(allowed).join(""), text)
        .toLowerCase()
        .includes(join("m", "éthode")),
  },
  {
    label: "retired fast counting label",
    test: (text) => text.includes(join("Comptage", " rapide")),
  },
  {
    label: "retired full counting label",
    test: (text) => text.includes(join("Comptage", " complet")),
  },
  {
    label: "sampling parcours",
    test: (text) => text.toLowerCase().includes(join("chantillon", "nage")),
  },
  {
    label: "typological parcours",
    test: (text) => text.toLowerCase().includes(join("typolog", "ique")),
  },
  {
    label: "systematic parcours",
    test: (text) => text.toLowerCase().includes(join("systémat", "ique")),
  },
  {
    label: "group name",
    test: (text) => text.toLowerCase().includes(join("groupe de", " relevés")),
  },
  {
    label: "inventory or study objective",
    test: (text) => /(^|[^\p{L}])(inventaire|étude)([^\p{L}]|$)/iu.test(text),
  },
  { label: "skip text", test: (text) => text.includes(join("Passer", " cette étape")) },
  { label: "optional tag", test: (text) => text.includes(join("Facul", "tatif")) },
  { label: "em dash", test: (text) => text.includes("—") },
]

describe("route catalogue text rules", () => {
  const { texts, functions } = walk()

  test("the catalogue holds the new sections", () => {
    expect(texts.length).toBeGreaterThan(60)
  })

  test("every function leaf has a sample and renders a clean sentence", () => {
    expect(functions.map(({ path }) => path).sort()).toEqual(Object.keys(SAMPLES).sort())
    for (const [path, render] of Object.entries(SAMPLES)) {
      const rendered = render()
      expect(rendered.length).toBeGreaterThan(0)
      expect([path, rendered.includes("undefined")]).toEqual([path, false])
      expect([path, rendered.includes("[object")]).toEqual([path, false])
      expect([path, rendered.includes("NaN")]).toEqual([path, false])
    }
  })

  test.each(FORBIDDEN.map((rule) => [rule.label, rule] as const))("no %s", (_label, rule) => {
    const rendered: Leaf[] = [
      ...texts,
      ...Object.entries(SAMPLES).map(([path, render]) => ({ path, text: render() })),
    ]
    expect(rendered.filter(({ text }) => rule.test(text)).map(({ path }) => path)).toEqual([])
  })

  test("the text rules catch what they are meant to catch", () => {
    const byLabel = Object.fromEntries(FORBIDDEN.map((rule) => [rule.label, rule.test]))
    expect(byLabel["snake case token"]("le code partial_strip")).toBe(true)
    expect(byLabel["snake case token"]("une phrase normale")).toBe(false)
    expect(byLabel["minutes or hours as a symbol"]("25 min")).toBe(true)
    expect(byLabel["minutes or hours as a symbol"]("2 h")).toBe(true)
    expect(byLabel["minutes or hours as a symbol"]("25 minutes, 2 heures")).toBe(false)
    expect(byLabel["word method applied to the parcours"]("Le parcours est une méthode")).toBe(true)
    expect(
      byLabel["word method applied to the parcours"]("selon la méthode officielle de l'IBP"),
    ).toBe(false)
    expect(byLabel["word method applied to the parcours"]("Méthode IBP")).toBe(false)
  })

  test("the glossary holds exactly the ten terms of the spec, in order", () => {
    expect(Object.keys(fr.routeGuide.glossary.terms)).toEqual([
      "peuplement",
      "parcoursEnPlein",
      "parcoursPartiel",
      "parBande",
      "parPlacette",
      "relevePlafonne",
      "releveDeplafonne",
      "surfaceDecrite",
      "resteDuPeuplement",
      "dendromicrohabitat",
    ])
    for (const entry of Object.values(fr.routeGuide.glossary.terms)) {
      expect(entry.term.length).toBeGreaterThan(0)
      expect(entry.text.endsWith(".")).toBe(true)
    }
  })

  test("each parcours and mode card has one short line of at most 9 words, the long words stay", () => {
    const { routes, counting } = fr.routeGuide
    const shorts = [
      routes.full.short,
      routes.partialStrip.short,
      routes.partialPlot.short,
      counting.capped.short,
      counting.uncapped.short,
    ]
    for (const line of shorts) {
      expect(line.split(" ").length).toBeLessThanOrEqual(9)
      expect(line.endsWith(".")).toBe(true)
      expect(line).not.toContain("\u2014")
    }
    // The numbers the spec fixes are kept in the long text behind the glyph.
    const strip = `${routes.partialStrip.explanation} ${routes.partialStrip.does}`
    expect(strip).toContain("20 à 50 mètres")
    expect(strip).toContain("10 à 20 %")
    expect(`${routes.full.explanation} ${routes.full.suits}`).toContain("5 hectares")
    expect(routes.full.suits).toContain("1 hectare")
  })

  test("the words are those of the official method (O-12)", () => {
    const { routes, counting, glossary, questions, screen } = fr.routeGuide
    expect(routes.full.name).toBe("Parcours en plein")
    expect(routes.partialStrip.name).toBe("Parcours partiel par bande")
    expect(routes.partialPlot.name).toBe("Parcours partiel par placette")
    expect(counting.caption).toBe("Mode de relevé")
    expect(counting.capped.name).toBe("Relevé plafonné")
    expect(counting.uncapped.name).toBe("Relevé déplafonné")
    expect(glossary.terms.peuplement.term).toBe("Peuplement")
    expect(screen.know).toBe("Je connais déjà mon parcours")
    expect(questions.surface.linearHelp).toContain("15 mètres")
  })

  test("each term is explained by the sentence of the glossary", () => {
    const { routes, counting, glossary } = fr.routeGuide
    expect(routes.full.explanation).toBe(glossary.terms.parcoursEnPlein.text)
    expect(routes.partialStrip.explanation).toBe(glossary.terms.parcoursPartiel.text)
    expect(routes.partialPlot.explanation).toBe(glossary.terms.parcoursPartiel.text)
    expect(routes.partialStrip.does.startsWith(glossary.terms.parBande.text)).toBe(true)
    expect(routes.partialPlot.does.startsWith(glossary.terms.parPlacette.text)).toBe(true)
    expect(counting.capped.explanation).toBe(glossary.terms.relevePlafonne.text)
    expect(counting.uncapped.explanation).toBe(glossary.terms.releveDeplafonne.text)
  })

  test("the three exits of the step are the mandatory ones (O-19)", () => {
    const { screen } = fr.routeGuide
    expect(screen.use).toBe("Utiliser ce parcours")
    expect(screen.next).toBe("Continuer")
    expect(Object.keys(screen)).not.toContain("skip")
  })

  test("the Contexte card and the PDF block use the words of the spec section 9", () => {
    const detail = fr.surveyDetail.route
    expect(detail.title).toBe("Parcours utilisé")
    expect([detail.parcours, detail.counting, detail.countedFactors, detail.zone]).toEqual([
      "Parcours",
      "Mode de relevé",
      "Facteurs comptés en entier",
      "Surface décrite",
    ])
    expect([detail.complement, detail.choice, detail.answers]).toEqual([
      "Reste du peuplement",
      "Choix",
      "Vos réponses",
    ])
    expect(detail.none).toBe("Parcours à choisir")
    expect(detail.choose).toBe("Choisir le parcours")
    expect(detail.edit).toBe("Modifier le parcours")
    expect(detail.legacyRow).toBe("Parcours : non renseigné")
    expect(detail.legacyBody).toBe("Ce relevé a été fait avant l'assistant de choix du parcours.")
    const pdf = fr.surveyExport.route
    expect(pdf.heading).toBe("Parcours utilisé")
    expect(pdf.counting).toBe("Mode de relevé")
    expect(pdf.choiceGuide({ answers: "peuplement de 8 ha, homogène, facile à observer" })).toBe(
      "Conseillé par l'application d'après vos réponses : peuplement de 8 ha, homogène, facile à observer.",
    )
    expect(pdf.choiceGuide({ answers: null })).toBe("Conseillé par l'application.")
    expect(pdf.choiceObserver).toBe("Choisi directement par l'observateur.")
  })

  test("a survey that existed before the phase still prints its old identity row", () => {
    expect(fr.surveyExport.identity.surveyMode).toBe("Mode de relevé")
    expect(fr.surveyExport.identity.cappedMode).toBe("Relevé plafonné, aucun facteur déplafonné")
  })

  test("the route-missing texts exist (O-19)", () => {
    expect(fr.surveyDetail.cta.routeRequired).toBe("Choisissez le parcours pour terminer")
    expect(fr.syncErrors.byCode.route_required).toBe(
      "Parcours non choisi : ouvrez le relevé pour le choisir",
    )
  })

  test("the factor captions of the relevé déplafonné cover A to G, I and J but not H", () => {
    const mode = fr.factorDetail.countingMode
    expect(mode.chip).toBe("Relevé déplafonné")
    for (const letter of ["A", "B", "C", "D", "E", "F", "G", "I", "J"] as const) {
      expect([letter, mode[letter].startsWith("Relevé déplafonné :")]).toEqual([letter, true])
    }
    expect(Object.keys(mode)).not.toContain("H")
  })

  test("the F hint no longer speaks of a detailed protocol", () => {
    const hint = fr.labels.factorInputHints.F.join(" ")
    expect(hint).not.toContain(join("protocole", " détaillé"))
    expect(hint).toContain("Pour le score, l'app garde au plus 2 arbres par hectare")
  })

  test("the route errors are the sentences of the zone checks", () => {
    expect(fr.validation.route.surfaceTooLarge).toBe(
      "Cette surface semble trop grande. Vérifiez-la.",
    )
    expect(fr.validation.route.surfaceNotPositive).toBe("Indiquez une surface supérieure à 0.")
    expect(fr.validation.route.zoneAboveStand).toBe(
      "La surface décrite ne peut pas dépasser celle du peuplement.",
    )
    expect(fr.validation.route.atLeastOneFactor).toBe("Choisissez au moins un facteur.")
  })
})
