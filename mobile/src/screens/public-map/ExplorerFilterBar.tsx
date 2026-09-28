import { memo, useMemo } from "react"
import { ScrollView, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { PERIOD_KEYS, type PeriodKey } from "./period-filter"
import { createFilterBarStyles } from "./styles"

const t = fr.publicMap
export const REGION_KEYS = ["", "ACA", "M"] as const
export type RegionKey = (typeof REGION_KEYS)[number]

function periodLabel(period: PeriodKey): string {
  return t.filters.period[period]
}

function regionLabel(region: RegionKey): string {
  return region === "" ? t.filters.region.all : t.filters.region[region]
}

export type ExplorerFilterBarProps = {
  period: PeriodKey
  onChangePeriod: (period: PeriodKey) => void
  region: RegionKey
  onChangeRegion: (region: RegionKey) => void
  mineOnly: boolean
  onToggleMine: () => void
  activeCount: number
  onReset: () => void
}

/**
 * MAP-02: period / region / "mes relevés" chips, applied immediately (no free-text fields, no
 * "Appliquer" button), with an active-filter count and a reset action.
 */
export const ExplorerFilterBar = memo(function ExplorerFilterBar({
  period,
  onChangePeriod,
  region,
  onChangeRegion,
  mineOnly,
  onToggleMine,
  activeCount,
  onReset,
}: ExplorerFilterBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createFilterBarStyles(theme), [theme])
  return (
    <View style={styles.container}>
      {activeCount > 0 ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{t.filters.activeCount(activeCount)}</Text>
          <Text
            style={styles.resetLink}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel={t.a11y.resetFilters}
          >
            {t.filters.reset}
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {PERIOD_KEYS.map((key) => (
          <AppChoiceChip
            key={key}
            label={periodLabel(key)}
            active={period === key}
            onPress={() => onChangePeriod(key)}
            style={styles.chip}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {REGION_KEYS.map((key) => (
          <AppChoiceChip
            key={key || "all"}
            label={regionLabel(key)}
            active={region === key}
            onPress={() => onChangeRegion(key)}
            style={styles.chip}
          />
        ))}
        <AppChoiceChip
          label={t.filters.mine}
          active={mineOnly}
          onPress={onToggleMine}
          style={styles.chip}
        />
      </ScrollView>

      <Text style={styles.hint}>{t.filters.regionHint}</Text>
    </View>
  )
})
