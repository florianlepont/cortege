import { useEffect, useRef, useState } from "react"
import { IBP_METHOD_V3_2, resolveMethodVersion } from "@cortege/ibp-domain"
import { createLocalDraft, getLocalSurveyDraft, updateLocalDraft } from "../storage/surveys"
import { DEFAULT_SURVEY_FORM } from "../app/constants"
import { fr, logStatusDetail, type StatusMessage } from "../i18n"
import type { FormMode } from "../navigation/types"
import { useSurveyForm } from "./useSurveyForm"
import { useSurveyList } from "./useSurveyList"

type UseEditingDraftParams = {
  editingSurveyId: string | null
  setEditingSurveyId: (id: string | null) => void
  editingSurveyVisibility: "private" | "public"
  setFormMode: (mode: FormMode) => void
  surveyForm: ReturnType<typeof useSurveyForm>
  surveyList: ReturnType<typeof useSurveyList>
  onStatusChange: (message: StatusMessage) => void
  onCloseSurveyDetail: () => void
}

const text = fr.status.editing

/** FLOW-07: the visible autosave indicator's state. */
export type AutosaveStatus = {
  state: "idle" | "saving" | "saved" | "error"
  savedAt: string | null
}

const IDLE_AUTOSAVE_STATUS: AutosaveStatus = { state: "idle", savedAt: null }

const surveyName = (survey: { site_name?: string | null } | null | undefined): string =>
  survey?.site_name?.trim() || fr.common.untitledSurvey

/**
 * The signature of a stored draft, in the form's draftInput key order, with its method fields as
 * stored: the version only when the draft has one (a legacy draft stays untagged), the cas and flag
 * for v3.2, region/stage for v3.0. A draft opened unchanged therefore does not autosave.
 */
const storedDraftSignature = (draft: {
  site_name?: string | null
  ibp_method_version?: string | null
  ibp_cas?: number | null
  ibp_cas3_scale?: boolean | null
  region_version?: string | null
  vegetation_stage?: string | null
  parcel_ids?: unknown
  factors?: unknown
}): string => {
  const hasVersion = draft.ibp_method_version !== undefined && draft.ibp_method_version !== null
  const methodContext =
    resolveMethodVersion(draft.ibp_method_version) === IBP_METHOD_V3_2
      ? { ibp_cas: draft.ibp_cas ?? null, ibp_cas3_scale: draft.ibp_cas3_scale === true }
      : {
          region_version: draft.region_version ?? "ACA",
          vegetation_stage: draft.vegetation_stage ?? "",
        }
  return JSON.stringify({
    site_name: draft.site_name ?? "",
    ...(hasVersion ? { ibp_method_version: draft.ibp_method_version } : {}),
    ...methodContext,
    factors: draft.factors ?? {},
    parcel_ids: Array.isArray(draft.parcel_ids) ? draft.parcel_ids : [],
  })
}

type PendingAutosaveRequest = {
  surveyId: string
  input: UseEditingDraftParams["surveyForm"]["draftInput"]
  visibility: "private" | "public"
  signature: string
}

