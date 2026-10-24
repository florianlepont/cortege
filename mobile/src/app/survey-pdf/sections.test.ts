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
      "identity",
      "conditions",
      "route",
      "score-summary",
      "factor-chart",
      "factors",
      "map",
      "trend",
      "photos",
    ])
  })

  it("holds no section for the summary yet (appended by a later plan)", () => {
    expect(sectionsFor("summary")).toEqual([])
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
    list.pop()
    expect(sectionsFor("complete")).toHaveLength(PDF_SECTIONS.length)
  })

  it("keeps the registry order whatever the mode filter", () => {
    const ids = sectionsFor("complete").map((entry) => entry.id)
    expect(ids).toEqual(PDF_SECTIONS.map((entry) => entry.id))
  })
})

describe("section builders", () => {
  it("prints no block for a survey with no weather, note or route", () => {
    expect(section("conditions").build(exportFixtureV32Submitted, palette)).toEqual([])
    expect(section("route").build(exportFixtureV32Submitted, palette)).toEqual([])
  })

  it("prints one block for a section that has something to show", () => {
    expect(section("route").build(exportFixtureWorstCase, palette)).toHaveLength(1)
    expect(section("score-summary").build(exportFixtureV30Draft, palette)).toHaveLength(1)
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
