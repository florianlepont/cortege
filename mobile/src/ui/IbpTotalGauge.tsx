import { StyleSheet, Text, View } from "react-native"
import { brandColors, brandFieldState, brandSpacing4 } from "../app/brand-tokens"
import type { FactorKey, FactorProgress } from "../app/types"
import { fr } from "../i18n"

type IbpTotalGaugeProps = {
  order: readonly FactorKey[]
  factorProgress: Record<FactorKey, FactorProgress>
  total: number
  testID?: string
}

/** FLOW-06: a segmented gauge (one bar per factor) visible from the first wizard step, not only at
 * the factors step. */
export function IbpTotalGauge({ order, factorProgress, total, testID }: IbpTotalGaugeProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{fr.surveyForm.factors.scoreLabel}</Text>
        <Text style={styles.total}>{fr.surveyForm.factors.scoreTotal({ total })}</Text>
      </View>
      <View style={styles.segments}>
        {order.map((factor) => {
          const progress = factorProgress[factor]
          const tone = progress.complete
            ? brandFieldState.complete
            : progress.invalid > 0
              ? brandFieldState.error
              : null
          return (
            <View
              key={factor}
              style={[styles.segment, { backgroundColor: tone ? tone.icon : brandColors.divider }]}
              testID={testID ? `${testID}-segment-${factor}` : undefined}
            />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: brandSpacing4.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: brandColors.textSecondary,
  },
  total: {
    fontSize: 15,
    fontWeight: "800",
    color: brandColors.textPrimary,
  },
  segments: {
    flexDirection: "row",
    gap: brandSpacing4.xxs,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
})
