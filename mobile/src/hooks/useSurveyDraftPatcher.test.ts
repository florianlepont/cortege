/**
 * Tests for useSurveyDraftPatcher — direct draft patching hook.
 *
 * Strategy: mock storage module, inject a minimal surveyList stub, and
 * verify that each handler correctly delegates to patchSurveyDraftDirectly.
 */

jest.mock("react-native", () => ({
  Platform: { select: (opts: Record<string, unknown>) => opts.default ?? Object.values(opts)[0] },
}))

jest.mock("../storage/surveys", () => ({
  getLocalSurveyDraft: jest.fn(),
  updateLocalDraft: jest.fn(),
}))

import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../i18n"
import { getLocalSurveyDraft, updateLocalDraft } from "../storage/surveys"
import type { SurveyQueuePayload } from "../storage/types"
import { applyMethodFields } from "../storage/utils"
import { useSurveyDraftPatcher } from "./useSurveyDraftPatcher"

const mockGetLocalSurveyDraft = getLocalSurveyDraft as jest.Mock
const mockUpdateLocalDraft = updateLocalDraft as jest.Mock

const TEST_SURVEY_ID = "survey-test-1"

function makeDraftRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_SURVEY_ID,
    site_name: "Old site",
    region_version: "ACA",
    vegetation_stage: "adult",
    parcel_ids: ["AB001"],
    factors: { A: { native_genus_count: 3 } },
    ...overrides,
  }
}

