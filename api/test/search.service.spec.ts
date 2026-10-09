import { Logger } from "@nestjs/common"
import { DatabaseService } from "../src/database/database.service"
import { SearchService } from "../src/surveys/search.service"

type QueryResult = { rows: unknown[] }

const V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"

function flat(sql: string): string {
  return sql.replace(/\s+/g, " ").trim()
}

/** Answers by the shape of the SQL: the members query groups by display name. */
function buildDb(answers: { surveys?: QueryResult; members?: QueryResult } = {}) {
  const query = jest.fn(async (text: string, _values?: unknown[]): Promise<QueryResult> => {
    return flat(text).includes("GROUP BY u.display_name")
      ? (answers.members ?? { rows: [] })
      : (answers.surveys ?? { rows: [] })
  })
  return { query }
}

function buildService(db: { query: jest.Mock }) {
  return new SearchService(db as unknown as DatabaseService)
}

const surveyRow = (overrides: Record<string, unknown> = {}) => ({
  id: "s-1",
  site_name: "Bois de Marie",
  ibp_method_version: V3_2,
  scores: { ibp_total: 34 },
  submitted_at: "2026-09-28 09:41:00+00",
  author_name: "Marie Dupont",
  ...overrides,
})

describe("SearchService.community", () => {
  it("runs the surveys and members queries with the trimmed text and the default limits", async () => {
    const db = buildDb({
      surveys: { rows: [surveyRow(), surveyRow({ id: "s-2", author_name: null, scores: {} })] },
      members: { rows: [{ author_name: "Marie Dupont", survey_count: 3 }] },
    })
    const result = await buildService(db).community({ q: " Marie ", limit: undefined }, "u1")

    expect(db.query).toHaveBeenCalledTimes(2)
    const byKind = (needle: string) =>
      db.query.mock.calls.find((call) => flat(call[0] as string).includes(needle))
    expect(byKind("ORDER BY s.submitted_at DESC")?.[1]).toEqual(["%Marie%", "u1", 30])
    expect(byKind("GROUP BY u.display_name")?.[1]).toEqual(["%Marie%", "u1", 5])
    expect(result.members).toEqual([{ author_name: "Marie Dupont", survey_count: 3 }])
    expect(result.surveys).toEqual([
      {
        survey_id: "s-1",
        site_name: "Bois de Marie",
        author_name: "Marie Dupont",
        submitted_at: "2026-09-28 09:41:00+00",
        ibp_total: 34,
        ibp_method_version: V3_2,
      },
      {
        survey_id: "s-2",
        site_name: "Bois de Marie",
        author_name: null,
        submitted_at: "2026-09-28 09:41:00+00",
        ibp_total: 0,
        ibp_method_version: V3_2,
      },
    ])
  })

  it("clamps the limit of the surveys to 1..50 and keeps the members at 5", async () => {
    const db = buildDb()
    const service = buildService(db)
    await service.community({ q: "ma", limit: 500 }, "u1")
    await service.community({ q: "ma", limit: 0 }, "u1")
    const surveyLimits = db.query.mock.calls
      .filter((call) => !flat(call[0] as string).includes("GROUP BY"))
      .map((call) => call[1]?.[2])
    const memberLimits = db.query.mock.calls
      .filter((call) => flat(call[0] as string).includes("GROUP BY"))
      .map((call) => call[1]?.[2])
    expect(surveyLimits).toEqual([50, 1])
    expect(memberLimits).toEqual([5, 5])
  })

  it("runs only the surveys query for an author and answers no members", async () => {
    const db = buildDb({
      surveys: { rows: [surveyRow()] },
      members: { rows: [{ author_name: "Marie Dupont", survey_count: 3 }] },
    })
    const result = await buildService(db).community(
      { q: "", author: " Marie Dupont ", limit: 10 },
      "u1",
    )
    expect(db.query).toHaveBeenCalledTimes(1)
    expect(db.query.mock.calls[0][1]).toEqual(["Marie Dupont", "u1", 10])
    expect(result.members).toEqual([])
    expect(result.surveys).toHaveLength(1)
  })

  it("treats a blank author as no author", async () => {
    const db = buildDb()
    await buildService(db).community({ q: "marie", author: "   " }, "u1")
    expect(db.query).toHaveBeenCalledTimes(2)
  })

  it("drops member rows with a blank or missing name and turns the count into a number", async () => {
    const db = buildDb({
      members: {
        rows: [
          { author_name: "  ", survey_count: 2 },
          { author_name: null, survey_count: 1 },
          { author_name: " Marc ", survey_count: "4" },
        ],
      },
    })
    const result = await buildService(db).community({ q: "ma" }, "u1")
    expect(result.members).toEqual([{ author_name: "Marc", survey_count: 4 }])
  })

  it("answers nothing without a database call for a text shorter than 2 characters", async () => {
    const db = buildDb()
    const service = buildService(db)
    expect(await service.community({ q: " a " }, "u1")).toEqual({ members: [], surveys: [] })
    expect(await service.community({ q: "   " }, "u1")).toEqual({ members: [], surveys: [] })
    expect(db.query).not.toHaveBeenCalled()
  })

  it("propagates a database error", async () => {
    const db = { query: jest.fn().mockRejectedValue(new Error("db down")) }
    await expect(buildService(db).community({ q: "marie" }, "u1")).rejects.toThrow("db down")
  })

  it("never logs the search text", async () => {
    const spies = (["log", "warn", "error", "debug", "verbose"] as const).map((method) =>
      jest.spyOn(Logger.prototype, method).mockImplementation(() => undefined),
    )
    const consoleSpies = (["log", "warn", "error"] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    )
    try {
      await buildService(buildDb()).community({ q: "Marie" }, "u1")
      await buildService({ query: jest.fn().mockRejectedValue(new Error("x")) })
        .community({ q: "Marie" }, "u1")
        .catch(() => undefined)
      for (const spy of [...spies, ...consoleSpies]) {
        expect(JSON.stringify(spy.mock.calls)).not.toContain("Marie")
      }
    } finally {
      for (const spy of [...spies, ...consoleSpies]) {
        spy.mockRestore()
      }
    }
  })
})
