import { formatDecimalComma, formatHectares, toFieldText } from "./decimal-text"

describe("toFieldText", () => {
  test("writes whole numbers plain and decimals with a comma", () => {
    expect(toFieldText(3)).toBe("3")
    expect(toFieldText(1.5)).toBe("1,5")
    expect(toFieldText(0)).toBe("0")
  })

  test("a float drift is not written", () => {
    expect(toFieldText(0.1 + 0.2)).toBe("0,3")
    expect(toFieldText(1.1 + 2.2)).toBe("3,3")
  })
})

describe("formatDecimalComma", () => {
  test("draws a count or a percent with up to two decimals", () => {
    expect(formatDecimalComma(70)).toBe("70")
    expect(formatDecimalComma(12.5)).toBe("12,5")
    expect(formatDecimalComma(0.256)).toBe("0,26")
  })
})

describe("formatHectares", () => {
  test("always shows a decimal", () => {
    expect(formatHectares(2)).toBe("2,0")
    expect(formatHectares(0)).toBe("0,0")
    expect(formatHectares(1.2)).toBe("1,2")
    expect(formatHectares(0.25)).toBe("0,25")
    expect(formatHectares(100000)).toBe("100000,0")
  })
})
