import { memo, useEffect } from "react"
import { OfflineAreasScreen } from "../../screens/OfflineAreasScreen"
import { useOfflineAreas } from "../../hooks/useOfflineAreas"
import { useAccessToken, useSession } from "../../state/session-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { OfflineAreasRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"

/** Offline-areas route (Paramètres > Cartes hors ligne): the downloaded zones and their delete. */
export const OfflineAreasRoute = memo(function OfflineAreasRoute({
  navigation,
}: OfflineAreasRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { areas, deleteArea, refresh } = useOfflineAreas(session.apiUrl, accessToken)

  // A download may have finished since the screen was last seen.
  useEffect(() => navigation.addListener?.("focus", () => void refresh()), [navigation, refresh])

  const onDeleteArea = useLatestCallback((areaId: string) => void deleteArea(areaId))

  return (
    // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <OfflineAreasScreen areas={areas} onDeleteArea={onDeleteArea} />
    </ScreenFrame>
  )
})
