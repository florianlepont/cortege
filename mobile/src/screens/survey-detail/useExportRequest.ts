import { useEffect, useRef } from "react"
import type { ExportMode } from "../../app/survey-pdf-export"
import type { SurveyExportRequest } from "../../navigation/types"
import { useLatestCallback } from "../../state/useLatestCallback"

/**
 * Phase 33: the export choice sheet hands its mode back through the summary's route parameter
 * (`exportRequest`). Each request is applied once per nonce: the nonce is remembered for this
 * mount, then the route clears the parameter (`onHandled`), so a re-render, a re-delivered
 * parameter or a later remount never exports twice (T-33-28, research Pattern 2). The export
 * itself, its lock, its notice and its alerts stay in `useSurveyPdfExport`.
 */
export function useExportRequest(
  request: SurveyExportRequest | undefined,
  share: (mode: ExportMode) => Promise<void>,
  onHandled: () => void,
): void {
  const handledNonce = useRef<number | null>(null)
  const runShare = useLatestCallback(share)
  const markHandled = useLatestCallback(onHandled)
  const nonce = request?.nonce
  const mode = request?.mode

  useEffect(() => {
    if (nonce === undefined || mode === undefined) return
    if (handledNonce.current === nonce) return
    handledNonce.current = nonce
    markHandled()
    void runShare(mode)
  }, [nonce, mode, markHandled, runShare])
}
