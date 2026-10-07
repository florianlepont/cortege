import { useMemo } from "react"
import { Alert, Pressable, ScrollView, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { LocalAttachment, LocalSurvey } from "../../storage"
import { AppText as Text } from "../../ui/AppText"
import { isPhotoAttachment } from "../survey-screen-helpers"
import { AttachmentPhotoPreview } from "./AttachmentPhotoPreview"
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
 * The survey's photos, visible on the summary (OA-43), with "Ajouter" next to the title. Photos
 * are part of the survey: no longer behind a small camera button on the map. A tap on a photo of
 * a draft offers to remove it.
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

  return (
    <View style={styles.photosCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {t.title}
          {photos.length > 0 ? (
            <Text style={styles.cardTitleCount}>{t.countSuffix(photos.length)}</Text>
          ) : null}
        </Text>
        {canEdit ? (
          <Pressable
            style={styles.addButton}
            onPress={handleAdd}
            accessibilityRole="button"
            accessibilityLabel={a11y.addPhoto}
          >
            <Ionicons name="add" size={20} color={theme.semanticColors.textStrong} />
            <Text style={styles.addButtonText}>{t.add}</Text>
          </Pressable>
        ) : null}
      </View>
      {photos.length === 0 ? (
        <Text style={styles.photoEmpty}>{canEdit ? t.empty : t.emptyReadOnly}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
        >
          {photos.map((attachment, index) => (
            <Pressable
              key={attachment.id}
              style={styles.photo}
              onPress={() => handlePhotoPress(attachment.id)}
              accessibilityRole={canEdit ? "button" : "image"}
              accessibilityLabel={a11y.photo({ position: index + 1, total: photos.length })}
              accessibilityHint={canEdit ? alerts.deletePhotoTitle : undefined}
            >
              <AttachmentPhotoPreview
                attachment={attachment}
                imageStyle={styles.photoImage}
                placeholderStyle={styles.photoImage}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
