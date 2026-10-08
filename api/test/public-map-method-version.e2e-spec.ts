import "dotenv/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test, TestingModule } from "@nestjs/testing"
import request = require("supertest")
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"
import { DatabaseService } from "../src/database/database.service"
import { normalizeCentroid } from "../src/surveys/surveys-normalize.utils"
import {
  getNextVersionNumber,
  loginTestUser,
  resolveParcel,
  uniqueCoordSeed,
  uniqueId,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// Phase 01.8 plan 12 (D-10, CH-9; RESEARCH §4.2 rule 6): the public reads carry each survey's
// IBP method version. /v1/public/map-items items gain `ibp_method_version` and `ibp_cas`, and
// /v1/public/parcels/status items gain `latest_ibp_method_version`, taken from the same latest
// row as `latest_ibp_total`. NULL stays null on the wire (it means v3.0; the phone resolves it).
// The `region` filter keeps matching `region_version` exactly, so it only matches v3.0 surveys:
// a v3.2 survey stores no region. Named "method-version", never "*-cas*": CAS means
// compare-and-swap in this suite.
//
// Phase 2 (association-only sharing): both routes require an authenticated member and show every
// submitted survey regardless of visibility, so "v32Private" (never patched to public) now shows
// up exactly like the public ones.
//
// Owner decision 2026-10-08: the map items no longer round the location; each sits at the exact
// centre of its linked parcels.

const V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"

type MapItem = {
  survey_id: string
  display_location: { lat: number; lng: number }
  survey_date: string
  region_code: string
  ibp_total: number
  ibp_method_version?: string | null
  ibp_cas?: number | null
}

type ParcelStatus = {
  parcel_id: string
  study_status: "studied" | "not_studied"
  latest_submitted_survey_id: string | null
  latest_ibp_total: number | null
  latest_ibp_method_version?: string | null
}

describe("Public map method version (e2e)", () => {
  let app: NestExpressApplication
  let db: DatabaseService
  let accessToken: string

  // Three parcels close together, in a small box of their own (random seed, no clock).
  const seed = uniqueCoordSeed()
  const baseLat = 47.3 + seed / 1000000
  const baseLng = 0.7 + seed / 1000000
  const coords = {
    v32Public: { lat: baseLat, lng: baseLng },
    untaggedPublic: { lat: baseLat + 0.002, lng: baseLng + 0.002 },
    v32Private: { lat: baseLat + 0.004, lng: baseLng + 0.004 },
  }
  const bbox = [baseLng - 0.01, baseLat - 0.01, baseLng + 0.01, baseLat + 0.01].join(",")

  const ids = {
    v32Public: uniqueId("e2e-pmv-v32-pub"),
    untaggedPublic: uniqueId("e2e-pmv-untag-pub"),
    v32Private: uniqueId("e2e-pmv-v32-prv"),
  }
  const parcels: Record<keyof typeof ids, string> = {
    v32Public: "",
    untaggedPublic: "",
    v32Private: "",
  }

  const server = () => app.getHttpServer()

  async function seedSubmitted(
    key: keyof typeof ids,
    visibility: "public" | "private",
    extra: Record<string, unknown>,
  ): Promise<void> {
    const { lat, lng } = coords[key]
    const parcelId = await resolveParcel(app, accessToken, lat, lng)
    parcels[key] = parcelId
    await request(server())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: ids[key],
        sync_version: 1,
        site_name: "Public method version forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2026,
        version_number: await getNextVersionNumber(db, parcelId),
        factors: validDirectFactors,
        ...extra,
      })
      .expect(201)
    await request(server())
      .post(`/v1/surveys/${ids[key]}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)
    if (visibility === "public") {
      await request(server())
        .patch(`/v1/surveys/${ids[key]}/visibility`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ visibility: "public" })
        .expect(200)
    }
  }

  async function mapItems(query: Record<string, string> = {}): Promise<MapItem[]> {
    const response = await request(server())
      .get("/v1/public/map-items")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ bbox, ...query })
      .expect(200)
    return response.body.items as MapItem[]
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication<NestExpressApplication>()
    configureApp(app)
    db = moduleFixture.get(DatabaseService)
    await app.init()
    accessToken = await loginTestUser(app, "e2e-public-method-version")

    // A v3.2 survey sent with a region and stage: the server stores them NULL (rule 2).
    await seedSubmitted("v32Public", "public", {
      ibp_method_version: V3_2,
      ibp_cas: 2,
      ibp_cas3_scale: true,
      region_version: "ACA",
      vegetation_stage: "collineen",
    })
    // An installed app's survey: no method fields at all (NULL = v3.0).
    await seedSubmitted("untaggedPublic", "public", {
      region_version: "ACA",
      vegetation_stage: "collineen",
    })
    await seedSubmitted("v32Private", "private", { ibp_method_version: V3_2, ibp_cas: 1 })
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  it("map items carry ibp_method_version and ibp_cas, null for an untagged survey", async () => {
    const items = await mapItems()

    const v32 = items.find((item) => item.survey_id === ids.v32Public)
    expect(v32).toEqual({
      survey_id: ids.v32Public,
      display_location: { lat: expect.any(Number), lng: expect.any(Number) },
      survey_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      // A v3.2 survey has no region: the pre-01.8 fallback is unchanged.
      region_code: "unknown",
      ibp_total: 14,
      ibp_method_version: V3_2,
      ibp_cas: 2,
    })

    const untagged = items.find((item) => item.survey_id === ids.untaggedPublic)
    expect(untagged).toMatchObject({
      region_code: "ACA",
      ibp_total: 14,
      ibp_method_version: null,
      ibp_cas: null,
    })
    // The keys are present even when null (additive, the production probe relies on it).
    expect(untagged).toHaveProperty("ibp_method_version", null)
    expect(untagged).toHaveProperty("ibp_cas", null)
  })

  it("shows a never-published private survey to any member too, at its exact parcel centre", async () => {
    const items = await mapItems()

    expect(items.some((item) => item.survey_id === ids.v32Private)).toBe(true)
    for (const key of Object.keys(ids) as Array<keyof typeof ids>) {
      const stored = await db.query<{ centroid_lat: number; centroid_lng: number }>(
        `SELECT centroid_lat, centroid_lng FROM parcels WHERE parcel_id = $1`,
        [parcels[key]],
      )
      const item = items.find((candidate) => candidate.survey_id === ids[key])
      expect(item?.display_location).toEqual(
        normalizeCentroid({ lat: stored.rows[0].centroid_lat, lng: stored.rows[0].centroid_lng }),
      )
    }
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(
        [
          "display_location",
          "ibp_cas",
          "ibp_method_version",
          "ibp_total",
          "region_code",
          "survey_date",
          "survey_id",
        ].sort(),
      )
    }
  })

  it("region=ACA matches region_version exactly: the untagged ACA survey, not the v3.2 one (CH-9)", async () => {
    const items = await mapItems({ region: "ACA" })
    const found = items.map((item) => item.survey_id)

    expect(found).toContain(ids.untaggedPublic)
    expect(found).not.toContain(ids.v32Public)
    expect(found).not.toContain(ids.v32Private)
    for (const item of items) {
      expect(item.region_code).toBe("ACA")
    }

    const stored = await db.query<{ region_version: string | null }>(
      `SELECT region_version FROM surveys WHERE id = $1`,
      [ids.v32Public],
    )
    expect(stored.rows[0].region_version).toBeNull()
  })

  it("parcel statuses carry latest_ibp_method_version from the latest submitted row", async () => {
    const response = await request(server())
      .get("/v1/public/parcels/status")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ bbox, zoom: 16 })
      .expect(200)
    const items = response.body.items as ParcelStatus[]
    const byParcel = (parcelId: string) => items.find((item) => item.parcel_id === parcelId)

    expect(byParcel(parcels.v32Public)).toMatchObject({
      study_status: "studied",
      latest_submitted_survey_id: ids.v32Public,
      latest_ibp_total: 14,
      latest_ibp_method_version: V3_2,
    })
    expect(byParcel(parcels.untaggedPublic)).toMatchObject({
      study_status: "studied",
      latest_submitted_survey_id: ids.untaggedPublic,
      latest_ibp_total: 14,
      latest_ibp_method_version: null,
    })
    expect(byParcel(parcels.untaggedPublic)).toHaveProperty("latest_ibp_method_version", null)
    // A parcel whose only survey is private (never published) is studied too: association-only
    // sharing shows every submitted survey to every member, regardless of visibility.
    expect(byParcel(parcels.v32Private)).toMatchObject({
      study_status: "studied",
      latest_submitted_survey_id: ids.v32Private,
      latest_ibp_total: 14,
      latest_ibp_method_version: V3_2,
    })
  })
})
