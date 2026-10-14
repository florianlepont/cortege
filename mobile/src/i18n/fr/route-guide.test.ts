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
  "routeGuide.questions.surface.value": () => fr.routeGuide.questions.surface.value("2,4"),
  "routeGuide.questions.surface.valueEstimated": () =>
    fr.routeGuide.questions.surface.valueEstimated("2,4"),
  "routeGuide.questions.refine.hoursValue": () =>
    `${fr.routeGuide.questions.refine.hoursValue({ hours: 1, text: "1" })}|${fr.routeGuide.questions.refine.hoursValue({ hours: 3, text: "3" })}`,
  "routeGuide.suggestion.surfaceLine": () => fr.routeGuide.suggestion.surfaceLine("1,2"),
  "routeGuide.advice.duration": () => fr.routeGuide.advice.duration({ range: "25 à 30 minutes" }),
  "routeGuide.details.fullLine": () => fr.routeGuide.details.fullLine("2,4"),
  "routeGuide.a11y.optionLabel": () =>
    fr.routeGuide.a11y.optionLabel({ label: "Oui", caption: "Une légende" }),
  "routeGuide.a11y.answerRow": () =>
    fr.routeGuide.a11y.answerRow({ question: "Surface", answer: "2,4 ha" }),
  "routeGuide.a11y.suggestionCard": () =>
    fr.routeGuide.a11y.suggestionCard({
      eyebrow: "Parcours conseillé",
      route: "Parcours en plein",
      counting: "Relevé plafonné",
      hectares: "2,4",
    }),
  "routeGuide.a11y.suggestionChanged": () =>
    fr.routeGuide.a11y.suggestionChanged({
      route: "Parcours en plein",
      counting: "Relevé plafonné",
    }),
  "routeGuide.a11y.glossaryInfo": () => fr.routeGuide.a11y.glossaryInfo("Peuplement"),
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
    expect(screen.required).toContain("nécessaire pour créer le relevé")
    expect(Object.keys(screen)).not.toContain("skip")
  })
})
