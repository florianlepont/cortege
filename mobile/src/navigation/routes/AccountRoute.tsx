import { memo, useEffect } from "react"
import { KeyboardAvoidingView, Platform } from "react-native"
import { AccountScreen } from "../../screens/AccountScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { styles } from "../styles"
import type { AccountRouteProps } from "../types"

/**
 * Account route (phase 01.9-18, D-01): reads the session and, as the only
 * route, the access token (for the avatar, T-01.9-31).
 */
export const AccountRoute = memo(function AccountRoute({ navigation }: AccountRouteProps) {
  const { state: session, actions } = useSession()
  const accessToken = useAccessToken()

  const { isAuthenticated } = session
  const { handleLoadMyProfile } = actions
  // OA-13: the Compte tab's press listener refreshed the profile; with the tab gone, opening the
  // screen does it.
  useEffect(
    () =>
      navigation.addListener?.("focus", () => {
        if (isAuthenticated) void handleLoadMyProfile({ silent: true })
      }),
    [navigation, isAuthenticated, handleLoadMyProfile],
  )

  const onOpenSyncAndData = useLatestCallback(() => {
    navigation.navigate("settings")
  })

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.accountScreenWrap}
    >
      <AccountScreen
        accessToken={accessToken ?? ""}
        currentUser={session.currentUser}
        profile={session.profile}
        profileUpdating={session.profileUpdating}
        apiUrl={session.apiUrl}
        onSaveProfile={actions.handleUpdateProfile}
        onChangeEmail={actions.handleChangeEmail}
        onPasswordReset={actions.handlePasswordReset}
        onPickProfilePictureFromLibrary={actions.handlePickProfilePictureFromLibrary}
        onTakeProfilePictureFromCamera={actions.handleTakeProfilePictureFromCamera}
        onRemoveProfilePicture={actions.handleRemoveProfilePicture}
        onOpenSyncAndData={onOpenSyncAndData}
        onLogout={actions.handleLogout}
      />
    </KeyboardAvoidingView>
  )
})
