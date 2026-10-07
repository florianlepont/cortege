import { useMemo, useState } from "react"
import { StyleProp, View, ViewStyle } from "react-native"
import { Image as ExpoImage } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useReducedMotion } from "react-native-reanimated"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { LocalAttachment } from "../../storage"
import { AppText as Text } from "../../ui/AppText"
import { Skeleton } from "../../ui/Skeleton"
import { AttachmentPreview, resolveAttachmentPreview } from "../survey-screen-helpers"
import { createSummaryScreenStyles, PHOTO_TILE } from "./summary-screen.styles"

const t = fr.surveyDetail.photos

/** The cross-fade from the skeleton to the picture. Not played under Reduce Motion. */
export const PHOTO_FADE_MS = 160

/** What a tile shows: the picture, the calm skeleton while it comes, or the neutral fallback. */
export type PhotoTileState = "image" | "loading" | "missing" | "unavailable"

export function resolvePhotoTileState(preview: AttachmentPreview): PhotoTileState {
  return preview.kind
}

/** The sentence a screen reader gets for a tile that has no picture (empty for a picture). */
export function photoTileStatusText(
  attachment: Pick<LocalAttachment, "file_state" | "local_uri">,
): string | undefined {
  const preview = resolveAttachmentPreview(attachment)
  return preview.kind === "image" ? undefined : preview.message
}

function FallbackFace({ kind }: { kind: "missing" | "unavailable" }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  return (
    <View style={styles.photoFallback} testID="photo-tile-fallback">
      <Ionicons name="image-outline" size={24} color={theme.colors.textSecondary} />
      <Text style={styles.photoFallbackText} numberOfLines={1}>
        {kind === "missing" ? t.tileMissing : t.tileUnavailable}
      </Text>
    </View>
  )
}

/**
 * The picture, over its skeleton. The tile has its size from the first frame, so nothing moves when
 * the image arrives; a file that fails to load turns into the neutral fallback instead of a hole.
 * Keyed by the uri by the parent, so a new file starts from the skeleton again.
 */
function ImageFace({ attachmentId, uri }: { attachmentId: string; uri: string }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<"loading" | "loaded" | "failed">("loading")

  if (phase === "failed") return <FallbackFace kind="unavailable" />

  return (
    <>
      {phase === "loading" ? (
        <Skeleton
          width={PHOTO_TILE.width}
          height={PHOTO_TILE.height}
          borderRadius={0}
          style={styles.photoImage}
        />
      ) : null}
      <ExpoImage
        source={{ uri }}
        style={styles.photoImage}
        contentFit="cover"
        cachePolicy="memory"
        recyclingKey={attachmentId}
        transition={reduced ? 0 : PHOTO_FADE_MS}
        onLoad={() => setPhase("loaded")}
        onError={() => setPhase("failed")}
      />
    </>
  )
}

/**
 * One photo of the survey as a tile (12.2-14, D-27b): always the same 4:3 box with the same radius
 * and hairline (`styles.photo`), whatever it shows. A local file gets its picture over a calm
 * skeleton, a photo still to download only the skeleton, a missing or unusable file a neutral face
 * with an outline icon and one word. The long sentence of `labels.attachmentPreview` is the
 * accessibility value, so no text overflows the tile. The parent owns the press and its label.
 */
export function PhotoTile({
  attachment,
  style,
}: {
  attachment: LocalAttachment
  style?: StyleProp<ViewStyle>
}) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const preview = resolveAttachmentPreview(attachment)
  const state = resolvePhotoTileState(preview)

  return (
    <View style={[styles.photo, style]} testID={`photo-tile-${state}`}>
      {preview.kind === "image" ? (
        <ImageFace key={preview.uri} attachmentId={attachment.id} uri={preview.uri} />
      ) : preview.kind === "loading" ? (
        <Skeleton
          width={PHOTO_TILE.width}
          height={PHOTO_TILE.height}
          borderRadius={0}
          style={styles.photoImage}
        />
      ) : (
        <FallbackFace kind={preview.kind} />
      )}
    </View>
  )
}
