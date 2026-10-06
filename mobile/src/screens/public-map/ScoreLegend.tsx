import { memo, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors, brandMapTokens, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { GlassSurface } from "../../ui/GlassSurface"
import { OfflineIndicatorBadge } from "./OfflineControls"

const t = fr.publicMap

const ROWS: Array<{ tone: keyof typeof brandMapTokens.scoreMarker; label: string }> = [
  { tone: "high", label: t.legend.high },
  { tone: "mid", label: t.legend.mid },
  { tone: "low", label: t.legend.low },
]

export type ScoreLegendProps = {
  bottom: number
  /** Surveys in the loaded viewport (the "12 relevés ici" pill). */
  count: number
  loading?: boolean
  isOffline?: boolean
}

/**
 * Bottom-left of the map: the survey count with the (i) button beside it, which opens the
 * legend of the score colours (MAP-03). Liquid Glass on iOS 26.
 */
export const ScoreLegend = memo(function ScoreLegend({
  bottom,
  count,
  loading = false,
  isOffline = false,
}: ScoreLegendProps) {
  const [expanded, setExpanded] = useState(false)
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.container, { bottom }]} pointerEvents="box-none">
      {expanded ? (
        <GlassSurface tone="auto" style={styles.panel}>
          <Text style={styles.title}>{t.legend.title}</Text>
          <Text style={styles.subtitle}>{t.legend.subtitle}</Text>
          {ROWS.map((row) => (
            <View key={row.tone} style={styles.row}>
              <View
                style={[styles.swatch, { backgroundColor: brandMapTokens.scoreMarker[row.tone] }]}
              />
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
          ))}
          <Text style={styles.attribution}>{t.legend.attribution}</Text>
        </GlassSurface>
      ) : null}
      <View style={styles.line}>
        <GlassSurface tone="auto" style={styles.countPill}>
          {loading ? <ActivityIndicator size="small" color={brandColors.forest} /> : null}
          <Text style={styles.countText}>{t.count(count)}</Text>
        </GlassSurface>
        <GlassSurface tone="auto" interactive style={styles.toggle}>
          <Pressable
            style={styles.toggleHit}
            onPress={() => setExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? t.a11y.hideLegend : t.a11y.showLegend}
            accessibilityState={{ expanded }}
          >
            <Ionicons
              name={expanded ? "close" : "information-circle-outline"}
              size={22}
              color={brandColors.forest}
            />
          </Pressable>
        </GlassSurface>
        {isOffline ? <OfflineIndicatorBadge /> : null}
      </View>
    </View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: 14,
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
      height: 40,
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
      padding: 14,
      gap: 8,
    },
    title: {
      ...brandTypography.label,
      color: theme.semanticColors.textStrong,
    },
    subtitle: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    swatch: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    attribution: {
      ...brandTypography.meta,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    rowLabel: {
      ...brandTypography.meta,
      color: theme.colors.textPrimary,
    },
  })
}
