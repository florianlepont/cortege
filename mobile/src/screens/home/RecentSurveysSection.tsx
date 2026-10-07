import { useCallback, useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { brandInteraction, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { formatShortDateTime } from "../../app/formatters"
import { formatSurveyUiStatusLabel, resolveSurveyUiStatus } from "../../app/survey-logic"
import type { SurveyDetailResponse } from "../../app/types"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppStatusChip } from "../../ui/AppStatusChip"
import { AppText as Text } from "../../ui/AppText"
import { EntranceView } from "../../ui/EntranceView"
import { feedback } from "../../ui/feedback"
import { RowIndicator, resolveSurveyRowTone } from "../survey-list/row-indicator"
import { createRowStyles } from "../survey-list/row-styles"
import { resolveRowScore } from "../survey-list/row-score"
import { SurveyRowFrame } from "../survey-list/SurveyRowFrame"

const t = fr.home.recent
const rowText = fr.surveyList

/** How many surveys the section shows. */
export const RECENT_SURVEYS_COUNT = 3

/** The surveys most recently updated, any status, newest first (D-20c). */
export function pickRecentSurveys(surveys: readonly LocalSurvey[]): LocalSurvey[] {
  const time = (survey: LocalSurvey): number => Date.parse(survey.updated_at) || 0
  return [...surveys].sort((a, b) => time(b) - time(a)).slice(0, RECENT_SURVEYS_COUNT)
}

type RecentSurveysSectionProps = {
  surveys: readonly LocalSurvey[]
  surveyDetails: Readonly<Record<string, SurveyDetailResponse | undefined>>
  onOpenSurvey: (surveyId: string) => void
  /** The "Tout voir" link: the Mes Relevés tab. */
  onSeeAll: () => void
  /** Stagger index of the header: the rows follow it one by one (EntranceView). */
  firstIndex: number
}

/**
 * D-20c: "Mes relevés récents", the three latest surveys of Accueil under the resume card. Each row
 * is the box of Mes Relevés (`SurveyRowFrame`: ring, title, status chip and date, no photo, the green
 * wave on press) and opens the survey the same way; "Tout voir" goes to the list. Nothing shows
 * without a survey.
 */
export function RecentSurveysSection({
  surveys,
  surveyDetails,
  onOpenSurvey,
  onSeeAll,
  firstIndex,
}: RecentSurveysSectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const rowStyles = useMemo(() => createRowStyles(theme), [theme])
  const recent = pickRecentSurveys(surveys)

  const open = useCallback(
    (surveyId: string) => {
      feedback.selection()
      onOpenSurvey(surveyId)
    },
    [onOpenSurvey],
  )

  if (recent.length === 0) return null

  return (
    <View style={styles.section} testID="home-recent-surveys">
      <EntranceView index={firstIndex}>
        <AppSectionHeader
          title={t.title}
          trailing={
            <Pressable
              style={styles.seeAll}
              onPress={onSeeAll}
              accessibilityRole="button"
              accessibilityLabel={t.seeAllLabel}
              testID="home-recent-see-all"
            >
              <Text style={styles.seeAllLabel}>{t.seeAll}</Text>
            </Pressable>
          }
          style={styles.header}
        />
      </EntranceView>
      <View style={styles.rows}>
        {recent.map((survey, position) => {
          const uiStatus = resolveSurveyUiStatus(survey)
          const label = formatSurveyUiStatusLabel(uiStatus)
          const tone = resolveSurveyRowTone(uiStatus)
          const updatedAt = formatShortDateTime(survey.updated_at)
          const title = survey.site_name?.trim() || fr.common.untitledSurvey
          return (
            <EntranceView key={survey.id} index={firstIndex + 1 + position}>
              <SurveyRowFrame
                testID={`home-recent-row-${survey.id}`}
                accessibilityLabel={rowText.a11y.openSurvey({
                  name: title,
                  status: label,
                  updatedAt,
                })}
                onPress={() => open(survey.id)}
                tone={tone}
                indicator={
                  <RowIndicator
                    surveyId={survey.id}
                    isSubmitted={survey.status === "submitted"}
                    score={resolveRowScore(survey, surveyDetails)}
                    completionRate={survey.completion_rate}
                    index={position}
                  />
                }
                title={title}
                status={
                  <>
                    <AppStatusChip
                      label={label}
                      tone={tone}
                      labelStyle={tone === "danger" ? rowStyles.badgeTextDanger : undefined}
                    />
                    <Text numberOfLines={1} style={rowStyles.surveyCardMeta}>
                      {rowText.row.updatedMeta(updatedAt)}
                    </Text>
                  </>
                }
              />
            </EntranceView>
          )
        })}
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    section: {
      marginTop: brandSpacing4.lg,
      marginHorizontal: brandSpacing4.md,
    },
    // The link is a 44 pt target, so the header centres its title on it.
    header: {
      alignItems: "center",
      marginBottom: brandSpacing4.xs,
    },
    seeAll: {
      minHeight: brandInteraction.hitTarget.min,
      minWidth: brandInteraction.hitTarget.min,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    seeAllLabel: {
      ...brandTypography.label,
      color: theme.visual.accentText,
    },
    rows: {
      gap: brandSpacing4.sm,
    },
  })
}
