import { createContext, useContext } from "react"
import type { GpsCaptureResult } from "../app/types"
import type { useSurveyForm } from "../hooks/useSurveyForm"
import type { FormMode } from "../navigation/types"

type SurveyForm = ReturnType<typeof useSurveyForm>

/**
 * Survey form context (phase 01.9, D-01): the fields of the survey being
 * created or edited and the form actions. It is the only value that changes on
 * a form keystroke. The nearby parcels have their own context (01.9-18).
 */
export type SurveyFormState = {
  siteName: SurveyForm["siteName"]
  regionVersion: SurveyForm["regionVersion"]
  vegetationStage: SurveyForm["vegetationStage"]
  /** The survey's IBP method (01.8-10): null for an untagged legacy draft (= v3.0). */
  ibpMethodVersion: SurveyForm["ibpMethodVersion"]
  ibpCas: SurveyForm["ibpCas"]
  ibpCas3Scale: SurveyForm["ibpCas3Scale"]
  gpsLocation: SurveyForm["gpsLocation"]
  selectedParcelIds: SurveyForm["selectedParcelIds"]
  factorSections: SurveyForm["factorSections"]
  factorRetainedScores: SurveyForm["factorRetainedScores"]
  /**
   * The doubt flag and the note of each factor (phase 27, D-12), written under
   * factors.annotations by the form's draft payload (D-23).
   */
  factorAnnotations: SurveyForm["factorAnnotations"]
  /**
   * The detail inputs of the relevé déplafonné (phase 30, D-07): B cover per stratum, F counts per
   * group and F's surface, written beside their scored keys by the form's draft payload.
   */
  uncapped: SurveyForm["uncapped"]
  formErrors: SurveyForm["formErrors"]
  draftInput: SurveyForm["draftInput"]
  /** Also in the surveys state; repeated here so the form routes read one context (01.9-18). */
  formMode: FormMode
  editingSurveyId: string | null
}

export type SurveyFormActions = {
  setSiteName: SurveyForm["setSiteName"]
  setVegetationStage: SurveyForm["setVegetationStage"]
  setSelectedParcelIds: SurveyForm["setSelectedParcelIds"]
  toggleParcelSelection: SurveyForm["toggleParcelSelection"]
  applyGpsLocation: SurveyForm["applyGpsLocation"]
  handleRegionChange: SurveyForm["handleRegionChange"]
  setIbpMethodVersion: SurveyForm["setIbpMethodVersion"]
  setIbpCas: SurveyForm["setIbpCas"]
  setIbpCas3Scale: SurveyForm["setIbpCas3Scale"]
  applyDraftToForm: SurveyForm["applyDraftToForm"]
  resetSurveyForm: SurveyForm["resetSurveyForm"]
  buildDraftInput: SurveyForm["buildDraftInput"]
  saveSurveyEdits: () => Promise<boolean>
  /** D-26: writes the pending form edits now and keeps editing; false when the write failed. */
  flushDraft: () => Promise<boolean>
  /** Finalises the new-survey draft: the survey id, or null when it could not be saved. */
  createDraft: () => Promise<string | null>
  captureGpsLocation: (options?: { silent?: boolean }) => Promise<GpsCaptureResult | null>
  markSubmitAttempted: SurveyForm["markSubmitAttempted"]
  /** Phase 27: the strip calls flushDraft after a doubt toggle for an immediate write. */
  setFactorDoubt: SurveyForm["setFactorDoubt"]
  setFactorNote: SurveyForm["setFactorNote"]
  /** Phase 30: each derives its scored value with the package helpers and writes it (U-O10). */
  setStratumCover: SurveyForm["setStratumCover"]
  setDmhCount: SurveyForm["setDmhCount"]
  setFSurface: SurveyForm["setFSurface"]
}

export type SurveyFormContextValue = {
  state: SurveyFormState
  actions: SurveyFormActions
}

export const SurveyFormContext = createContext<SurveyFormContextValue | null>(null)

export const SurveyFormProvider = SurveyFormContext.Provider

export function useSurveyFormState(): SurveyFormContextValue {
  const value = useContext(SurveyFormContext)
  if (value === null) {
    throw new Error("useSurveyFormState must be used inside AppStateProvider")
  }
  return value
}
