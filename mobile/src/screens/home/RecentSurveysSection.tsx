import { Fragment, useCallback, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import {
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypography,
} from "../../app/brand-tokens"
import type { SurveyDetailResponse } from "../../app/types"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { EntranceView } from "../../ui/EntranceView"
import { feedback } from "../../ui/feedback"
import { HOME_GAPS, RECENT_LAYOUT } from "./layout-budget"
import { CompactSurveyRow } from "../survey-list/CompactSurveyRow"
import { AppPressable } from "../../ui/AppPressable"

const t = fr.home.recent

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
 * D-20c: "Mes relevés récents", the three latest surveys of Accueil under the resume card. Compact
 * (12.2-14, owner check: the section pushed the nearby map out of the first screen): the rows are
 * slim (`SurveyRowFrame density="compact"`, 52 pt) inside one glass card and divided by hairlines, with the parts of a
 * Mes Relevés row (accent bar, smaller ring, title, status chip and date, no photo, the green wave on
 * press); a press opens the survey the same way. "Tout voir" goes to the list. Nothing shows without
 * a survey. Mes Relevés and the search page keep their own, taller rows (D-23).
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
            <AppPressable
              style={styles.seeAll}
              onPress={onSeeAll}
              accessibilityRole="button"
              accessibilityLabel={t.seeAllLabel}
              testID="home-recent-see-all"
            >
              <Text style={styles.seeAllLabel}>{t.seeAll}</Text>
            </AppPressable>
          }
          style={styles.header}
        />
      </EntranceView>
      {/* The shell carries the glass and the shadow; the clip keeps the wave inside the corners. */}
      <View style={styles.card} testID="home-recent-card">
        <View style={styles.clip}>
          {recent.map((survey, position) => (
            <Fragment key={survey.id}>
              {position > 0 ? (
                <View style={styles.separator} testID="home-recent-separator" />
              ) : null}
              <EntranceView index={firstIndex + 1 + position}>
                <CompactSurveyRow
                  testID={`home-recent-row-${survey.id}`}
                  survey={survey}
                  surveyDetails={surveyDetails}
                  index={position}
                  onOpen={open}
                />
              </EntranceView>
            </Fragment>
          ))}
        </View>
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    section: {
      marginTop: HOME_GAPS.recent,
      marginHorizontal: brandSpacing4.md,
    },
    // The link is a 44 pt target, so the header centres its title on it; the 13 pt of the target
    // above and under the title are the gap to the card (`RECENT_LAYOUT.headerGap` is 0).
    header: {
      alignItems: "center",
      marginBottom: RECENT_LAYOUT.headerGap,
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
    // The glass of a Mes Relevés card, once for the three rows.
    card: {
      borderRadius: brandRadius.card,
      borderWidth: RECENT_LAYOUT.cardBorder,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
    },
    clip: {
      overflow: "hidden",
      borderRadius: brandRadius.card - RECENT_LAYOUT.cardBorder,
    },
    separator: {
      height: RECENT_LAYOUT.separator,
      backgroundColor: theme.colors.divider,
    },
  })
}
