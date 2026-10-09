import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated"
import { FACTOR_KEYS } from "@cortege/ibp-domain"
import { brandMotion, brandSpacing, brandTypography } from "../app/brand-tokens"
import { factorRatio, factorTone } from "../app/ibp-display"
import { useBrandTheme } from "../app/theme"
import type { FactorKey } from "../app/types"
import { factorBarGeometry } from "../app/visual-tokens"
import { fr } from "../i18n"
import { AppText } from "./AppText"

export type FactorBarsEntries = Partial<Record<FactorKey, number | null>>

const FACTOR_KEY_SET: ReadonlySet<string> = new Set(FACTOR_KEYS)

/**
 * Points per factor from the survey detail entries (`displayedFactorEntries`): keeps only the ten
 * known factor keys, so an unexpected key never reaches the chart.
 */
export function factorPointsFromEntries(
  entries: ReadonlyArray<readonly [string, { score_points: number | null }]>,
): FactorBarsEntries {
  const points: FactorBarsEntries = {}
  for (const [key, value] of entries) {
    if (FACTOR_KEY_SET.has(key)) points[key as FactorKey] = value.score_points
  }
  return points
}

type FactorBarsChartProps = {
  entries: FactorBarsEntries
  /** Grow the bars in on mount (spring, 40 ms stagger). */
  animate?: boolean
  testID?: string
}

/**
 * The ten factor bars A to J (D-15). Colour follows the 0-2 / 3 / 4-5 display convention. The bars
 * are about 22 pt wide, below the 44 pt target, so they are not interactive: factor navigation
 * stays on the Score page rows. One accessibility label reads the whole chart.
 */
export function FactorBarsChart({ entries, animate = false, testID }: FactorBarsChartProps) {
  const theme = useBrandTheme()
  const label = fr.components.factorBars.label(
    FACTOR_KEYS.map((letter) => ({ letter, points: entries[letter] ?? null })),
  )

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={styles.row}
      testID={testID}
    >
      {FACTOR_KEYS.map((letter, index) => (
        <View
          key={letter}
          style={styles.column}
          importantForAccessibility="no"
          accessibilityElementsHidden
          testID={testID ? `${testID}-${letter}` : undefined}
        >
          <View style={styles.barArea}>
            <FactorBar
              points={entries[letter] ?? null}
              index={index}
              animate={animate}
              testID={testID ? `${testID}-${letter}-bar` : undefined}
            />
          </View>
          <AppText style={[styles.letter, { color: theme.colors.textSecondary }]}>{letter}</AppText>
        </View>
      ))}
    </View>
  )
}

function FactorBar({
  points,
  index,
  animate,
  testID,
}: {
  points: number | null
  index: number
  animate: boolean
  testID?: string
}) {
  const theme = useBrandTheme()
  const reduced = useReducedMotion()
  const grows = animate && !reduced
  const scale = useSharedValue(grows ? 0 : 1)

  useEffect(() => {
    if (!grows) return
    scale.value = withDelay(
      index * brandMotion.staggerMs,
      withSpring(1, { ...brandMotion.springs.gentle, reduceMotion: ReduceMotion.System }),
    )
  }, [grows, index, scale])

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }))

  const height = Math.max(factorBarGeometry.stub, factorRatio(points) * factorBarGeometry.maxHeight)
  const tone = points === null ? null : theme.visual.factorBar[factorTone(points)]
  const paint = tone
    ? {
        backgroundColor: tone.base,
        experimental_backgroundImage: tone.image,
        boxShadow: tone.shadow,
      }
    : { backgroundColor: theme.visual.score.track }

  return <Animated.View style={[styles.bar, { height }, paint, animatedStyle]} testID={testID} />
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: factorBarGeometry.gap,
  },
  column: {
    flex: 1,
    alignItems: "stretch",
    gap: brandSpacing.xs,
  },
  barArea: {
    height: factorBarGeometry.maxHeight,
    justifyContent: "flex-end",
  },
  bar: {
    borderRadius: factorBarGeometry.radius,
    transformOrigin: "bottom",
  },
  letter: {
    ...brandTypography.ringValue,
    textAlign: "center",
  },
})
