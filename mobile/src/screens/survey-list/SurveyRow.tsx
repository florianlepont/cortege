import { memo, useCallback, useMemo, useRef } from "react"
import { ActivityIndicator, Pressable, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Image as ExpoImage } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import Swipeable from "react-native-gesture-handler/Swipeable"
import { useBrandTheme } from "../../app/theme"
import { formatShortDateTime, formatSyncErrorForUser } from "../../app/formatters"
import { formatSurveyUiStatusLabel, resolveSurveyUiStatus } from "../../app/survey-logic"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppStatusChip } from "../../ui/AppStatusChip"
import { ScoreRing } from "../../ui/ScoreRing"
import type { AttachmentPreview } from "../survey-screen-helpers"
import { feedback } from "../../ui/feedback"
import { createRowStyles } from "./row-styles"

type RowStyles = ReturnType<typeof createRowStyles>

type SurveyRowTone = "neutral" | "success" | "warning" | "danger"

/** First photo preview of a survey, with the attachment id used as image recycling key. */
export type SurveyRowPreview = AttachmentPreview & { attachmentId: string }

export type SurveyRowProps = {
  survey: LocalSurvey
  preview: SurveyRowPreview | null
  /** LIST-01: the submitted survey's IBP total, once known — null shows a plain "submitted" ring. */
  score: number | null
  selected: boolean
  /** Position in the list: drives the ring's entrance stagger (rows 0 to 7 only). */
  index?: number
  onOpen: (surveyId: string) => void
  onDelete: (surveyId: string) => void
}

const t = fr.surveyList

function resolveSurveyRowTone(uiStatus: ReturnType<typeof resolveSurveyUiStatus>): SurveyRowTone {
  if (uiStatus === "sync_error" || uiStatus === "sync_blocked") return "danger"
  if (uiStatus === "submitted") return "success"
  if (uiStatus === "sync_pending") return "warning"
  return "neutral"
}

function accentStyleByTone(styles: RowStyles) {
  return {
    success: styles.surveyCardAccentSuccess,
    warning: styles.surveyCardAccentWarning,
    danger: styles.surveyCardAccentDanger,
    neutral: styles.surveyCardAccentNeutral,
  } as const
}

function previewEqual(left: SurveyRowPreview | null, right: SurveyRowPreview | null): boolean {
  if (left === right) return true
  if (!left || !right) return false
  if (left.attachmentId !== right.attachmentId || left.kind !== right.kind) return false
  if (left.kind === "image" && right.kind === "image") return left.uri === right.uri
  return true
}

function RowPreview({
  preview,
  theme,
  styles,
}: {
  preview: SurveyRowPreview
  theme: ReturnType<typeof useBrandTheme>
  styles: RowStyles
}) {
  if (preview.kind === "image") {
    return (
      <View style={styles.surveyCardMedia}>
        <ExpoImage
          source={{ uri: preview.uri }}
          style={styles.surveyCardPreview}
          contentFit="cover"
          cachePolicy="memory"
          recyclingKey={preview.attachmentId}
        />
      </View>
    )
  }
  return (
    <View style={styles.surveyCardMedia}>
      <View style={[styles.surveyCardPreview, styles.surveyCardPreviewPlaceholder]}>
        {preview.kind === "loading" ? (
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        ) : (
          <Ionicons
            name={preview.kind === "missing" ? "warning-outline" : "image-outline"}
            size={18}
            color={theme.colors.textSecondary}
          />
        )}
      </View>
    </View>
  )
}

// LIST-01: the score ring (12.2-11). A submitted survey with a known total gets the band-coloured
// ring, a submitted one without a score the dashed "no score" ring, a draft a neutral arc showing
// how many of the ten factors are filled.
function RowIndicator({
  surveyId,
  isSubmitted,
  score,
  completionRate,
  index,
  styles,
}: {
  surveyId: string
  isSubmitted: boolean
  score: number | null
  completionRate: number
  index: number
  styles: RowStyles
}) {
  if (isSubmitted) {
    return (
      <View style={styles.surveyCardIndicator}>
        {score != null ? (
          <ScoreRing score={score} index={index} animationKey={`${surveyId}:${score}`} />
        ) : (
          <ScoreRing score={null} />
        )}
      </View>
    )
  }
  const clamped = Math.max(0, Math.min(100, completionRate))
  return (
    <View style={styles.surveyCardIndicator}>
      <ScoreRing
        score={null}
        completion={clamped / 100}
        index={index}
        animationKey={`${surveyId}:draft:${clamped}`}
      />
    </View>
  )
}

