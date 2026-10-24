import { COMPLETE_BASE_PAGES, estimateCompletePages } from "./page-estimate"

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
})
