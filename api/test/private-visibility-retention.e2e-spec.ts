import "dotenv/config"
import { randomUUID } from "crypto"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test, TestingModule } from "@nestjs/testing"
import request = require("supertest")
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"
import { DatabaseService } from "../src/database/database.service"
import {
  getNextVersionNumber,
  loginTestUser,
  uniqueCoordSeed,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// Phase 29, D-11 and D-13.
//
// D-11: a private survey is invisible to other members, yet the next version number of its parcel
// still counts it (the accepted number leak): another member's draft on that parcel defaults to
// the following version, and a draft forced to the taken version is refused at submit with
// parcel_version_conflict and the expected number. The other member still sees nothing of the
// private survey on the map, the parcel statuses or the history.
//
// D-13: after the author deletes the account, a retained private survey (author nulled) stays
// hidden from everyone, and a retained shared one stays visible with author_name null.
//
// The app runs with the production bootstrap (configureApp: /v1 prefix, validation pipe).

type ResolvedParcel = { parcel_id: string; centroid: { lat: number; lng: number } }

describe("Private surveys: numbering and account deletion (e2e, Phase 29 D-11 and D-13)", () => {
  let app: NestExpressApplication
  let db: DatabaseService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication<NestExpressApplication>()
    configureApp(app)
    await app.init()
    db = moduleFixture.get(DatabaseService)
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  function get(path: string, token: string) {
    return request(app.getHttpServer()).get(path).set("Authorization", `Bearer ${token}`)
  }

  async function resolveFullParcel(
    token: string,
    at: { lat: number; lng: number },
  ): Promise<ResolvedParcel> {
    const resolved = await get("/v1/parcels/resolve", token)
      .query({ lat: String(at.lat), lng: String(at.lng) })
      .expect(200)
    return resolved.body.parcel as ResolvedParcel
  }

  /** A draft on `parcelId`; `versionNumber` undefined leaves the default to the server. */
  async function upsertDraft(
    token: string,
    input: {
      surveyId: string
      parcelId: string
      visibility: "private" | "public"
      versionNumber?: number
    },
  ): Promise<void> {
    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: input.surveyId,
        sync_version: 1,
        site_name: `Retention ${input.surveyId}`,
        status: "draft",
        visibility: input.visibility,
        parcel_id: input.parcelId,
        observation_year: 2025,
        ...(input.versionNumber === undefined ? {} : { version_number: input.versionNumber }),
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
      })
      .expect(201)
  }

  async function createSubmitted(
    token: string,
    label: string,
    visibility: "private" | "public",
    parcelId: string,
  ): Promise<{ surveyId: string; versionNumber: number }> {
    const surveyId = `${label}-${randomUUID()}`
    const versionNumber = await getNextVersionNumber(db, parcelId)
    await upsertDraft(token, { surveyId, parcelId, visibility, versionNumber })
    await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201)
    return { surveyId, versionNumber }
  }

  function bboxAround(...parcels: ResolvedParcel[]): string {
    const lats = parcels.map((parcel) => parcel.centroid.lat)
    const lngs = parcels.map((parcel) => parcel.centroid.lng)
    const margin = 0.0005
    return [
      Math.min(...lngs) - margin,
      Math.min(...lats) - margin,
      Math.max(...lngs) + margin,
      Math.max(...lats) + margin,
    ].join(",")
  }

  async function mapItemIds(token: string, bbox: string): Promise<string[]> {
    const response = await get("/v1/public/map-items", token).query({ bbox }).expect(200)
    return (response.body.items as Array<{ survey_id: string }>).map((item) => item.survey_id)
  }

  async function historyIds(token: string, parcelId: string): Promise<string[]> {
    const response = await get(`/v1/parcels/${parcelId}/surveys/history`, token).expect(200)
    return (response.body.items as Array<{ survey_id: string }>).map((item) => item.survey_id)
  }

  it("D-11: the next version counts another member's private survey, which stays hidden", async () => {
    const tokenA = await loginTestUser(app, "e2e-retention-numbering-a")
    const tokenB = await loginTestUser(app, "e2e-retention-numbering-b")
    const seed = uniqueCoordSeed()
    const parcel = await resolveFullParcel(tokenA, {
      lat: 45.7 + seed / 100000,
      lng: 4.7 + seed / 100000,
    })
    const priv = await createSubmitted(tokenA, "e2e-retention-priv", "private", parcel.parcel_id)
    const v = priv.versionNumber

    // B's draft without a version number: the server default counts A's private survey.
    const defaulted = `e2e-retention-b-default-${randomUUID()}`
    await upsertDraft(tokenB, {
      surveyId: defaulted,
      parcelId: parcel.parcel_id,
      visibility: "public",
    })
    const draft = await get(`/v1/surveys/${defaulted}`, tokenB).expect(200)
    expect(draft.body.version_number).toBe(v + 1)

    // B's draft forced to the taken version: refused at submit, the expected number leaks (D-11).
    const forced = `e2e-retention-b-forced-${randomUUID()}`
    await upsertDraft(tokenB, {
      surveyId: forced,
      parcelId: parcel.parcel_id,
      visibility: "public",
      versionNumber: v,
    })
    const conflict = await request(app.getHttpServer())
      .post(`/v1/surveys/${forced}/submit`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(409)
    expect(conflict.body.code).toBe("parcel_version_conflict")
    expect(conflict.body.details.expected_version_number).toBe(v + 1)
    // Only the number leaks, never the content: no id, site name or score of A's survey.
    expect(JSON.stringify(conflict.body)).not.toContain(priv.surveyId)

    // B still sees nothing of A's private survey on that parcel.
    const bbox = bboxAround(parcel)
    expect(await mapItemIds(tokenB, bbox)).not.toContain(priv.surveyId)
    const statuses = await get("/v1/public/parcels/status", tokenB)
      .query({ bbox, zoom: 16 })
      .expect(200)
    const item = (statuses.body.items as Array<{ parcel_id: string; study_status: string }>).find(
      (status) => status.parcel_id === parcel.parcel_id,
    )
    expect(item?.study_status ?? "not_studied").toBe("not_studied")
    expect(JSON.stringify(statuses.body)).not.toContain(priv.surveyId)
    expect(await historyIds(tokenB, parcel.parcel_id)).toEqual([])
    // The owner keeps it (D-10).
    expect(await historyIds(tokenA, parcel.parcel_id)).toEqual([priv.surveyId])
  })

  it("D-13: after account deletion a retained private survey stays hidden, a shared one stays visible", async () => {
    const tokenD = await loginTestUser(app, "e2e-retention-deleted-d")
    const tokenB = await loginTestUser(app, "e2e-retention-reader-b")
    const seed = uniqueCoordSeed()
    const parcelT = await resolveFullParcel(tokenD, {
      lat: 45.4 + seed / 100000,
      lng: 4.4 + seed / 100000,
    })
    const parcelU = await resolveFullParcel(tokenD, {
      lat: 45.4 + seed / 100000 + 0.003,
      lng: 4.4 + seed / 100000 + 0.003,
    })
    expect(parcelT.parcel_id).not.toBe(parcelU.parcel_id)
    const dPriv = await createSubmitted(tokenD, "e2e-retention-dpriv", "private", parcelT.parcel_id)
    const dPub = await createSubmitted(tokenD, "e2e-retention-dpub", "public", parcelU.parcel_id)

    await request(app.getHttpServer())
      .delete("/v1/me")
      .set("Authorization", `Bearer ${tokenD}`)
      .expect(204)

    // The retained private survey answers exactly like an unknown id.
    const hidden = await get(`/v1/public/community-surveys/${dPriv.surveyId}`, tokenB)
    expect(hidden.status).toBe(404)
    const unknown = await get(
      `/v1/public/community-surveys/unknown-${randomUUID()}`,
      tokenB,
    ).expect(404)
    expect(hidden.body).toEqual(unknown.body)

    // The retained shared survey stays visible, anonymised.
    const shared = await get(`/v1/public/community-surveys/${dPub.surveyId}`, tokenB).expect(200)
    expect(shared.body.survey_id).toBe(dPub.surveyId)
    expect(shared.body.author_name).toBeNull()

    const ids = await mapItemIds(tokenB, bboxAround(parcelT, parcelU))
    expect(ids).toContain(dPub.surveyId)
    expect(ids).not.toContain(dPriv.surveyId)
    expect(await historyIds(tokenB, parcelT.parcel_id)).toEqual([])
    expect(await historyIds(tokenB, parcelU.parcel_id)).toEqual([dPub.surveyId])

    const rows = await db.query<{ id: string; user_id: string | null; visibility: string }>(
      `SELECT id, user_id, visibility FROM surveys WHERE id = ANY($1::text[]) ORDER BY id`,
      [[dPriv.surveyId, dPub.surveyId]],
    )
    const byId = new Map(rows.rows.map((row) => [row.id, row]))
    expect(byId.get(dPriv.surveyId)).toEqual({
      id: dPriv.surveyId,
      user_id: null,
      visibility: "private",
    })
    expect(byId.get(dPub.surveyId)).toEqual({
      id: dPub.surveyId,
      user_id: null,
      visibility: "public",
    })
  })
})