describe("useSurveyDraftPatcher", () => {
  let onStatusChange: jest.Mock
  let surveyList: {
    surveys: Record<string, unknown>[]
    refreshLocalSurveys: jest.Mock
    refreshLocalAttachments: jest.Mock
  }

  function useBuildHook() {
    return useSurveyDraftPatcher({ surveyList: surveyList as never, onStatusChange })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    onStatusChange = jest.fn()
    surveyList = {
      surveys: [],
      refreshLocalSurveys: jest.fn().mockResolvedValue(undefined),
      refreshLocalAttachments: jest.fn().mockResolvedValue(undefined),
    }
    mockUpdateLocalDraft.mockResolvedValue({})
  })

  // ─── patchSurveyDraftDirectly ──────────────────────────────────────────────

  describe("patchSurveyDraftDirectly", () => {
    test("returns false when survey is submitted (read-only)", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "submitted", visibility: "private" }]
      const { patchSurveyDraftDirectly } = useBuildHook()

      const result = await patchSurveyDraftDirectly(
        TEST_SURVEY_ID,
        (d) => d,
        fr.status.editing.draftCreated(),
      )

      expect(result).toBe(false)
      expect(onStatusChange).toHaveBeenCalledWith(
        fr.status.editing.readOnly({ name: fr.common.untitledSurvey }),
      )
      expect(mockUpdateLocalDraft).not.toHaveBeenCalled()
    })

    test("returns false when survey is not found locally", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "private" }]
      mockGetLocalSurveyDraft.mockResolvedValue(null)
      const { patchSurveyDraftDirectly } = useBuildHook()

      const result = await patchSurveyDraftDirectly(
        TEST_SURVEY_ID,
        (d) => d,
        fr.status.editing.draftCreated(),
      )

      expect(result).toBe(false)
      expect(onStatusChange).toHaveBeenCalledWith(fr.status.editing.notFound())
    })

    test("calls updateLocalDraft with mutated data and returns true", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "public" }]
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow())
      const { patchSurveyDraftDirectly } = useBuildHook()

      const result = await patchSurveyDraftDirectly(
        TEST_SURVEY_ID,
        (draft) => ({ ...draft, site_name: "New name" }),
        fr.status.editing.renamed({ name: "New name" }),
      )

      expect(result).toBe(true)
      expect(mockUpdateLocalDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          survey_id: TEST_SURVEY_ID,
          site_name: "New name",
          visibility: "public",
        }),
      )
      expect(onStatusChange).toHaveBeenCalledWith(fr.status.editing.renamed({ name: "New name" }))
    })

    test("refreshes surveys and attachments on success", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "private" }]
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow())
      const { patchSurveyDraftDirectly } = useBuildHook()

      await patchSurveyDraftDirectly(TEST_SURVEY_ID, (d) => d, fr.status.editing.draftCreated())

      expect(surveyList.refreshLocalSurveys).toHaveBeenCalled()
      expect(surveyList.refreshLocalAttachments).toHaveBeenCalled()
    })

    test("returns false and reports error on storage exception", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "private" }]
      mockGetLocalSurveyDraft.mockRejectedValue(new Error("DB crash"))
      const { patchSurveyDraftDirectly } = useBuildHook()

      const result = await patchSurveyDraftDirectly(
        TEST_SURVEY_ID,
        (d) => d,
        fr.status.editing.draftCreated(),
      )

      expect(result).toBe(false)
      expect(onStatusChange).toHaveBeenCalledWith(fr.status.editing.updateFailed())
    })

    test("treats survey as non-submitted when not found in surveys list", async () => {
      surveyList.surveys = [] // survey not in list — no status check
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow())
      const { patchSurveyDraftDirectly } = useBuildHook()

      const result = await patchSurveyDraftDirectly(
        TEST_SURVEY_ID,
        (d) => d,
        fr.status.editing.draftCreated(),
      )

      expect(result).toBe(true)
    })
  })

  // ─── handleRenameSurvey ────────────────────────────────────────────────────

  describe("handleRenameSurvey", () => {
    test("saves trimmed site name", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "private" }]
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow())
      const { handleRenameSurvey } = useBuildHook()

      await handleRenameSurvey(TEST_SURVEY_ID, "  Forest Nord  ")

      expect(mockUpdateLocalDraft).toHaveBeenCalledWith(
        expect.objectContaining({ site_name: "Forest Nord" }),
      )
    })

    test("falls back to the untitled survey name for blank name", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "private" }]
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow())
      const { handleRenameSurvey } = useBuildHook()

      await handleRenameSurvey(TEST_SURVEY_ID, "   ")

      expect(mockUpdateLocalDraft).toHaveBeenCalledWith(
        expect.objectContaining({ site_name: fr.common.untitledSurvey }),
      )
    })
  })

  // ─── handleUpdateSurveyRegionVersion ──────────────────────────────────────

  describe("handleUpdateSurveyRegionVersion", () => {
    test("updates region_version", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "private" }]
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow())
      const { handleUpdateSurveyRegionVersion } = useBuildHook()

      await handleUpdateSurveyRegionVersion(TEST_SURVEY_ID, "M")

      expect(mockUpdateLocalDraft).toHaveBeenCalledWith(
        expect.objectContaining({ region_version: "M" }),
      )
    })

    test("normalizes vegetation stage when region changes", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "private" }]
      // 'adult' stage must be valid for both regions or get normalized
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow({ vegetation_stage: "adult" }))
      const { handleUpdateSurveyRegionVersion } = useBuildHook()

      await handleUpdateSurveyRegionVersion(TEST_SURVEY_ID, "ACA")

      expect(mockUpdateLocalDraft).toHaveBeenCalledWith(
        expect.objectContaining({ region_version: "ACA", vegetation_stage: expect.any(String) }),
      )
    })
  })

  // ─── handleUpdateSurveyVegetationStage ────────────────────────────────────

  describe("handleUpdateSurveyVegetationStage", () => {
    test("updates vegetation_stage normalized for current region", async () => {
      surveyList.surveys = [{ id: TEST_SURVEY_ID, status: "draft", visibility: "private" }]
      mockGetLocalSurveyDraft.mockResolvedValue(
        makeDraftRow({ region_version: "ACA", vegetation_stage: "young" }),
      )
      const { handleUpdateSurveyVegetationStage } = useBuildHook()

      await handleUpdateSurveyVegetationStage(TEST_SURVEY_ID, "planitiaire")

      expect(mockUpdateLocalDraft).toHaveBeenCalledWith(
        expect.objectContaining({ vegetation_stage: expect.any(String) }),
      )
    })
  })

  // ─── Method version, cas and cas-3 flag (01.8-10) ─────────────────────────

  describe("method fields (D-02, D-08)", () => {
    // What storage would write (its 01.8-08 rule), from the stored row and the patch input.
    const storedPayload = (row: Record<string, unknown>) => {
      const input = mockUpdateLocalDraft.mock.calls[0][0] as Record<string, unknown>
      return applyMethodFields(
        {
          ...(row as SurveyQueuePayload),
          site_name: input.site_name as string,
          parcel_ids: input.parcel_ids as string[],
          factors: input.factors as Record<string, unknown>,
        },
        input,
      )
    }

    const v32Row = (overrides: Record<string, unknown> = {}) => ({
      id: TEST_SURVEY_ID,
      site_name: "Bois",
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
      ibp_cas3_scale: false,
      parcel_ids: ["AB001"],
      factors: { A: { native_genus_count: 3, native_cover_percent: 60 } },
      ...overrides,
    })

    beforeEach(() => {
      surveyList.surveys = [
        { id: TEST_SURVEY_ID, status: "draft", visibility: "private", site_name: "Bois" },
      ]
    })

    test("switching an ACA/collineen draft to v3.2 moves the cover and drops region/stage", async () => {
      const row = makeDraftRow({
        vegetation_stage: "collineen",
        factors: {
          A: { native_genus_count: 3 },
          B: { strata_count: 4, covered_autochthonous_percent: 40 },
        },
      })
      mockGetLocalSurveyDraft.mockResolvedValue(row)
      const { handleSwitchSurveyToV32 } = useBuildHook()

      await handleSwitchSurveyToV32(TEST_SURVEY_ID)

      const input = mockUpdateLocalDraft.mock.calls[0][0]
      expect(input).toMatchObject({
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 1,
        ibp_cas3_scale: false,
      })
      expect(input).not.toHaveProperty("region_version")
      expect(input).not.toHaveProperty("vegetation_stage")
      expect(input.factors).toEqual({
        A: { native_genus_count: 3, native_cover_percent: 40 },
        B: { strata_count: 4 },
      })
      const payload = storedPayload(row)
      expect(payload.ibp_method_version).toBe(IBP_METHOD_V3_2)
      expect(payload).not.toHaveProperty("region_version")
      expect(payload).not.toHaveProperty("vegetation_stage")
      expect(onStatusChange).toHaveBeenCalledWith(fr.status.editing.switchedToV32({ name: "Bois" }))
    })

    test("switching an ACA/subalpin draft leaves the cas for the observer to pick", async () => {
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow({ vegetation_stage: "subalpin" }))
      const { handleSwitchSurveyToV32 } = useBuildHook()

      await handleSwitchSurveyToV32(TEST_SURVEY_ID)

      expect(mockUpdateLocalDraft).toHaveBeenCalledWith(
        expect.objectContaining({ ibp_method_version: IBP_METHOD_V3_2, ibp_cas: null }),
      )
    })

    test("switching a draft already on v3.2 writes nothing", async () => {
      mockGetLocalSurveyDraft.mockResolvedValue(v32Row())
      const { handleSwitchSurveyToV32 } = useBuildHook()

      await handleSwitchSurveyToV32(TEST_SURVEY_ID)

      expect(mockUpdateLocalDraft).not.toHaveBeenCalled()
      expect(onStatusChange).toHaveBeenCalledWith(
        fr.status.editing.switchNotAllowed({ name: "Bois" }),
      )
    })

    test("a submitted survey is never switched or patched", async () => {
      surveyList.surveys = [
        { id: TEST_SURVEY_ID, status: "submitted", visibility: "private", site_name: "Bois" },
      ]
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow())
      const { handleSwitchSurveyToV32, handleUpdateSurveyIbpCas, handleUpdateSurveyCas3Scale } =
        useBuildHook()

      await handleSwitchSurveyToV32(TEST_SURVEY_ID)
      await handleUpdateSurveyIbpCas(TEST_SURVEY_ID, 2)
      await handleUpdateSurveyCas3Scale(TEST_SURVEY_ID, true)

      expect(mockGetLocalSurveyDraft).not.toHaveBeenCalled()
      expect(mockUpdateLocalDraft).not.toHaveBeenCalled()
      expect(onStatusChange).toHaveBeenCalledWith(fr.status.editing.readOnly({ name: "Bois" }))
    })

    test("renaming a v3.2 draft keeps its method fields and adds no region/stage", async () => {
      const row = v32Row({ ibp_cas: 2, ibp_cas3_scale: true })
      mockGetLocalSurveyDraft.mockResolvedValue(row)
      const { handleRenameSurvey } = useBuildHook()

      await handleRenameSurvey(TEST_SURVEY_ID, "Nouveau nom")

      const input = mockUpdateLocalDraft.mock.calls[0][0]
      expect(input).toMatchObject({
        site_name: "Nouveau nom",
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 2,
        ibp_cas3_scale: true,
      })
      expect(input).not.toHaveProperty("region_version")
      expect(input).not.toHaveProperty("vegetation_stage")
      const payload = storedPayload(row)
      expect(payload).not.toHaveProperty("region_version")
      expect(payload).not.toHaveProperty("vegetation_stage")
      expect(payload).toMatchObject({ ibp_cas: 2, ibp_cas3_scale: true })
    })

    test("renaming an untagged legacy draft keeps it untagged with its region/stage", async () => {
      const row = makeDraftRow({ region_version: "M", vegetation_stage: "meso_mediterraneen" })
      mockGetLocalSurveyDraft.mockResolvedValue(row)
      const { handleRenameSurvey } = useBuildHook()

      await handleRenameSurvey(TEST_SURVEY_ID, "Autre nom")

      const input = mockUpdateLocalDraft.mock.calls[0][0]
      expect(input).not.toHaveProperty("ibp_method_version")
      expect(input).not.toHaveProperty("ibp_cas")
      expect(input).toMatchObject({ region_version: "M", vegetation_stage: "meso_mediterraneen" })
      const payload = storedPayload(row)
      expect(payload).not.toHaveProperty("ibp_method_version")
      expect(payload).toMatchObject({ region_version: "M", vegetation_stage: "meso_mediterraneen" })
    })

    test("handleUpdateSurveyIbpCas sets the cas of a v3.2 draft", async () => {
      const row = v32Row()
      mockGetLocalSurveyDraft.mockResolvedValue(row)
      const { handleUpdateSurveyIbpCas } = useBuildHook()

      await handleUpdateSurveyIbpCas(TEST_SURVEY_ID, 3)

      expect(storedPayload(row)).toMatchObject({ ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 3 })
      expect(storedPayload(row)).not.toHaveProperty("region_version")
      expect(onStatusChange).toHaveBeenCalledWith(fr.status.editing.ibpCasUpdated({ name: "Bois" }))
    })

    test("handleUpdateSurveyIbpCas on a v3.0 draft writes nothing", async () => {
      mockGetLocalSurveyDraft.mockResolvedValue(makeDraftRow())
      const { handleUpdateSurveyIbpCas } = useBuildHook()

      await handleUpdateSurveyIbpCas(TEST_SURVEY_ID, 3)

      expect(mockUpdateLocalDraft).not.toHaveBeenCalled()
      expect(onStatusChange).toHaveBeenCalledWith(
        fr.status.editing.switchNotAllowed({ name: "Bois" }),
      )
    })

    test("handleUpdateSurveyCas3Scale sets the flag of a v3.2 draft only", async () => {
      const row = v32Row()
      mockGetLocalSurveyDraft.mockResolvedValue(row)
      const { handleUpdateSurveyCas3Scale } = useBuildHook()

      await handleUpdateSurveyCas3Scale(TEST_SURVEY_ID, true)

      expect(storedPayload(row)).toMatchObject({ ibp_cas3_scale: true, ibp_cas: 1 })
      expect(onStatusChange).toHaveBeenCalledWith(
        fr.status.editing.cas3ScaleUpdated({ name: "Bois" }),
      )

      mockUpdateLocalDraft.mockClear()
      mockGetLocalSurveyDraft.mockResolvedValue(
        makeDraftRow({ ibp_method_version: IBP_METHOD_V3_0 }),
      )
      await handleUpdateSurveyCas3Scale(TEST_SURVEY_ID, true)
      expect(mockUpdateLocalDraft).not.toHaveBeenCalled()
    })

    test("the region and stage handlers write nothing on a v3.2 draft", async () => {
      mockGetLocalSurveyDraft.mockResolvedValue(v32Row())
      const { handleUpdateSurveyRegionVersion, handleUpdateSurveyVegetationStage } = useBuildHook()

      await handleUpdateSurveyRegionVersion(TEST_SURVEY_ID, "M")
      await handleUpdateSurveyVegetationStage(TEST_SURVEY_ID, "montagnard")

      expect(mockUpdateLocalDraft).not.toHaveBeenCalled()
      expect(onStatusChange).toHaveBeenCalledWith(
        fr.status.editing.switchNotAllowed({ name: "Bois" }),
      )
    })

    test("a tagged v3.0 draft keeps its tag and region/stage when patched", async () => {
      const row = makeDraftRow({
        ibp_method_version: IBP_METHOD_V3_0,
        region_version: "ACA",
        vegetation_stage: "montagnard",
      })
      mockGetLocalSurveyDraft.mockResolvedValue(row)
      const { handleUpdateSurveyVegetationStage } = useBuildHook()

      await handleUpdateSurveyVegetationStage(TEST_SURVEY_ID, "planitiaire")

      expect(mockUpdateLocalDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          ibp_method_version: IBP_METHOD_V3_0,
          region_version: "ACA",
          vegetation_stage: "planitiaire",
        }),
      )
      expect(mockUpdateLocalDraft.mock.calls[0][0]).not.toHaveProperty("ibp_cas")
    })
  })
})
