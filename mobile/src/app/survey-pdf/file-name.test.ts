import { fr } from "../../i18n"
import { EXPORT_SITE_SLUG_MAX, buildExportFileName } from "./file-name"

const t = fr.surveyExport.file

const SAFE_NAME = /^[A-Za-z0-9-]+\.pdf$/

function nameOf(overrides: Partial<Parameters<typeof buildExportFileName>[0]> = {}): string {
  return buildExportFileName({
    siteName: "Bois de la Colline",
    observationYear: 2026,
    dateIso: "2026-09-26T10:00:00.000Z",
    isDraft: false,
    ...overrides,
  })
}

describe("buildExportFileName", () => {
  it("keeps the slug limit at 40", () => {
    expect(EXPORT_SITE_SLUG_MAX).toBe(40)
  })

  it("names a submitted survey from its site and year", () => {
    expect(nameOf({ siteName: "Forêt de l'Étang / Nord" })).toBe(
      "Cortege-IBP-Foret-de-l-Etang-Nord-2026.pdf",
    )
    expect(t.prefix).toBe("Cortege-IBP")
  })

  it("adds the draft suffix before the extension", () => {
    expect(nameOf({ isDraft: true })).toBe(
      `Cortege-IBP-Bois-de-la-Colline-2026-${t.draftSuffix}.pdf`,
    )
  })

  it("takes the year of the survey date when the observation year is missing", () => {
    expect(nameOf({ observationYear: null, dateIso: "2025-03-04T10:00:00.000Z" })).toBe(
      "Cortege-IBP-Bois-de-la-Colline-2025.pdf",
    )
  })

  it("leaves the year out when neither the year nor the date is usable", () => {
    const name = nameOf({ observationYear: null, dateIso: "not-a-date" })
    expect(name).toBe("Cortege-IBP-Bois-de-la-Colline.pdf")
    expect(name).not.toMatch(/unknown|null|NaN/i)
    expect(nameOf({ observationYear: null, dateIso: "not-a-date", isDraft: true })).toBe(
      `Cortege-IBP-Bois-de-la-Colline-${t.draftSuffix}.pdf`,
    )
  })

  it("ignores an observation year that is not a plain four digit year", () => {
    expect(nameOf({ observationYear: Number.NaN })).toBe("Cortege-IBP-Bois-de-la-Colline-2026.pdf")
    expect(nameOf({ observationYear: 20.5 })).toBe("Cortege-IBP-Bois-de-la-Colline-2026.pdf")
    expect(nameOf({ observationYear: 12 })).toBe("Cortege-IBP-Bois-de-la-Colline-2026.pdf")
    expect(nameOf({ observationYear: 123456 })).toBe("Cortege-IBP-Bois-de-la-Colline-2026.pdf")
  })

  it("cannot be turned into a path", () => {
    for (const siteName of [
      "../../etc/passwd",
      "..\\..\\windows\\system32",
      "/absolute/path",
      "a/../b",
      "....",
      "name.pdf.exe",
      "%2e%2e%2f",
    ]) {
      const name = nameOf({ siteName })
      expect(name).toMatch(SAFE_NAME)
      expect(name).not.toContain("/")
      expect(name).not.toContain("\\")
      expect(name).not.toContain("..")
    }
    expect(nameOf({ siteName: "../../etc/passwd" })).toBe("Cortege-IBP-etc-passwd-2026.pdf")
  })

  it("falls back to the neutral site word for an empty or symbol-only name", () => {
    for (const siteName of ["", "   ", "🌲🌲", "/// ...", "日本語"]) {
      expect(nameOf({ siteName })).toBe(`Cortege-IBP-${t.fallbackSite}-2026.pdf`)
    }
  })

  it("strips accents and keeps ASCII only", () => {
    const name = nameOf({ siteName: "Bois d'Œuvre à Çà et là, ñandú" })
    expect(name).toMatch(SAFE_NAME)
    expect(name).toContain("Bois-d-")
    expect(name).toContain("Ca-et-la-nandu")
  })

  it("cuts a long site name to the limit, at a dash when there is one near the end", () => {
    const long = nameOf({ siteName: "Foret domaniale de la grande colline du nord ".repeat(2) })
    const slug = long.replace("Cortege-IBP-", "").replace("-2026.pdf", "")
    expect(slug.length).toBeLessThanOrEqual(EXPORT_SITE_SLUG_MAX)
    expect(slug.endsWith("-")).toBe(false)
    expect(slug).toBe("Foret-domaniale-de-la-grande-colline-du")
    expect(long).toMatch(SAFE_NAME)
  })

  it("cuts one long word at the limit with no trailing dash", () => {
    const slug = nameOf({ siteName: "a".repeat(80) })
      .replace("Cortege-IBP-", "")
      .replace("-2026.pdf", "")
    expect(slug).toBe("a".repeat(EXPORT_SITE_SLUG_MAX))
    const dashed = nameOf({ siteName: `${"a".repeat(39)} ${"b".repeat(40)}` })
    expect(dashed).toBe(`Cortege-IBP-${"a".repeat(39)}-2026.pdf`)
  })

  it("matches the safe pattern for every combination", () => {
    for (const siteName of ["Bois", "Forêt de l'Étang / Nord", "", "x".repeat(200), "../../x"]) {
      for (const isDraft of [true, false]) {
        for (const observationYear of [2026, null]) {
          for (const dateIso of ["2026-01-01T00:00:00Z", "garbage"]) {
            expect(nameOf({ siteName, isDraft, observationYear, dateIso })).toMatch(SAFE_NAME)
          }
        }
      }
    }
  })
})
