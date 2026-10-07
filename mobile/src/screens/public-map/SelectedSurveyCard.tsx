import { memo, useMemo } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  isIbpCas,
  resolveMethodVersion,
} from "@cortege/ibp-domain"
import type { PublicMapItem } from "../../app/types"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppNotice } from "../../ui/AppNotice"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { GlassButton } from "../../ui/GlassButton"
import { ScoreRing } from "../../ui/ScoreRing"
import { SheetCloseButton } from "./SheetCloseButton"
import { createPanelStyles } from "./styles"

const t = fr.publicMap

/** "IBP v3.0" or "IBP v3.2"; a survey without a version is v3.0 (D-02), an unknown one shows none. */
export function surveyMethodLabel(item: PublicMapItem): string | null {
  const version = resolveMethodVersion(item.ibp_method_version)
  if (version === IBP_METHOD_V3_2) return t.method.v3_2
  if (version === IBP_METHOD_V3_0) return t.method.v3_0
  return null
}

/** Where the survey sits in the method: "Cas N" for a v3.2 survey with a cas, else its region. */
export function surveyPlaceLabel(item: PublicMapItem): string {
  if (resolveMethodVersion(item.ibp_method_version) === IBP_METHOD_V3_2 && isIbpCas(item.ibp_cas)) {
    return t.cas(item.ibp_cas)
  }
  return item.region_code
}

export type SelectedSurveyCardProps = {
  item: PublicMapItem
  isOwnSurvey: boolean
  /** OA-59: an unfinished survey of the author, shown to them alone. */
  isDraft?: boolean
  onOpenSurvey: (surveyId: string) => void
  onClose: () => void
}

/**
 * The selected survey marker's summary (member-only Explorer map, Phase 2), shown in the
 * Explorer tiered sheet (MAP-01). The report entry point that used to live here was removed
 * (ROADMAP Phase 2 criterion 3); `api/src/reports/` stays in the API, untouched, for a future
 * moderation UI.
 */
export const SelectedSurveyCard = memo(function SelectedSurveyCard({
  item,
  isOwnSurvey,
  isDraft = false,
  onOpenSurvey,
  onClose,
}: SelectedSurveyCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPanelStyles(theme), [theme])
  const methodLabel = surveyMethodLabel(item)

  return (
    <View style={styles.card}>
      <AppSectionHeader
        title={isDraft ? t.draft.title(item.ibp_total) : t.selected.title(item.ibp_total)}
        trailing={<SheetCloseButton accessibilityLabel={t.a11y.closeSelection} onPress={onClose} />}
        titleStyle={styles.title}
      />
      {/* 12.2-18: the selected survey as a glass row with the accent outline, its place and date
          on the left and its ring on the trailing side, centred (D-27a). No photo (owner). */}
      <View testID="selected-survey-summary" style={styles.selectedSummary}>
        <View style={styles.selectedText}>
          <Text style={styles.selectedPlace}>
            {isDraft
              ? t.draft.meta
              : t.selected.meta({ region: surveyPlaceLabel(item), date: item.survey_date })}
          </Text>
          {methodLabel ? <Text style={styles.meta}>{methodLabel}</Text> : null}
        </View>
        <View style={styles.ringColumn}>
          <ScoreRing
            score={item.ibp_total}
            index={0}
            animationKey={`${item.survey_id}:${item.ibp_total}`}
          />
        </View>
      </View>

      {/* The full-width action of the panel is the glass call to action (D-27c, D-28), same size. */}
      <GlassButton
        label={isDraft ? t.draft.open : t.selected.openSurvey}
        size="sm"
        onPress={() => onOpenSurvey(item.survey_id)}
        testID="selected-survey-open"
      />
      {isOwnSurvey && !isDraft ? (
        <AppNotice tone="info" icon="information-circle-outline" message={t.selected.ownSurvey} />
      ) : null}
    </View>
  )
})
