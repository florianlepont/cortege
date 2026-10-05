import { isOfflineMapsEnabled } from "./feature-flags"

describe("isOfflineMapsEnabled", () => {
  test("is on unless the build sets the variable to false", () => {
    expect(isOfflineMapsEnabled(undefined)).toBe(true)
    expect(isOfflineMapsEnabled("true")).toBe(true)
    expect(isOfflineMapsEnabled("")).toBe(true)
    expect(isOfflineMapsEnabled("false")).toBe(false)
  })
})
