import { memo, useCallback, useMemo } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { useBrandTheme } from "../../app/theme"
import type { PublicMapItem } from "../../app/types"
import { fr } from "../../i18n"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { ScoreRing } from "../../ui/ScoreRing"
import { createRowStyles } from "../survey-list/row-styles"
import { SurveyRowFrame } from "../survey-list/SurveyRowFrame"
import { PanelRowEntrance } from "./PanelRowEntrance"
import { surveyPlaceLabel } from "./SelectedSurveyCard"
import { SheetCloseButton } from "./SheetCloseButton"
import { createPanelStyles } from "./styles"

const t = fr.publicMap

type ClusterRowProps = {
  item: PublicMapItem
  index: number
  onSelect: (id: string) => void
}

// 12.2-18: the box of a survey row of Mes Relevés (`SurveyRowFrame`: glass card, 44 pt minimum,
// green wave on press), the score and date as the title, the cas or region under it and the ring
// on the trailing side (D-27a). No photo.
const ClusterRow = memo(function ClusterRow({ item, index, onSelect }: ClusterRowProps) {
  const theme = useBrandTheme()
  const rowStyles = useMemo(() => createRowStyles(theme), [theme])
  const handlePress = useCallback(() => onSelect(item.survey_id), [item.survey_id, onSelect])
  const place = surveyPlaceLabel(item)
  return (
    <SurveyRowFrame
      onPress={handlePress}
      accessibilityLabel={t.a11y.clusterListItem({
        ibp: item.ibp_total,
        date: item.survey_date,
        region: place,
      })}
      indicator={
        <ScoreRing
          score={item.ibp_total}
          index={index}
          animationKey={`${item.survey_id}:${item.ibp_total}`}
        />
      }
      title={t.clusterList.row({ ibp: item.ibp_total, date: item.survey_date })}
      status={
        <Text numberOfLines={1} style={rowStyles.surveyCardMeta}>
          {place}
        </Text>
      }
    />
  )
})

export type ClusterListSheetProps = {
  items: PublicMapItem[]
  onSelect: (id: string) => void
  onClose: () => void
}

/**
 * The surveys of a cluster that zooming cannot split (Pitfall 7): public locations are rounded to
 * about 1 km, so several surveys can share one point. Shown in the Explorer sheet (MAP-01), whose
 * own scroll view provides the scrolling.
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
          <SheetCloseButton accessibilityLabel={t.a11y.closeClusterList} onPress={onClose} />
        }
      />
      <View style={styles.rows}>
        {items.map((item, index) => (
          <PanelRowEntrance key={item.survey_id} index={index}>
            <ClusterRow item={item} index={index} onSelect={onSelect} />
          </PanelRowEntrance>
        ))}
      </View>
    </View>
  )
})
