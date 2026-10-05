import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"
import { DatabaseService } from "../src/database/database.service"
import { CommunitySurveysService } from "../src/surveys/community-surveys.service"
import { ParcelsService } from "../src/surveys/parcels.service"
import { StorageService } from "../src/storage/storage.service"

type QueryResult = { rows: unknown[] }

function buildDb(...results: QueryResult[]) {
  const query = jest.fn()
  for (const result of results) {
    query.mockResolvedValueOnce(result)
  }
  query.mockResolvedValue({ rows: [] })
  return { query }
}

function buildStorage(mode: "local" | "minio" = "local") {
  return {
    mode,
    presignGet: jest.fn().mockResolvedValue("https://files.example/photo.jpg?sig=1"),
    getObject: jest.fn().mockResolvedValue(Buffer.from("jpeg")),
  }
}

function buildService(
  db: { query: jest.Mock },
  storage: ReturnType<typeof buildStorage> = buildStorage(),
  location: { lat: number; lng: number } | null = { lat: 47.31234, lng: 1.30987 },
) {
  const parcels = { displayLocation: jest.fn().mockResolvedValue(location) }
  const service = new CommunitySurveysService(
    db as unknown as DatabaseService,
    storage as unknown as StorageService,
    parcels as unknown as ParcelsService,
  )
  return { service, parcels }
}

const detailRow = (overrides: Record<string, unknown> = {}) => ({
  id: "s-2",
  site_name: "Bois du Second",
  parcel_id: "75101AB0123",
  observation_year: 2026,
  version_number: 2,
  region_version: null,
  vegetation_stage: null,
  ibp_method_version: "cnpf_ibp_fr_v3_2_2026-02-02",
  ibp_cas: 2,
  ibp_cas3_scale: true,
  scores: { ibp_total: 31 },
  factor_results: { A: { selected_class: "S2", score: 4 } },
  submitted_at: "2026-09-28 09:41:00+00",
  author_name: "Camille",
  parcel_ids: ["75101AB0123", "75101AB0124"],
  ...overrides,
})

const historyRow = (id: string, version: number, total: unknown) => ({
  id,
  site_name: `Site ${id}`,
  observation_year: 2025 + version,
  version_number: version,
  scores: { ibp_total: total },
  submitted_at: "2026-09-28 09:41:00+00",
  author_name: version === 1 ? null : "Camille",
})

