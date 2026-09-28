import { memo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import {
  brandColors,
  brandMapTokens,
  brandRadius,
  brandShadow,
  brandTranslucentPanel,
  brandTypography,
} from "../../app/brand-tokens"
import { fr } from "../../i18n"

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

  return (
    <View style={[styles.container, { bottom }]}>
      {expanded ? (
        <View style={styles.panel}>
          <Text style={styles.title}>{t.legend.title}</Text>
          {ROWS.map((row) => (
            <View key={row.tone} style={styles.row}>
              <View
                style={[styles.swatch, { backgroundColor: brandMapTokens.scoreMarker[row.tone] }]}
              />
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Pressable
        style={styles.toggle}
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? t.a11y.hideLegend : t.a11y.showLegend}
        accessibilityState={{ expanded }}
      >
        <Ionicons name="color-palette-outline" size={18} color={brandColors.forest} />
      </Pressable>
    </View>
  )
})

const styles = StyleSheet.create({
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
    borderColor: brandColors.divider,
    backgroundColor: brandTranslucentPanel.subtle,
    alignItems: "center",
    justifyContent: "center",
    ...brandShadow.card,
  },
  panel: {
    backgroundColor: brandTranslucentPanel.strongest,
    borderRadius: brandRadius.card,
    padding: 12,
    gap: 6,
    ...brandShadow.card,
  },
  title: {
    ...brandTypography.label,
    color: brandColors.forest,
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
    color: brandColors.textPrimary,
  },
})
