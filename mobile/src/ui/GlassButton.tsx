import { useMemo } from "react"
import {
  ActivityIndicator,
  Platform,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandComponentTokens, brandRadius, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppButtonSize, hitSlopFor } from "./AppButton"
import { AppPressable } from "./AppPressable"
import { AppText as Text } from "./AppText"
import { feedback } from "./feedback"
import { LIQUID_GLASS_AVAILABLE } from "./GlassSurface"
import { NATIVE_GLASS_BUTTON_AVAILABLE, NativeGlassButton } from "./NativeGlassButton"
import type { NativeControlSize, NativeSymbolName } from "./NativeGlassButton.types"

type IoniconName = keyof typeof Ionicons.glyphMap

/**
 * `primary` is the forest glass call to action, the default. `secondary` is the neutral companion
 * next to it (the system `glass` button, untinted, label in the primary text colour).
 */
export type GlassButtonVariant = "primary" | "secondary"

type GlassButtonProps = {
  label: string
  variant?: GlassButtonVariant
  /** `lg` (50 pt) for the big call to action of a screen, the default. */
  size?: AppButtonSize
  /**
   * Height of the button in points, in place of the size's own (a token, never below the 44 pt
   * hit target): the one panel button drawn between two sizes (`button.minHeightPanel`).
   */
  minHeight?: number
  /**
   * Ionicons glyph before the label. The native iOS 26 button can only draw SF Symbols: the glyph
   * is mapped through `NATIVE_SYMBOLS`, and an unmapped one is left out there.
   */
  leadingIcon?: IoniconName
  accessibilityLabel?: string
  disabled?: boolean
  /** Shows a spinner, keeps the forest look and ignores presses. */
  loading?: boolean
  onPress: () => void
  testID?: string
  style?: StyleProp<ViewStyle>
  /** Applies to the fallback only: the native button's label is drawn by SwiftUI. */
  labelStyle?: StyleProp<TextStyle>
}

/** The SF Symbol drawn by the native button for each Ionicons glyph a call to action may use. */
export const NATIVE_SYMBOLS: Partial<Record<IoniconName, NativeSymbolName>> = {
  checkmark: "checkmark",
  "checkmark-circle": "checkmark.circle.fill",
  "checkmark-done": "checkmark",
  "arrow-forward": "arrow.right",
  "chevron-forward": "chevron.right",
  add: "plus",
  play: "play.fill",
  camera: "camera.fill",
  flag: "flag.fill",
}

/**
 * Height the native host keeps for each size. `sm` keeps 44 pt there, not 36: a SwiftUI button has
 * no hit slop, so its capsule is its touch area, and every control keeps a 44 pt target.
 */
const NATIVE_GEOMETRY: Record<AppButtonSize, { control: NativeControlSize; minHeight: number }> = {
  sm: { control: "small", minHeight: brandComponentTokens.button.minHeight },
  md: { control: "regular", minHeight: brandComponentTokens.button.minHeight },
  lg: { control: "large", minHeight: brandComponentTokens.button.minHeightLarge },
}

/**
 * Whether the big call to action is the native iOS glass button here: iOS 26 and later (where
 * `glassProminent` exists; older iOS would silently get the automatic style) in a binary that
 * carries `@expo/ui`. Evaluated once, it does not change while the app runs.
 */
const USE_NATIVE_GLASS =
  LIQUID_GLASS_AVAILABLE && NATIVE_GLASS_BUTTON_AVAILABLE && Platform.OS === "ios"

/**
 * The big call-to-action button on forest glass (12.2-14, D-27c, D-28). On iOS 26 and later it is
 * the system's own glass button (`NativeGlassButton`: SwiftUI `glassProminent` tinted with the
 * charter forest and a white label), not a drawn pill: the system draws the capsule, the material,
 * the specular highlight and the press response. On Android and older iOS it is a flat translucent
 * forest fill with a crisp hairline, a marked top rim, a faint white reflection over its top half
 * and a soft shadow, and no blur (D-12). The `secondary` variant is the neutral companion: the
 * bare system `glass` style on iOS 26 (no outline of ours, 12.2-17), an outlined translucent pill
 * elsewhere, its outline the border of the button itself. Either
 * way the button replaces the opaque bar behind a primary `AppButton`, and what scrolls behind the
 * fallback stays visible through it.
 *
 * Same sizes, 44 pt hit area, light haptic and accessibility contract as `AppButton`. Disabled is
 * the system disabled look natively, and a pale neutral glass with a softer label in the fallback.
 * The colours are tokens (`theme.visual.glassCta`) checked at 4.5:1 (`visual-tokens.test.ts`).
 */
export function GlassButton({
  label,
  variant = "primary",
  size = "lg",
  minHeight,
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
  const secondary = variant === "secondary"
  const isDisabled = disabled || loading
  const a11yLabel = accessibilityLabel ?? (label.trim() || fr.components.appButton.defaultLabel)
  const handlePress = () => {
    if (isDisabled) return
    feedback.impact.light()
    onPress()
  }

  if (USE_NATIVE_GLASS) {
    const geometry = NATIVE_GEOMETRY[size]
    const typography = size === "sm" ? brandTypography.meta : brandTypography.button
    return (
      <NativeGlassButton
        label={label}
        accessibilityLabel={a11yLabel}
        controlSize={geometry.control}
        minHeight={minHeight ?? geometry.minHeight}
        variant={variant}
        tint={secondary ? undefined : cta.tint}
        ink={secondary ? cta.secondary.ink : cta.ink}
        fontFamily={typography.fontFamily}
        fontSize={typography.fontSize}
        colorScheme={theme.scheme}
        symbol={leadingIcon ? NATIVE_SYMBOLS[leadingIcon] : undefined}
        disabled={disabled}
        loading={loading}
        onPress={handlePress}
        testID={testID}
        style={style}
      />
    )
  }

  const ink = disabled ? cta.inkOff : secondary ? cta.secondary.ink : cta.ink
  const iconSize = size === "lg" ? 18 : size === "sm" ? 15 : 16
  return (
    <AppPressable
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={hitSlopFor(false, size)}
      onPress={handlePress}
      style={[
        styles.base,
        styles[size],
        minHeight === undefined ? null : { minHeight },
        disabled ? styles.flatOff : secondary ? styles.outline : styles.flat,
        style,
      ]}
      testID={testID}
    >
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
    // The hairline is the inset ring at the head of `cta.shadow`, not a border: a border on a view
    // with a gradient shows the tiled gradient under it (12.2-17, see ForestCard).
    flat: {
      backgroundColor: cta.flat,
      experimental_backgroundImage: cta.sheen,
      boxShadow: cta.shadow,
    },
    outline: {
      backgroundColor: cta.secondary.flat,
      borderWidth: 1,
      borderColor: cta.secondary.hairline,
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
