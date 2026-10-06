import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  isIbpCas,
  resolveMethodVersion,
  type IbpCas,
} from "@cortege/ibp-domain"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { addGenusToListValue, serializeGenusListValue } from "../app/factor-a-genus-list"
import { getLocalSurveyDraft, updateLocalDraft } from "../storage/surveys"
import { DEFAULT_SURVEY_FORM, normalizeVegetationStageForRegion } from "../app/constants"
import { migrateDraftToV32 } from "../app/ibp-scoring"
import { RegionVersion, VegetationStage } from "../app/types"
import { fr, logStatusDetail, type StatusMessage } from "../i18n"
import type { SurveyQueuePayload } from "../storage/types"
import { useSurveyList } from "./useSurveyList"

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

/**
 * A stored draft as the patch mutators see it. The method fields are the draft's own (01.8 D-08):
 * `ibp_method_version` is absent for an untagged legacy draft, the cas and flag exist for v3.2
 * only, and region/stage for v3.0 only.
 */
type DirectDraftPatchInput = {
  site_name: string
  ibp_method_version?: string
  ibp_cas?: IbpCas | null
  ibp_cas3_scale?: boolean
  region_version?: RegionVersion
  vegetation_stage?: VegetationStage
  parcel_ids: string[]
  factors: Record<string, unknown>
}

/** A mutator returns null when the change does not apply to the draft's method version. */
type DraftPatchMutator = (draft: DirectDraftPatchInput) => DirectDraftPatchInput | null

type UseSurveyDraftPatcherParams = {
  surveyList: ReturnType<typeof useSurveyList>
  onStatusChange: (message: StatusMessage) => void
}

const text = fr.status.editing

const surveyName = (survey: { site_name?: string | null } | undefined): string =>
  survey?.site_name?.trim() || fr.common.untitledSurvey

/** The mutators' view of a stored draft, built from its own method fields (never stamped). */
const toPatchInput = (draft: SurveyQueuePayload): DirectDraftPatchInput => {
  const base: DirectDraftPatchInput = {
    site_name:
      typeof draft.site_name === "string" && draft.site_name.trim().length > 0
        ? draft.site_name
        : fr.common.untitledSurvey,
    parcel_ids: Array.isArray(draft.parcel_ids)
      ? draft.parcel_ids.filter((value): value is string => typeof value === "string")
      : [],
    factors: asRecord(draft.factors),
  }
  if (typeof draft.ibp_method_version === "string" && draft.ibp_method_version.length > 0) {
    base.ibp_method_version = draft.ibp_method_version
  }

  const version = resolveMethodVersion(draft.ibp_method_version)
  if (version === IBP_METHOD_V3_2) {
    base.ibp_cas = isIbpCas(draft.ibp_cas) ? draft.ibp_cas : null
    base.ibp_cas3_scale = draft.ibp_cas3_scale === true
  } else if (version === IBP_METHOD_V3_0) {
    const region: RegionVersion = draft.region_version === "M" ? "M" : "ACA"
    base.region_version = region
    base.vegetation_stage = normalizeVegetationStageForRegion(
      region,
      typeof draft.vegetation_stage === "string"
        ? draft.vegetation_stage
        : DEFAULT_SURVEY_FORM.vegetationStage,
    )
  }
  return base
}

/**
 * The method fields to send with the update: the version only when the draft has one (storage
 * then keeps an untagged draft untagged), the cas and flag for v3.2, region/stage for v3.0.
 */
const methodFieldsToWrite = (next: DirectDraftPatchInput) => {
  const version = resolveMethodVersion(next.ibp_method_version)
  return {
    ...(next.ibp_method_version !== undefined
      ? { ibp_method_version: next.ibp_method_version }
      : {}),
    ...(version === IBP_METHOD_V3_2
      ? { ibp_cas: next.ibp_cas ?? null, ibp_cas3_scale: next.ibp_cas3_scale === true }
      : {}),
    ...(version === IBP_METHOD_V3_0
      ? { region_version: next.region_version, vegetation_stage: next.vegetation_stage }
      : {}),
  }
}

const isV32 = (draft: DirectDraftPatchInput): boolean =>
  resolveMethodVersion(draft.ibp_method_version) === IBP_METHOD_V3_2

const isV30 = (draft: DirectDraftPatchInput): boolean =>
  resolveMethodVersion(draft.ibp_method_version) === IBP_METHOD_V3_0

