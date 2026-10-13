import { ConflictException, NotFoundException, UnprocessableEntityException } from "@nestjs/common"
import { AuthenticatedUser } from "../src/auth/auth.types"
import { DatabaseService } from "../src/database/database.service"
import { StorageService } from "../src/storage/storage.service"
import { IbpRulesService } from "../src/surveys/ibp-rules.service"
import { ParcelsService } from "../src/surveys/parcels.service"
import { SurveyEventsService } from "../src/surveys/survey-events.service"
import { SurveysService } from "../src/surveys/surveys.service"
import { SurveysRepository } from "../src/surveys/surveys.repository"

// Phase 29 (D-07, D-08): the visibility is chosen on the draft and frozen at submit, on every
// write channel. The PATCH lookups lock the row (submit locks it too), the visibility UPDATE is
// guarded by the status, and a refusal carries details.fields so the sync mapper keeps the name.
describe("SurveysService visibility write guard (phase 29, D-07)", () => {
  const user = { id: "11111111-1111-4111-8111-111111111111" } as AuthenticatedUser

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: "survey-1",
    user_id: user.id,
    site_name: "Stored",
    status: "draft",
    visibility: "private",
    parcel_id: null,
    observation_year: null,
    version_number: null,
    previous_survey_id: null,
    region_version: null,
    vegetation_stage: null,
    ibp_method_version: null,
    ibp_cas: null,
    ibp_cas3_scale: null,
    survey_note: null,
    weather: null,
    factors: {},
    factor_results: {},
    scores: {},
    created_at: "2026-01-01 00:00:00+00",
    updated_at: "2026-01-01 00:00:00+00",
    submitted_at: null,
    sync_version: 1,
    last_sync_error: null,
    deleted_at: null,
    ...overrides,
  })

  const submitted = (overrides: Record<string, unknown> = {}) =>
    row({ status: "submitted", submitted_at: "2026-01-02 00:00:00+00", ...overrides })

  function setup(stored: Record<string, unknown> | null, reRead = stored) {
    const txQuery = jest.fn().mockResolvedValue({ rows: [] })
    const db = {
      query: jest.fn(),
      transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({ query: txQuery }),
      ),
    }
    const repository = {
      findOwnedOrThrow: jest.fn(async () => {
        if (!stored) throw new NotFoundException("Survey not found")
        return stored
      }),
      findOwned: jest.fn(async (_db: unknown, _id: string, _user: string, options: unknown) =>
        (options as { forUpdate?: boolean }).forUpdate ? stored : reRead,
      ),
      readForUpsert: jest
        .fn()
        .mockResolvedValue(stored ? { ...stored, cas_token: "1", parcel_ids: [] } : null),
      getSurveyParcelIds: jest.fn().mockResolvedValue([]),
    }
    const ibpRules = {
      validateDraft: jest.fn().mockReturnValue({
        ok: true,
        errors: [],
        warnings: [],
        issues: [],
        factor_scores: null,
        factor_results: null,
        scores: null,
      }),
    }
    const events = { insert: jest.fn().mockResolvedValue(undefined) }
    const service = new SurveysService(
      db as unknown as DatabaseService,
      ibpRules as unknown as IbpRulesService,
      {} as StorageService,
      repository as unknown as SurveysRepository,
      events as unknown as SurveyEventsService,
      {} as ParcelsService,
    )
    return { service, repository, txQuery, events }
  }

  async function caught(promise: Promise<unknown>): Promise<unknown> {
    try {
      await promise
    } catch (error) {
      return error
    }
    throw new Error("expected a rejection")
  }

  describe("patchSurveyVisibility", () => {
    it("locks the row and refuses a different value on a submitted survey with a 422", async () => {
      const { service, repository, txQuery, events } = setup(submitted())

      const error = await caught(
        service.patchSurveyVisibility(user, "survey-1", { visibility: "public" }),
      )

      expect(error).toBeInstanceOf(UnprocessableEntityException)
      expect((error as UnprocessableEntityException).getResponse()).toEqual({
        code: "submitted_read_only_fields",
        message: "submitted survey visibility is read-only",
        forbidden_fields: ["visibility"],
        details: { survey_id: "survey-1", fields: ["visibility"] },
      })
      expect(repository.findOwnedOrThrow).toHaveBeenCalledWith(
        expect.anything(),
        "survey-1",
        user.id,
        expect.objectContaining({ activeOnly: true, columns: "full", forUpdate: true }),
      )
      expect(txQuery).not.toHaveBeenCalled()
      expect(events.insert).not.toHaveBeenCalled()
    })

    it("answers the stored value as a no-op on a submitted survey and on a draft", async () => {
      for (const stored of [submitted({ visibility: "public" }), row({ visibility: "public" })]) {
        const { service, txQuery, events } = setup(stored)
        await expect(
          service.patchSurveyVisibility(user, "survey-1", { visibility: "public" }),
        ).resolves.toEqual({
          id: "survey-1",
          visibility: "public",
          updated_at: "2026-01-01 00:00:00+00",
        })
        expect(txQuery).not.toHaveBeenCalled()
        expect(events.insert).not.toHaveBeenCalled()
      }
    })

    it("applies a draft change with the status-guarded UPDATE and one visibility_changed event (D-08)", async () => {
      const { service, txQuery, events } = setup(row())
      txQuery.mockResolvedValueOnce({
        rows: [{ id: "survey-1", visibility: "public", updated_at: "t2" }],
      })

      await expect(
        service.patchSurveyVisibility(user, "survey-1", { visibility: "public" }),
      ).resolves.toEqual({ id: "survey-1", visibility: "public", updated_at: "t2" })

      const [sql] = txQuery.mock.calls[0] as [string, unknown[]]
      expect(sql).toContain("AND status <> 'submitted'")
      expect(events.insert).toHaveBeenCalledTimes(1)
      expect(events.insert).toHaveBeenCalledWith(
        expect.anything(),
        "survey-1",
        user.id,
        "visibility_changed",
        { from: "private", to: "public" },
      )
    })

    it("answers 422 when the guarded UPDATE finds the row submitted", async () => {
      const { service, events } = setup(row(), submitted())

      const error = await caught(
        service.patchSurveyVisibility(user, "survey-1", { visibility: "public" }),
      )

      expect(error).toBeInstanceOf(UnprocessableEntityException)
      expect((error as UnprocessableEntityException).getResponse()).toMatchObject({
        code: "submitted_read_only_fields",
        details: { fields: ["visibility"] },
      })
      expect(events.insert).not.toHaveBeenCalled()
    })

    it("keeps the 404 when the guarded UPDATE finds no row", async () => {
      const { service } = setup(row(), null)
      await expect(
        service.patchSurveyVisibility(user, "survey-1", { visibility: "public" }),
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe("patchSurvey", () => {
    it("locks the row and refuses visibility on a submitted survey with details.fields", async () => {
      const { service, repository, txQuery } = setup(submitted())

      const error = await caught(service.patchSurvey(user, "survey-1", { visibility: "public" }))

      expect(error).toBeInstanceOf(UnprocessableEntityException)
      expect((error as UnprocessableEntityException).getResponse()).toEqual({
        code: "submitted_read_only_fields",
        message: "submitted survey is read-only for observation fields",
        forbidden_fields: ["visibility"],
        details: { survey_id: "survey-1", fields: ["visibility"] },
      })
      expect(repository.findOwnedOrThrow).toHaveBeenCalledWith(
        expect.anything(),
        "survey-1",
        user.id,
        expect.objectContaining({ forUpdate: true }),
      )
      expect(txQuery).not.toHaveBeenCalled()
    })
  })

  describe("upsert of a submitted survey with a higher sync_version", () => {
    const upsertBody = (visibility?: "private" | "public") => ({
      id: "survey-1",
      sync_version: 2,
      site_name: "Stored",
      factors: {},
      ...(visibility ? { visibility } : {}),
    })

    it("refuses a different visibility with 409 survey_submitted_read_only", async () => {
      const { service, txQuery } = setup(submitted())

      const error = await caught(service.upsertForUser(user, upsertBody("public")))

      expect(error).toBeInstanceOf(ConflictException)
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: "survey_submitted_read_only",
        details: { survey_id: "survey-1", fields: ["visibility"] },
      })
      expect(txQuery).not.toHaveBeenCalled()
    })

    it("writes the stored visibility back in the restricted UPDATE (equal or absent value)", async () => {
      for (const visibility of ["private", undefined] as const) {
        const { service, txQuery } = setup(submitted())
        txQuery.mockResolvedValueOnce({ rows: [{ id: "survey-1", updated_at: "t2" }] })

        await service.upsertForUser(user, upsertBody(visibility))

        const [sql, values] = txQuery.mock.calls[0] as [string, unknown[]]
        expect(sql).toContain("SET visibility = $3")
        expect(values[2]).toBe("private")
      }
    })
  })
})
