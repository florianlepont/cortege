import { Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import {
  brandColors,
  brandRadius,
  brandSemanticColors,
  brandStatTileTint,
  brandTypography,
} from "../../app/brand-tokens"
import { triggerHaptic } from "./haptics"

// P3-PERSON-05: severity prop for visual differentiation
export type StatTileSeverity = "neutral" | "warning" | "danger"

export type StatTileProps = {
  label: string
  value: string
  severity?: StatTileSeverity
  onPress: () => void
  accessibilityLabel: string
}

// P3-PERSON-05: severity tint + P1-A11Y-01: funnel affordance
export function StatTile({
  label,
  value,
  severity = "neutral",
  onPress,
  accessibilityLabel,
}: StatTileProps) {
  const chipBg =
    severity === "danger"
      ? brandStatTileTint.dangerSoft
      : severity === "warning"
        ? brandStatTileTint.warningSoft
        : brandSemanticColors.heroPanelBackgroundOnDark
  const chipBorder =
    severity === "danger"
      ? brandStatTileTint.dangerStrong
      : severity === "warning"
        ? brandStatTileTint.warningStrong
        : brandSemanticColors.heroPanelBorderOnDark

  return (
    <Pressable
      onPress={() => {
        triggerHaptic()
        onPress()
      }}
      style={({ pressed }) => [pressed && styles.statTilePressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.statTile, { backgroundColor: chipBg, borderColor: chipBorder }]}>
        <Text style={styles.statTileText}>
          {value} {label}
        </Text>
        {/* P1-A11Y-01: subtle funnel affordance hinting the tile is interactive */}
        <Ionicons name="funnel-outline" size={9} color={brandSemanticColors.haloOnDark} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // P3-PERSON-05 + P1-A11Y-01: custom tile (not AppStatusChip) for full style control
  statTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: brandRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statTileText: {
    ...brandTypography.meta,
    fontSize: 12,
    color: brandColors.white,
  },
  statTilePressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
})
