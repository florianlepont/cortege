import { surveyExportFr as t } from "./survey-export"

const EM_DASH = "—"
const FACTOR_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

function strings(node: unknown, into: string[] = []): string[] {
  if (typeof node === "string") into.push(node)
  else if (node !== null && typeof node === "object") {
    for (const child of Object.values(node)) strings(child, into)
  }
  return into
}

describe("fr.surveyExport", () => {
  it("prints a word, not a dash, for an unknown value", () => {
    expect(t.identity.unknown).toBe("Non renseigné")
  })

  it("agrees the provisional score with the number of missing factors", () => {
    expect(t.scores.provisional({ count: 1 })).toBe("Score provisoire : 1 facteur non renseigné")
    expect(t.scores.provisional({ count: 3 })).toBe("Score provisoire : 3 facteurs non renseignés")
  })

  it("agrees the genus count", () => {
    expect(t.factors.genusCount({ count: 1 })).toBe("1 genre compté")
    expect(t.factors.genusCount({ count: 4 })).toBe("4 genres comptés")
    expect(t.factors.legacyGenusCount({ count: 3 })).toBe(
      "3 genres (saisie antérieure, sans la liste)",
    )
    expect(t.factors.legacyGenusCount({ count: 1 })).toBe(
      "1 genre (saisie antérieure, sans la liste)",
    )
  })

  it("agrees the unavailable photo count", () => {
    expect(t.photos.unavailable({ count: 1 })).toBe(
      "1 photo n'est pas disponible sur cet appareil.",
    )
    expect(t.photos.unavailable({ count: 2 })).toBe(
      "2 photos ne sont pas disponibles sur cet appareil.",
    )
  })

  it("numbers photos and pages", () => {
    expect(t.photos.caption({ index: "2", total: 9 })).toBe("Photo 2 sur 9")
    expect(t.page.number({ index: "2", total: 7 })).toBe("Page 2 / 7")
    expect(t.photos.capped({ shown: "12", total: 30 })).toBe("12 photos sur 30 sont reproduites.")
  })

  it("interpolates preformatted values", () => {
    expect(t.scores.outOf({ points: "27,5", max: "35" })).toBe("27,5 / 35")
    expect(t.scores.band({ band: "assez forte" })).toBe("Niveau : assez forte")
    expect(t.identity.coordinatesValue({ lat: "48,40491", lng: "-4,48" })).toBe(
      "48,40491, -4,48 (WGS 84, système géodésique mondial)",
    )
    expect(t.factors.pointsOutOfFive({ points: "2" })).toBe("2 / 5")
    expect(t.factors.percent({ value: "35" })).toBe("35 %")
    expect(t.factors.surfaceValue({ value: "0,5" })).toBe("0,5 ha")
    expect(t.factors.countPerHa({ value: "3", perHa: "6" })).toBe("3 (6 / ha)")
    expect(t.factors.treesPerHaValue({ value: "4" })).toBe("4 arbres / ha")
    expect(t.map.scaleValue({ metres: "200" })).toBe("200 m")
    expect(t.map.scaleKm({ km: "1" })).toBe("1 km")
    expect(t.trend.cachedAt({ date: "10 octobre 2026" })).toBe(
      "Historique enregistré sur l'appareil le 10 octobre 2026.",
    )
    expect(t.trend.deltaHeading({ year: "2024" })).toBe("Évolution par facteur depuis 2024")
    expect(t.page.generatedAt({ date: "10 octobre 2026" })).toBe("Généré le 10 octobre 2026")
    expect(t.documentTitle("Bois")).toBe("Relevé IBP : Bois")
    expect(t.shareDialogTitle("Bois")).toBe("Partager le relevé Bois")
    expect(t.footer("10 octobre 2026")).toContain("10 octobre 2026")
    expect(t.scores.total(30)).toBe("30 / 50")
    expect(t.scores.stand(20)).toContain("20 / 35")
    expect(t.scores.context(10)).toContain("10 / 15")
    // D-26: the chart group labels, with and without a score, built from the same two names.
    expect(t.scores.groupNames).toEqual({ stand: "Peuplement et gestion", context: "Contexte" })
    expect(t.scores.stand(24)).toBe("Peuplement et gestion : 24 / 35")
    expect(t.scores.context(10)).toBe("Contexte : 10 / 15")
  })

  it.each(["v3_2", "v3_0"] as const)("has a clean scale line for each factor (%s)", (key) => {
    const lines = t.scaleLines[key]
    expect(Object.keys(lines)).toEqual(FACTOR_LETTERS)
    for (const letter of FACTOR_LETTERS) {
      const line = lines[letter as keyof typeof lines]
      expect(line).toContain("= 5")
      expect(line).not.toMatch(/_count|_ha|class_score|S5/)
    }
  })

  it("names the file in plain ASCII", () => {
    for (const value of Object.values(t.file)) expect(value).toMatch(/^[\x20-\x7e]+$/)
    expect(t.file.prefix).toBe("Cortege-IBP")
    expect(t.file.draftSuffix).toBe("brouillon")
    expect(t.file.fallbackSite).toBe("releve")
  })

  it("words the commune row, the cover and the summary (phase 33)", () => {
    expect(t.identity.communeValue({ code: "77186", department: "77" })).toBe(
      "77186 (département 77)",
    )
    expect(t.cover.scoreA11y({ points: "32", max: "50" })).toBe("Score IBP : 32 sur 50")
    expect(t.cover.subscoreA11y({ heading: "Contexte", points: "12", max: "15" })).toBe(
      "Contexte : 12 sur 15",
    )
    expect(t.cover.outOf({ max: "50" })).toBe("/ 50")
    expect(t.summary.eyebrow).toBe("Résumé du relevé IBP")
    expect(t.summary.mapHeading).toBe("Parcelle")
    expect(t.summary.metaLine({ commune: "77186", parcels: "77186000AB0123", version: "2" })).toBe(
      "Commune 77186, parcelle 77186000AB0123, version 2",
    )
    expect(t.summary.subscores({ stand: "20", context: "12" })).toBe(
      "20 / 35 peuplement, 12 / 15 contexte",
    )
    expect(t.summary.trendUnavailable).toBe(
      "Évolution de la parcelle non disponible sur cet appareil.",
    )
  })

  it("names the summary file with its own ASCII suffix", () => {
    expect(t.file.summarySuffix).toBe("resume")
  })

  it("has the draft marks", () => {
    expect(t.draft.banner).toBe("Brouillon, non soumis")
    expect(t.draft.watermark).toBe("Brouillon")
  })

  it("holds no em dash in any fixed string", () => {
    for (const value of strings(t)) expect(value).not.toContain(EM_DASH)
  })
})