export function useSurveyDraftPatcher({ surveyList, onStatusChange }: UseSurveyDraftPatcherParams) {
  const currentName = (surveyId: string): string =>
    surveyName(surveyList.surveys.find((survey) => survey.id === surveyId))

  const patchSurveyDraftDirectly = async (
    surveyId: string,
    mutator: DraftPatchMutator,
    successMessage: StatusMessage,
  ): Promise<boolean> => {
    const current = surveyList.surveys.find((survey) => survey.id === surveyId)
    // Submitted surveys are read-only, method version included (D-02, T-01.8-28).
    if (current?.status === "submitted") {
      onStatusChange(text.readOnly({ name: surveyName(current) }))
      return false
    }

    try {
      const draft = await getLocalSurveyDraft(surveyId)
      if (!draft) {
        onStatusChange(text.notFound())
        return false
      }

      const next = mutator(toPatchInput(draft))
      if (next === null) {
        onStatusChange(text.switchNotAllowed({ name: surveyName(current) }))
        return false
      }

      await updateLocalDraft({
        survey_id: surveyId,
        site_name: next.site_name,
        ...methodFieldsToWrite(next),
        parcel_ids: next.parcel_ids,
        factors: next.factors,
        visibility: current?.visibility ?? "private",
      })

      await surveyList.refreshLocalSurveys()
      await surveyList.refreshLocalAttachments()
      onStatusChange(successMessage)
      return true
    } catch (error) {
      logStatusDetail("editing.directUpdate", error)
      onStatusChange(text.updateFailed())
      return false
    }
  }

  const handleRenameSurvey = async (surveyId: string, nextSiteName: string): Promise<void> => {
    const siteName = nextSiteName.trim() || fr.common.untitledSurvey
    await patchSurveyDraftDirectly(
      surveyId,
      (draft) => ({ ...draft, site_name: siteName }),
      text.renamed({ name: siteName }),
    )
  }

  // Region and stage exist for v3.0 drafts only (D-08).
  const handleUpdateSurveyRegionVersion = async (
    surveyId: string,
    region: RegionVersion,
  ): Promise<void> => {
    await patchSurveyDraftDirectly(
      surveyId,
      (draft) =>
        isV30(draft)
          ? {
              ...draft,
              region_version: region,
              vegetation_stage: normalizeVegetationStageForRegion(region, draft.vegetation_stage),
            }
          : null,
      text.regionUpdated({ name: currentName(surveyId) }),
    )
  }

  const handleUpdateSurveyVegetationStage = async (
    surveyId: string,
    stage: VegetationStage,
  ): Promise<void> => {
    await patchSurveyDraftDirectly(
      surveyId,
      (draft) =>
        isV30(draft)
          ? {
              ...draft,
              vegetation_stage: normalizeVegetationStageForRegion(
                draft.region_version ?? DEFAULT_SURVEY_FORM.regionVersion,
                stage,
              ),
            }
          : null,
      text.vegetationStageUpdated({ name: currentName(surveyId) }),
    )
  }

  // The cas and the cas-3 flag exist for v3.2 drafts only (D-08 amended).
  const handleUpdateSurveyIbpCas = async (surveyId: string, cas: IbpCas): Promise<void> => {
    await patchSurveyDraftDirectly(
      surveyId,
      (draft) => (isV32(draft) ? { ...draft, ibp_cas: cas } : null),
      text.ibpCasUpdated({ name: currentName(surveyId) }),
    )
  }

  const handleUpdateSurveyCas3Scale = async (surveyId: string, value: boolean): Promise<void> => {
    await patchSurveyDraftDirectly(
      surveyId,
      (draft) => (isV32(draft) ? { ...draft, ibp_cas3_scale: value } : null),
      text.cas3ScaleUpdated({ name: currentName(surveyId) }),
    )
  }

  /**
   * Switches an unsubmitted v3.0 (or untagged) draft to v3.2 (D-08, CH-7): B's cover moves to A,
   * the cas is pre-filled from region and stage (null when ambiguous) and region/stage are dropped.
   */
  const handleSwitchSurveyToV32 = async (surveyId: string): Promise<void> => {
    await patchSurveyDraftDirectly(
      surveyId,
      (draft) => (isV30(draft) ? migrateDraftToV32(draft) : null),
      text.switchedToV32({ name: currentName(surveyId) }),
    )
  }

  /**
   * OA-107: a genus confirmed in the photo tool goes into factor A of a draft that is not open
   * (the list of genera, the cover and the other fields untouched). False when it did not apply.
   */
  const handleAddGenusToSurvey = async (
    surveyId: string,
    genus: CnpfFactorAGenusCode,
  ): Promise<boolean> =>
    patchSurveyDraftDirectly(
      surveyId,
      (draft) => {
        const factorA = asRecord(draft.factors.A)
        const stored = Array.isArray(factorA.genera)
          ? factorA.genera.filter((code): code is string => typeof code === "string")
          : []
        const genera = addGenusToListValue(serializeGenusListValue(stored), genus)
        return {
          ...draft,
          factors: { ...draft.factors, A: { ...factorA, genera: genera ? genera.split(",") : [] } },
        }
      },
      text.genusAdded({ name: currentName(surveyId) }),
    )

  return {
    patchSurveyDraftDirectly,
    handleAddGenusToSurvey,
    handleRenameSurvey,
    handleUpdateSurveyRegionVersion,
    handleUpdateSurveyVegetationStage,
    handleUpdateSurveyIbpCas,
    handleUpdateSurveyCas3Scale,
    handleSwitchSurveyToV32,
  }
}
