import { computePeriodRange } from "./period-filter"

const NOW = new Date(2026, 8, 27) // 2026-09-27 (local, no TZ surprises for date-only math)

describe("computePeriodRange (MAP-02: period chips)", () => {
  test("'all' clears both bounds", () => {
    expect(computePeriodRange("all", NOW)).toEqual({ from: "", to: "" })
  })

  test("'month' starts at the 1st of the current month", () => {
    expect(computePeriodRange("month", NOW)).toEqual({ from: "2026-09-01", to: "2026-09-27" })
  })

  test("'quarter' starts at the 1st of the month two months back", () => {
    expect(computePeriodRange("quarter", NOW)).toEqual({ from: "2026-07-01", to: "2026-09-27" })
  })

  test("'quarter' rolls back across a year boundary", () => {
    const januaryNow = new Date(2026, 0, 15)
    expect(computePeriodRange("quarter", januaryNow)).toEqual({
      from: "2025-11-01",
      to: "2026-01-15",
    })
  })

  test("'year' starts at January 1st of the current year", () => {
    expect(computePeriodRange("year", NOW)).toEqual({ from: "2026-01-01", to: "2026-09-27" })
  })
})
