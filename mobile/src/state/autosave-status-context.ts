import { createContext, useContext } from "react"
import type { AutosaveStatus } from "../hooks/useEditingDraft"

/**
 * Autosave status (phase 3, FLOW-07): its own narrow context, like nearby parcels. The autosave
 * indicator changes twice per debounce cycle ("saving" then "saved") — folding it into the shared
 * survey-form context would re-render every screen that reads that context (factor detail, parcel
 * selection, ...) on every autosave, not just the one CTA bar that shows it.
 */
export const AutosaveStatusContext = createContext<AutosaveStatus | null>(null)

export const AutosaveStatusProvider = AutosaveStatusContext.Provider

export function useAutosaveStatus(): AutosaveStatus {
  const value = useContext(AutosaveStatusContext)
  if (value === null) {
    throw new Error("useAutosaveStatus must be used inside AppStateProvider")
  }
  return value
}
