import { fr } from "../index"

// Phase 33 (D-05, D-09, D-14, D-15): the strings of the export choice sheet, pinned.

describe("fr.surveyExportChoice", () => {
  const t = fr.surveyExportChoice

  test("the title and the group label", () => {
    expect(t.title).toBe("Quel PDF voulez-vous ?")
    expect(t.groupA11y).toBe("Type de PDF")
  })

  test("the complete card carries the approximate page count", () => {
    expect(t.options.complete.label).toBe("Complet")
    expect(t.options.complete.caption({ count: 6 })).toBe(
      "Tout le relevé : identité, conditions, parcours, facteurs, carte, évolution et photos. Environ 6 pages.",
    )
    expect(t.options.complete.caption({ count: 1 })).toMatch(/Environ 1 page\.$/)
  })

  test("the summary card says it is one page", () => {
    expect(t.options.summary.label).toBe("Résumé")
    expect(t.options.summary.caption).toBe(
      "Une page à présenter aux partenaires et aux financeurs : score, parcelle, facteurs et évolution. 1 page.",
    )
  })

  test("the draft sentence and its spoken form", () => {
    expect(t.summaryDraft).toBe(
      "Le résumé est réservé aux relevés terminés. Terminez le relevé pour l'obtenir.",
    )
    expect(t.summaryDraftA11y).toBe(
      "Résumé, indisponible. Le résumé est réservé aux relevés terminés.",
    )
  })

  test("the buttons and their spoken labels", () => {
    expect(t.confirm).toBe("Exporter le PDF")
    expect(t.confirmA11y.complete({ name: "Bois" })).toBe("Exporter le PDF complet du relevé Bois.")
    expect(t.confirmA11y.summary({ name: "Bois" })).toBe("Exporter le PDF résumé du relevé Bois.")
  })

  test("words defined once are shared", () => {
    expect(t.cancel).toBe(fr.common.actions.cancel)
  })
})
