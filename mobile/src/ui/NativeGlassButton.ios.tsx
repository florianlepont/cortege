import { StyleSheet } from "react-native"
import { requireOptionalNativeModule } from "expo"
import { Button, HStack, Host, Image, ProgressView, Text } from "@expo/ui/swift-ui"
import {
  accessibilityHidden,
  accessibilityLabel,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  tint,
} from "@expo/ui/swift-ui/modifiers"
import type { NativeGlassButtonProps } from "./NativeGlassButton.types"

/**
 * Whether this binary carries the `@expo/ui` native module. A development build made before the
 * dependency was added has none; `GlassButton` then keeps its flat fallback instead of crashing.
 */
export const NATIVE_GLASS_BUTTON_AVAILABLE = requireOptionalNativeModule("ExpoUI") != null

// "As wide (and as tall) as the host allows": the label row asks for this much and SwiftUI clamps
// it to the space the host proposes, so the capsule fills the host. A large finite number rather
// than `Infinity`, which is not guaranteed to cross the bridge.
const FILL = 10000

/**
 * The real iOS 26 glass button (D-28): a SwiftUI `Button` with `buttonStyle("glassProminent")`,
 * tinted with the charter forest, inside a `Host`. The secondary variant is the neutral system
 * `glass` style, untinted, and nothing else: the system glass button is the whole visual. (12.2-17:
 * a 1 pt hairline laid over it showed on the iPhone as a green outline of another size than the
 * system capsule, so it is gone.) The system draws the capsule, the glass material, the specular
 * highlight and the press response; we only give it the tint, the label row and the size. Rendered by `GlassButton` only on iOS 26 and later (`isLiquidGlassAvailable()`);
 * on older iOS the same style silently falls back to the automatic button style, which is why
 * `GlassButton` keeps the flat fallback there instead.
 *
 * Sizing: the host stretches to the width it is given and keeps `minHeight`; `matchContents`
 * (vertical) lets it grow when the label wraps at a large text size. The label row is framed to
 * fill the host, so the capsule is the host. Disabled is the system disabled look (the label colour
 * is left to the system then); loading shows a `ProgressView` next to the label and keeps the tint.
 */
export function NativeGlassButton({
  label,
  accessibilityLabel: a11yLabel,
  controlSize: size,
  minHeight,
  height,
  variant,
  tint: tintColor,
  ink,
  fontFamily,
  fontSize,
  colorScheme,
  symbol,
  disabled: isDisabled,
  loading,
  onPress,
  testID,
  style,
}: NativeGlassButtonProps) {
  const inkModifiers = isDisabled ? [] : [foregroundStyle(ink)]
  const secondary = variant === "secondary"
  // An exact height: the host is that box, the SwiftUI button is offered exactly its size and its
  // label row fills it, so the capsule is the box and nothing is drawn outside it. Otherwise the
  // host follows the button (`matchContents`), floored at `minHeight`.
  const exact = height !== undefined
  const fitModifiers = exact ? [lineLimit(1), minimumScaleFactor(0.75)] : []
  return (
    <Host
      matchContents={exact ? undefined : { vertical: true }}
      colorScheme={colorScheme}
      style={[styles.host, exact ? { height } : { minHeight }, style]}
    >
      <Button
        onPress={onPress}
        testID={testID}
        modifiers={[
          buttonStyle(secondary ? "glass" : "glassProminent"),
          controlSize(size),
          ...(tintColor ? [tint(tintColor)] : []),
          disabled(isDisabled),
          accessibilityLabel(a11yLabel),
        ]}
      >
        <HStack spacing={8} modifiers={[frame({ maxWidth: FILL, maxHeight: FILL })]}>
          {loading ? (
            <ProgressView modifiers={[tint(ink), accessibilityHidden(true)]} />
          ) : symbol ? (
            <Image
              systemName={symbol}
              size={fontSize}
              modifiers={[...inkModifiers, accessibilityHidden(true)]}
            />
          ) : null}
          <Text
            modifiers={[
              font({ family: fontFamily, size: fontSize, textStyle: "body" }),
              ...inkModifiers,
              ...fitModifiers,
            ]}
          >
            {label}
          </Text>
        </HStack>
      </Button>
    </Host>
  )
}

const styles = StyleSheet.create({
  host: {
    alignSelf: "stretch",
  },
})
