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
import { MEMBER_READ_ROUTES } from "./helpers/survey-read-routes"

// Phase 29, D-12: the two-user guarantee matrix. User A owns a private submitted survey (S_PRIV,
// alone on parcel P) and a shared one (S_PUB, alone on parcel Q); user C owns only a private
// submitted survey; user B reads. For every route that can show another member's surveys, B never
// sees S_PRIV (nor C), sees S_PUB, and A keeps the owner view where one exists (D-10). Every direct
// id access by B to S_PRIV answers 404 with exactly the body of an unknown id, never 403.
//
// The matrix keys must equal MEMBER_READ_ROUTES (test/helpers/survey-read-routes.ts), which the
// unit spec survey-read-paths.spec.ts keeps equal to the real controller routes: adding a member
// read route therefore fails here until it has a case.
//
// The app runs with the production bootstrap (configureApp: /v1 prefix, validation pipe).

type ResolvedParcel = {
  parcel_id: string
  commune_code: string
  section: string
  number: string
  centroid: { lat: number; lng: number }
}

type Fixture = {
  surveyId: string
  attachmentId: string | null
  parcel: ResolvedParcel
}

type Ctx = {
  tokenA: string
  tokenB: string
  tokenC: string
  run: string
  nameA: string
  nameC: string
  priv: Fixture
  pub: Fixture
  privC: Fixture
  /** A bbox (minLng,minLat,maxLng,maxLat) around the parcels P and Q. */
  bbox: string
}

const PHOTO = Buffer.from("fake-jpeg-binary")

