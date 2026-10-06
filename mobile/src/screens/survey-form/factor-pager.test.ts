import type { FactorKey } from "../../app/types"
import { findNextIncompleteFactorIndex, letterIndexAt } from "./factor-pager"
import type { FactorProgress } from "./FactorsList"

const ORDER: FactorKey[] = ["A", "B", "C", "D"]

const progressOf = (completeFlags: boolean[]): Record<FactorKey, FactorProgress> =>
  ORDER.reduce(
    (acc, factor, index) => ({
      ...acc,
      [factor]: { complete: completeFlags[index], filled: 0, total: 1, invalid: 0 },
    }),
    {} as Record<FactorKey, FactorProgress>,
  )

describe("findNextIncompleteFactorIndex (FLOW-04 shortcut)", () => {
  test("finds the next incomplete factor after the current one", () => {
    const progress = progressOf([true, true, false, true])
    expect(findNextIncompleteFactorIndex(ORDER, progress, 0)).toBe(2)
  })

  test("wraps around past the end", () => {
    const progress = progressOf([false, true, true, true])
    expect(findNextIncompleteFactorIndex(ORDER, progress, 2)).toBe(0)
  })

  test("skips the current index on the first pass, returning it only if nothing else is incomplete", () => {
    const progress = progressOf([true, true, false, true])
    expect(findNextIncompleteFactorIndex(ORDER, progress, 2)).toBe(2)
  })

  test("returns null when every factor is complete", () => {
    const progress = progressOf([true, true, true, true])
    expect(findNextIncompleteFactorIndex(ORDER, progress, 0)).toBeNull()
  })
})

describe("letterIndexAt (OA-111)", () => {
  test("shares the strip evenly between the letters", () => {
    expect(letterIndexAt(0, 300, 10)).toBe(0)
    expect(letterIndexAt(29.9, 300, 10)).toBe(0)
    expect(letterIndexAt(30, 300, 10)).toBe(1)
    expect(letterIndexAt(165, 300, 10)).toBe(5)
    expect(letterIndexAt(299, 300, 10)).toBe(9)
  })

  test("a finger past either end keeps the first or the last letter", () => {
    expect(letterIndexAt(-40, 300, 10)).toBe(0)
    expect(letterIndexAt(900, 300, 10)).toBe(9)
  })

  test("is the first letter when the strip is not measured or the position is invalid", () => {
    expect(letterIndexAt(100, 0, 10)).toBe(0)
    expect(letterIndexAt(Number.NaN, 300, 10)).toBe(0)
    expect(letterIndexAt(100, 300, 0)).toBe(0)
  })
})
