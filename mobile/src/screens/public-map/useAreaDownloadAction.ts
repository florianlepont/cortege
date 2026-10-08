import { useCallback, useRef } from "react"
import { Alert } from "react-native"
import type { MapRegion } from "../../app/map-viewport"
import type { StartDownloadResult } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"

const t = fr.offlineMap.areas

type Options = {
  startDownload: (region: MapRegion, name: string) => Promise<StartDownloadResult>
  /** The area shown, the one the download takes. */
  region: MapRegion
  /** Whether the offline panel is open: it shows a failure itself, with its retry. */
  panelOpen: boolean
  onStart?: () => void
  onFailure?: () => void
}

/**
 * The download action of the offline panel, shared by the Explorer and the parcel selection. The
 * panel shows a running download's bar, then its outcome (12.2-19 third round); a failure while the
 * panel is closed is still told by an alert, and a refused area (too large) always is.
 */
export function useAreaDownloadAction({
  startDownload,
  region,
  panelOpen,
  onStart,
  onFailure,
}: Options): (name: string) => void {
  const panelOpenRef = useRef(panelOpen)
  panelOpenRef.current = panelOpen
  const callbacksRef = useRef({ onStart, onFailure })
  callbacksRef.current = { onStart, onFailure }

  return useCallback(
    (name: string) => {
      callbacksRef.current.onStart?.()
      void startDownload(region, name).then((outcome) => {
        if (outcome.ok) return
        callbacksRef.current.onFailure?.()
        if (outcome.reason === "too_large") Alert.alert(t.tooLarge)
        else if (!panelOpenRef.current) Alert.alert(t.downloadFailed)
      })
    },
    [startDownload, region],
  )
}
