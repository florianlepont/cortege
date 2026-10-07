import { memo, useEffect } from "react"
import { SettingsScreen } from "../../screens/SettingsScreen"
import { useOfflineAreasSummary } from "../../hooks/useOfflineAreasSummary"
import { useSession } from "../../state/session-context"
import { useSyncActions } from "../../state/sync-actions-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { SettingsRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"

/**
 * Settings route (phase 01.9-18, D-01). OA-78: no sync tools any more, and no status line (OA-77);
 * the offline-areas summary is read again each time the screen is shown.
 */
export const SettingsRoute = memo(function SettingsRoute({ navigation }: SettingsRouteProps) {
  const { state: session, actions: sessionActions } = useSession()
  const syncActions = useSyncActions()
  const { summary, refresh } = useOfflineAreasSummary()

  useEffect(() => navigation.addListener?.("focus", () => void refresh()), [navigation, refresh])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const onOpenOfflineAreas = useLatestCallback(() => navigation.navigate("offlineAreas"))

  return (
    // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <SettingsScreen
        apiUrl={session.apiUrl}
        onApiUrlChange={sessionActions.setApiUrl}
        offlineAreas={summary}
        onOpenOfflineAreas={onOpenOfflineAreas}
        onDeleteAccount={sessionActions.handleDeleteAccount}
        onDebugResetIbpData={syncActions.handleDebugResetIbpData}
        onDebugResetUserData={syncActions.handleDebugResetUserData}
      />
    </ScreenFrame>
  )
})
