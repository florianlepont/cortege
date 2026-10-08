import type { StyleProp, ViewStyle } from "react-native"
import type { ImageProps } from "@expo/ui/swift-ui"

/** An SF Symbol name, the only kind of icon a SwiftUI button can draw. */
export type NativeSymbolName = NonNullable<ImageProps["systemName"]>

/** SwiftUI control sizes the glass button uses (`controlSize`). */
export type NativeControlSize = "small" | "regular" | "large"

/**
 * What `GlassButton` hands to the native iOS 26 glass button (D-28), already resolved: colours from
 * the theme tokens, the accessibility label, the haptic and the loading guard inside `onPress`.
 */
export type NativeGlassButtonProps = {
  label: string
  accessibilityLabel: string
  /** The system's control size; the height below is the floor the host keeps. */
  controlSize: NativeControlSize
  /** Minimum height of the host (and so of the capsule, which fills it), in points. */
  minHeight: number
  /**
   * The exact height of the host, which the capsule fills (12.2-19, the offline panel's 46 pt
   * buttons). The host then no longer sizes itself to the SwiftUI button: a `matchContents` host
   * keeps the button at its own ideal height, which is not the height asked for, and the capsule
   * overlapped the text above it. The label stays on one line and shrinks a little to fit.
   */
  height?: number
  /**
   * `primary` is the forest-tinted `glassProminent` button, `secondary` the neutral system `glass`
   * button (no tint, nothing drawn over it).
   */
  variant: "primary" | "secondary"
  /** Forest the system glass is tinted with (`glassProminent`); absent for `secondary`. */
  tint?: string
  /** Label colour on the tint or the glass (AA 4.5:1, `visual-tokens.test.ts`). */
  ink: string
  fontFamily: string
  fontSize: number
  colorScheme: "light" | "dark"
  symbol?: NativeSymbolName
  disabled: boolean
  loading: boolean
  onPress: () => void
  testID?: string
  style?: StyleProp<ViewStyle>
}
