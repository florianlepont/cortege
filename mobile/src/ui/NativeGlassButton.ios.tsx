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
 * tinted with the saturated brand green, inside a `Host`. The system draws the capsule, the glass
 * material, the specular highlight and the press response; we only give it the tint, the label row
 * and the size. Rendered by `GlassButton` only on iOS 26 and later (`isLiquidGlassAvailable()`);
 * on older iOS the same style silently falls back to the automatic button style, which is why
 * `GlassButton` keeps the flat fallback there instead.
 *
 * Sizing: the host stretches to the width it is given and keeps `minHeight`; `matchContents`
 * (vertical) lets it grow when the label wraps at a large text size. The label row is framed to
 * fill the host, so the capsule is the host. Disabled is the system disabled look (the label colour
 * is left to the system then); loading shows a `ProgressView` next to the label and keeps the green.
 */
export function NativeGlassButton({
  label,
  accessibilityLabel: a11yLabel,
  controlSize: size,
  minHeight,
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
  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={colorScheme}
      style={[styles.host, { minHeight }, style]}
    >
      <Button
        onPress={onPress}
        testID={testID}
        modifiers={[
          buttonStyle("glassProminent"),
          controlSize(size),
          tint(tintColor),
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
