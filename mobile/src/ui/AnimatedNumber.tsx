import { useEffect } from "react"
import { StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle } from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { brandMotion } from "../app/brand-tokens"

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

const [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] = brandMotion.easings.decelerate

type AnimatedNumberProps = {
  value: number
  /** A typography role (for example `brandTypography.numeral`) and a colour. */
  style?: StyleProp<TextStyle>
  durationMs?: number
  testID?: string
}

/**
 * A plain-text number that counts up on the UI thread (D-08, 500 ms decelerate). It is a read-only
 * TextInput driven through animated props, so no React render happens per frame. Under Reduce
 * Motion the final value shows at once. Hidden from accessibility: the caller's container carries
 * the label.
 */
export function AnimatedNumber({
  value,
  style,
  durationMs = brandMotion.durations.emphasis,
  testID,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion()
  const current = useSharedValue(reduced ? value : 0)

  useEffect(() => {
    current.value = withTiming(value, {
      duration: durationMs,
      easing: Easing.bezier(EASE_X1, EASE_Y1, EASE_X2, EASE_Y2),
      reduceMotion: ReduceMotion.System,
    })
  }, [value, durationMs, current])

  const animatedProps = useAnimatedProps(() => ({ text: String(Math.round(current.value)) }))

  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={String(value)}
      underlineColorAndroid="transparent"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.text, style]}
      animatedProps={animatedProps as Partial<TextInputProps>}
      testID={testID}
    />
  )
}

const styles = StyleSheet.create({
  text: {
    padding: 0,
  },
})
