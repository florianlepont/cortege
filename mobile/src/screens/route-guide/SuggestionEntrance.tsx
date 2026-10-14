import { useEffect, type ReactNode } from "react"
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { brandMotion, brandSpacing4 } from "../../app/brand-tokens"

/** The rise of the entrance, in points (UI-SPEC motion contract: 8 pt). */
export const SUGGESTION_RISE = brandSpacing4.sm

type SuggestionEntranceProps = {
  /** The entrance plays again each time this value changes (a new suggestion). */
  trigger: string
  children: ReactNode
}

/**
 * The suggestion appearing or changing: a fade in and an 8 pt rise over `brandMotion.durations.base`
 * with the decelerate curve, instant under Reduce Motion (UI-SPEC section 4 and motion contract).
 * Not `EntranceView`: that one is tied to the screen's focus and rises 20 pt, this one answers to the
 * suggestion itself and replays when the answers change it.
 */
export function SuggestionEntrance({ trigger, children }: SuggestionEntranceProps) {
  const reduced = useReducedMotion()
  const progress = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) {
      cancelAnimation(progress)
      progress.value = 1
      return
    }
    progress.value = 0
    progress.value = withTiming(1, {
      duration: brandMotion.durations.base,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    })
  }, [trigger, reduced, progress])

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * SUGGESTION_RISE }],
  }))

  return <Animated.View style={style}>{children}</Animated.View>
}
