import { ActivityIndicator, ImageStyle, StyleProp, View, ViewStyle } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Image as ExpoImage } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { brandSpacing, brandTypography } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { LocalAttachment } from "../../storage"
import { AttachmentPreview, resolveAttachmentPreview } from "../survey-screen-helpers"

// Renders one attachment as an image (expo-image, from the downsized local
// file), a loading placeholder (server photo not cached yet), or a static
// missing/unavailable placeholder (D-10, D-11). Used by the carousel, hero
// thumb and debug tab so the "which state to show" decision stays in the one
// tested helper (resolveAttachmentPreview).
export function AttachmentPhotoPreview({
  attachment,
  imageStyle,
  placeholderStyle,
}: {
  attachment: LocalAttachment
  imageStyle: StyleProp<ImageStyle>
  placeholderStyle: StyleProp<ViewStyle>
}) {
  const theme = useBrandTheme()
  const preview: AttachmentPreview = resolveAttachmentPreview(attachment)

  if (preview.kind === "image") {
    return (
      <ExpoImage
        source={{ uri: preview.uri }}
        style={imageStyle}
        contentFit="cover"
        cachePolicy="memory"
        recyclingKey={attachment.id}
      />
    )
  }

  return (
    <View
      style={[
        placeholderStyle,
        { alignItems: "center", justifyContent: "center", gap: brandSpacing.xs },
      ]}
    >
      {preview.kind === "loading" ? (
        <ActivityIndicator size="small" color={theme.colors.forest} />
      ) : (
        <Ionicons
          name={preview.kind === "unavailable" ? "image-outline" : "alert-circle-outline"}
          size={20}
          color={theme.colors.textSecondary}
        />
      )}
      <Text style={{ ...brandTypography.meta, color: theme.colors.textSecondary }}>
        {preview.message}
      </Text>
    </View>
  )
}
