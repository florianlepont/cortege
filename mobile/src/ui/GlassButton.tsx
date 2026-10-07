import { useMemo } from "react"
import { ActivityIndicator, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandComponentTokens, brandRadius, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppButtonSize, hitSlopFor } from "./AppButton"
import { AppPressable } from "./AppPressable"
import { AppText as Text } from "./AppText"
import { feedback } from "./feedback"
import { GlassSurface, LIQUID_GLASS_AVAILABLE } from "./GlassSurface"

type GlassButtonProps = {
  label: string
  /** `lg` (50 pt) for the big call to action of a screen, the default. */
  size?: AppButtonSize
  leadingIcon?: keyof typeof Ionicons.glyphMap
  accessibilityLabel?: string
  disabled?: boolean
  /** Shows a spinner, keeps the green look and ignores presses. */
  loading?: boolean
  onPress: () => void
  testID?: string
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
}

/**
 * The big call-to-action button on green glass (12.2-14, D-27c). On iOS 26 and later it is real
 * Liquid Glass (`GlassSurface`, tinted green, interactive: the system press shimmer); on Android
 * and older iOS it is a flat translucent green fill with a hairline, an inner highlight and a soft
 * green shadow, and no blur (D-12). Either way the button is see-through, so what scrolls behind it
 * stays visible, and it replaces the opaque bar behind a primary `AppButton`.
 *
 * Same sizes, 44 pt hit area, light haptic and accessibility contract as `AppButton`. Disabled is a
 * pale neutral glass with a softer label (less saturated than the green, still readable, no
 * shadow). One glass view per button, none animated by us; the press scale is `AppPressable`'s.
 * The label colours are tokens (`theme.visual.glassCta`) checked at 4.5:1 over the canvas, the
 * backdrop halo and the lightest or darkest plausible backdrop (`visual-tokens.test.ts`).
 */
export function GlassButton({
  label,
  size = "lg",
  leadingIcon,
  accessibilityLabel,
  disabled = false,
  loading = false,
  onPress,
  testID,
  style,
  labelStyle,
}: GlassButtonProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const cta = theme.visual.glassCta
  const isDisabled = disabled || loading
  const ink = disabled ? cta.inkOff : cta.ink
  const iconSize = size === "lg" ? 18 : size === "sm" ? 15 : 16

  return (
    <AppPressable
      accessibilityLabel={
        accessibilityLabel ?? (label.trim() || fr.components.appButton.defaultLabel)
      }
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={hitSlopFor(false, size)}
      onPress={() => {
        feedback.impact.light()
        onPress()
      }}
      style={[
        styles.base,
        styles[size],
        LIQUID_GLASS_AVAILABLE ? null : disabled ? styles.flatOff : styles.flat,
        style,
      ]}
      testID={testID}
    >
      {LIQUID_GLASS_AVAILABLE ? (
        <GlassSurface
          interactive={!isDisabled}
          tintColor={disabled ? cta.tintOff : cta.tint}
          style={styles.surface}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator size="small" color={ink} />
      ) : leadingIcon ? (
        <Ionicons name={leadingIcon} size={iconSize} color={ink} />
      ) : null}
      <Text
        style={[styles.label, size === "sm" ? styles.labelSmall : null, { color: ink }, labelStyle]}
      >
        {label}
      </Text>
    </AppPressable>
  )
}

function createStyles(theme: BrandTheme) {
  const cta = theme.visual.glassCta
  const { button } = brandComponentTokens
  return StyleSheet.create({
    base: {
      borderRadius: brandRadius.pill,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    sm: { minHeight: button.minHeightSmall, paddingHorizontal: button.horizontalPaddingSmall },
    md: { minHeight: button.minHeight, paddingHorizontal: button.horizontalPadding },
    lg: { minHeight: button.minHeightLarge, paddingHorizontal: button.horizontalPaddingLarge },
    // The glass fills the button behind the label and draws its own edge and light.
    surface: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: brandRadius.pill,
    },
    flat: {
      backgroundColor: cta.flat,
      borderWidth: 1,
      borderColor: cta.hairline,
      boxShadow: cta.shadow,
    },
    flatOff: {
      backgroundColor: cta.flatOff,
      borderWidth: 1,
      borderColor: cta.hairlineOff,
    },
    label: {
      ...brandTypography.button,
      textAlign: "center",
    },
    labelSmall: {
      ...brandTypography.meta,
    },
  })
}
