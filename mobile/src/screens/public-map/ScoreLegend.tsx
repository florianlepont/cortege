import { memo, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import {
  brandColors,
  brandMapTokens,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { GlassSurface } from "../../ui/GlassSurface"
import { MAP_CONTROL_HIT_SLOP, MAP_EDGE, MAP_PILL_HEIGHT } from "./MapChips"
import { OfflineIndicatorBadge } from "./OfflineControls"

const t = fr.publicMap

export type MapLegendRow = { color: string; label: string; dashed?: boolean }

// The swatches are the marker colours themselves (`markerStyles` in styles.ts), so the legend always
// describes the markers drawn on the map; they are not restyled with the overlays (12.2-18). The
// last row is the warm grey of a parcel without a score (12.2-19), drawn from zoom 15.
const SCORE_ROWS: MapLegendRow[] = [
  { color: brandMapTokens.scoreMarker.high, label: t.legend.high },
  { color: brandMapTokens.scoreMarker.mid, label: t.legend.mid },
  { color: brandMapTokens.scoreMarker.low, label: t.legend.low },
  { color: brandColors.white, label: t.legend.draft, dashed: true },
  { color: brandMapTokens.parcelUnscored, label: t.legend.unscored },
]

export type MapLegendProps = {
  bottom: number
  /** The count pill's text ("12 relevés ici"). */
  countLabel: string
  title: string
  subtitle: string
  rows: MapLegendRow[]
  loading?: boolean
  isOffline?: boolean
}

/**
 * Bottom-left of every interactive map: a count with the (i) button beside it, which opens the
 * legend of the map's colours (MAP-03). Liquid Glass on iOS 26. The Explorer and the parcel
 * picker both draw it, with their own rows.
 */
export const MapLegend = memo(function MapLegend({
  bottom,
  countLabel,
  title,
  subtitle,
  rows,
  loading = false,
  isOffline = false,
}: MapLegendProps) {
  const [expanded, setExpanded] = useState(false)
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.container, { bottom }]} pointerEvents="box-none">
      {expanded ? (
        <GlassSurface tone="auto" style={styles.panel}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: row.color },
                  row.dashed ? styles.swatchDashed : null,
                ]}
              />
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
          ))}
          <Text style={styles.attribution}>{t.legend.attribution}</Text>
        </GlassSurface>
      ) : null}
      <View style={styles.line}>
        <GlassSurface tone="auto" style={styles.countPill}>
          {loading ? <ActivityIndicator size="small" color={theme.visual.accentText} /> : null}
          <Text style={styles.countText}>{countLabel}</Text>
        </GlassSurface>
        <GlassSurface tone="auto" interactive style={styles.toggle}>
          <Pressable
            style={styles.toggleHit}
            hitSlop={MAP_CONTROL_HIT_SLOP}
            onPress={() => setExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? t.a11y.hideLegend : t.a11y.showLegend}
            accessibilityState={{ expanded }}
          >
            <Ionicons
              name={expanded ? "close" : "information-circle-outline"}
              size={22}
              color={theme.visual.accentText}
            />
          </Pressable>
        </GlassSurface>
        {isOffline ? <OfflineIndicatorBadge /> : null}
      </View>
    </View>
  )
})

export type ScoreLegendProps = {
  bottom: number
  /** Surveys in the loaded viewport (the "12 relevés ici" pill). */
  count: number
  loading?: boolean
  isOffline?: boolean
}

/** The Explorer's legend: the survey count and the score colours of its markers. */
export const ScoreLegend = memo(function ScoreLegend({ count, ...rest }: ScoreLegendProps) {
  return (
    <MapLegend
      {...rest}
      countLabel={t.count(count)}
      title={t.legend.title}
      subtitle={t.legend.subtitle}
      rows={SCORE_ROWS}
    />
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: MAP_EDGE,
      // The panel wraps inside the screen (its attribution line is long): it ends before the right
      // edge instead of running past it (OA-119).
      right: MAP_EDGE,
      alignItems: "flex-start",
      gap: 8,
    },
    line: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    countPill: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      paddingHorizontal: 14,
      height: MAP_PILL_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    countText: {
      ...brandTypography.meta,
      color: theme.colors.textPrimary,
    },
    toggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    toggleHit: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    panel: {
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: brandSpacing4.md,
      gap: brandSpacing4.sm,
    },
    title: {
      ...brandTypography.sectionHeader,
      color: theme.semanticColors.textStrong,
    },
    subtitle: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    swatch: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    swatchDashed: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: brandColors.forest,
    },
    attribution: {
      ...brandTypography.meta,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: brandSpacing4.xs,
    },
    rowLabel: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
  })
}
