import { useMemo } from "react"
import { Alert, Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { LocalAttachment, LocalSurvey } from "../../storage"
import { AppText as Text } from "../../ui/AppText"
import { isPhotoAttachment } from "../survey-screen-helpers"
import { GlassSurface } from "../../ui/GlassSurface"
import { PhotoGallery } from "./PhotoGallery"
import { PhotoTile, photoTileStatusText } from "./PhotoTile"
import { createPhotoStyles } from "./photos.styles"
import { createSummaryScreenStyles } from "./summary-screen.styles"

const t = fr.surveyDetail.photos
const alerts = fr.surveyDetail.alerts
const a11y = fr.surveyDetail.a11y

type PhotosStripProps = {
  survey: LocalSurvey
  attachments: LocalAttachment[]
  canEdit: boolean
  onTakePhoto: (surveyId: string) => Promise<void> | void
  onPickPhoto: (surveyId: string) => Promise<void> | void
  onDeleteAttachment: (surveyId: string, localAttachmentId: string) => Promise<void> | void
}

/**
 * The survey's photos, visible on the summary (OA-43), as a section of the page with no framing
 * card: the title and count, a compact glass "Ajouter" pill, then the photos as the star (one photo
 * full width at 16:10, several as a snapping 4:3 strip with the next tile peeking, a dashed tile to
 * add one for a draft without; nothing for a submitted survey without). A tap on a photo of a draft
 * offers to remove it.
 */
export function PhotosStrip({
  survey,
  attachments,
  canEdit,
  onTakePhoto,
  onPickPhoto,
  onDeleteAttachment,
}: PhotosStripProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const photoStyles = useMemo(() => createPhotoStyles(theme), [theme])
  const photos = useMemo(() => attachments.filter(isPhotoAttachment), [attachments])

  const handleAdd = (): void => {
    Alert.alert(alerts.addPhotoTitle, alerts.addPhotoMessage, [
      { text: alerts.takePhoto, onPress: () => void onTakePhoto(survey.id) },
      { text: alerts.pickFromGallery, onPress: () => void onPickPhoto(survey.id) },
      { text: fr.common.actions.cancel, style: "cancel" },
    ])
  }

  const handlePhotoPress = (attachmentId: string): void => {
    if (!canEdit) return
    Alert.alert(alerts.deletePhotoTitle, alerts.deletePhotoMessage, [
      {
        text: fr.common.actions.delete,
        style: "destructive",
        onPress: () => void onDeleteAttachment(survey.id, attachmentId),
      },
      { text: fr.common.actions.cancel, style: "cancel" },
    ])
  }

  // Nothing to show and nothing to add: no block at all (a submitted survey without photo).
  if (photos.length === 0 && !canEdit) return null

  return (
    <View style={photoStyles.block}>
      <View style={photoStyles.header}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {t.title}
          {photos.length > 0 ? (
            <Text style={styles.cardTitleCount}>{t.countSuffix(photos.length)}</Text>
          ) : null}
        </Text>
        {canEdit ? (
          <Pressable
            style={photoStyles.addHit}
            onPress={handleAdd}
            accessibilityRole="button"
            accessibilityLabel={a11y.addPhoto}
          >
            <GlassSurface tone="auto" pointerEvents="none" style={photoStyles.addPill}>
              <Ionicons name="add-outline" size={18} color={theme.semanticColors.textStrong} />
              <Text style={photoStyles.addPillText}>{t.add}</Text>
            </GlassSurface>
          </Pressable>
        ) : null}
      </View>
      {photos.length === 0 ? (
        <Pressable
          style={photoStyles.emptyTile}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={a11y.addPhoto}
          testID="photos-empty-tile"
        >
          <Ionicons name="camera-outline" size={28} color={theme.colors.textSecondary} />
          <Text style={photoStyles.emptyText}>{t.emptyAdd}</Text>
        </Pressable>
      ) : (
        <PhotoGallery
          ids={photos.map((attachment) => attachment.id)}
          renderPhoto={(id, index, size) => (
            <Pressable
              style={[photoStyles.photoPress, { width: size.width, height: size.height }]}
              onPress={() => handlePhotoPress(id)}
              accessibilityRole={canEdit ? "button" : "image"}
              accessibilityLabel={a11y.photo({ position: index + 1, total: photos.length })}
              accessibilityHint={canEdit ? alerts.deletePhotoTitle : undefined}
              accessibilityValue={{ text: photoTileStatusText(photos[index]) }}
            >
              <PhotoTile attachment={photos[index]} size={size} />
            </Pressable>
          )}
        />
      )}
    </View>
  )
}
