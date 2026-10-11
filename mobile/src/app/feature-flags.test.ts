import { isGenusTimingEnabled, isOfflineMapsEnabled } from "./feature-flags"

describe("isOfflineMapsEnabled", () => {
  test("is on unless the build sets the variable to false", () => {
    expect(isOfflineMapsEnabled(undefined)).toBe(true)
    expect(isOfflineMapsEnabled("true")).toBe(true)
    expect(isOfflineMapsEnabled("")).toBe(true)
    expect(isOfflineMapsEnabled("false")).toBe(false)
  })
})

describe("isGenusTimingEnabled", () => {
  test("is on only when the build sets the variable to true", () => {
    expect(isGenusTimingEnabled("true")).toBe(true)
    expect(isGenusTimingEnabled(undefined)).toBe(false)
    expect(isGenusTimingEnabled("false")).toBe(false)
    expect(isGenusTimingEnabled("1")).toBe(false)
  })
})
