import { memo, useMemo } from "react"
import { Pressable, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  isIbpCas,
  resolveMethodVersion,
} from "@cortege/ibp-domain"
import type { PublicMapItem } from "../../app/types"
import { brandColors } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppNotice } from "../../ui/AppNotice"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
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
  onClose,
}: SelectedSurveyCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPanelStyles(theme), [theme])
  const methodLabel = surveyMethodLabel(item)

  return (
    <View style={styles.card}>
      <AppSectionHeader
        title={t.selected.title(item.ibp_total)}
        trailing={
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t.a11y.closeSelection}
          >
            <Ionicons name="close" size={18} color={brandColors.forest} />
          </Pressable>
        }
        titleStyle={styles.title}
      />
      {methodLabel ? <Text style={styles.meta}>{methodLabel}</Text> : null}
      <Text style={styles.meta}>
        {t.selected.meta({ region: surveyPlaceLabel(item), date: item.survey_date })}
      </Text>

      {isOwnSurvey ? (
        <AppNotice tone="info" icon="information-circle-outline" message={t.selected.ownSurvey} />
      ) : null}
    </View>
  )
})
