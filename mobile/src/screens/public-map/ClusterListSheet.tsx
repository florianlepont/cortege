import { memo, useCallback, useMemo } from "react"
import { Pressable, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import type { PublicMapItem } from "../../app/types"
import { fr } from "../../i18n"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { surveyPlaceLabel } from "./SelectedSurveyCard"
import { createPanelStyles } from "./styles"

const t = fr.publicMap

type ClusterRowProps = {
  item: PublicMapItem
  onSelect: (id: string) => void
}

const ClusterRow = memo(function ClusterRow({ item, onSelect }: ClusterRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPanelStyles(theme), [theme])
  const handlePress = useCallback(() => onSelect(item.survey_id), [item.survey_id, onSelect])
  const place = surveyPlaceLabel(item)
  return (
    <Pressable
      style={styles.clusterRow}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t.a11y.clusterListItem({
        ibp: item.ibp_total,
        date: item.survey_date,
        region: place,
      })}
    >
      <Text style={styles.clusterRowText}>
        {t.clusterList.row({ ibp: item.ibp_total, date: item.survey_date })}
      </Text>
      <Text style={styles.meta}>{place}</Text>
    </Pressable>
  )
})

export type ClusterListSheetProps = {
  items: PublicMapItem[]
  onSelect: (id: string) => void
  onClose: () => void
}

/**
 * The surveys of a cluster that zooming cannot split (Pitfall 7): public locations are rounded to
 * about 1 km, so several surveys can share one point. Shown in the Explorer tiered sheet (MAP-01),
 * whose own BottomSheetScrollView provides the scrolling.
 */
export const ClusterListSheet = memo(function ClusterListSheet({
  items,
  onSelect,
  onClose,
}: ClusterListSheetProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPanelStyles(theme), [theme])
  return (
    <View style={styles.card}>
      <AppSectionHeader
        title={t.clusterList.title(items.length)}
        subtitle={t.clusterList.subtitle}
        titleStyle={styles.title}
        subtitleStyle={styles.meta}
        trailing={
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t.a11y.closeClusterList}
          >
            <Ionicons name="close" size={18} color={brandColors.forest} />
          </Pressable>
        }
      />
      {items.map((item) => (
        <ClusterRow key={item.survey_id} item={item} onSelect={onSelect} />
      ))}
    </View>
  )
})
