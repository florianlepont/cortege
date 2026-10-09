import { fr } from "../index"

const { page } = fr.parcelHistory

describe("fr.parcelHistory.entry", () => {
  test("joins year, version and the latest badge when all three are present", () => {
    expect(fr.parcelHistory.entry({ year: 2025, version: 1, isLatest: true })).toBe(
      "2025 · version 1 · Dernier relevé",
    )
  })

  test("capitalises the version when it is the first part", () => {
    expect(fr.parcelHistory.entry({ year: null, version: 1, isLatest: false })).toBe("Version 1")
  })

  test("omits a missing version instead of guessing", () => {
    expect(fr.parcelHistory.entry({ year: 2025, version: null, isLatest: false })).toBe("2025")
  })

  test("falls back to a plain label when year, version and isLatest are all absent", () => {
    expect(fr.parcelHistory.entry({ year: null, version: null, isLatest: false })).toBe("Relevé")
  })
})

describe("fr.parcelHistory.page", () => {
  test("states, subtitle and reload action", () => {
    expect(page.subtitle).toBe("Les relevés faits sur cette parcelle.")
    expect(page.first).toBe(
      "C'est le premier relevé de cette parcelle. Les suivants apparaîtront ici.",
    )
    expect(page.noParcel).toBe(
      "Aucune parcelle n'est liée à ce relevé. Choisissez-en une pour voir son historique.",
    )
    expect(page.offline).toBe(
      "L'historique de la parcelle n'est pas disponible hors connexion. Il s'affichera dès que vous serez en ligne.",
    )
    expect(page.reload).toBe("Recharger l'historique")
  })

  test("trend title strong part carries the sign and the plural", () => {
    expect(page.trend.titleStrong(13)).toBe("+13 points")
    expect(page.trend.titleStrong(1)).toBe("+1 point")
    expect(page.trend.titleStrong(-1)).toBe("-1 point")
    expect(page.trend.titleStrong(-4)).toBe("-4 points")
    expect(page.trend.titleStrong(0)).toBe("Aucun changement")
  })

  test("trend title accent part names the year or the first survey", () => {
    expect(page.trend.titleAccent(2023)).toBe(" depuis 2023")
    expect(page.trend.titleAccent(null)).toBe(" depuis le premier relevé")
  })

  test("method change title", () => {
    expect(page.trend.newMethodStrong("v3.2")).toBe("Passage à la méthode v3.2")
    expect(page.trend.newMethodAccent(2025)).toBe(" en 2025")
    expect(page.trend.newMethodUnknown).toBe("Changement de méthode")
  })

  test("mixed notice, unknown year marker and the curve's text alternative", () => {
    expect(page.trend.mixed).toBe("Méthodes v3.0 et v3.2 : totaux non strictement comparables.")
    expect(page.trend.unknownYear).toBe("?")
    expect(
      page.trend.a11y([
        { year: 2023, total: 21 },
        { year: null, total: 27 },
      ]),
    ).toBe("Évolution du total IBP. 2023, 21 sur 50. année inconnue, 27 sur 50.")
    expect(page.trend.a11yMixed).toBe(" Courbe coupée entre les méthodes v3.0 et v3.2.")
  })

  test("delta card title", () => {
    expect(page.deltas.title(2025)).toBe("Depuis 2025")
    expect(page.deltas.title(null)).toBe("Depuis le relevé précédent")
  })

  test("delta card total line", () => {
    expect(page.deltas.total({ delta: 3, current: 34, previous: 31 })).toBe(
      "Total : +3 (34 contre 31)",
    )
    expect(page.deltas.total({ delta: -2, current: 29, previous: 31 })).toBe(
      "Total : -2 (29 contre 31)",
    )
    expect(page.deltas.total({ delta: 0, current: 34, previous: 34 })).toBe("Total : inchangé (34)")
  })

  test("delta card values", () => {
    expect(page.deltas.value(2)).toBe("+2")
    expect(page.deltas.value(-1)).toBe("-1")
    expect(page.deltas.value(0)).toBe("=")
    expect(page.deltas.none).toBe("n.d.")
    expect(page.deltas.differentMethod).toBe(
      "Le relevé précédent suit une autre méthode : pas de comparaison par facteur.",
    )
  })

  test("delta card spoken row", () => {
    const row = (points: number | null, delta: number | null) =>
      page.deltas.row({ letter: "A", points, max: 5, delta })
    expect(row(3, 2)).toBe("Facteur A, 3 sur 5, plus 2")
    expect(row(3, -1)).toBe("Facteur A, 3 sur 5, moins 1")
    expect(row(3, 0)).toBe("Facteur A, 3 sur 5, inchangé")
    expect(row(3, null)).toBe("Facteur A, 3 sur 5, pas de comparaison")
    expect(row(null, null)).toBe("Facteur A, non renseigné, pas de comparaison")
  })

  test("survey list texts", () => {
    expect(page.list.title(4)).toBe("Relevés · 4")
    expect(page.list.current).toBe("Ce relevé")
    expect(page.list.method("v3.0")).toBe("Méthode v3.0")
    expect(page.list.open({ entry: "2025 · version 2", total: 31 })).toBe(
      "2025 · version 2, 31 sur 50. Ouvrir ce relevé",
    )
    expect(page.list.openCurrent({ entry: "2026 · version 3", total: 34 })).toBe(
      "2026 · version 3, 34 sur 50. Ce relevé",
    )
  })
})
