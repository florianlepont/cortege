import type { FactorKey } from "../../app/types"
import { findNextIncompleteFactorIndex } from "./factor-pager"
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
