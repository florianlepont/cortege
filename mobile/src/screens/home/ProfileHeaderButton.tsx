import { Image as ExpoImage } from "expo-image"
import { StyleSheet } from "react-native"
import { brandRadius } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"

const AVATAR_SIZE = 32

type ProfileHeaderButtonProps = {
  pictureUri: string
  accessToken: string | null
  onPress: () => void
}

/**
 * OA-85: the profile photo as a native header item. iOS 26 puts the glass around it, so it is a
 * bare round photo; without a photo the header uses a plain icon button instead.
 */
export function ProfileHeaderButton({
  pictureUri,
  accessToken,
  onPress,
}: ProfileHeaderButtonProps) {
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={fr.home.avatar}
      hitSlop={6}
      onPress={onPress}
    >
      <ExpoImage
        source={{
          uri: pictureUri,
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        }}
        style={styles.image}
        contentFit="cover"
        accessible={false}
      />
    </AppPressable>
  )
}

const styles = StyleSheet.create({
  image: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: brandRadius.pill },
})
