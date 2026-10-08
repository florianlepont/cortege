import { memo, useCallback, useMemo, useRef } from "react"
import {} from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import Swipeable from "react-native-gesture-handler/Swipeable"
import { useBrandTheme } from "../../app/theme"
import { formatShortDateTime, formatSyncErrorForUser } from "../../app/formatters"
import { formatSurveyUiStatusLabel, resolveSurveyUiStatus } from "../../app/survey-logic"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppStatusChip } from "../../ui/AppStatusChip"
import { feedback } from "../../ui/feedback"
import { createRowStyles } from "./row-styles"
import { RowIndicator, resolveSurveyRowTone } from "./row-indicator"
import { SurveyRowFrame } from "./SurveyRowFrame"
import { AppPressable } from "../../ui/AppPressable"

export type SurveyRowProps = {
  survey: LocalSurvey
  /** LIST-01: the submitted survey's IBP total, once known — null shows a plain "submitted" ring. */
  score: number | null
  selected: boolean
  /** Position in the list: read at mount only, for the ring entrance stagger (rows 0 to 7). */
  index?: number
  onOpen: (surveyId: string) => void
  onDelete: (surveyId: string) => void
}

const t = fr.surveyList

/**
 * One survey list row (01.9-22, D-03). Memoised: it re-renders only when its own
 * survey object, preview, selection or callbacks change. Callbacks take the
 * survey id, so the list passes the same two functions to every row.
 */
function SurveyRowComponent({
  survey,
  score,
  selected,
  index = 0,
  onOpen,
  onDelete,
}: SurveyRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createRowStyles(theme), [theme])
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
      <AppPressable
        disableScale
        disableRipple
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
      </AppPressable>
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
      <SurveyRowFrame
        accessibilityState={{ selected }}
        accessibilityLabel={t.a11y.openSurvey({
          name: survey.site_name,
          status: uiStatusLabel,
          updatedAt,
        })}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
        onPress={handleOpen}
        tone={rowTone}
        selected={selected}
        indicator={
          <RowIndicator
            surveyId={surveyId}
            isSubmitted={survey.status === "submitted"}
            score={score}
            completionRate={survey.completion_rate}
            index={index}
          />
        }
        /* OA-58: an unnamed draft no longer shows as a blank row. */
        title={survey.site_name?.trim() || fr.common.untitledSurvey}
        status={
          <>
            <AppStatusChip
              label={uiStatusLabel}
              tone={rowTone}
              labelStyle={rowTone === "danger" ? styles.badgeTextDanger : undefined}
            />
            <Text numberOfLines={1} style={styles.surveyCardMeta}>
              {t.row.updatedMeta(updatedAt)}
            </Text>
          </>
        }
        support={supportText}
      />
    </Swipeable>
  )
}

// `index` is left out of the comparison on purpose: it only drives the entrance stagger at mount, and
// comparing it would re-render every row below a draft that moves into the "continue" card.
export const SurveyRow = memo(
  SurveyRowComponent,
  (previous, next) =>
    previous.survey === next.survey &&
    previous.score === next.score &&
    previous.selected === next.selected &&
    previous.onOpen === next.onOpen &&
    previous.onDelete === next.onDelete,
)
