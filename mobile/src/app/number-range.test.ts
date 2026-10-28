import { toFiniteNumberInRange } from "./number-range"

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
