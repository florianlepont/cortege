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
  uniqueId,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// /v1/search/community, /v1/search/places and /v1/search/parcels (phase 25, D-04, D-06, D-13, D-15).
// The e2e database runs with the synthetic cadastre provider: places answer an empty list and the
// parcel search reads the registered parcels (the IGN paths are covered by the unit specs).

type SurveyItem = {
  survey_id: string
  site_name: string
  author_name: string | null
}

type MemberItem = { author_name: string; survey_count: number }

type ParcelItem = {
  parcel_id: string
  commune_code: string
  section: string
  number: string
  centroid: { lat: number; lng: number }
  bbox: number[] | null
  survey_count: number
}

type ResolvedParcel = {
  parcel_id: string
  commune_code: string
  section: string
  number: string
}

describe("Search endpoints (e2e)", () => {
  let app: NestExpressApplication
  let db: DatabaseService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication<NestExpressApplication>()
    // The same bootstrap as the real server: the /v1 prefix and the global validation pipe.
    configureApp(app)
    await app.init()
    db = moduleFixture.get(DatabaseService)
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  /** Letters and digits only, so the marker never meets a LIKE wildcard or an accent rule. */
  function marker(prefix: string): string {
    return `${prefix}${randomUUID().replace(/-/g, "").slice(0, 12)}`
  }

  async function resolveFullParcel(
    token: string,
    lat: number,
    lng: number,
  ): Promise<ResolvedParcel> {
    const resolved = await request(app.getHttpServer())
      .get("/v1/parcels/resolve")
      .set("Authorization", `Bearer ${token}`)
      .query({ lat: String(lat), lng: String(lng) })
      .expect(200)
    return resolved.body.parcel as ResolvedParcel
  }

  /** The survey location must lie on the parcel, so one coordinate serves both calls. */
  async function createSurvey(
    token: string,
    input: { id: string; siteName: string; submit: boolean },
  ): Promise<ResolvedParcel> {
    const seed = uniqueCoordSeed()
    const lat = 47.2 + seed / 100000
    const lng = 1.2 + seed / 100000
    const parcel = await resolveFullParcel(token, lat, lng)
    const versionNumber = await getNextVersionNumber(db, parcel.parcel_id)
    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: input.id,
        sync_version: 1,
        site_name: input.siteName,
        status: "draft",
        visibility: "private",
        parcel_id: parcel.parcel_id,
        observation_year: 2025,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat, lng },
      })
      .expect(201)
    if (input.submit) {
      await request(app.getHttpServer())
        .post(`/v1/surveys/${input.id}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
    }
    return parcel
  }

  function searchCommunity(token: string, query: Record<string, string | number>) {
    return request(app.getHttpServer())
      .get("/v1/search/community")
      .set("Authorization", `Bearer ${token}`)
      .query(query)
  }

  describe("authentication and validation", () => {
    it("answers 401 without a token on the three routes", async () => {
      await request(app.getHttpServer())
        .get("/v1/search/community")
        .query({ q: "bois" })
        .expect(401)
      await request(app.getHttpServer()).get("/v1/search/places").query({ q: "bois" }).expect(401)
      await request(app.getHttpServer())
        .get("/v1/search/parcels")
        .query({ q: "AB 0123" })
        .expect(401)
    })

    it("answers 400 for a missing, too short or too long q on the three routes", async () => {
      const token = await loginTestUser(app, "e2e-search-validation")
      for (const path of ["community", "places", "parcels"]) {
        const get = (query: Record<string, string>) =>
          request(app.getHttpServer())
            .get(`/v1/search/${path}`)
            .set("Authorization", `Bearer ${token}`)
            .query(query)
        await get({}).expect(400)
        await get({ q: "a" }).expect(400)
        await get({ q: "a".repeat(101) }).expect(400)
      }
    })

    it("accepts q of 2 and of 100 characters", async () => {
      const token = await loginTestUser(app, "e2e-search-bounds")
      await searchCommunity(token, { q: "zz" }).expect(200)
      await searchCommunity(token, { q: "z".repeat(100) }).expect(200)
    })

    it("answers 400 for an author over 100 characters and a community limit outside 1..50", async () => {
      const token = await loginTestUser(app, "e2e-search-community-bounds")
      await searchCommunity(token, { q: "bois", author: "a".repeat(101) }).expect(400)
      await searchCommunity(token, { q: "bois", limit: 0 }).expect(400)
      await searchCommunity(token, { q: "bois", limit: 51 }).expect(400)
      await searchCommunity(token, { q: "bois", limit: 50 }).expect(200)
    })

    it("answers 400 for a places limit outside 1..10", async () => {
      const token = await loginTestUser(app, "e2e-search-places-bounds")
      const places = (limit: number) =>
        request(app.getHttpServer())
          .get("/v1/search/places")
          .set("Authorization", `Bearer ${token}`)
          .query({ q: "Fontainebleau", limit })
      await places(0).expect(400)
      await places(11).expect(400)
      await places(10).expect(200)
    })
  })

  describe("community", () => {
    const tag = marker("zq")
    const nameWord = marker("Zelie")
    const accentedName = `Hélène ${nameWord}`
    const foldedName = `helene ${nameWord}`.toLowerCase()
    const accentedSiteName = `Forêt de l'Écureuil ${tag}`
    const literalSiteName = `50%_${tag}`
    let authorToken: string
    let readerToken: string
    let accentedId: string
    let literalId: string
    let draftId: string
    let deletedId: string

    beforeAll(async () => {
      authorToken = await loginTestUser(app, "e2e-search-author")
      readerToken = await loginTestUser(app, "e2e-search-reader")
      await request(app.getHttpServer())
        .patch("/v1/me")
        .set("Authorization", `Bearer ${authorToken}`)
        .send({ display_name: accentedName })
        .expect(200)

      accentedId = uniqueId("e2e-search-accent")
      literalId = uniqueId("e2e-search-literal")
      draftId = uniqueId("e2e-search-draft")
      deletedId = uniqueId("e2e-search-deleted")
      await createSurvey(authorToken, { id: accentedId, siteName: accentedSiteName, submit: true })
      await createSurvey(authorToken, { id: literalId, siteName: literalSiteName, submit: true })
      await createSurvey(authorToken, {
        id: draftId,
        siteName: `Brouillon ${tag}`,
        submit: false,
      })
      await createSurvey(authorToken, {
        id: deletedId,
        siteName: `Supprimé ${tag}`,
        submit: true,
      })
      await request(app.getHttpServer())
        .delete(`/v1/surveys/${deletedId}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .expect(204)
    })

    function ids(body: { surveys: SurveyItem[] }): string[] {
      return body.surveys.map((survey) => survey.survey_id)
    }

    it("finds a survey ignoring accents and case, and never a draft or a deleted survey", async () => {
      const response = await searchCommunity(readerToken, { q: tag }).expect(200)
      expect(ids(response.body).sort()).toEqual([accentedId, literalId].sort())

      const folded = await searchCommunity(readerToken, {
        q: `foret de l'ecureuil ${tag}`,
      }).expect(200)
      expect(ids(folded.body)).toEqual([accentedId])

      const upper = await searchCommunity(readerToken, {
        q: `FORET DE L'ECUREUIL ${tag.toUpperCase()}`,
      }).expect(200)
      expect(ids(upper.body)).toEqual([accentedId])
    })

    it("reads % and _ literally", async () => {
      const literal = await searchCommunity(readerToken, { q: `50%_${tag}` }).expect(200)
      expect(ids(literal.body)).toEqual([literalId])

      // "%" is not "any run of characters" and "_" is not "any one character": each of these
      // would match "50%_<tag>" if it were read as a wildcard.
      const percent = await searchCommunity(readerToken, { q: `50%${tag}` }).expect(200)
      expect(percent.body.surveys).toEqual([])
      const underscore = await searchCommunity(readerToken, { q: `5_%_${tag}` }).expect(200)
      expect(underscore.body.surveys).toEqual([])
    })

    it("lists the matching member with the number of finished surveys and no id or email", async () => {
      const response = await searchCommunity(readerToken, { q: foldedName }).expect(200)
      const members = response.body.members as MemberItem[]
      expect(members).toEqual([{ author_name: accentedName, survey_count: 2 }])
      expect(Object.keys(members[0]).sort()).toEqual(["author_name", "survey_count"])
      expect(JSON.stringify(response.body)).not.toMatch(/@ibp\.local/)
      expect(ids(response.body).sort()).toEqual([accentedId, literalId].sort())
    })

    it("narrows to one author with author, ignoring accents and case, with no members", async () => {
      const response = await searchCommunity(readerToken, {
        q: "zz",
        author: foldedName.toUpperCase(),
      }).expect(200)
      expect(ids(response.body).sort()).toEqual([accentedId, literalId].sort())
      expect(response.body.members).toEqual([])
      for (const survey of response.body.surveys as SurveyItem[]) {
        expect(survey.author_name).toBe(accentedName)
      }
    })

    it("returns nothing for an author that is not a member", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/search/community?q=zz&author=${encodeURIComponent(marker("Nobody"))}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(response.body).toEqual({ members: [], surveys: [] })
    })

    it("never returns the caller's own surveys or the caller as a member", async () => {
      const byTag = await searchCommunity(authorToken, { q: tag }).expect(200)
      expect(byTag.body.surveys).toEqual([])
      const byName = await searchCommunity(authorToken, { q: foldedName }).expect(200)
      expect(byName.body).toEqual({ members: [], surveys: [] })
      const byAuthor = await searchCommunity(authorToken, {
        q: "zz",
        author: accentedName,
      }).expect(200)
      expect(byAuthor.body.surveys).toEqual([])
    })

    it("caps the answer to the requested limit", async () => {
      const response = await searchCommunity(readerToken, { q: tag, limit: 1 }).expect(200)
      expect((response.body.surveys as SurveyItem[]).length).toBe(1)
    })
  })

  describe("places", () => {
    it("answers an empty list with the synthetic provider", async () => {
      const token = await loginTestUser(app, "e2e-search-places")
      const response = await request(app.getHttpServer())
        .get("/v1/search/places")
        .set("Authorization", `Bearer ${token}`)
        .query({ q: "Fontainebleau" })
        .expect(200)
      expect(response.body).toEqual({ items: [] })
    })
  })

  describe("parcels", () => {
    let token: string

    beforeAll(async () => {
      token = await loginTestUser(app, "e2e-search-parcels")
    })

    function searchParcels(q: string) {
      return request(app.getHttpServer())
        .get("/v1/search/parcels")
        .set("Authorization", `Bearer ${token}`)
        .query({ q })
    }

    it("finds a registered parcel by section and number, with its survey count and centroid", async () => {
      const parcel = await createSurvey(token, {
        id: uniqueId("e2e-search-parcel-done"),
        siteName: `Parcelle ${marker("pc")}`,
        submit: true,
      })

      const response = await searchParcels(`${parcel.section} ${parcel.number}`).expect(200)
      const found = (response.body.items as ParcelItem[]).find(
        (item) => item.parcel_id === parcel.parcel_id,
      )
      expect(found).toBeDefined()
      expect(found?.section).toBe(parcel.section)
      expect(found?.number).toBe(parcel.number)
      expect(found?.commune_code).toBe(parcel.commune_code)
      expect(found?.survey_count).toBeGreaterThanOrEqual(1)
      expect(typeof found?.centroid.lat).toBe("number")
      expect(typeof found?.centroid.lng).toBe("number")
      expect((response.body.items as ParcelItem[]).length).toBeLessThanOrEqual(10)
    })

    it("finds a registered parcel by its key (commune code, section, number)", async () => {
      const parcel = await createSurvey(token, {
        id: uniqueId("e2e-search-parcel-key"),
        siteName: `Parcelle ${marker("pk")}`,
        submit: true,
      })

      const response = await searchParcels(
        `${parcel.commune_code} ${parcel.section} ${parcel.number}`,
      ).expect(200)
      const items = response.body.items as ParcelItem[]
      expect(items.map((item) => item.parcel_id)).toContain(parcel.parcel_id)
      expect(
        items.find((item) => item.parcel_id === parcel.parcel_id)?.survey_count,
      ).toBeGreaterThanOrEqual(1)
    })

    it("does not count a draft in the survey count of a parcel", async () => {
      const parcel = await createSurvey(token, {
        id: uniqueId("e2e-search-parcel-draft"),
        siteName: `Parcelle ${marker("pd")}`,
        submit: false,
      })

      const response = await searchParcels(
        `${parcel.commune_code} ${parcel.section} ${parcel.number}`,
      ).expect(200)
      const found = (response.body.items as ParcelItem[]).find(
        (item) => item.parcel_id === parcel.parcel_id,
      )
      expect(found?.survey_count).toBe(0)
    })

    it("answers an empty list for a text that is not a parcel reference", async () => {
      const response = await searchParcels("hello world").expect(200)
      expect(response.body).toEqual({ items: [] })
    })
  })
})
