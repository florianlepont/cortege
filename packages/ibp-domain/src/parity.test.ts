import { evaluateIbp } from "./evaluate"
import { FACTOR_KEYS } from "./factors"
import { migrateDraftToV32 } from "./migrate"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2, resolveMethodVersion } from "./method-version"
import {
  IBP_MIGRATION_CASES,
  IBP_PARITY_CASES,
  IBP_READINESS_CASES,
  type IbpParityCase,
} from "./parity/cases"
import { evaluateSubmitReadiness } from "./readiness"
import { isRecord } from "./input"

// The parity fixture (D-07) run against the package itself. The API and mobile suites run the same
// data through their adapters (01.8-06, 01.8-07).

const uniqueSorted = (values: readonly string[]) => [...new Set(values)].sort()

describe("IBP_PARITY_CASES (matrix v2)", () => {
  it.each(IBP_PARITY_CASES.map((c) => [c.id, c] as const))("%s", (_id, parityCase) => {
    const result = evaluateIbp(
      {
        ...parityCase.context,
        ibp_method_version: parityCase.method,
        factors: parityCase.factors,
        expires_at: parityCase.expires_at,
      },
      parityCase.mode,
      parityCase.now ? new Date(parityCase.now) : undefined,
    )

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

  it("has unique ids, each tied to a matrix case id", () => {
    const ids = IBP_PARITY_CASES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of IBP_PARITY_CASES) {
      expect(c.id === c.matrixId || c.id.startsWith(`${c.matrixId}#`)).toBe(true)
      expect(c.matrixId).toMatch(/^MAT-[A-Z]+-\d{2}(@v3\.0|@v3\.2|@both)?$/)
    }
  })

  it("scores every factor from an object input under each version", () => {
    const covered = (version: string) =>
      new Set(
        IBP_PARITY_CASES.filter((c) => resolveMethodVersion(c.method) === version).flatMap((c) =>
          Object.entries(c.expect.scores)
            .filter(([key, score]) => score !== null && isRecord(c.factors[key]))
            .map(([key]) => key),
        ),
      )
    expect([...covered(IBP_METHOD_V3_0)].sort()).toEqual([...FACTOR_KEYS])
    expect([...covered(IBP_METHOD_V3_2)].sort()).toEqual([...FACTOR_KEYS])
  })

  it("includes the dispatch cases MAT-VER-01 (untagged, v3.0 tag, v3.2 tag) and MAT-VER-02", () => {
    const ver01 = IBP_PARITY_CASES.filter((c) => c.matrixId === "MAT-VER-01")
    expect(ver01.map((c) => c.method).sort()).toEqual(
      [null, IBP_METHOD_V3_0, IBP_METHOD_V3_2].sort(),
    )
    expect(IBP_PARITY_CASES.some((c) => c.matrixId === "MAT-VER-02")).toBe(true)
  })

  it("runs every both-version case under both versions", () => {
    const both = IBP_PARITY_CASES.filter((c) => c.matrixId.endsWith("@both"))
    const byMatrixId = new Map<string, Set<string | null>>()
    for (const c of both) {
      const versions = byMatrixId.get(c.matrixId) ?? new Set()
      versions.add(resolveMethodVersion(c.method))
      byMatrixId.set(c.matrixId, versions)
    }
    expect(byMatrixId.size).toBeGreaterThan(0)
    for (const versions of byMatrixId.values()) {
      expect([...versions].sort()).toEqual([IBP_METHOD_V3_0, IBP_METHOD_V3_2])
    }
  })

  it("tags each @v3.0 / @v3.2 case with its version", () => {
    const check = (c: IbpParityCase, suffix: string, version: string) =>
      !c.matrixId.endsWith(suffix) || resolveMethodVersion(c.method) === version
    for (const c of IBP_PARITY_CASES) {
      expect(check(c, "@v3.0", IBP_METHOD_V3_0) && check(c, "@v3.2", IBP_METHOD_V3_2)).toBe(true)
    }
  })
})

describe("IBP_READINESS_CASES", () => {
  it.each(IBP_READINESS_CASES.map((c) => [c.id, c] as const))("%s", (_id, readinessCase) => {
    expect(evaluateSubmitReadiness(readinessCase.draft, new Date(readinessCase.now))).toEqual(
      readinessCase.expect,
    )
  })
})

describe("IBP_MIGRATION_CASES", () => {
  it.each(IBP_MIGRATION_CASES.map((c) => [c.id, c] as const))("%s", (_id, migrationCase) => {
    const before = JSON.stringify(migrationCase.draft)
    expect(migrateDraftToV32(migrationCase.draft)).toEqual(migrationCase.expect)
    expect(JSON.stringify(migrationCase.draft)).toBe(before)
  })
})
