import { useMemo } from "react"
import { ActionSheetIOS, Alert, Platform, View } from "react-native"
import { Image } from "expo-image"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../../app/theme"
import { AuthUser } from "../../app/types"
import { GlassSurface } from "../../ui/GlassSurface"
import { fr } from "../../i18n"
import { createIdentityStyles } from "./styles"
import { AppPressable } from "../../ui/AppPressable"

export type IdentityCardProps = {
  // The only reader of the access token on the account screen: it signs the
  // profile picture request.
  accessToken: string
  apiUrl: string
  currentUser: AuthUser
  profile: string
  heroName: string
  profileUpdating: boolean
  onPickProfilePictureFromLibrary: () => Promise<void>
  onTakeProfilePictureFromCamera: () => Promise<void>
  onRemoveProfilePicture: () => Promise<void>
}

export const resolveInitials = (user: AuthUser | null, fallbackProfile: string): string => {
  const source =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.display_name?.trim() ||
    user?.email?.trim() ||
    fallbackProfile.trim() ||
    fr.account.fallbackName

  return source
    .split(/[\s@._-]+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export const resolveProfilePictureUri = (raw: string | null | undefined, apiUrl: string) => {
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  const trimmedBase = apiUrl.replace(/\/+$/, "")
  const path = raw.startsWith("/") ? raw : `/${raw}`
  return `${trimmedBase}${path}`
}

export function IdentityCard({
  accessToken,
  apiUrl,
  currentUser,
  profile,
  heroName,
  profileUpdating,
  onPickProfilePictureFromLibrary,
  onTakeProfilePictureFromCamera,
  onRemoveProfilePicture,
}: IdentityCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createIdentityStyles(theme), [theme])
  const profilePictureUri = useMemo(
    () => resolveProfilePictureUri(currentUser.profile_picture_url, apiUrl),
    [apiUrl, currentUser.profile_picture_url],
  )
  const heroSubtitle = currentUser.email ?? fr.account.noEmail
  const initials = resolveInitials(currentUser, profile)

  // ACC-01 : Action Sheet native au lieu du Modal custom
  const openPhotoActions = (): void => {
    const photo = fr.account.alerts.photo
    const options: string[] = [fr.common.actions.cancel, photo.take, photo.pick]
    const actions = [
      () => void onTakeProfilePictureFromCamera(),
      () => void onPickProfilePictureFromLibrary(),
    ]
    if (profilePictureUri) {
      options.push(photo.remove)
      actions.push(() => void onRemoveProfilePicture())
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: photo.title,
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: profilePictureUri ? options.length - 1 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) actions[buttonIndex - 1]()
        },
      )
    } else {
      // Android fallback via Alert
      Alert.alert(
        photo.title,
        undefined,
        [
          { text: photo.take, onPress: () => void onTakeProfilePictureFromCamera() },
          {
            text: photo.pick,
            onPress: () => void onPickProfilePictureFromLibrary(),
          },
          ...(profilePictureUri
            ? [
                {
                  text: photo.remove,
                  style: "destructive" as const,
                  onPress: () => void onRemoveProfilePicture(),
                },
              ]
            : []),
          { text: fr.common.actions.cancel, style: "cancel" as const },
        ],
        { cancelable: true },
      )
    }
  }

  // OA-70, D-05: a compact glass card, the avatar with its glass camera badge on the left, the
  // name and the email on the right (no role chip: OA-71).
  return (
    <View style={styles.identity}>
      {/* ACC-11 : Avatar avec badge caméra */}
      <AppPressable
        style={styles.avatarButton}
        onPress={openPhotoActions}
        disabled={profileUpdating}
        accessibilityRole="button"
        accessibilityLabel={fr.account.a11y.editPhoto}
        accessibilityHint={fr.account.a11y.editPhotoHint}
        hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
        {profilePictureUri ? (
          <Image
            source={{
              uri: profilePictureUri,
              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
            }}
            style={styles.avatarImage}
            contentFit="cover"
            accessible={false}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText} accessible={false}>
              {initials || fr.account.initialsFallback}
            </Text>
          </View>
        )}
        <GlassSurface style={styles.avatarEditBadge} pointerEvents="none">
          <Ionicons name="camera-outline" size={14} color={theme.semanticColors.textStrong} />
        </GlassSurface>
      </AppPressable>
      <View style={styles.identityTexts}>
        <Text style={styles.identityName} numberOfLines={1}>
          {heroName}
        </Text>
        <Text style={styles.identityMeta} numberOfLines={1}>
          {heroSubtitle}
        </Text>
      </View>
    </View>
  )
}
