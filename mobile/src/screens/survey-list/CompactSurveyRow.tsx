import { memo, useCallback, useMemo } from "react"
import { StyleSheet } from "react-native"
import { formatShortDateTime } from "../../app/formatters"
import { formatSurveyUiStatusLabel, resolveSurveyUiStatus } from "../../app/survey-logic"
import type { SurveyDetailResponse } from "../../app/types"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppText as Text } from "../../ui/AppText"
import { RECENT_LAYOUT } from "../home/layout-budget"
import { RowIndicator, resolveSurveyRowTone } from "./row-indicator"
import { resolveRowScore } from "./row-score"
import { createRowStyles } from "./row-styles"
import { SurveyRowFrame } from "./SurveyRowFrame"

const rowText = fr.surveyList

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    paddingVertical: RECENT_LAYOUT.chipPaddingY,
  },
  meta: {
    flexShrink: 1,
  },
})

type CompactSurveyRowProps = {
  survey: LocalSurvey
  surveyDetails: Readonly<Record<string, SurveyDetailResponse | undefined>>
  /** Position in the list, for the ring entrance stagger. */
  index: number
  onOpen: (surveyId: string) => void
  testID?: string
}

/**
 * The slim own-survey row (52 pt, 32 pt ring): accent bar, title, status chip and short date. It is
 * the row of "Mes relevés récents" on Accueil and of the own surveys of the search summary (25-04,
 * UI-SPEC U-05), drawn inside a card the caller provides (`SurveyRowFrame density="compact"`).
 */
function CompactSurveyRowComponent({
  survey,
  surveyDetails,
  index,
  onOpen,
  testID,
}: CompactSurveyRowProps) {
  const theme = useBrandTheme()
  const rowStyles = useMemo(() => createRowStyles(theme), [theme])
  const handlePress = useCallback(() => onOpen(survey.id), [onOpen, survey.id])

  const uiStatus = resolveSurveyUiStatus(survey)
  const label = formatSurveyUiStatusLabel(uiStatus)
  const tone = resolveSurveyRowTone(uiStatus)
  const updatedAt = formatShortDateTime(survey.updated_at)
  const title = survey.site_name?.trim() || fr.common.untitledSurvey

  return (
    <SurveyRowFrame
      density="compact"
      testID={testID}
      accessibilityLabel={rowText.a11y.openSurvey({ name: title, status: label, updatedAt })}
      onPress={handlePress}
      tone={tone}
      indicator={
        <RowIndicator
          surveyId={survey.id}
          isSubmitted={survey.status === "submitted"}
          score={resolveRowScore(survey, surveyDetails)}
          completionRate={survey.completion_rate}
          index={index}
          size={RECENT_LAYOUT.ringSize}
        />
      }
      title={title}
      status={
        <>
          <AppChoiceChip
            variant="status"
            label={label}
            tone={tone}
            style={styles.chip}
            labelStyle={tone === "danger" ? rowStyles.badgeTextDanger : undefined}
          />
          <Text numberOfLines={1} style={[rowStyles.surveyCardMeta, styles.meta]}>
            {rowText.row.updatedMeta(updatedAt)}
          </Text>
        </>
      }
    />
  )
}

export const CompactSurveyRow = memo(CompactSurveyRowComponent)
