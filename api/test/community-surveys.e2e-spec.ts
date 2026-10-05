import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import {
  createE2eApp,
  getNextVersionNumber,
  loginTestUser,
  resolveParcel,
  uniqueCoordSeed,
  uniqueId,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// /v1/public/community-surveys: the community search of Mes Relevés. Every member sees every
// submitted survey (association-only sharing), with its site name and its author's name.

type CommunityItem = {
  survey_id: string
  site_name: string
  author_name: string | null
  submitted_at: string
  ibp_total: number
}

describe("Community surveys (e2e)", () => {
  let app: INestApplication
  let db: DatabaseService

  beforeAll(async () => {
    const context = await createE2eApp()
    app = context.app
    db = context.db
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  async function createSurvey(token: string, id: string, siteName: string, submit: boolean) {
    const seed = uniqueCoordSeed()
    const lat = 47.2 + seed / 100000
    const lng = 1.2 + seed / 100000
    const parcelId = await resolveParcel(app, token, lat, lng)
    const versionNumber = await getNextVersionNumber(db, parcelId)
    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id,
        sync_version: 1,
        site_name: siteName,
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat, lng },
      })
      .expect(201)
    if (submit) {
      await request(app.getHttpServer())
        .post(`/v1/surveys/${id}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
    }
  }

  it("requires authentication", async () => {
    await request(app.getHttpServer()).get("/v1/public/community-surveys").expect(401)
  })

  it("lists the finished surveys of other members with their author, never a draft", async () => {
    const authorToken = await loginTestUser(app, "e2e-community-author")
    const readerToken = await loginTestUser(app, "e2e-community-reader")
    const tag = uniqueId("zq")
    const finishedId = uniqueId("e2e-community-done")
    const draftId = uniqueId("e2e-community-draft")
    await createSurvey(authorToken, finishedId, `Forêt ${tag} terminée`, true)
    await createSurvey(authorToken, draftId, `Forêt ${tag} brouillon`, false)

    const response = await request(app.getHttpServer())
      .get("/v1/public/community-surveys")
      .set("Authorization", `Bearer ${readerToken}`)
      .query({ q: tag })
      .expect(200)

    const items = response.body.items as CommunityItem[]
    expect(items.map((item) => item.survey_id)).toEqual([finishedId])
    expect(items[0].site_name).toBe(`Forêt ${tag} terminée`)
    expect(typeof items[0].author_name).toBe("string")
    expect(typeof items[0].ibp_total).toBe("number")
    expect(Number.isNaN(Date.parse(items[0].submitted_at))).toBe(false)
  })

  it("matches the site name or the author's name, without case or wildcard surprises", async () => {
    const token = await loginTestUser(app, "e2e-community-search")
    const tag = uniqueId("pc")
    const id = uniqueId("e2e-community-pct")
    await createSurvey(token, id, `Bois ${tag}%_ ouest`, true)

    const byName = await request(app.getHttpServer())
      .get("/v1/public/community-surveys")
      .set("Authorization", `Bearer ${token}`)
      .query({ q: `BOIS ${tag}%_` })
      .expect(200)
    expect((byName.body.items as CommunityItem[]).map((item) => item.survey_id)).toEqual([id])

    // A bare "%" is a literal percent sign, not "match everything".
    const percentOnly = await request(app.getHttpServer())
      .get("/v1/public/community-surveys")
      .set("Authorization", `Bearer ${token}`)
      .query({ q: `${tag}_x` })
      .expect(200)
    expect(percentOnly.body.items).toEqual([])

    const author = (byName.body.items as CommunityItem[])[0].author_name as string
    const byAuthor = await request(app.getHttpServer())
      .get("/v1/public/community-surveys")
      .set("Authorization", `Bearer ${token}`)
      .query({ q: author.toUpperCase(), limit: 50 })
      .expect(200)
    expect((byAuthor.body.items as CommunityItem[]).some((item) => item.survey_id === id)).toBe(
      true,
    )
  })

  it("caps the answer to the requested limit, and never above 50", async () => {
    const token = await loginTestUser(app, "e2e-community-limit")
    const limited = await request(app.getHttpServer())
      .get("/v1/public/community-surveys")
      .set("Authorization", `Bearer ${token}`)
      .query({ limit: 1 })
      .expect(200)
    expect((limited.body.items as CommunityItem[]).length).toBeLessThanOrEqual(1)

    const clamped = await request(app.getHttpServer())
      .get("/v1/public/community-surveys")
      .set("Authorization", `Bearer ${token}`)
      .query({ limit: 500 })
      .expect(200)
    expect((clamped.body.items as CommunityItem[]).length).toBeLessThanOrEqual(50)
  })
})
