import { useEffect, useState } from "react"
import type { ExportMode } from "../../app/survey-pdf-export"
import { useLatestCallback } from "../../state/useLatestCallback"
import { feedback } from "../../ui/feedback"

type UseExportChoiceParams = {
  /** True for any survey that is not submitted (D-18): the summary is then out of reach (D-09). */
  isDraft: boolean
  /** False when the survey is not (or no longer) in the local list: the sheet closes. */
  surveyFound: boolean
  /** Hands the chosen mode to the caller; the sheet never exports itself. */
  onConfirm: (mode: ExportMode) => void
  onClose: () => void
}

export type ExportChoice = {
  mode: ExportMode
  select: (next: ExportMode) => void
  confirm: () => void
}

/**
 * Phase 33, D-05, D-09 and D-14: the selection of the export choice sheet. It starts on the
 * complete PDF at every opening (nothing is remembered) and can never be the summary while the
 * survey is a draft, even when the survey turns into a draft while the sheet is open. The sheet
 * mounts at each opening, so the state is fresh each time.
 */
export function useExportChoice({
  isDraft,
  surveyFound,
  onConfirm,
  onClose,
}: UseExportChoiceParams): ExportChoice {
  const [picked, setPicked] = useState<ExportMode>("complete")
  const mode: ExportMode = isDraft ? "complete" : picked

  // Stable, so the effect below reacts only to the survey disappearing (deleted meanwhile).
  const close = useLatestCallback(onClose)
  useEffect(() => {
    if (!surveyFound) close()
  }, [surveyFound, close])

  const select = useLatestCallback((next: ExportMode): void => {
    if (isDraft && next === "summary") return
    if (next === mode) return
    feedback.selection()
    setPicked(next)
  })

  const confirm = useLatestCallback((): void => {
    onConfirm(mode)
  })

  return { mode, select, confirm }
}
