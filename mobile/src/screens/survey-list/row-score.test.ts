import type { SurveyDetailResponse } from "../../app/types"
import { resolveRowScore } from "./row-score"

const detail = (total: number) =>
  ({ scores: { ibp_total: total } }) as unknown as SurveyDetailResponse

describe("resolveRowScore (12.2-14)", () => {
  test("reads the total the local list took from the stored payload, with no detail loaded", () => {
    expect(resolveRowScore({ id: "a", ibp_total: 37 }, {})).toBe(37)
  })

  test("keeps a total of 0", () => {
    expect(resolveRowScore({ id: "a", ibp_total: 0 }, {})).toBe(0)
  })

  test("prefers the canonical detail of this session over the stored payload", () => {
    expect(resolveRowScore({ id: "a", ibp_total: 37 }, { a: detail(41) })).toBe(41)
  })

  test("falls back to the stored total for a detail without scores", () => {
    expect(
      resolveRowScore({ id: "a", ibp_total: 37 }, { a: {} as unknown as SurveyDetailResponse }),
    ).toBe(37)
  })

  test("is null without a detail and without a stored total (a plain submitted ring)", () => {
    expect(resolveRowScore({ id: "a", ibp_total: null }, {})).toBeNull()
    expect(resolveRowScore({ id: "a" }, { b: detail(10) })).toBeNull()
  })
})
