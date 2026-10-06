import { IBP_PARITY_CASES, type IbpParityCase } from "@cortege/ibp-domain"
import { IbpRulesService } from "../src/surveys/ibp-rules.service"

// The shared parity fixture (01.8 D-07) run through the API adapter: the API gets exactly the
// package's results, which proves it delegates every IBP rule to @cortege/ibp-domain.
describe("IBP_PARITY_CASES through IbpRulesService", () => {
  const service = new IbpRulesService()
  const uniqueSorted = (values: readonly string[]) => [...new Set(values)].sort()

  function run(parityCase: IbpParityCase) {
    const input = {
      ...parityCase.context,
      ibp_method_version: parityCase.method,
      factors: parityCase.factors,
    }
    return parityCase.mode === "submit"
      ? service.validateSubmit(input)
      : service.validateDraft(input)
  }

  it.each(IBP_PARITY_CASES.map((c) => [c.id, c] as const))("%s", (_id, parityCase) => {
    const result = run(parityCase)

    expect(result.ok).toBe(parityCase.expect.ok)
    for (const [key, expected] of Object.entries(parityCase.expect.scores)) {
      expect({ key, score: result.factor_scores?.[key] ?? null }).toEqual({ key, score: expected })
    }
    if (parityCase.expect.totals) {
      expect(result.scores).toEqual(parityCase.expect.totals)
    }
    expect(uniqueSorted(result.issues.map((i) => i.code))).toEqual(
      uniqueSorted(parityCase.expect.issueCodes),
    )
  })

  it("resolves DRIFT-1: MAT-F-02 yields factor_f_group_capped through the adapter", () => {
    const cases = IBP_PARITY_CASES.filter((c) => c.matrixId.startsWith("MAT-F-02"))
    expect(cases.length).toBeGreaterThan(0)
    for (const parityCase of cases) {
      const result = run(parityCase)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "factor_f_group_capped", blocking: false, factor: "F" }),
      )
    }
  })
})
