import { parseFiniteNumberInput, toFiniteNumberInRange } from "./number-utils"

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

describe("toFiniteNumberInRange", () => {
  test("reads the number with the comma rule and no bound by default", () => {
    expect(toFiniteNumberInRange("12,5")).toBe(12.5)
    expect(toFiniteNumberInRange("")).toBeNull()
    expect(toFiniteNumberInRange("abc")).toBeNull()
  })

  test("refuses a decimal when a whole number is required", () => {
    expect(toFiniteNumberInRange("3", { integer: true })).toBe(3)
    expect(toFiniteNumberInRange("3,5", { integer: true })).toBeNull()
  })

  test("keeps the bounds inclusive", () => {
    expect(toFiniteNumberInRange("0", { min: 0, max: 100 })).toBe(0)
    expect(toFiniteNumberInRange("100", { min: 0, max: 100 })).toBe(100)
    expect(toFiniteNumberInRange("-1", { min: 0 })).toBeNull()
    expect(toFiniteNumberInRange("101", { max: 100 })).toBeNull()
  })
})
