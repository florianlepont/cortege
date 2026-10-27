// palette.ts reads useColorScheme from react-native through theme.ts; the print palette never calls
// it, so the stub only has to exist.
jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import {
  exportFixtureTypical,
  exportFixtureTypicalConditioned,
  exportFixtureV30Draft,
  exportFixtureV32Submitted,
  exportFixtureWorstCase,
} from "../../../test/survey-export-fixtures"
import { buildSurveyExportHtml } from "./build-html"
import { COMPLETE_BASE_PAGES, estimateCompletePages } from "./page-estimate"
import type { SurveyExportData } from "./types"

describe("estimateCompletePages", () => {
  test("the base is a positive integer", () => {
    expect(Number.isInteger(COMPLETE_BASE_PAGES)).toBe(true)
    expect(COMPLETE_BASE_PAGES).toBeGreaterThan(0)
  })

  test("no photo gives the base", () => {
    expect(estimateCompletePages({ photoCount: 0 })).toBe(COMPLETE_BASE_PAGES)
  })

  test("one page per six photos", () => {
    expect(estimateCompletePages({ photoCount: 1 })).toBe(COMPLETE_BASE_PAGES + 1)
    expect(estimateCompletePages({ photoCount: 6 })).toBe(COMPLETE_BASE_PAGES + 1)
    expect(estimateCompletePages({ photoCount: 7 })).toBe(COMPLETE_BASE_PAGES + 2)
    expect(estimateCompletePages({ photoCount: 12 })).toBe(COMPLETE_BASE_PAGES + 2)
    expect(estimateCompletePages({ photoCount: 24 })).toBe(COMPLETE_BASE_PAGES + 4)
  })

  test("the photos are capped at 24 like the export", () => {
    expect(estimateCompletePages({ photoCount: 30 })).toBe(COMPLETE_BASE_PAGES + 4)
  })

  test("a negative or NaN count is read as no photo", () => {
    expect(estimateCompletePages({ photoCount: -3 })).toBe(COMPLETE_BASE_PAGES)
    expect(estimateCompletePages({ photoCount: Number.NaN })).toBe(COMPLETE_BASE_PAGES)
  })

  test("never below two pages", () => {
    expect(estimateCompletePages({ photoCount: 0 })).toBeGreaterThanOrEqual(2)
    expect(estimateCompletePages({ photoCount: 24 })).toBeGreaterThanOrEqual(2)
  })

  // Pitfall 8 of the research: the estimate of the choice sheet is pinned to the builder.
  test("the base is the builder's page count of the typical survey without photos", () => {
    const noPhotos: SurveyExportData = {
      ...exportFixtureTypical,
      photos: { items: [], total: 0, unavailable: 0 },
    }
    expect(buildSurveyExportHtml(noPhotos).pageCount).toBe(COMPLETE_BASE_PAGES)
  })
})

describe("estimateCompletePages against the builder (fixtures)", () => {
  const built = (data: SurveyExportData) => buildSurveyExportHtml(data).pageCount
  const estimated = (data: SurveyExportData) =>
    estimateCompletePages({ photoCount: data.photos.items.length })

  test("equals the builder's count for the typical survey", () => {
    expect(estimated(exportFixtureTypical)).toBe(built(exportFixtureTypical))
  })

  test.each([
    ["the v3.2 submitted survey", exportFixtureV32Submitted],
    ["the v3.0 draft", exportFixtureV30Draft],
    ["the typical survey with conditions and route", exportFixtureTypicalConditioned],
    ["the worst case sheet", exportFixtureWorstCase],
  ])("is within one page of the builder's count for %s", (_label, data) => {
    expect(Math.abs(estimated(data) - built(data))).toBeLessThanOrEqual(1)
  })
})
