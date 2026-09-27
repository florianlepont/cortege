/**
 * Tests for useSurveyForm.
 *
 * Strategy: render the real hook with renderHook from
 * @testing-library/react-native/pure (see render-hook-smoke.test.ts). The render
 * computes every memoised value (formErrors, factorSections,
 * factorRetainedScores, draftInput) and the validators they call
 * (numberError, oneOfError, requiredError). Setters and updaters run inside
 * act() and the tests read the resulting state from result.current.
 */

jest.mock("react-native", () => ({}))

const mockComputeRetainedScores = jest.fn()
const mockNormalizeVegetationStage = jest.fn()
const mockDefaultVegetationStage = jest.fn()
const mockParseFinite = jest.fn()

jest.mock("../app/constants", () => ({
  DEFAULT_SURVEY_FORM: {
    siteName: "",
    regionVersion: "ACA",
    vegetationStage: "collineen",
    ibpMethodVersion: "cnpf_ibp_fr_v3_2_2026-02-02",
    ibpCas: 1,
    ibpCas3Scale: false,
    gpsLocation: { lat: "", lng: "", collected_at: "" },
    factorA: { native_genus_count: "", native_cover_percent: "" },
    factorB: { strata_count: "" },
    factorC: { bmg_count: "", bmm_count: "", surface_ha: "" },
    factorD: { bmg_count: "", bmm_count: "", surface_ha: "" },
    factorE: { tgb_count: "", gb_count: "", surface_ha: "" },
    factorF: { trees_per_ha: "" },
    factorG: { open_flowering_percent: "" },
    factorH: { class_score: "" },
    factorI: { type_count: "" },
    factorJ: { type_count: "" },
  },
  normalizeVegetationStageForRegion: (...args: unknown[]) => mockNormalizeVegetationStage(...args),
  defaultVegetationStageForRegion: (...args: unknown[]) => mockDefaultVegetationStage(...args),
}))

jest.mock("../app/ibp-scoring", () => ({
  computeRetainedScoresFromRawFactors: (...args: unknown[]) => mockComputeRetainedScores(...args),
}))

