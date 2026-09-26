import {
  FACTOR_KEYS,
  IBP_MIGRATION_CASES,
  IBP_PARITY_CASES,
  IBP_READINESS_CASES,
  type FactorKey,
} from "@cortege/ibp-domain"
import {
  computeIbpTotalsFromRetainedScores,
  computeRetainedScoresFromRawFactors,
  evaluateSubmitReadinessFromDraft,
  migrateDraftToV32,
} from "./ibp-scoring"

// The shared parity fixture (01.8 D-07) run through the mobile adapter: the phone's preview scores,
// totals, readiness and draft migration equal the package's, hence the server's (01.8-06 runs the
// same data through the API adapter).

const PARCEL = ["75056000AB0001"]

describe("IBP_PARITY_CASES through the mobile adapter", () => {
  it.each(IBP_PARITY_CASES.map((c) => [c.id, c] as const))("%s", (_id, parityCase) => {
    const retained = computeRetainedScoresFromRawFactors(parityCase.factors, {
      ...parityCase.context,
      ibp_method_version: parityCase.method,
    })

    for (const [key, expected] of Object.entries(parityCase.expect.scores)) {
      const score = retained[key as FactorKey]?.score ?? null
      expect({ key, score }).toEqual({ key, score: expected })
    }
    if (parityCase.expect.totals) {
      const { completed_factors: _completed, ...totals } =
        computeIbpTotalsFromRetainedScores(retained)
      expect(totals).toEqual(parityCase.expect.totals)
    }
  })

  it("covers every factor key of the package", () => {
    const scored = new Set(IBP_PARITY_CASES.flatMap((c) => Object.keys(c.expect.scores)))
    expect([...scored].sort()).toEqual([...FACTOR_KEYS])
  })
})

describe("IBP_READINESS_CASES through the mobile adapter", () => {
  it.each(IBP_READINESS_CASES.map((c) => [c.id, c] as const))(
    "%s (parcels selected)",
    (_id, readinessCase) => {
      const readiness = evaluateSubmitReadinessFromDraft(
        { ...readinessCase.draft, parcel_ids: PARCEL },
        new Date(readinessCase.now),
      )
      expect(readiness).toEqual(readinessCase.expect)
    },
  )

  it.each(IBP_READINESS_CASES.map((c) => [c.id, c] as const))(
    "%s (no parcel) adds parcel_ids",
    (_id, readinessCase) => {
      const readiness = evaluateSubmitReadinessFromDraft(
        { ...readinessCase.draft, parcel_ids: [] },
        new Date(readinessCase.now),
      )
      expect(readiness).toEqual({
        ...readinessCase.expect,
        ready: false,
        missing_fields: [...readinessCase.expect.missing_fields, "parcel_ids"],
      })
    },
  )
})

describe("IBP_MIGRATION_CASES through the mobile adapter", () => {
  it.each(IBP_MIGRATION_CASES.map((c) => [c.id, c] as const))("%s", (_id, migrationCase) => {
    expect(migrateDraftToV32(migrationCase.draft)).toEqual(migrationCase.expect)
  })
})
