import { memo, useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
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
import { mapControlIconSize } from "../../app/visual-tokens"
import { GlassSurface } from "../../ui/GlassSurface"
import { MAP_CONTROL_HIT_SLOP, MAP_EDGE, MAP_PILL_HEIGHT } from "./MapChips"
import { OfflineIndicatorBadge } from "./OfflineControls"
import { AppPressable } from "../../ui/AppPressable"

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
  /**
   * The count pill's text (the parcel picker's "3 parcelles"). The Explorer gives none: it has no
   * count pill (UI-SPEC section 1, CONTEXT item 13 e).
   */
  countLabel?: string
  title: string
  subtitle: string
  rows: MapLegendRow[]
  loading?: boolean
  isOffline?: boolean
  /**
   * Phase 28: the source lines of the layers shown (one `Text` each, in the attribution style)
   * instead of the default attribution. Omitted in the default display.
   */
  attributionLines?: string[]
}

/**
 * Bottom-left of every interactive map: the (i) button, which opens the legend of the map's
 * colours (MAP-03), with a count pill before it when a label is given (the parcel picker). Without
 * a count a bare spinner right of the (i) button shows that the data is loading. Liquid Glass on iOS 26, on the map control glass
 * (`theme.visual.mapControl`, near opaque in dark: the map stays light, 12.2-19 fix round). The
 * Explorer and the parcel picker both draw it, with their own rows.
 */
export const MapLegend = memo(function MapLegend({
  bottom,
  countLabel,
  title,
  subtitle,
  rows,
  loading = false,
  isOffline = false,
  attributionLines,
}: MapLegendProps) {
  const [expanded, setExpanded] = useState(false)
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const glass = theme.visual.mapControl.glass

  return (
    <View style={[styles.container, { bottom }]} pointerEvents="box-none">
      {expanded ? (
        <GlassSurface tone="auto" surface={glass} style={styles.panel}>
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
          {attributionLines ? (
            attributionLines.map((line) => (
              <Text key={line} style={styles.attribution}>
                {line}
              </Text>
            ))
          ) : (
            <Text style={styles.attribution}>{t.legend.attribution}</Text>
          )}
        </GlassSurface>
      ) : null}
      <View style={styles.line}>
        {countLabel !== undefined ? (
          <GlassSurface tone="auto" surface={glass} style={styles.countPill}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.visual.mapControl.icon} />
            ) : null}
            <Text style={styles.countText}>{countLabel}</Text>
          </GlassSurface>
        ) : null}
        <GlassSurface tone="auto" interactive surface={glass} style={styles.toggle}>
          <AppPressable
            disableScale
            disableRipple
            style={styles.toggleHit}
            hitSlop={MAP_CONTROL_HIT_SLOP}
            onPress={() => setExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? t.a11y.hideLegend : t.a11y.showLegend}
            accessibilityState={{ expanded }}
          >
            <Ionicons
              name={expanded ? "close-outline" : "information-circle-outline"}
              size={mapControlIconSize}
              color={theme.visual.mapControl.icon}
            />
          </AppPressable>
        </GlassSurface>
        {countLabel === undefined && loading ? (
          <ActivityIndicator
            size="small"
            color={theme.visual.mapControl.icon}
            testID="map-legend-loading"
          />
        ) : null}
        {isOffline ? <OfflineIndicatorBadge /> : null}
      </View>
    </View>
  )
})

export type ScoreLegendProps = {
  bottom: number
  loading?: boolean
  isOffline?: boolean
  /** Phase 28: one source line per layer shown, then the common attribution (null: default text). */
  attributionLines?: string[]
}

/** The Explorer's legend: the score colours of its markers, no count pill. */
export const ScoreLegend = memo(function ScoreLegend(props: ScoreLegendProps) {
  return (
    <MapLegend
      {...props}
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
      gap: brandSpacing4.sm,
    },
    line: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    countPill: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
      paddingHorizontal: 14,
      height: MAP_PILL_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    countText: {
      ...brandTypography.meta,
      color: theme.visual.mapControl.text,
    },
    toggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
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
      borderColor: theme.visual.mapControl.hairline,
      padding: brandSpacing4.md,
      gap: brandSpacing4.sm,
    },
    title: {
      ...brandTypography.sectionHeader,
      flexShrink: 1,
      color: theme.visual.mapControl.text,
    },
    subtitle: {
      ...brandTypography.meta,
      color: theme.visual.mapControl.textMuted,
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
      color: theme.visual.mapControl.textMuted,
      marginTop: brandSpacing4.xs,
    },
    rowLabel: {
      ...brandTypeScale.footnote,
      color: theme.visual.mapControl.textMuted,
    },
  })
}
