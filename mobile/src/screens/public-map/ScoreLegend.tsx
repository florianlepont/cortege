import { memo, useMemo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors, brandMapTokens, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { GlassSurface } from "../../ui/GlassSurface"

const t = fr.publicMap

const ROWS: Array<{ tone: keyof typeof brandMapTokens.scoreMarker; label: string }> = [
  { tone: "high", label: t.legend.high },
  { tone: "mid", label: t.legend.mid },
  { tone: "low", label: t.legend.low },
]

export type ScoreLegendProps = {
  bottom: number
}

/** MAP-03: a collapsible legend for the score-band pastille colors. */
export const ScoreLegend = memo(function ScoreLegend({ bottom }: ScoreLegendProps) {
  const [expanded, setExpanded] = useState(false)
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.container, { bottom }]}>
      {expanded ? (
        <GlassSurface tone="auto" style={styles.panel}>
          <Text style={styles.title}>{t.legend.title}</Text>
          {ROWS.map((row) => (
            <View key={row.tone} style={styles.row}>
              <View
                style={[styles.swatch, { backgroundColor: brandMapTokens.scoreMarker[row.tone] }]}
              />
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
          ))}
        </GlassSurface>
      ) : null}
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? t.a11y.hideLegend : t.a11y.showLegend}
        accessibilityState={{ expanded }}
      >
        <GlassSurface tone="auto" style={styles.toggle}>
          <Ionicons name="color-palette-outline" size={18} color={brandColors.forest} />
        </GlassSurface>
      </Pressable>
    </View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: 12,
      alignItems: "flex-start",
      gap: 8,
    },
    toggle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    panel: {
      borderRadius: brandRadius.card,
      padding: 12,
      gap: 6,
    },
    title: {
      ...brandTypography.label,
      color: theme.semanticColors.textStrong,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    swatch: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    rowLabel: {
      ...brandTypography.meta,
      color: theme.colors.textPrimary,
    },
  })
}
