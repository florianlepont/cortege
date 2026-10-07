import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Platform, ScrollView, View } from "react-native"
import { PageTitle } from "../ui/PageTitle"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors, brandSpacing } from "../app/brand-tokens"
import { AuthUser } from "../app/types"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { fr } from "../i18n"
import { AppGroupedList } from "../ui/AppGroupedList"
import type { AppGroupedListSection } from "../ui/AppGroupedList"
import { useAccountConnectionRows, useLogoutRow } from "./account/AccountSettingsRows"
import { IdentityCard } from "./account/IdentityCard"
import { ProfileSaveBar, useProfileRows } from "./account/ProfileRows"
import { accountStyles as styles } from "./account/styles"

type UpdateProfileInput = {
  first_name: string
  last_name: string
  display_name: string
}

type AccountScreenProps = {
  accessToken: string
  currentUser: AuthUser | null
  profile: string
  profileUpdating: boolean
  apiUrl: string
  onSaveProfile: (input: UpdateProfileInput) => Promise<void>
  onChangeEmail: (newEmail: string) => Promise<void>
  onPasswordReset: () => Promise<void>
  onPickProfilePictureFromLibrary: () => Promise<void>
  onTakeProfilePictureFromCamera: () => Promise<void>
  onRemoveProfilePicture: () => Promise<void>
  onLogout: () => Promise<void>
}

// ACC-03, OA-70: the avatar and name, then one grouped iOS-style list (Profil, Connexion, then
// Se déconnecter in red). The profile fields are rows of that list; a glass save bar shows only
// while they hold unsaved changes (OA-72). Data and about live in Paramètres (OA-75).
export function AccountScreen({
  accessToken,
  currentUser,
  profile,
  profileUpdating,
  apiUrl,
  onSaveProfile,
  onChangeEmail,
  onPasswordReset,
  onPickProfilePictureFromLibrary,
  onTakeProfilePictureFromCamera,
  onRemoveProfilePicture,
  onLogout,
}: AccountScreenProps) {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight(Platform.select({ ios: 84, default: 68 }) ?? 68)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [displayName, setDisplayName] = useState("")

  useEffect(() => {
    setFirstName(currentUser?.first_name ?? "")
    setLastName(currentUser?.last_name ?? "")
    setDisplayName(currentUser?.display_name ?? "")
  }, [currentUser])

  const isProfileDirty = useMemo(() => {
    return (
      firstName.trim() !== (currentUser?.first_name ?? "").trim() ||
      lastName.trim() !== (currentUser?.last_name ?? "").trim() ||
      displayName.trim() !== (currentUser?.display_name ?? "").trim()
    )
  }, [currentUser, firstName, lastName, displayName])

  const heroName =
    displayName.trim() ||
    [firstName.trim(), lastName.trim()].filter((p) => p.length > 0).join(" ") ||
    currentUser?.display_name ||
    profile ||
    fr.account.fallbackName

  const connectionRows = useAccountConnectionRows({
    currentUser,
    profileUpdating,
    onChangeEmail,
    onPasswordReset,
  })
  const logoutRow = useLogoutRow({ onLogout })
  const profileRows = useProfileRows({
    firstName,
    lastName,
    displayName,
    onFirstNameChange: setFirstName,
    onLastNameChange: setLastName,
    onDisplayNameChange: setDisplayName,
  })
  const resetProfile = (): void => {
    setFirstName(currentUser?.first_name ?? "")
    setLastName(currentUser?.last_name ?? "")
    setDisplayName(currentUser?.display_name ?? "")
  }

  // D-19: the route's ScreenFrame starts the page below the transparent header and clips the
  // scroll there, so only a small top margin is left here; the tab bar clearance stays inside the
  // scroll content so it scrolls away naturally.
  const topContentPadding = brandSpacing.md
  const bottomContentPadding = Math.max(tabBarHeight, insets.bottom) + brandSpacing.md

  // ACC-C02 : état de chargement quand currentUser n'est pas encore disponible
  if (currentUser === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.forest} />
      </View>
    )
  }

  const sections: AppGroupedListSection[] = [
    { key: "profile", title: fr.account.profile.title, rows: profileRows },
    {
      key: "connection",
      title: fr.account.sections.connection,
      rows: connectionRows,
    },
    {
      key: "signout",
      rows: [logoutRow],
    },
  ]

  return (
    <View style={styles.screen}>
      {/* ACC-04 : ScrollView pour gérer le clavier et les petits écrans */}
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topContentPadding,
            paddingBottom: bottomContentPadding + (isProfileDirty ? SAVE_BAR_ROOM : 0),
            paddingHorizontal: brandSpacing.md,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <PageTitle>{fr.account.title}</PageTitle>

        <IdentityCard
          accessToken={accessToken}
          apiUrl={apiUrl}
          currentUser={currentUser}
          profile={profile}
          heroName={heroName}
          profileUpdating={profileUpdating}
          onPickProfilePictureFromLibrary={onPickProfilePictureFromLibrary}
          onTakeProfilePictureFromCamera={onTakeProfilePictureFromCamera}
          onRemoveProfilePicture={onRemoveProfilePicture}
        />

        <AppGroupedList sections={sections} />
      </ScrollView>

      {isProfileDirty ? (
        <ProfileSaveBar
          bottom={Math.max(tabBarHeight, insets.bottom) + brandSpacing.sm}
          saving={profileUpdating}
          onCancel={resetProfile}
          onSave={() =>
            void onSaveProfile({
              first_name: firstName,
              last_name: lastName,
              display_name: displayName,
            })
          }
        />
      ) : null}
    </View>
  )
}

/** Room kept under the list so the floating save bar never hides the last row. */
const SAVE_BAR_ROOM = 76
