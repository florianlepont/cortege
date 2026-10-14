/**
 * Tests for useUncappedEntry (phase 30, D-07, spec section 7 and U-O10): the detail inputs of the
 * relevé déplafonné. The arithmetic is the package's; the hook stores text and calls it.
 */

jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { useUncappedEntry } from "./useUncappedEntry"

afterEach(async () => {
  await cleanup()
})

const render = async () => (await renderHook(() => useUncappedEntry())).result

type Rendered = Awaited<ReturnType<typeof render>>
const stateOf = (result: Rendered) => ({
  strataCoverText: result.current.strataCoverText,
  dmhCounts: result.current.dmhCounts,
  fSurfaceText: result.current.fSurfaceText,
})

describe("useUncappedEntry", () => {
  test("starts empty", async () => {
    const result = await render()
    expect(stateOf(result)).toEqual({ strataCoverText: {}, dmhCounts: {}, fSurfaceText: "" })
    expect(result.current.uncappedPayload()).toEqual({})
  })

  describe("setStratumCover", () => {
    test("stores the text and returns the strata count that reach 20 %", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        result.current.setStratumCover("low", "19")
      })
      await act(async () => {
        derived = result.current.setStratumCover("high", "20")
      })
      expect(derived).toBe(1)
      expect(result.current.strataCoverText).toEqual({ low: "19", high: "20" })
    })

    test("two calls in one batch both count (the derivation reads the latest state)", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        result.current.setStratumCover("low", "30")
        derived = result.current.setStratumCover("high", "40")
      })
      expect(derived).toBe(2)
    })

    test("accepts the French decimal comma", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        derived = result.current.setStratumCover("low", "20,0")
      })
      expect(derived).toBe(1)
    })

    test("an empty or invalid text counts as absent and returns null when nothing is left", async () => {
      const result = await render()
      let derived: number | null = 99
      await act(async () => {
        derived = result.current.setStratumCover("low", "abc")
      })
      expect(derived).toBeNull()
      await act(async () => {
        derived = result.current.setStratumCover("low", "")
      })
      expect(derived).toBeNull()
      expect(result.current.strataCoverText).toEqual({})
    })

    test("an invalid text is kept as typed but never reaches the payload or the count", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        result.current.setStratumCover("low", "50")
        derived = result.current.setStratumCover("high", "150")
      })
      expect(result.current.strataCoverText.high).toBe("150")
      expect(derived).toBe(1)
      expect(result.current.uncappedPayload()).toEqual({ strata_cover: { low: 50 } })
    })

    test("clearing a stratum text removes it and recomputes the count", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        result.current.setStratumCover("low", "50")
        result.current.setStratumCover("high", "50")
        derived = result.current.setStratumCover("high", "")
      })
      expect(derived).toBe(1)
      expect(result.current.strataCoverText).toEqual({ low: "50" })
    })

    test("a cover of 0 is a valid entry that counts for nothing", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        derived = result.current.setStratumCover("low", "0")
      })
      expect(derived).toBe(0)
    })

    test("covers are rounded to one decimal before they count and before they are stored", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        derived = result.current.setStratumCover("low", "19,96")
      })
      expect(derived).toBe(1)
      expect(result.current.uncappedPayload()).toEqual({ strata_cover: { low: 20 } })
    })
  })

  describe("setDmhCount and setFSurface", () => {
    test("the density needs a valid surface", async () => {
      const result = await render()
      let derived: number | null = 99
      await act(async () => {
        derived = result.current.setDmhCount("dmh_01", 3)
      })
      expect(derived).toBeNull()
      await act(async () => {
        derived = result.current.setFSurface("2")
      })
      expect(derived).toBe(1.5)
    })

    test("each group is capped at 2 trees per hectare, then the groups add up", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        result.current.setFSurface("1")
        result.current.setDmhCount("dmh_01", 5)
        derived = result.current.setDmhCount("dmh_02", 1)
      })
      expect(derived).toBe(3)
    })

    test("a surface of 0 or an unreadable surface gives null", async () => {
      const result = await render()
      let derived: number | null = 99
      await act(async () => {
        result.current.setDmhCount("dmh_01", 1)
        derived = result.current.setFSurface("0")
      })
      expect(derived).toBeNull()
      await act(async () => {
        derived = result.current.setFSurface("x")
      })
      expect(derived).toBeNull()
    })

    test("a count of 0 is a valid entry", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        result.current.setFSurface("1")
        derived = result.current.setDmhCount("dmh_03", 0)
      })
      expect(derived).toBe(0)
      expect(result.current.uncappedPayload()).toEqual({
        dmh_counts: { dmh_03: 0 },
        f_surface_ha: 1,
      })
    })

    test("a negative or fractional count removes the entry", async () => {
      const result = await render()
      await act(async () => {
        result.current.setDmhCount("dmh_01", 2)
        result.current.setDmhCount("dmh_02", 2)
      })
      await act(async () => {
        result.current.setDmhCount("dmh_01", -1)
        result.current.setDmhCount("dmh_02", 1.5)
      })
      expect(result.current.dmhCounts).toEqual({})
    })

    test("with no count left the density is null", async () => {
      const result = await render()
      let derived: number | null = 99
      await act(async () => {
        derived = result.current.setFSurface("2")
      })
      expect(derived).toBeNull()
    })
  })

  describe("uncappedPayload", () => {
    test("gives only valid entries, in the package code order", async () => {
      const result = await render()
      await act(async () => {
        result.current.setStratumCover("herbaceous", "10")
        result.current.setStratumCover("very_low", "25,5")
        result.current.setDmhCount("dmh_10", 4)
        result.current.setDmhCount("dmh_02", 1)
        result.current.setFSurface("1,5")
      })
      const payload = result.current.uncappedPayload()
      expect(payload).toEqual({
        strata_cover: { very_low: 25.5, herbaceous: 10 },
        dmh_counts: { dmh_02: 1, dmh_10: 4 },
        f_surface_ha: 1.5,
      })
      expect(Object.keys(payload.strata_cover ?? {})).toEqual(["very_low", "herbaceous"])
      expect(Object.keys(payload.dmh_counts ?? {})).toEqual(["dmh_02", "dmh_10"])
    })

    test("omits empty objects and an invalid surface", async () => {
      const result = await render()
      await act(async () => {
        result.current.setStratumCover("low", "x")
        result.current.setFSurface("-3")
      })
      expect(result.current.uncappedPayload()).toEqual({})
    })
  })

  describe("loadUncapped and resetUncapped", () => {
    test("reads the stored keys through the package readers", async () => {
      const result = await render()
      await act(async () => {
        result.current.loadUncapped({
          B: { strata_count: 2, strata_cover: { low: 30, high: 45.5, bogus: 5, very_low: 120 } },
          F: { trees_per_ha: 2, dmh_counts: { dmh_01: 2, dmh_99: 1, dmh_02: -1 }, surface_ha: 1.5 },
        })
      })
      expect(stateOf(result)).toEqual({
        strataCoverText: { low: "30", high: "45.5" },
        dmhCounts: { dmh_01: 2 },
        fSurfaceText: "1.5",
      })
    })

    test("loading a draft without detail keys clears the previous ones", async () => {
      const result = await render()
      await act(async () => {
        result.current.setStratumCover("low", "30")
        result.current.setDmhCount("dmh_01", 1)
        result.current.setFSurface("1")
      })
      await act(async () => {
        result.current.loadUncapped({ B: { strata_count: 1 } })
      })
      expect(stateOf(result)).toEqual({ strataCoverText: {}, dmhCounts: {}, fSurfaceText: "" })
      await act(async () => {
        result.current.loadUncapped(undefined)
      })
      expect(result.current.fSurfaceText).toBe("")
    })

    test("an unusable stored surface is not loaded", async () => {
      const result = await render()
      await act(async () => {
        result.current.loadUncapped({ F: { trees_per_ha: 1, surface_ha: 0 } })
      })
      expect(result.current.fSurfaceText).toBe("")
    })

    test("the derivation after a load reads the loaded state", async () => {
      const result = await render()
      let derived: number | null = null
      await act(async () => {
        result.current.loadUncapped({
          B: { strata_count: 1, strata_cover: { low: 30 } },
        })
      })
      await act(async () => {
        derived = result.current.setStratumCover("high", "20")
      })
      expect(derived).toBe(2)
    })

    test("resetUncapped clears all three", async () => {
      const result = await render()
      await act(async () => {
        result.current.setStratumCover("low", "30")
        result.current.setDmhCount("dmh_01", 1)
        result.current.setFSurface("1")
      })
      await act(async () => {
        result.current.resetUncapped()
      })
      expect(stateOf(result)).toEqual({ strataCoverText: {}, dmhCounts: {}, fSurfaceText: "" })
      expect(result.current.uncappedPayload()).toEqual({})
    })
  })

  test("the callbacks keep their identity across renders", async () => {
    const result = await render()
    const first = result.current
    await act(async () => {
      result.current.setFSurface("2")
    })
    expect(result.current.setFSurface).toBe(first.setFSurface)
    expect(result.current.setDmhCount).toBe(first.setDmhCount)
    expect(result.current.setStratumCover).toBe(first.setStratumCover)
    expect(result.current.loadUncapped).toBe(first.loadUncapped)
    expect(result.current.resetUncapped).toBe(first.resetUncapped)
  })
})