export function useEditingDraft({
  editingSurveyId,
  setEditingSurveyId,
  editingSurveyVisibility,
  setFormMode,
  surveyForm,
  surveyList,
  onStatusChange,
  onCloseSurveyDetail,
}: UseEditingDraftParams) {
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(IDLE_AUTOSAVE_STATUS)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autosaveInFlightRef = useRef(false)
  const autosaveSignatureRef = useRef("")
  const pendingAutosaveRef = useRef<PendingAutosaveRequest | null>(null)
  const editingSurveyIdRef = useRef(editingSurveyId)
  editingSurveyIdRef.current = editingSurveyId
  const createDraftBootstrappingRef = useRef(false)
  const refreshLocalSurveys = surveyList.refreshLocalSurveys
  const refreshLocalAttachments = surveyList.refreshLocalAttachments
  const setSelectedSurveyId = surveyList.setSelectedSurveyId
  const surveys = surveyList.surveys

  // Reassigned every render so it always closes over the latest
  // onStatusChange/refreshLocalSurveys, without retriggering the debounce
  // effect below whenever those identities change.
  const runAutosaveRef = useRef<((request: PendingAutosaveRequest) => Promise<void>) | undefined>(
    undefined,
  )
  runAutosaveRef.current = async (request: PendingAutosaveRequest): Promise<void> => {
    if (autosaveInFlightRef.current) {
      // A save is already writing: keep only the latest request, don't drop it.
      pendingAutosaveRef.current = request
      return
    }
    autosaveInFlightRef.current = true
    setAutosaveStatus((current) => ({ ...current, state: "saving" }))

    try {
      await updateLocalDraft({
        survey_id: request.surveyId,
        ...request.input,
        visibility: request.visibility,
      })
      await refreshLocalSurveys()
      autosaveSignatureRef.current = request.signature
      setAutosaveStatus({ state: "saved", savedAt: new Date().toISOString() })
    } catch (error) {
      logStatusDetail("editing.autosave", error)
      onStatusChange(text.autosaveFailed())
      setAutosaveStatus((current) => ({ ...current, state: "error" }))
    } finally {
      autosaveInFlightRef.current = false
      const pending = pendingAutosaveRef.current
      pendingAutosaveRef.current = null
      if (
        pending &&
        pending.signature !== autosaveSignatureRef.current &&
        pending.surveyId === editingSurveyIdRef.current
      ) {
        void runAutosaveRef.current?.(pending)
      }
    }
  }

  useEffect(() => {
    if (!editingSurveyId) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
      pendingAutosaveRef.current = null
      return
    }

    const draftSignature = JSON.stringify(surveyForm.draftInput)
    if (autosaveSignatureRef.current === draftSignature) {
      return
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }

    autosaveTimerRef.current = setTimeout(() => {
      void runAutosaveRef.current?.({
        surveyId: editingSurveyId,
        input: surveyForm.draftInput,
        visibility: editingSurveyVisibility,
        signature: draftSignature,
      })
    }, 900)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [editingSurveyId, editingSurveyVisibility, surveyForm.draftInput])

  const handleOpenCreateSurvey = (): void => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    pendingAutosaveRef.current = null
    autosaveSignatureRef.current = ""
    setAutosaveStatus(IDLE_AUTOSAVE_STATUS)
    setEditingSurveyId(null)
    setFormMode("create")
    onCloseSurveyDetail()
    surveyForm.resetSurveyForm()
    onStatusChange(text.createOpened())

    if (createDraftBootstrappingRef.current) {
      return
    }
    createDraftBootstrappingRef.current = true

    // A new survey follows v3.2 with cas 1 and carries no region/stage (D-02, D-08). Same keys
    // and order as the reset form's draftInput, so opening it does not trigger an autosave.
    const initialDraftInput = {
      site_name: DEFAULT_SURVEY_FORM.siteName,
      ...(DEFAULT_SURVEY_FORM.ibpMethodVersion !== null
        ? { ibp_method_version: DEFAULT_SURVEY_FORM.ibpMethodVersion }
        : {}),
      ibp_cas: DEFAULT_SURVEY_FORM.ibpCas,
      ibp_cas3_scale: DEFAULT_SURVEY_FORM.ibpCas3Scale,
      factors: {},
      parcel_ids: [],
    }

    void (async () => {
      try {
        const created = await createLocalDraft(initialDraftInput)
        await refreshLocalSurveys()
        await refreshLocalAttachments()
        autosaveSignatureRef.current = JSON.stringify(initialDraftInput)
        setEditingSurveyId(created.id)
        setSelectedSurveyId(created.id)
        onStatusChange(text.draftInitialized())
      } catch (error) {
        logStatusDetail("editing.draftInit", error)
        onStatusChange(text.draftInitFailed())
      } finally {
        createDraftBootstrappingRef.current = false
      }
    })()
  }

  const handleCreateDraft = async (): Promise<boolean> => {
    try {
      const draftInput = surveyForm.buildDraftInput()
      if (editingSurveyId) {
        const current = surveys.find((survey) => survey.id === editingSurveyId)
        await updateLocalDraft({
          survey_id: editingSurveyId,
          ...draftInput,
          visibility: current?.visibility ?? "private",
        })

        await refreshLocalSurveys()
        await refreshLocalAttachments()
        pendingAutosaveRef.current = null
        autosaveSignatureRef.current = ""
        setEditingSurveyId(null)
        setFormMode("create")
        setSelectedSurveyId(editingSurveyId)
        onStatusChange(text.draftSaved({ name: surveyName(draftInput) }))
        return true
      }

      const created = await createLocalDraft(draftInput)
      await refreshLocalSurveys()
      await refreshLocalAttachments()
      setEditingSurveyId(null)
      setFormMode("create")
      setSelectedSurveyId(created.id)
      onStatusChange(text.draftCreated())
      return true
    } catch (error) {
      logStatusDetail("editing.draftSave", error)
      onStatusChange(text.draftSaveFailed())
      return false
    }
  }

  const handleStartEditSurvey = async (surveyId: string): Promise<boolean> => {
    const current = surveys.find((survey) => survey.id === surveyId)
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
      autosaveSignatureRef.current = storedDraftSignature(draft)
      surveyForm.applyDraftToForm(draft)
      setAutosaveStatus(IDLE_AUTOSAVE_STATUS)
      setEditingSurveyId(surveyId)
      setFormMode("edit")
      setSelectedSurveyId(surveyId)
      onStatusChange(text.editing({ name: surveyName(draft) }))
      return true
    } catch (error) {
      logStatusDetail("editing.editLoad", error)
      onStatusChange(text.editLoadFailed())
      return false
    }
  }

  const handleSaveSurveyEdits = async (): Promise<boolean> => {
    if (!editingSurveyId) {
      onStatusChange(text.noSurveySelected())
      return false
    }

    try {
      const current = surveys.find((survey) => survey.id === editingSurveyId)
      const draftInput = surveyForm.buildDraftInput()
      await updateLocalDraft({
        survey_id: editingSurveyId,
        ...draftInput,
        visibility: current?.visibility ?? "private",
      })

      await refreshLocalSurveys()
      await refreshLocalAttachments()
      pendingAutosaveRef.current = null
      autosaveSignatureRef.current = ""
      setEditingSurveyId(null)
      setFormMode("create")
      onStatusChange(text.editsSaved({ name: surveyName(draftInput) }))
      return true
    } catch (error) {
      logStatusDetail("editing.editSave", error)
      onStatusChange(text.editSaveFailed())
      return false
    }
  }

  return {
    handleOpenCreateSurvey,
    handleCreateDraft,
    handleStartEditSurvey,
    handleSaveSurveyEdits,
    autosaveStatus,
  }
}