jest.mock("../app/number-utils", () => ({
  parseFiniteNumberInput: (...args: unknown[]) => mockParseFinite(...args),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../i18n"
import { useSurveyForm } from "./useSurveyForm"

const { fields, rules } = fr.validation

async function renderForm() {
  const { result } = await renderHook(() => useSurveyForm())
  return result
}

async function buildHook() {
  return (await renderForm()).current
}

describe("useSurveyForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNormalizeVegetationStage.mockReturnValue("collineen")
    mockDefaultVegetationStage.mockReturnValue("collineen")
    mockComputeRetainedScores.mockReturnValue({})
    mockParseFinite.mockReturnValue(null)
  })

  afterEach(async () => {
    await cleanup()
  })

  // ─── Initialization ───────────────────────────────────────────────────────

  describe("hook initialization", () => {
    test("returns all expected properties", async () => {
      const hook = await buildHook()
      expect(hook).toHaveProperty("siteName")
      expect(hook).toHaveProperty("regionVersion")
      expect(hook).toHaveProperty("vegetationStage")
      expect(hook).toHaveProperty("gpsLocation")
      expect(hook).toHaveProperty("selectedParcelIds")
      expect(hook).toHaveProperty("factorSections")
      expect(hook).toHaveProperty("formErrors")
      expect(hook).toHaveProperty("draftInput")
      expect(hook).toHaveProperty("factorRetainedScores")
      expect(hook).toHaveProperty("applyDraftToForm")
      expect(hook).toHaveProperty("resetSurveyForm")
      expect(hook).toHaveProperty("buildDraftInput")
    })

    test("calls computeRetainedScoresFromRawFactors on render", async () => {
      await buildHook()
      expect(mockComputeRetainedScores).toHaveBeenCalled()
    })

    test("factorSections has all 10 factors", async () => {
      const hook = await buildHook()
      expect(Object.keys(hook.factorSections)).toEqual([
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
      ])
    })

    test("factorSections A has the count and the native cover, both required (CH-1)", async () => {
      const hook = await buildHook()
      expect(hook.factorSections.A).toHaveLength(2)
      expect(hook.factorSections.A[0].error).toBe(rules.required(fields.native_genus_count))
      expect(hook.factorSections.A[1].label).toBe(fields.native_cover_percent)
      expect(hook.factorSections.A[1].error).toBe(rules.required(fields.native_cover_percent))
    })

    test("factorSections B has the strata count only (no cover field)", async () => {
      const hook = await buildHook()
      expect(hook.factorSections.B.map((field) => field.label)).toEqual([fields.strata_count])
    })

    test("factorSections H uses oneOfError (shows required error when empty)", async () => {
      const hook = await buildHook()
      expect(hook.factorSections.H[0].error).toBe(rules.required(fields.class_score))
    })

    test("formErrors.siteName is set when siteName is empty", async () => {
      const hook = await buildHook()
      expect(hook.formErrors.siteName).toBe(rules.required(fields.siteName))
    })

    test("draftInput has expected shape", async () => {
      const hook = await buildHook()
      expect(hook.draftInput).toHaveProperty("site_name")
      expect(hook.draftInput).toHaveProperty("ibp_method_version")
      expect(hook.draftInput).toHaveProperty("ibp_cas")
      expect(hook.draftInput).toHaveProperty("factors")
      expect(hook.draftInput).toHaveProperty("parcel_ids")
    })
  })

  // ─── draftInput.factors (buildFactorsPayload) ────────────────────────────

  describe("draftInput.factors (buildFactorsPayload)", () => {
    test("returns empty object when parseFiniteNumberInput returns null for all", async () => {
      mockParseFinite.mockReturnValue(null)
      const hook = await buildHook()
      expect(hook.draftInput.factors).toEqual({})
    })

    test("includes all factors when inputs parse to 2 (valid for all constraints)", async () => {
      // 2: integer, >= 0, <= 100, in [0, 2, 5]
      mockParseFinite.mockReturnValue(2)
      const hook = await buildHook()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = hook.draftInput.factors as any
      expect(payload).toHaveProperty("A")
      expect(payload).toHaveProperty("B")
      expect(payload).toHaveProperty("C")
      expect(payload).toHaveProperty("D")
      expect(payload).toHaveProperty("E")
      expect(payload).toHaveProperty("F")
      expect(payload).toHaveProperty("G")
      expect(payload).toHaveProperty("H")
      expect(payload).toHaveProperty("I")
      expect(payload).toHaveProperty("J")
      expect(payload.A).toEqual({ native_genus_count: 2, native_cover_percent: 2 })
      expect(payload.B).toEqual({ strata_count: 2 })
      expect(payload.H).toEqual({ class_score: 2 })
    })

    test("excludes factor H when class_score is not in [0, 2, 5]", async () => {
      mockParseFinite.mockReturnValue(3)
      const hook = await buildHook()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = hook.draftInput.factors as any
      expect(payload).not.toHaveProperty("H")
      expect(payload).toHaveProperty("A")
    })

    test("excludes factor B when its strata count is null", async () => {
      mockParseFinite.mockReturnValue(null)
      const hook = await buildHook()
      expect(hook.draftInput.factors).not.toHaveProperty("B")
    })
  })

  // ─── buildDraftInput ──────────────────────────────────────────────────────

  describe("buildDraftInput", () => {
    test("returns the computed draftInput object", async () => {
      const hook = await buildHook()
      const result = hook.buildDraftInput()
      expect(result).toHaveProperty("site_name")
      expect(result).toHaveProperty("ibp_method_version", IBP_METHOD_V3_2)
      expect(result).toHaveProperty("parcel_ids")
    })
  })

  // ─── applyDraftToForm ─────────────────────────────────────────────────────

  describe("applyDraftToForm", () => {
    test("applies site_name from draft", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.applyDraftToForm({ site_name: "My Forest" })
      })
      expect(result.current.siteName).toBe("My Forest")
    })

    test("uses 'ACA' region version for unknown values", async () => {
      const hook = await buildHook()
      await act(async () => {
        hook.applyDraftToForm({ region_version: "UNKNOWN", vegetation_stage: "collineen" })
      })
      expect(mockNormalizeVegetationStage).toHaveBeenCalledWith("ACA", "collineen")
    })

    test("uses 'M' region version when specified", async () => {
      const hook = await buildHook()
      await act(async () => {
        hook.applyDraftToForm({ region_version: "M", vegetation_stage: "montagnard" })
      })
      expect(mockNormalizeVegetationStage).toHaveBeenCalledWith("M", "montagnard")
    })

    test("falls back to DEFAULT_SURVEY_FORM.siteName when site_name is missing", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setSiteName("Previous site")
      })
      await act(async () => {
        result.current.applyDraftToForm({})
      })
      expect(result.current.siteName).toBe("")
    })

    test("handles null draft without throwing (asObject returns {})", async () => {
      const hook = await buildHook()
      await act(async () => {
        expect(() => hook.applyDraftToForm(null)).not.toThrow()
      })
    })

    test("handles non-object draft (string) without throwing", async () => {
      const hook = await buildHook()
      await act(async () => {
        expect(() => hook.applyDraftToForm("not-an-object")).not.toThrow()
      })
    })

    test("handles array draft without throwing (asObject returns {})", async () => {
      const hook = await buildHook()
      await act(async () => {
        expect(() => hook.applyDraftToForm([1, 2, 3])).not.toThrow()
      })
    })

    test("normalizes parcel_ids: trims, uppercases, deduplicates, skips non-strings", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.applyDraftToForm({
          parcel_ids: ["  abc  ", "DEF", "abc", 123, null, ""],
        })
      })
      expect(result.current.selectedParcelIds).toEqual(["ABC", "DEF"])
    })

    test("applies numeric factor values (converted to strings via toTextNum)", async () => {
      const hook = await buildHook()
      await act(async () => {
        expect(() =>
          hook.applyDraftToForm({
            factors: {
              A: { native_genus_count: 5 },
              B: { strata_count: 3, covered_autochthonous_percent: 75.5 },
              F: { trees_per_ha: 100 },
            },
          }),
        ).not.toThrow()
      })
    })

    test("handles parcel_ids that is not an array", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setSelectedParcelIds(["P001"])
      })
      await act(async () => {
        result.current.applyDraftToForm({ parcel_ids: "not-an-array" })
      })
      expect(result.current.selectedParcelIds).toEqual([])
    })

    test("applies full draft with all factors", async () => {
      const hook = await buildHook()
      await act(async () => {
        expect(() =>
          hook.applyDraftToForm({
            site_name: "Site A",
            region_version: "M",
            vegetation_stage: "montagnard",
            factors: {
              A: { native_genus_count: 3 },
              B: { strata_count: 2, covered_autochthonous_percent: 60 },
              C: { bmg_count: 1, bmm_count: 2, surface_ha: 0.5 },
              D: { bmg_count: 0, bmm_count: 1, surface_ha: 1 },
              E: { tgb_count: 2, gb_count: 3, surface_ha: 2 },
              F: { trees_per_ha: 15 },
              G: { open_flowering_percent: 50 },
              H: { class_score: 2 },
              I: { type_count: 1 },
              J: { type_count: 0 },
            },
            parcel_ids: ["P001", "P002"],
          }),
        ).not.toThrow()
      })
    })
  })

  // ─── Method version, cas and cas-3 flag (01.8-10) ──────────────────────────

  describe("method version and cas (D-02, D-08, CH-1)", () => {
    const useRealRules = () => {
      mockParseFinite.mockImplementation(
        jest.requireActual("../app/number-utils").parseFiniteNumberInput,
      )
      mockComputeRetainedScores.mockImplementation(
        jest.requireActual("../app/ibp-scoring").computeRetainedScoresFromRawFactors,
      )
    }

    type FormResult = Awaited<ReturnType<typeof renderForm>>
    const type = async (
      result: FormResult,
      factor: "A" | "B" | "G" | "H",
      index: number,
      value: string,
    ) => {
      await act(async () => {
        result.current.factorSections[factor][index].onChange(value)
      })
    }

    test("a fresh form is v3.2, cas 1, no cas-3 scale; draftInput has no region/stage", async () => {
      const hook = await buildHook()
      expect(hook.ibpMethodVersion).toBe(IBP_METHOD_V3_2)
      expect(hook.ibpCas).toBe(1)
      expect(hook.ibpCas3Scale).toBe(false)
      expect(hook.draftInput).toMatchObject({
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 1,
        ibp_cas3_scale: false,
      })
      expect(hook.draftInput).not.toHaveProperty("region_version")
      expect(hook.draftInput).not.toHaveProperty("vegetation_stage")
    })

    test("switching to v3.0 clears the cas and flag and restores region/stage defaults", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setIbpCas3Scale(true)
        result.current.handleRegionChange("M")
      })
      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_0)
      })
      expect(result.current.ibpMethodVersion).toBe(IBP_METHOD_V3_0)
      expect(result.current.ibpCas).toBeNull()
      expect(result.current.ibpCas3Scale).toBe(false)
      expect(result.current.regionVersion).toBe("ACA")
      expect(result.current.vegetationStage).toBe("collineen")
      expect(result.current.draftInput).toMatchObject({
        ibp_method_version: IBP_METHOD_V3_0,
        region_version: "ACA",
        vegetation_stage: "collineen",
      })
      expect(result.current.draftInput).not.toHaveProperty("ibp_cas")
      expect(result.current.draftInput).not.toHaveProperty("ibp_cas3_scale")
    })

    test("switching back to v3.2 pre-fills the cas from region and stage", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_0)
      })
      mockNormalizeVegetationStage.mockReturnValue("thermo_mediterraneen")
      await act(async () => {
        result.current.handleRegionChange("M")
      })
      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_2)
      })
      expect(result.current.ibpCas).toBe(4)
      expect(result.current.draftInput).toMatchObject({
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 4,
      })
      expect(result.current.draftInput).not.toHaveProperty("region_version")

      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_0)
      })
      await act(async () => {
        result.current.setVegetationStage("subalpin")
      })
      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_2)
      })
      expect(result.current.ibpCas).toBeNull()
    })

    test("choosing the version the form already has changes nothing", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setIbpCas(3)
      })
      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_2)
      })
      expect(result.current.ibpCas).toBe(3)
    })

    test("setIbpCas and setIbpCas3Scale reach the draft input and the scoring context", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setIbpCas(2)
        result.current.setIbpCas3Scale(true)
      })
      expect(result.current.draftInput).toMatchObject({ ibp_cas: 2, ibp_cas3_scale: true })
      const lastCall = mockComputeRetainedScores.mock.calls.at(-1)
      expect(lastCall?.[1]).toMatchObject({
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 2,
        ibp_cas3_scale: true,
      })
    })

    test("A with 5 genera and 40 % cover scores 2 under v3.2 cas 1 (cap on A)", async () => {
      useRealRules()
      const result = await renderForm()
      await type(result, "A", 0, "5")
      await type(result, "A", 1, "40")
      expect(result.current.factorRetainedScores.A?.score).toBe(2)
      expect(result.current.draftInput.factors).toEqual({
        A: { native_genus_count: 5, native_cover_percent: 40 },
      })
    })

    test("A without its cover is neither sent nor scored", async () => {
      useRealRules()
      const result = await renderForm()
      await type(result, "A", 0, "5")
      expect(result.current.draftInput.factors).not.toHaveProperty("A")
      expect(result.current.factorRetainedScores.A).toBeNull()
    })

    test("A with a cover above 100 is not sent", async () => {
      useRealRules()
      const result = await renderForm()
      await type(result, "A", 0, "5")
      await type(result, "A", 1, "140")
      expect(result.current.draftInput.factors).not.toHaveProperty("A")
    })

    test.each([
      [3, "0.5", 2],
      [1, "6", 2],
      [3, "6", 5],
    ] as const)("cas %i with G %s %% scores %i", async (cas, percent, expected) => {
      useRealRules()
      const result = await renderForm()
      await act(async () => {
        result.current.setIbpCas(cas)
      })
      await type(result, "G", 0, percent)
      expect(result.current.factorRetainedScores.G?.score).toBe(expected)
    })

    test("the cas-3 flag selects the cas-3 G scale under cas 2", async () => {
      useRealRules()
      const result = await renderForm()
      await act(async () => {
        result.current.setIbpCas(2)
        result.current.setIbpCas3Scale(true)
      })
      await type(result, "G", 0, "6")
      expect(result.current.factorRetainedScores.G?.score).toBe(5)
    })

    test("B is sent as { strata_count } only", async () => {
      useRealRules()
      const result = await renderForm()
      await type(result, "B", 0, "4")
      expect(result.current.draftInput.factors).toEqual({ B: { strata_count: 4 } })
    })

    test("H accepts only 0, 2 or 5 (the package's allowed set)", async () => {
      useRealRules()
      const result = await renderForm()
      await type(result, "H", 0, "1")
      expect(result.current.draftInput.factors).not.toHaveProperty("H")
      expect(result.current.factorSections.H[0].error).toBe(
        rules.oneOf(fields.class_score, "0, 2, 5"),
      )
      await type(result, "H", 0, "5")
      expect(result.current.draftInput.factors).toEqual({ H: { class_score: 5 } })
    })

    test("a legacy draft keeps no version and moves B's cover to A on the next save", async () => {
      useRealRules()
      const result = await renderForm()
      await act(async () => {
        result.current.applyDraftToForm({
          site_name: "Ancien",
          region_version: "ACA",
          vegetation_stage: "collineen",
          factors: {
            A: { native_genus_count: 5 },
            B: { strata_count: 3, covered_autochthonous_percent: 40 },
          },
        })
      })
      expect(result.current.ibpMethodVersion).toBeNull()
      expect(result.current.ibpCas).toBeNull()
      expect(result.current.factorSections.A[1].value).toBe("40")
      const input = result.current.buildDraftInput()
      expect(input).not.toHaveProperty("ibp_method_version")
      expect(input).not.toHaveProperty("ibp_cas")
      expect(input).toMatchObject({ region_version: "ACA", vegetation_stage: "collineen" })
      expect(input.factors).toEqual({
        A: { native_genus_count: 5, native_cover_percent: 40 },
        B: { strata_count: 3 },
      })
      // v3.0 (null) caps A from the cover: 5 genera, 40 % → 2
      expect(result.current.factorRetainedScores.A?.score).toBe(2)
    })

    test("a legacy draft's B native_cover_percent also moves to A", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.applyDraftToForm({ factors: { B: { native_cover_percent: 70 } } })
      })
      expect(result.current.factorSections.A[1].value).toBe("70")
    })

    test("choosing v3.0 on a legacy draft does not stamp it", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.applyDraftToForm({ region_version: "ACA", vegetation_stage: "collineen" })
      })
      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_0)
      })
      expect(result.current.ibpMethodVersion).toBeNull()
      expect(result.current.draftInput).not.toHaveProperty("ibp_method_version")
    })

    test("switching a legacy draft to v3.2 tags it and pre-fills the cas", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.applyDraftToForm({ region_version: "ACA", vegetation_stage: "collineen" })
      })
      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_2)
      })
      expect(result.current.draftInput).toMatchObject({
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 1,
      })
    })

    test("a v3.2 draft keeps its cas, flag and A cover", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.applyDraftToForm({
          ibp_method_version: IBP_METHOD_V3_2,
          ibp_cas: 3,
          ibp_cas3_scale: true,
          factors: { A: { native_genus_count: 2, native_cover_percent: 80 } },
        })
      })
      expect(result.current.ibpMethodVersion).toBe(IBP_METHOD_V3_2)
      expect(result.current.ibpCas).toBe(3)
      expect(result.current.ibpCas3Scale).toBe(true)
      expect(result.current.factorSections.A[1].value).toBe("80")
    })

    test("a draft with an unknown cas or version reads as none", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.applyDraftToForm({ ibp_method_version: "v9", ibp_cas: 7 })
      })
      expect(result.current.ibpMethodVersion).toBeNull()
      expect(result.current.ibpCas).toBeNull()
    })

    test("resetSurveyForm restores the v3.2 defaults", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setIbpMethodVersion(IBP_METHOD_V3_0)
      })
      await act(async () => {
        result.current.resetSurveyForm()
      })
      expect(result.current.ibpMethodVersion).toBe(IBP_METHOD_V3_2)
      expect(result.current.ibpCas).toBe(1)
      expect(result.current.ibpCas3Scale).toBe(false)
    })
  })

  // ─── resetSurveyForm ──────────────────────────────────────────────────────

  describe("resetSurveyForm", () => {
    test("resets siteName to default", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setSiteName("Previous site")
      })
      await act(async () => {
        result.current.resetSurveyForm()
      })
      expect(result.current.siteName).toBe("") // DEFAULT_SURVEY_FORM.siteName
    })

    test("calls defaultVegetationStageForRegion to reset vegetationStage", async () => {
      const hook = await buildHook()
      await act(async () => {
        hook.resetSurveyForm()
      })
      expect(mockDefaultVegetationStage).toHaveBeenCalled()
    })

    test("resets selectedParcelIds to empty array", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setSelectedParcelIds(["P001"])
      })
      await act(async () => {
        result.current.resetSurveyForm()
      })
      expect(result.current.selectedParcelIds).toEqual([])
    })
  })

  // ─── handleRegionChange ───────────────────────────────────────────────────

  describe("handleRegionChange", () => {
    test("calls normalizeVegetationStageForRegion with the new region", async () => {
      mockNormalizeVegetationStage.mockReturnValue("montagnard")
      const result = await renderForm()
      await act(async () => {
        result.current.handleRegionChange("M")
      })
      // The vegetation stage is derived from the current one ("collineen").
      expect(result.current.regionVersion).toBe("M")
      expect(result.current.vegetationStage).toBe("montagnard")
      expect(mockNormalizeVegetationStage).toHaveBeenCalledWith("M", "collineen")
    })

    test("calls normalizeVegetationStageForRegion with ACA region", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setVegetationStage("subalpin" as never)
      })
      await act(async () => {
        result.current.handleRegionChange("ACA")
      })
      expect(mockNormalizeVegetationStage).toHaveBeenCalledWith("ACA", "subalpin")
    })
  })

  // ─── applyGpsLocation ────────────────────────────────────────────────────

  describe("applyGpsLocation", () => {
    test("calls setGpsLocation with formatted lat/lng strings", async () => {
      const hook = await buildHook()
      await act(async () => {
        expect(() =>
          hook.applyGpsLocation({
            lat: 48.8566,
            lng: 2.3522,
            collected_at: "2024-01-01T00:00:00Z",
          }),
        ).not.toThrow()
      })
    })
  })

  // ─── toggleParcelSelection ────────────────────────────────────────────────

  describe("toggleParcelSelection", () => {
    test("does nothing when parcelId is whitespace only", async () => {
      const result = await renderForm()
      const before = result.current.selectedParcelIds
      await act(async () => {
        result.current.toggleParcelSelection("   ")
      })
      expect(result.current.selectedParcelIds).toBe(before)
    })

    test("calls setSelectedParcelIds with an updater function", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.toggleParcelSelection("abc")
      })
      expect(result.current.selectedParcelIds).toEqual(["ABC"])
    })

    test("updater adds normalized parcelId when not present", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.toggleParcelSelection("  abc  ")
      })
      expect(result.current.selectedParcelIds).toEqual(["ABC"])
      await act(async () => {
        result.current.setSelectedParcelIds(["DEF"])
      })
      await act(async () => {
        result.current.toggleParcelSelection("  abc  ")
      })
      expect(result.current.selectedParcelIds).toEqual(["DEF", "ABC"])
    })

    test("updater removes parcelId when already present", async () => {
      const result = await renderForm()
      await act(async () => {
        result.current.setSelectedParcelIds(["ABC", "DEF"])
      })
      await act(async () => {
        result.current.toggleParcelSelection("abc")
      })
      expect(result.current.selectedParcelIds).toEqual(["DEF"])
    })

    test("does nothing when parcelId is empty string", async () => {
      const result = await renderForm()
      const before = result.current.selectedParcelIds
      await act(async () => {
        result.current.toggleParcelSelection("")
      })
      expect(result.current.selectedParcelIds).toBe(before)
    })
  })

  // ─── factorSections field onChange callbacks ──────────────────────────────

  describe("factorSections onChange callbacks", () => {
    test("factorA onChange calls setFactorA with new value", async () => {
      const hook = await buildHook()
      // The onChange is a closure, ensure it doesn't throw
      await act(async () => {
        expect(() => hook.factorSections.A[0].onChange("5")).not.toThrow()
      })
    })

    test("factorB onChange does not throw for strata_count", async () => {
      const hook = await buildHook()
      await act(async () => {
        expect(() => hook.factorSections.B[0].onChange("3")).not.toThrow()
      })
    })

    test("factorH onChange does not throw", async () => {
      const hook = await buildHook()
      await act(async () => {
        expect(() => hook.factorSections.H[0].onChange("2")).not.toThrow()
      })
    })

    test("all factor onChange callbacks can be invoked without throwing", async () => {
      const hook = await buildHook()
      const keys = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const
      await act(async () => {
        for (const key of keys) {
          for (const field of hook.factorSections[key]) {
            expect(() => field.onChange("3")).not.toThrow()
          }
        }
      })
    })
  })

  // ─── numberError / oneOfError deeper branches ─────────────────────────────

  describe("numberError branches via factorSections (non-empty values)", () => {
    // numberError now reuses the shared parseFiniteNumberInput (BUG-04 fix: both the payload
    // builder and the displayed-error path agree on the same comma-accepting parse), so this
    // block needs the real implementation instead of the default `null` stub.
    beforeEach(() => {
      mockParseFinite.mockImplementation(
        jest.requireActual("../app/number-utils").parseFiniteNumberInput,
      )
    })

    test("non-finite value produces 'must be a number' error", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = {
        ...saved,
        factorA: { ...saved.factorA, native_genus_count: "abc" },
      }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.factorSections.A[0].error).toBe(rules.number(fields.native_genus_count))
    })

    test("non-integer value produces 'must be an integer' error", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = {
        ...saved,
        factorA: { ...saved.factorA, native_genus_count: "1.5" },
      }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.factorSections.A[0].error).toBe(rules.integer(fields.native_genus_count))
    })

    test("value below min produces '>= min' error", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = {
        ...saved,
        factorA: { ...saved.factorA, native_genus_count: "-1" },
      }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.factorSections.A[0].error).toBe(rules.min(fields.native_genus_count, 0))
    })

    test("value above max produces '<= max' error (factorG, max=100)", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = {
        ...saved,
        factorG: { open_flowering_percent: "101" },
      }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.factorSections.G[0].error).toBe(rules.max(fields.open_flowering_percent, 100))
    })

    test("valid value produces null error for factorA", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = {
        ...saved,
        factorA: { ...saved.factorA, native_genus_count: "3" },
      }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.factorSections.A[0].error).toBeNull()
    })

    // FLOW-03/BUG-04: a French decimal comma must not surface a "must be a number" error.
    test("a decimal comma is accepted (factorG)", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = {
        ...saved,
        factorG: { open_flowering_percent: "12,5" },
      }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.factorSections.G[0].error).toBeNull()
    })

    test("oneOfError: valid value in [0,2,5] produces null error (factorH)", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = {
        ...saved,
        factorH: { class_score: "2" },
      }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.factorSections.H[0].error).toBeNull()
    })

    test("oneOfError: integer not in [0,2,5] produces 'must be one of' error", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = {
        ...saved,
        factorH: { class_score: "3" },
      }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.factorSections.H[0].error).toBe(rules.oneOf(fields.class_score, "0, 2, 5"))
    })

    test("formErrors.siteName is null when siteName is non-empty", async () => {
      const mockConstants = jest.requireMock("../app/constants")
      const saved = mockConstants.DEFAULT_SURVEY_FORM
      mockConstants.DEFAULT_SURVEY_FORM = { ...saved, siteName: "Mon site" }
      const hook = await buildHook()
      mockConstants.DEFAULT_SURVEY_FORM = saved
      expect(hook.formErrors.siteName).toBeNull()
    })
  })
})
