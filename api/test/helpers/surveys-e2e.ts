import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { randomUUID } from "crypto"
import request = require("supertest")
import { AppModule } from "../../src/app.module"
import { DatabaseService } from "../../src/database/database.service"

// Phase 01.8 D-12: shared setup for the survey E2E files split out of
// surveys-idempotency.e2e-spec.ts. Ids, emails and coordinate seeds come from randomUUID(),
// never from the clock, so two runs (or two tests in the same millisecond) cannot collide.
// This file is not a spec: jest.config.js only matches *.e2e-spec.ts.

export type E2eContext = { app: INestApplication; db: DatabaseService }

/** Nest app with the production module graph and the "v1" prefix, as the original suite. */
export async function createE2eApp(): Promise<E2eContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleFixture.createNestApplication()
  const db = moduleFixture.get(DatabaseService)
  app.setGlobalPrefix("v1")
  await app.init()
  return { app, db }
}

/** `${label}-<uuid>`: a collision-free survey id (fits SAFE_ID_PATTERN for short labels). */
export function uniqueId(label: string): string {
  return `${label}-${randomUUID()}`
}

/**
 * A number in [0, 90000) for the synthetic-cadastre coordinate scheme
 * (`base + seed / 100000`), drawn from randomUUID() instead of the clock.
 */
export function uniqueCoordSeed(): number {
  return parseInt(randomUUID().slice(0, 8), 16) % 90000
}

/** Logs a fresh test user in through the debug token route and returns its access token. */
export async function loginTestUser(app: INestApplication, label: string): Promise<string> {
  const login = await request(app.getHttpServer())
    .post("/v1/debug/test-token")
    .send({ email: `${label}-${randomUUID()}@ibp.local` })
    .expect(201)
  return login.body.access_token as string
}

/** Next free version number among the submitted surveys of a parcel. */
export async function getNextVersionNumber(
  db: DatabaseService,
  parcelId: string,
  surveyIdToExclude?: string,
): Promise<number> {
  const result = await db.query<{ next_version: number }>(
    `SELECT COALESCE(MAX(s.version_number), 0) + 1 AS next_version
     FROM surveys s
     JOIN survey_parcels sp
       ON sp.survey_id = s.id
     WHERE sp.parcel_id = $1
       AND s.deleted_at IS NULL
       AND s.status = 'submitted'
       AND ($2::text IS NULL OR s.id <> $2)`,
    [parcelId, surveyIdToExclude ?? null],
  )

  return result.rows[0]?.next_version ?? 1
}

/** Resolves the parcel under (lat, lng) and returns its id (asserted non-empty). */
export async function resolveParcel(
  app: INestApplication,
  accessToken: string,
  lat: number,
  lng: number,
): Promise<string> {
  const resolved = await request(app.getHttpServer())
    .get("/v1/parcels/resolve")
    .set("Authorization", `Bearer ${accessToken}`)
    .query({ lat: String(lat), lng: String(lng) })
    .expect(200)
  const parcelId = resolved.body.parcel?.parcel_id as string
  expect(parcelId).toBeTruthy()
  return parcelId
}

/**
 * Direct A..J scores valid under both the current rules and the BUG-2 fix (D-05: G and H
 * accept only 0, 2 or 5): stand sub-total 8, context sub-total 6, total 14.
 */
export const validDirectFactors = {
  A: 1,
  B: 1,
  C: 1,
  D: 1,
  E: 1,
  F: 1,
  G: 2,
  H: 2,
  I: 2,
  J: 2,
} as const
