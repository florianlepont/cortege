/**
 * Tests for useFactorAnnotations (phase 27, D-12): the doubt flag and the note of each factor.
 * The hook keeps the note as typed; the canonical form is applied by useSurveyForm at payload time.
 */

jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { useFactorAnnotations } from "./useFactorAnnotations"

afterEach(async () => {
  await cleanup()
})

describe("useFactorAnnotations", () => {
  test("starts empty", async () => {
    const { result } = await renderHook(() => useFactorAnnotations())
    expect(result.current.annotations).toEqual({})
  })

  test("setFactorDoubt records the doubt of a factor", async () => {
    const { result } = await renderHook(() => useFactorAnnotations())
    await act(async () => {
      result.current.setFactorDoubt("A", true)
    })
    expect(result.current.annotations.A).toEqual({ doubt: true, note: "" })
  })

  test("setFactorNote keeps the note as typed", async () => {
    const { result } = await renderHook(() => useFactorAnnotations())
    await act(async () => {
      result.current.setFactorNote("F", "zone dense ")
    })
    expect(result.current.annotations.F).toEqual({ doubt: false, note: "zone dense " })
  })

  test("a doubt and a note of one factor live together", async () => {
    const { result } = await renderHook(() => useFactorAnnotations())
    await act(async () => {
      result.current.setFactorDoubt("C", true)
    })
    await act(async () => {
      result.current.setFactorNote("C", "souches")
    })
    expect(result.current.annotations.C).toEqual({ doubt: true, note: "souches" })
  })

  test("an entry left with no doubt and no note is removed", async () => {
    const { result } = await renderHook(() => useFactorAnnotations())
    await act(async () => {
      result.current.setFactorDoubt("B", true)
    })
    await act(async () => {
      result.current.setFactorDoubt("B", false)
    })
    expect(result.current.annotations).toEqual({})
  })

  test("loadAnnotations replaces the state with the stored container", async () => {
    const { result } = await renderHook(() => useFactorAnnotations())
    await act(async () => {
      result.current.setFactorDoubt("J", true)
    })
    await act(async () => {
      result.current.loadAnnotations({ A: { doubt: true, note: "x" }, D: { note: "y" } })
    })
    expect(result.current.annotations).toEqual({
      A: { doubt: true, note: "x" },
      D: { doubt: false, note: "y" },
    })
  })

  test("resetAnnotations empties the state", async () => {
    const { result } = await renderHook(() => useFactorAnnotations())
    await act(async () => {
      result.current.setFactorNote("G", "fleurs")
    })
    await act(async () => {
      result.current.resetAnnotations()
    })
    expect(result.current.annotations).toEqual({})
  })

  test("the setters are referentially stable", async () => {
    const { result } = await renderHook(() => useFactorAnnotations())
    const first = result.current
    await act(async () => {
      result.current.setFactorDoubt("E", true)
    })
    expect(result.current.setFactorDoubt).toBe(first.setFactorDoubt)
    expect(result.current.setFactorNote).toBe(first.setFactorNote)
    expect(result.current.loadAnnotations).toBe(first.loadAnnotations)
    expect(result.current.resetAnnotations).toBe(first.resetAnnotations)
  })
})
