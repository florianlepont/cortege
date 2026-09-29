import { Image as ExpoImage } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { StyleSheet } from "react-native"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { HeaderCircleButton, HEADER_BUTTON_SIZE } from "../../ui/HeaderCircleButton"

type ProfileHeaderButtonProps = {
  pictureUri: string | null
  accessToken: string | null
  onPress: () => void
}

/** OA-85: the profile button of the Accueil header, a glass circle like Mes Relevés' "+". */
export function ProfileHeaderButton({
  pictureUri,
  accessToken,
  onPress,
}: ProfileHeaderButtonProps) {
  const theme = useBrandTheme()
  return (
    <HeaderCircleButton label={fr.home.avatar} onPress={onPress}>
      {pictureUri ? (
        <ExpoImage
          source={{
            uri: pictureUri,
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          }}
          style={styles.image}
          contentFit="cover"
          accessible={false}
        />
      ) : (
        <Ionicons name="person" size={20} color={theme.semanticColors.accent} />
      )}
    </HeaderCircleButton>
  )
}

const styles = StyleSheet.create({
  image: { width: HEADER_BUTTON_SIZE, height: HEADER_BUTTON_SIZE },
})
