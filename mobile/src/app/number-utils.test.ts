import { parseFiniteNumberInput } from "./number-utils"

describe("parseFiniteNumberInput", () => {
  test("returns null for blank values", () => {
    expect(parseFiniteNumberInput("")).toBeNull()
    expect(parseFiniteNumberInput("   ")).toBeNull()
  })

  test("parses valid numeric strings", () => {
    expect(parseFiniteNumberInput("0")).toBe(0)
    expect(parseFiniteNumberInput(" 12.5 ")).toBe(12.5)
    expect(parseFiniteNumberInput("-3")).toBe(-3)
  })

  // FLOW-03/BUG-04: the French decimal separator is a comma.
  test("accepts a comma as the decimal separator", () => {
    expect(parseFiniteNumberInput("12,5")).toBe(12.5)
    expect(parseFiniteNumberInput(" 0,6 ")).toBe(0.6)
    expect(parseFiniteNumberInput("-3,25")).toBe(-3.25)
  })

  test("returns null for invalid numeric strings", () => {
    expect(parseFiniteNumberInput("abc")).toBeNull()
    expect(parseFiniteNumberInput("1,2,3")).toBeNull()
  })
})
