import { CONTEXT_FACTOR_KEYS, FACTOR_KEYS, STAND_FACTOR_KEYS, toFactorClass } from "./factors"

describe("factor keys", () => {
  it("lists the ten IBP factors A to J in order", () => {
    expect(FACTOR_KEYS).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"])
  })

  it("splits the factors into the stand (A-G) and context (H-J) groups", () => {
    expect(STAND_FACTOR_KEYS).toEqual(["A", "B", "C", "D", "E", "F", "G"])
    expect(STAND_FACTOR_KEYS).toHaveLength(7)
    expect(CONTEXT_FACTOR_KEYS).toEqual(["H", "I", "J"])
    expect(CONTEXT_FACTOR_KEYS).toHaveLength(3)
    expect([...STAND_FACTOR_KEYS, ...CONTEXT_FACTOR_KEYS]).toEqual([...FACTOR_KEYS])
  })
})

describe("toFactorClass", () => {
  it.each([
    [0, "S0"],
    [1, "S1"],
    [2, "S2"],
    [5, "S5"],
  ] as const)("maps score %d to class %s", (score, expected) => {
    expect(toFactorClass(score)).toBe(expected)
  })
})