describe("Private surveys are invisible to other members (e2e, Phase 29 D-12)", () => {
  let app: NestExpressApplication
  let db: DatabaseService
  let ctx: Ctx

  function get(path: string, token: string) {
    return request(app.getHttpServer()).get(path).set("Authorization", `Bearer ${token}`)
  }

  async function resolveFullParcel(token: string, lat: number, lng: number) {
    const resolved = await get("/v1/parcels/resolve", token)
      .query({ lat: String(lat), lng: String(lng) })
      .expect(200)
    return resolved.body.parcel as ResolvedParcel
  }

  async function uploadPhoto(token: string, surveyId: string): Promise<string> {
    const created = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mime_type: "image/jpeg", size_bytes: PHOTO.length })
      .expect(201)
    if (String(created.body.upload_url).startsWith("http")) {
      const put = await fetch(created.body.upload_url as string, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: PHOTO,
      })
      expect(put.ok).toBe(true)
      await request(app.getHttpServer())
        .put(`/v1${created.body.confirm_url}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
    } else {
      await request(app.getHttpServer())
        .put(`/v1${created.body.upload_url}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("file", PHOTO, { filename: "sample.jpg", contentType: "image/jpeg" })
        .expect(200)
    }
    return created.body.attachment_id as string
  }

  /** A submitted survey with its visibility chosen before submit (D-07), and optionally a photo. */
  async function createSubmitted(
    token: string,
    input: {
      label: string
      siteName: string
      visibility: "private" | "public"
      at: { lat: number; lng: number }
      photo: boolean
    },
  ): Promise<Fixture> {
    const parcel = await resolveFullParcel(token, input.at.lat, input.at.lng)
    const surveyId = `${input.label}-${randomUUID()}`
    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: input.siteName,
        status: "draft",
        visibility: input.visibility,
        parcel_id: parcel.parcel_id,
        observation_year: 2025,
        version_number: await getNextVersionNumber(db, parcel.parcel_id),
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
      })
      .expect(201)
    const attachmentId = input.photo ? await uploadPhoto(token, surveyId) : null
    await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201)
    return { surveyId, attachmentId, parcel }
  }

  async function setDisplayName(token: string, displayName: string): Promise<void> {
    await request(app.getHttpServer())
      .patch("/v1/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ display_name: displayName })
      .expect(200)
  }

  /** The 404 answer of a route for ids that do not exist, to compare bodies with. */
  async function unknownBody(path: string, token: string): Promise<unknown> {
    const response = await get(path, token).expect(404)
    return response.body
  }

  /** B reading S_PRIV through `path(id, attachmentId)`: 404 with the unknown-id body. */
  async function expectHiddenLikeUnknown(
    path: (surveyId: string, attachmentId: string) => string,
  ): Promise<void> {
    const hidden = await get(path(ctx.priv.surveyId, ctx.priv.attachmentId ?? ""), ctx.tokenB)
    expect(hidden.status).toBe(404)
    expect(hidden.body).toEqual(
      await unknownBody(path(`unknown-${randomUUID()}`, `unknown-${randomUUID()}`), ctx.tokenB),
    )
    expect(JSON.stringify(hidden.body)).not.toContain(ctx.priv.surveyId)
  }

  function surveyIds(items: Array<{ survey_id: string }>): string[] {
    return items.map((item) => item.survey_id)
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication<NestExpressApplication>()
    configureApp(app)
    await app.init()
    db = moduleFixture.get(DatabaseService)

    // Letters and digits only, so the token never meets a LIKE wildcard or an accent rule.
    const run = `pv${randomUUID().replace(/-/g, "").slice(0, 12)}`
    const tokenA = await loginTestUser(app, "e2e-private-a")
    const tokenB = await loginTestUser(app, "e2e-private-b")
    const tokenC = await loginTestUser(app, "e2e-private-c")
    const nameA = `Alice ${run}`
    const nameC = `Chloe ${run}`
    await setDisplayName(tokenA, nameA)
    await setDisplayName(tokenC, nameC)

    const seed = uniqueCoordSeed()
    const base = { lat: 46.3 + seed / 100000, lng: 2.3 + seed / 100000 }
    const priv = await createSubmitted(tokenA, {
      label: "e2e-private-priv",
      siteName: `Bois prive ${run}`,
      visibility: "private",
      at: base,
      photo: true,
    })
    const pub = await createSubmitted(tokenA, {
      label: "e2e-private-pub",
      siteName: `Bois partage ${run}`,
      visibility: "public",
      at: { lat: base.lat + 0.003, lng: base.lng + 0.003 },
      photo: true,
    })
    const privC = await createSubmitted(tokenC, {
      label: "e2e-private-c",
      siteName: `Bois de Chloe ${run}`,
      visibility: "private",
      at: { lat: base.lat - 0.003, lng: base.lng - 0.003 },
      photo: false,
    })
    expect(priv.parcel.parcel_id).not.toBe(pub.parcel.parcel_id)

    const lats = [priv.parcel.centroid.lat, pub.parcel.centroid.lat]
    const lngs = [priv.parcel.centroid.lng, pub.parcel.centroid.lng]
    const margin = 0.0005
    const bbox = [
      Math.min(...lngs) - margin,
      Math.min(...lats) - margin,
      Math.max(...lngs) + margin,
      Math.max(...lats) + margin,
    ].join(",")

    ctx = { tokenA, tokenB, tokenC, run, nameA, nameC, priv, pub, privC, bbox }
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  // One case per member read route (B reads unless stated).
  const MATRIX: Record<string, () => Promise<void>> = {
    "GET /v1/public/map-items": async () => {
      const response = await get("/v1/public/map-items", ctx.tokenB)
        .query({ bbox: ctx.bbox })
        .expect(200)
      const ids = surveyIds(response.body.items)
      expect(ids).toContain(ctx.pub.surveyId)
      expect(ids).not.toContain(ctx.priv.surveyId)
    },

    "GET /v1/public/parcels/status": async () => {
      const response = await get("/v1/public/parcels/status", ctx.tokenB)
        .query({ bbox: ctx.bbox, zoom: 16 })
        .expect(200)
      const items = response.body.items as Array<{
        parcel_id: string
        study_status: string
        latest_submitted_survey_id?: string | null
      }>
      const q = items.find((item) => item.parcel_id === ctx.pub.parcel.parcel_id)
      expect(q?.study_status).toBe("studied")
      expect(q?.latest_submitted_survey_id).toBe(ctx.pub.surveyId)
      // D-11: P holds only a private survey, so it is not studied for B.
      const p = items.find((item) => item.parcel_id === ctx.priv.parcel.parcel_id)
      expect(p?.study_status ?? "not_studied").toBe("not_studied")
      expect(JSON.stringify(response.body)).not.toContain(ctx.priv.surveyId)
    },

    "GET /v1/public/community-surveys": async () => {
      const response = await get("/v1/public/community-surveys", ctx.tokenB)
        .query({ q: ctx.run, limit: 50 })
        .expect(200)
      const ids = surveyIds(response.body.items)
      expect(ids).toEqual([ctx.pub.surveyId])
    },

    "GET /v1/public/community-surveys/:id": async () => {
      await expectHiddenLikeUnknown((id) => `/v1/public/community-surveys/${id}`)
      const shared = await get(`/v1/public/community-surveys/${ctx.pub.surveyId}`, ctx.tokenB)
      expect(shared.status).toBe(200)
      expect(shared.body.survey_id).toBe(ctx.pub.surveyId)
      expect(JSON.stringify(shared.body)).not.toContain(ctx.priv.surveyId)
    },

    "GET /v1/public/community-surveys/:id/attachments": async () => {
      await expectHiddenLikeUnknown((id) => `/v1/public/community-surveys/${id}/attachments`)
      const shared = await get(
        `/v1/public/community-surveys/${ctx.pub.surveyId}/attachments`,
        ctx.tokenB,
      ).expect(200)
      expect(attachmentIds(shared.body.items)).toEqual([ctx.pub.attachmentId])
    },

    "GET /v1/public/community-surveys/:id/attachments/:attachmentId/download-url": async () => {
      await expectHiddenLikeUnknown(
        (id, attachmentId) =>
          `/v1/public/community-surveys/${id}/attachments/${attachmentId}/download-url`,
      )
      const shared = await get(
        `/v1/public/community-surveys/${ctx.pub.surveyId}/attachments/${ctx.pub.attachmentId}/download-url`,
        ctx.tokenB,
      ).expect(200)
      expect(typeof shared.body.url).toBe("string")
    },

    "GET /v1/public/community-surveys/:id/attachments/:attachmentId/content": async () => {
      await expectHiddenLikeUnknown(
        (id, attachmentId) =>
          `/v1/public/community-surveys/${id}/attachments/${attachmentId}/content`,
      )
      const download = await get(
        `/v1/public/community-surveys/${ctx.pub.surveyId}/attachments/${ctx.pub.attachmentId}/download-url`,
        ctx.tokenB,
      ).expect(200)
      if (download.body.requires_auth === true) {
        // Local storage: the content route serves the shared photo.
        const content = await get(`/v1${download.body.url}`, ctx.tokenB).expect(200)
        expect(content.headers["content-type"]).toContain("image/jpeg")
      } else {
        // Object storage: the photo is read from the presigned URL, the content route is unused.
        const fetched = await fetch(download.body.url as string)
        expect(fetched.ok).toBe(true)
      }
    },

    "GET /v1/search/community": async () => {
      const bySite = await get("/v1/search/community", ctx.tokenB)
        .query({ q: ctx.run, limit: 50 })
        .expect(200)
      expect(surveyIds(bySite.body.surveys)).toEqual([ctx.pub.surveyId])
      // Members: A counts only the shared survey; C, whose only survey is private, is absent.
      expect(bySite.body.members).toEqual([{ author_name: ctx.nameA, survey_count: 1 }])

      const byAuthor = await get("/v1/search/community", ctx.tokenB)
        .query({ q: "bois", author: ctx.nameA, limit: 50 })
        .expect(200)
      expect(surveyIds(byAuthor.body.surveys)).toEqual([ctx.pub.surveyId])
      const byPrivateAuthor = await get("/v1/search/community", ctx.tokenB)
        .query({ q: "bois", author: ctx.nameC, limit: 50 })
        .expect(200)
      expect(byPrivateAuthor.body).toEqual({ members: [], surveys: [] })
    },

    "GET /v1/search/parcels": async () => {
      const countFor = async (parcel: ResolvedParcel): Promise<number> => {
        const response = await get("/v1/search/parcels", ctx.tokenB)
          .query({ q: `${parcel.commune_code} ${parcel.section} ${parcel.number}` })
          .expect(200)
        const items = response.body.items as Array<{ parcel_id: string; survey_count: number }>
        return items.find((item) => item.parcel_id === parcel.parcel_id)?.survey_count ?? 0
      }
      expect(await countFor(ctx.priv.parcel)).toBe(0)
      expect(await countFor(ctx.pub.parcel)).toBe(1)
    },

    "GET /v1/parcels/:parcelId/surveys/history": async () => {
      const historyIds = async (parcelId: string, token: string): Promise<string[]> => {
        const response = await get(`/v1/parcels/${parcelId}/surveys/history`, token).expect(200)
        return surveyIds(response.body.items)
      }
      expect(await historyIds(ctx.priv.parcel.parcel_id, ctx.tokenB)).toEqual([])
      expect(await historyIds(ctx.pub.parcel.parcel_id, ctx.tokenB)).toEqual([ctx.pub.surveyId])
      // D-10: the owner keeps their private survey in the history.
      expect(await historyIds(ctx.priv.parcel.parcel_id, ctx.tokenA)).toEqual([ctx.priv.surveyId])
    },

    "POST /v1/reports": async () => {
      const report = (surveyId: string) =>
        request(app.getHttpServer())
          .post("/v1/reports")
          .set("Authorization", `Bearer ${ctx.tokenB}`)
          .send({ survey_id: surveyId, reason: "Phase 29 guarantee" })
      const hidden = await report(ctx.priv.surveyId)
      expect(hidden.status).toBe(404)
      const unknown = await report(`unknown-${randomUUID()}`).expect(404)
      expect(hidden.body).toEqual(unknown.body)
      const stored = await db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM reports WHERE survey_id = $1`,
        [ctx.priv.surveyId],
      )
      expect(stored.rows[0]?.count).toBe(0)
      await report(ctx.pub.surveyId).expect(201)
    },
  }

  function attachmentIds(items: Array<{ id: string }>): Array<string | null> {
    return items.map((item) => item.id)
  }

  it("has exactly one case per member read route", () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...MEMBER_READ_ROUTES])
  })

  for (const route of [...MEMBER_READ_ROUTES]) {
    it(`${route}: A's private survey is hidden from B, the shared one is not`, async () => {
      const run = MATRIX[route]
      expect(run).toBeDefined()
      await run()
    })
  }

  describe("owner routes (not member reads)", () => {
    const OWNER_PATHS: Array<(id: string) => string> = [
      (id) => `/v1/surveys/${id}`,
      (id) => `/v1/surveys/${id}/events`,
      (id) => `/v1/surveys/${id}/attachments`,
    ]

    it("answer B with the unknown-id 404 on A's private survey", async () => {
      for (const path of OWNER_PATHS) {
        const hidden = await get(path(ctx.priv.surveyId), ctx.tokenB)
        expect(hidden.status).toBe(404)
        expect(hidden.body).toEqual(await unknownBody(path(`unknown-${randomUUID()}`), ctx.tokenB))
      }
      const download = await get(
        `/v1/surveys/${ctx.priv.surveyId}/attachments/${ctx.priv.attachmentId}/download-url`,
        ctx.tokenB,
      )
      expect(download.status).toBe(404)
      expect(download.body).toEqual(
        await unknownBody(
          `/v1/surveys/unknown-${randomUUID()}/attachments/unknown-${randomUUID()}/download-url`,
          ctx.tokenB,
        ),
      )
    })

    it("still serve A their own private survey", async () => {
      const own = await get(`/v1/surveys/${ctx.priv.surveyId}`, ctx.tokenA).expect(200)
      expect(own.body.visibility).toBe("private")
      expect(own.body.status).toBe("submitted")
      await get(`/v1/surveys/${ctx.priv.surveyId}/events`, ctx.tokenA).expect(200)
      const attachments = await get(
        `/v1/surveys/${ctx.priv.surveyId}/attachments`,
        ctx.tokenA,
      ).expect(200)
      expect(attachments.body.items.map((item: { id: string }) => item.id)).toEqual([
        ctx.priv.attachmentId,
      ])
    })
  })
})