/**
 * One survey list row (01.9-22, D-03). Memoised: it re-renders only when its own
 * survey object, preview, selection or callbacks change. Callbacks take the
 * survey id, so the list passes the same two functions to every row.
 */
function SurveyRowComponent({
  survey,
  preview,
  score,
  selected,
  index = 0,
  onOpen,
  onDelete,
}: SurveyRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createRowStyles(theme), [theme])
  const accentStyles = useMemo(() => accentStyleByTone(styles), [styles])
  const swipeableRef = useRef<Swipeable>(null)
  const surveyId = survey.id
  const uiStatus = resolveSurveyUiStatus(survey)
  const uiStatusLabel = formatSurveyUiStatusLabel(uiStatus)
  const rowTone = resolveSurveyRowTone(uiStatus)
  const updatedAt = formatShortDateTime(survey.updated_at)
  const supportText = formatSyncErrorForUser(survey.last_sync_error, survey.last_sync_error_code)
  const deleteLabel = t.a11y.deleteSurvey(survey.site_name)

  const handleDelete = useCallback(() => {
    swipeableRef.current?.close()
    onDelete(surveyId)
  }, [onDelete, surveyId])

  const handleOpen = useCallback(() => {
    feedback.selection()
    onOpen(surveyId)
  }, [onOpen, surveyId])

  // LIST-02: destructive action on the right (iOS convention), revealed by swiping left.
  const renderRightActions = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        onPress={handleDelete}
        style={({ pressed }) => [
          styles.surveyDeleteAction,
          pressed && styles.surveyDeleteActionPressed,
        ]}
      >
        <Ionicons name="trash-outline" size={18} color={theme.colors.white} />
        <Text style={styles.surveyDeleteActionText}>{t.row.deleteAction}</Text>
      </Pressable>
    ),
    [deleteLabel, handleDelete, styles, theme],
  )

  // LIST-02: an accessibility action mirrors the swipe gesture, so a screen-reader user does not
  // need to perform it to delete a survey.
  const accessibilityActions = [{ name: "delete", label: t.row.deleteAction }]
  const handleAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      if (event.nativeEvent.actionName === "delete") {
        handleDelete()
      }
    },
    [handleDelete],
  )

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      rightThreshold={56}
      containerStyle={styles.surveySwipeable}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={t.a11y.openSurvey({
          name: survey.site_name,
          status: uiStatusLabel,
          updatedAt,
        })}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
        style={({ pressed }) => [
          styles.surveyCard,
          selected ? styles.surveyCardSelected : null,
          pressed && styles.surveyCardPressed,
        ]}
        onPress={handleOpen}
      >
        {/* Accent bar — transparent for neutral (N-06) */}
        <View style={[styles.surveyCardAccent, accentStyles[rowTone]]} />

        <RowIndicator
          surveyId={surveyId}
          isSubmitted={survey.status === "submitted"}
          score={score}
          completionRate={survey.completion_rate}
          index={index}
          styles={styles}
        />

        {/* P2-COMPACT-01: thumbnail only when photo exists */}
        {preview ? <RowPreview preview={preview} theme={theme} styles={styles} /> : null}

        <View style={styles.surveyCardContent}>
          <View style={styles.surveyCardHeader}>
            <Text numberOfLines={2} style={styles.surveyCardTitle}>
              {/* OA-58: an unnamed draft no longer shows as a blank row. */}
              {survey.site_name?.trim() || fr.common.untitledSurvey}
            </Text>
            {selected ? (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.forest}
                style={styles.surveyCardSelectedIcon}
              />
            ) : null}
          </View>

          <View style={styles.surveyCardStatusRow}>
            <AppStatusChip
              label={uiStatusLabel}
              tone={rowTone}
              labelStyle={rowTone === "danger" ? styles.badgeTextDanger : undefined}
            />
            <Text numberOfLines={1} style={styles.surveyCardMeta}>
              {t.row.updatedMeta(updatedAt)}
            </Text>
          </View>

          {supportText ? (
            <Text numberOfLines={2} style={styles.surveyCardSupport}>
              {supportText}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Swipeable>
  )
}

export const SurveyRow = memo(
  SurveyRowComponent,
  (previous, next) =>
    previous.survey === next.survey &&
    previous.score === next.score &&
    previous.selected === next.selected &&
    previous.index === next.index &&
    previous.onOpen === next.onOpen &&
    previous.onDelete === next.onDelete &&
    previewEqual(previous.preview, next.preview),
)
