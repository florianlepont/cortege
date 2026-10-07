import { View } from "react-native"
import { Circle, Svg } from "react-native-svg"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../app/theme"

export const STROKE_WIDTH = 3
export const DEFAULT_RING_SIZE = 28

type FactorProgressRingProps = {
  /** 0-1: filled fields over total fields for this factor. */
  progress: number
  complete: boolean
  hasError?: boolean
  size?: number
  testID?: string
}

/**
 * FLOW-06: a per-factor progress ring that morphs into a check mark once the factor is complete.
 * Phase 12.2 (variant I): the score tokens, the track `visual.score.track`, the arc in progress
 * `visual.score.neutral`, the complete check `visual.score.high` (the darker moss in light, D-16);
 * an invalid factor keeps the error tone. Size and stroke unchanged.
 */
export function FactorProgressRing({
  progress,
  complete,
  hasError = false,
  size = DEFAULT_RING_SIZE,
  testID,
}: FactorProgressRingProps) {
  const theme = useBrandTheme()
  const score = theme.visual.score
  const ringColor = complete ? score.high : hasError ? theme.fieldState.error.icon : score.neutral

  if (complete) {
    return (
      <View style={{ width: size, height: size }} testID={testID}>
        <Ionicons name="checkmark-circle" size={size} color={ringColor} />
      </View>
    )
  }

  const radius = (size - STROKE_WIDTH) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, progress))
  const dashOffset = circumference * (1 - clamped)

  return (
    <Svg width={size} height={size} testID={testID}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={theme.visual.score.track}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={ringColor}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        fill="none"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  )
}
