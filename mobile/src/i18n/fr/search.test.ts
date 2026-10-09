import { searchFr } from "./search"

describe("fr.search", () => {
  test("seeAll adds a plus sign only when capped", () => {
    expect(searchFr.seeAll({ count: 6, capped: false })).toBe("Voir les 6")
    expect(searchFr.seeAll({ count: 50, capped: true })).toBe("Voir les 50+")
  })

  test("memberMeta agrees in number", () => {
    expect(searchFr.rows.memberMeta({ count: 1 })).toBe("1 relevé terminé")
    expect(searchFr.rows.memberMeta({ count: 3 })).toBe("3 relevés terminés")
  })

  test("parcelMeta names the commune, or falls back to its code", () => {
    const base = { commune: "Fontainebleau", code: "77186" }
    expect(searchFr.rows.parcelMeta({ ...base, surveyCount: null })).toBe("Fontainebleau (77186)")
    expect(searchFr.rows.parcelMeta({ ...base, surveyCount: 1 })).toBe(
      "Fontainebleau (77186) · 1 relevé",
    )
    expect(searchFr.rows.parcelMeta({ ...base, surveyCount: 2 })).toBe(
      "Fontainebleau (77186) · 2 relevés",
    )
    expect(searchFr.rows.parcelMeta({ commune: null, code: "77186", surveyCount: null })).toBe(
      "Commune 77186",
    )
    expect(searchFr.rows.parcelMeta({ commune: null, code: "77186", surveyCount: 2 })).toBe(
      "Commune 77186 · 2 relevés",
    )
  })

  test("placeMeta joins kind and context with a middle dot", () => {
    expect(searchFr.rows.placeMeta({ kind: "Commune", context: "Seine-et-Marne (77)" })).toBe(
      "Commune · Seine-et-Marne (77)",
    )
    expect(searchFr.rows.placeMeta({ kind: "Commune", context: null })).toBe("Commune")
  })

  test("announce.results agrees in number", () => {
    expect(searchFr.announce.results({ count: 1 })).toBe("1 résultat")
    expect(searchFr.announce.results({ count: 4 })).toBe("4 résultats")
  })

  test("quoted and grouped titles", () => {
    expect(searchFr.noResult.title("marie")).toBe("Aucun résultat pour « marie »")
    expect(searchFr.list.title({ group: "Communauté", count: 6 })).toBe("Communauté · 6")
  })

  test("the remaining sentence builders render their arguments", () => {
    expect(searchFr.best.a11y({ title: "T", meta: "M" })).toBe("Meilleur résultat : T, M")
    expect(searchFr.seeAllA11y({ group: "Lieux", count: 3 })).toBe("Voir les 3 résultats : Lieux")
    expect(searchFr.rows.placeA11y({ name: "N", meta: "M" })).toBe("Lieu : N, M")
    expect(searchFr.rows.parcelTitle({ section: "AB", number: "0123" })).toBe("Parcelle AB 0123")
    expect(searchFr.rows.parcelA11y({ title: "T", meta: "M" })).toBe("T, M")
    expect(searchFr.rows.memberA11y({ name: "N", meta: "M" })).toBe("Membre : N, M")
    expect(searchFr.start.recentOpenA11y("q")).toBe("Chercher « q »")
    expect(searchFr.start.recentRemoveA11y("q")).toBe("Retirer « q » des recherches récentes")
    expect(searchFr.noResult.offlineTitle("q")).toBe("Aucun de vos relevés ne correspond à « q »")
    expect(searchFr.error.retryA11y("Lieux")).toBe("Réessayer la recherche : Lieux")
    expect(searchFr.list.caption("q")).toBe("Pour « q »")
    expect(searchFr.list.memberCaption("Marie")).toBe("Relevés de Marie")
  })
})
