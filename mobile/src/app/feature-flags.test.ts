import {
  isGenusTimingEnabled,
  isOfflineMapsEnabled,
  isSwipeSpikeEnabled,
  swipeSpikeLeftView,
} from "./feature-flags"

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

describe("isSwipeSpikeEnabled", () => {
  test("is on only when the build sets the variable to true", () => {
    expect(isSwipeSpikeEnabled("true")).toBe(true)
    expect(isSwipeSpikeEnabled(undefined)).toBe(false)
    expect(isSwipeSpikeEnabled("false")).toBe(false)
    expect(isSwipeSpikeEnabled("1")).toBe(false)
  })
})

describe("swipeSpikeLeftView", () => {
  test("is texture only when the build asks for it, surface otherwise", () => {
    expect(swipeSpikeLeftView("texture")).toBe("texture")
    expect(swipeSpikeLeftView(undefined)).toBe("surface")
    expect(swipeSpikeLeftView("surface")).toBe("surface")
    expect(swipeSpikeLeftView("Texture")).toBe("surface")
  })
})
