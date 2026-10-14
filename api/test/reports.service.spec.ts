import { ForbiddenException, NotFoundException } from "@nestjs/common"
import { DatabaseService } from "../src/database/database.service"
import { ReportsService } from "../src/reports/reports.service"
import { SurveyEventsService } from "../src/surveys/survey-events.service"
import { PUBLIC_SURVEY_PREDICATE } from "../src/surveys/public-map.queries"
import type { AuthenticatedUser } from "../src/auth/auth.types"

type SurveyRow = {
  id: string
  user_id: string | null
  deleted_at: string | null
  shared: boolean
}

function user(role: string, id = "reporter-1"): AuthenticatedUser {
  return { id, role } as unknown as AuthenticatedUser
}

function buildService(survey: SurveyRow | null) {
  const insert = jest.fn().mockResolvedValue({ rows: [{ id: "r-1", status: "open" }] })
  const query = jest.fn().mockResolvedValue({ rows: survey ? [survey] : [] })
  const db = {
    query,
    transaction: jest.fn(async (fn: (tx: { query: jest.Mock }) => unknown) =>
      fn({ query: insert }),
    ),
  }
  const events = { insert: jest.fn().mockResolvedValue(undefined) }
  const service = new ReportsService(
    db as unknown as DatabaseService,
    events as unknown as SurveyEventsService,
  )
  return { service, query, events }
}

const body = { survey_id: "s-1", reason: "Suspicious values" }
const live = (overrides: Partial<SurveyRow> = {}): SurveyRow => ({
  id: "s-1",
  user_id: "author-1",
  deleted_at: null,
  shared: true,
  ...overrides,
})

describe("ReportsService.createReport (Phase 29, D-12)", () => {
  it("answers 404 for an unknown id", async () => {
    const { service } = buildService(null)
    await expect(service.createReport(user("member"), body)).rejects.toEqual(
      new NotFoundException("Survey not found"),
    )
  })

  it("answers 404 for a deleted survey", async () => {
    const { service } = buildService(live({ deleted_at: "2026-10-01 00:00:00+00" }))
    await expect(service.createReport(user("member"), body)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it("lets a moderator or admin report any live survey, hidden or not", async () => {
    for (const role of ["moderator", "admin"]) {
      const { service, events } = buildService(live({ shared: false }))
      await expect(service.createReport(user(role), body)).resolves.toEqual({
        id: "r-1",
        status: "open",
      })
      expect(events.insert).toHaveBeenCalledTimes(1)
    }
  })

  it("keeps the 403 for the author on their own survey", async () => {
    const { service } = buildService(live({ user_id: "reporter-1" }))
    await expect(service.createReport(user("member"), body)).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it("lets another member report a shared, submitted survey", async () => {
    const { service } = buildService(live())
    await expect(service.createReport(user("member"), body)).resolves.toEqual({
      id: "r-1",
      status: "open",
    })
  })

  it("answers the same 404 as an unknown id for a private survey or a draft of another member", async () => {
    const { service } = buildService(live({ shared: false }))
    const hidden = await service.createReport(user("member"), body).catch((error) => error)
    const unknown = await buildService(null)
      .service.createReport(user("member"), body)
      .catch((error) => error)
    expect(hidden).toBeInstanceOf(NotFoundException)
    expect(hidden.message).toBe("Survey not found")
    expect(hidden.getResponse()).toEqual(unknown.getResponse())
  })

  it("decides reportability with the shared predicate and no hand-written visibility rule", async () => {
    const { service, query } = buildService(live())
    await service.createReport(user("member"), body)
    const sql = query.mock.calls[0][0] as string
    expect(sql).toContain(`(${PUBLIC_SURVEY_PREDICATE}) AS shared`)
    expect(sql).toContain("FROM surveys s")
    expect(sql).not.toContain("SELECT id, user_id, visibility")
    expect(sql.replace(PUBLIC_SURVEY_PREDICATE, "")).not.toContain("visibility")
  })
})
