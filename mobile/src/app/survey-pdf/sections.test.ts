// palette.ts reads useColorScheme from react-native through theme.ts; the print palette never calls
// it, so the stub only has to exist.
jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import {
  exportFixtureSummary,
  exportFixtureTypicalConditioned,
  exportFixtureV30Draft,
  exportFixtureV32Submitted,
  exportFixtureWorstCase,
} from "../../../test/survey-export-fixtures"
import { buildPdfPalette } from "./palette"
import { PDF_SECTIONS, sectionsFor } from "./sections"
import type { PdfSection } from "./sections"

const palette = buildPdfPalette()

function section(id: string): PdfSection {
  const found = PDF_SECTIONS.find((entry) => entry.id === id)
  if (found === undefined) throw new Error(`no section ${id}`)
  return found
}

describe("PDF_SECTIONS", () => {
  it("lists the sections of the complete document in the order of the sheet", () => {
    expect(sectionsFor("complete").map((entry) => entry.id)).toEqual([
      "cover",
      "identity",
      "conditions",
      "route",
      "factor-chart",
      "factors",
      "map",
      "trend",
      "photos",
    ])
  })

  it("holds the summary alone in the summary mode, and none of the complete sections", () => {
    expect(sectionsFor("summary").map((entry) => entry.id)).toEqual(["summary"])
    expect(sectionsFor("complete").map((entry) => entry.id)).not.toContain("summary")
    expect(sectionsFor("summary").map((entry) => entry.id)).not.toContain("cover")
  })

  it("has no score card entry any more (its content moved to the cover, D-01)", () => {
    expect(PDF_SECTIONS.map((entry) => entry.id)).not.toContain("score-summary")
    expect(sectionsFor("complete")[0].id).toBe("cover")
  })

  it("has unique ids and only known modes, at least one per section", () => {
    const ids = PDF_SECTIONS.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of PDF_SECTIONS) {
      expect(entry.modes.length).toBeGreaterThan(0)
      for (const mode of entry.modes) expect(["complete", "summary"]).toContain(mode)
    }
  })

  it("is frozen, with frozen mode lists", () => {
    expect(Object.isFrozen(PDF_SECTIONS)).toBe(true)
    expect(Object.isFrozen(PDF_SECTIONS[0].modes)).toBe(true)
  })

  it("hands out a copy: changing the result leaves the registry alone", () => {
    const list = sectionsFor("complete")
    const before = list.length
    list.pop()
    expect(sectionsFor("complete")).toHaveLength(before)
  })

  it("keeps the registry order whatever the mode filter", () => {
    const registry = PDF_SECTIONS.map((entry) => entry.id)
    for (const mode of ["complete", "summary"] as const) {
      const ids = sectionsFor(mode).map((entry) => entry.id)
      expect(ids).toEqual(registry.filter((id) => ids.includes(id)))
    }
  })
})

describe("section builders", () => {
  it("prints no block for a survey with no weather, note or route", () => {
    expect(section("conditions").build(exportFixtureV32Submitted, palette)).toEqual([])
    expect(section("route").build(exportFixtureV32Submitted, palette)).toEqual([])
  })

  it("prints one block for a section that has something to show", () => {
    expect(section("route").build(exportFixtureWorstCase, palette)).toHaveLength(1)
    expect(section("cover").build(exportFixtureV30Draft, palette)).toHaveLength(1)
    expect(section("summary").build(exportFixtureSummary, palette)).toHaveLength(1)
    expect(section("factor-chart").build(exportFixtureV30Draft, palette)).toHaveLength(1)
    expect(section("map").build(exportFixtureV30Draft, palette)).toHaveLength(1)
    expect(section("trend").build(exportFixtureV30Draft, palette)).toHaveLength(1)
  })

  it("gives every section a CSS string and at least one block for a full survey", () => {
    const full = {
      ...exportFixtureWorstCase,
      conditions: exportFixtureTypicalConditioned.conditions,
    }
    for (const entry of PDF_SECTIONS) {
      expect(typeof entry.css(palette)).toBe("string")
      expect(entry.build(full, palette).length).toBeGreaterThan(0)
    }
  })

  it("ignores the mode of the data: the filter is the registry's job", () => {
    const blocks = section("identity").build(exportFixtureSummary, palette)
    expect(blocks.length).toBeGreaterThan(0)
  })
})
