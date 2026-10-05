import { isOfflineMapsEnabled } from "./feature-flags"

describe("isOfflineMapsEnabled", () => {
  test("is on only for the exact value true", () => {
    expect(isOfflineMapsEnabled("true")).toBe(true)
    expect(isOfflineMapsEnabled("1")).toBe(false)
    expect(isOfflineMapsEnabled("false")).toBe(false)
    expect(isOfflineMapsEnabled(undefined)).toBe(false)
  })
})
