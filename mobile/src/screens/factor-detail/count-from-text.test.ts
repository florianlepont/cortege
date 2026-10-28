import { countFromText } from "./count-from-text"

describe("countFromText", () => {
  test("reads a whole number", () => {
    expect(countFromText("3")).toBe(3)
  })

  test("rounds a decimal and accepts the comma", () => {
    expect(countFromText("2,6")).toBe(3)
    expect(countFromText("2.4")).toBe(2)
  })

  test("clamps a negative entry to 0", () => {
    expect(countFromText("-4")).toBe(0)
  })

  test("gives NaN for an empty or non numeric entry, so the form drops the count", () => {
    expect(countFromText("")).toBeNaN()
    expect(countFromText("abc")).toBeNaN()
  })
})