describe("CommunitySurveysService.getDetail", () => {
  it("maps the survey with its parcels and exact location, and flags the current history entry", async () => {
    const db = buildDb(
      { rows: [detailRow()] },
      { rows: [historyRow("s-1", 1, 24), historyRow("s-2", 2, "oops")] },
    )
    const { service, parcels } = buildService(db)

    const detail = await service.getDetail("s-2")

    expect(detail).toMatchObject({
      survey_id: "s-2",
      site_name: "Bois du Second",
      author_name: "Camille",
      ibp_cas: 2,
      ibp_cas3_scale: true,
      parcel_ids: ["75101AB0123", "75101AB0124"],
      display_location: { lat: 47.31234, lng: 1.30987 },
      scores: { ibp_total: 31 },
    })
    expect(detail).not.toHaveProperty("parcel_id")
    expect(detail.history).toEqual([
      expect.objectContaining({
        survey_id: "s-1",
        ibp_total: 24,
        is_current: false,
        author_name: null,
      }),
      expect.objectContaining({ survey_id: "s-2", ibp_total: 0, is_current: true }),
    ])
    expect(parcels.displayLocation).toHaveBeenCalledWith(db, "s-2", "75101AB0123")
    expect(db.query.mock.calls[0][1]).toEqual(["s-2"])
    expect(db.query.mock.calls[1][1]).toEqual(["s-2", 20])
  })

  it("falls back to the legacy single parcel, has none without a parcel, and reads null untagged flags", async () => {
    const { service } = buildService(
      buildDb(
        { rows: [detailRow({ parcel_ids: null, ibp_cas3_scale: null })] },
        { rows: [] },
        { rows: [detailRow({ parcel_ids: null, parcel_id: null })] },
        { rows: [] },
      ),
      buildStorage(),
      null,
    )
    const legacy = await service.getDetail("s-2")
    expect(legacy.parcel_ids).toEqual(["75101AB0123"])
    expect(legacy.ibp_cas3_scale).toBe(false)
    expect(legacy.display_location).toBeNull()
    expect((await service.getDetail("s-2")).parcel_ids).toEqual([])
  })

  it("answers 404 when the survey is not a finished one", async () => {
    const { service } = buildService(buildDb({ rows: [] }))
    await expect(service.getDetail("draft")).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe("CommunitySurveysService attachments", () => {
  const survey = { rows: [{ id: "s-1" }] }
  const attachment = (overrides: Record<string, unknown> = {}) => ({
    id: "a-1",
    storage_key: "surveys/s-1/a-1.jpg",
    mime_type: "image/jpeg",
    size_bytes: 12,
    created_at: "2026-09-28 09:41:00+00",
    uploaded_at: "2026-09-28 09:42:00+00",
    ...overrides,
  })

  it("lists the uploaded files without their storage key, and 404s on a non-public survey", async () => {
    const { service } = buildService(buildDb(survey, { rows: [attachment()] }))
    expect(await service.listAttachments("s-1")).toEqual({
      items: [
        {
          id: "a-1",
          mime_type: "image/jpeg",
          size_bytes: 12,
          created_at: "2026-09-28 09:41:00+00",
        },
      ],
    })

    const { service: missing } = buildService(buildDb({ rows: [] }))
    await expect(missing.listAttachments("draft")).rejects.toBeInstanceOf(NotFoundException)
  })

  it("gives a presigned URL in MinIO mode and the authenticated content route in local mode", async () => {
    const minio = buildStorage("minio")
    const { service } = buildService(buildDb(survey, { rows: [attachment()] }), minio)
    const presigned = await service.getAttachmentDownload("s-1", "a-1")
    expect(presigned).toMatchObject({
      url: "https://files.example/photo.jpg?sig=1",
      requires_auth: false,
    })
    expect(minio.presignGet).toHaveBeenCalledWith("surveys/s-1/a-1.jpg")

    const { service: local } = buildService(buildDb(survey, { rows: [attachment()] }))
    expect(await local.getAttachmentDownload("s-1", "a-1")).toMatchObject({
      url: "/public/community-surveys/s-1/attachments/a-1/content",
      requires_auth: true,
    })
  })

  it("404s on an unknown attachment and 409s on one not uploaded yet", async () => {
    const { service: unknown } = buildService(buildDb(survey, { rows: [] }))
    await expect(unknown.getAttachmentDownload("s-1", "nope")).rejects.toBeInstanceOf(
      NotFoundException,
    )
    const { service: pending } = buildService(
      buildDb(survey, { rows: [attachment({ uploaded_at: null })] }),
    )
    await expect(pending.getAttachmentDownload("s-1", "a-1")).rejects.toBeInstanceOf(
      ConflictException,
    )
  })

  it("serves the content in local mode only, with its type, and 404s on a key outside the root", async () => {
    const storage = buildStorage()
    const { service } = buildService(buildDb(survey, { rows: [attachment()] }), storage)
    expect(await service.getAttachmentContent("s-1", "a-1")).toEqual({
      buffer: Buffer.from("jpeg"),
      mimeType: "image/jpeg",
    })

    const { service: untyped } = buildService(
      buildDb(survey, { rows: [attachment({ mime_type: null })] }),
    )
    expect((await untyped.getAttachmentContent("s-1", "a-1")).mimeType).toBe(
      "application/octet-stream",
    )

    const minio = buildStorage("minio")
    const { service: remote } = buildService(buildDb(survey), minio)
    await expect(remote.getAttachmentContent("s-1", "a-1")).rejects.toBeInstanceOf(
      NotFoundException,
    )

    const outside = buildStorage()
    outside.getObject.mockRejectedValue(new BadRequestException("outside"))
    const { service: escaped } = buildService(buildDb(survey, { rows: [attachment()] }), outside)
    await expect(escaped.getAttachmentContent("s-1", "a-1")).rejects.toBeInstanceOf(
      NotFoundException,
    )

    const broken = buildStorage()
    broken.getObject.mockRejectedValue(new Error("disk"))
    const { service: failing } = buildService(buildDb(survey, { rows: [attachment()] }), broken)
    await expect(failing.getAttachmentContent("s-1", "a-1")).rejects.toThrow("disk")
  })
})
