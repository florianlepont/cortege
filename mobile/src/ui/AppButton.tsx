import { useMemo } from "react"
import { ActivityIndicator, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import {
  brandColors,
  brandComponentTokens,
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppPressable } from "./AppPressable"
import { feedback } from "./feedback"

/**
 * `glow` (variant I, Phase 12.2) is the moss gradient pill, the primary call to action on forest
 * cards only (UI-SPEC accent list item 2). Terracotta is never a call to action.
 */
type AppButtonVariant = "primary" | "secondary" | "dangerSoft" | "glow"
export type AppButtonSize = "sm" | "md" | "lg"

type AppButtonProps = {
  label?: string
  variant?: AppButtonVariant
  size?: AppButtonSize
  leadingIcon?: keyof typeof Ionicons.glyphMap
  iconOnly?: boolean
  accessibilityLabel?: string
  disabled?: boolean
  loading?: boolean
  onPress: () => void
  testID?: string
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
}

export function AppButton({
  label,
  variant = "primary",
  size = "md",
  leadingIcon,
  iconOnly = false,
  accessibilityLabel,
  disabled = false,
  loading = false,
  onPress,
  testID,
  style,
  labelStyle,
}: AppButtonProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const hasLabel = Boolean(label?.trim().length)
  const iconColor =
    variant === "secondary"
      ? theme.componentColors.button.secondaryLabel
      : variant === "dangerSoft"
        ? theme.onSurface.danger
        : variant === "primary"
          ? theme.semanticColors.onCtaPrimary
          : variant === "glow"
            ? theme.visual.pill.label
            : brandColors.white
  const iconSize = size === "lg" ? 18 : size === "sm" ? 15 : 16
  const isDisabled = disabled || loading

  return (
    <AppPressable
      accessibilityLabel={accessibilityLabel ?? label ?? fr.components.appButton.defaultLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={hitSlopFor(iconOnly, size)}
      onPress={() => {
        // A light tap on every button press (owner: the taps were felt on Reprendre and Nouveau relevé).
        feedback.impact.light()
        onPress()
      }}
      style={[
        styles.base,
        iconOnly ? styles.iconOnlyBase : styles[size],
        iconOnly
          ? size === "lg"
            ? styles.iconOnlyLg
            : size === "sm"
              ? styles.iconOnlySm
              : styles.iconOnlyMd
          : null,
        styles[variant],
        isDisabled ? styles.disabled : null,
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : leadingIcon ? (
        <Ionicons name={leadingIcon} size={iconSize} color={iconColor} />
      ) : null}
      {hasLabel && !iconOnly ? (
        <Text
          style={[
            styles.label,
            size === "sm" ? styles.labelSmall : null,
            variant === "secondary"
              ? styles.labelSecondary
              : variant === "dangerSoft"
                ? styles.labelDangerSoft
                : variant === "primary"
                  ? styles.labelPrimary
                  : variant === "glow"
                    ? styles.labelGlow
                    : null,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </AppPressable>
  )
}

// Every size keeps a hit area of at least `hitTarget.min` (D-05): the small button and the small
// and medium icon-only buttons are drawn below 44 pt, so the touch area grows past the visible
// shape instead (the 37 call sites render exactly as before).
export function hitSlopFor(iconOnly: boolean, size: AppButtonSize): number {
  const { button } = brandComponentTokens
  const drawn = iconOnly
    ? size === "lg"
      ? button.iconOnlySizeLarge
      : size === "sm"
        ? button.iconOnlySizeSmall
        : button.iconOnlySize
    : size === "lg"
      ? button.minHeightLarge
      : size === "sm"
        ? button.minHeightSmall
        : button.minHeight
  return Math.max(0, Math.ceil((brandInteraction.hitTarget.min - drawn) / 2))
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      borderRadius: brandRadius.pill,
      flexDirection: "row",
      gap: brandSpacing4.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    iconOnlyBase: {
      paddingHorizontal: 0,
      borderRadius: brandRadius.pill,
    },
    iconOnlySm: {
      width: brandComponentTokens.button.iconOnlySizeSmall,
      height: brandComponentTokens.button.iconOnlySizeSmall,
    },
    iconOnlyMd: {
      width: brandComponentTokens.button.iconOnlySize,
      height: brandComponentTokens.button.iconOnlySize,
    },
    iconOnlyLg: {
      width: brandComponentTokens.button.iconOnlySizeLarge,
      height: brandComponentTokens.button.iconOnlySizeLarge,
    },
    sm: {
      minHeight: brandComponentTokens.button.minHeightSmall,
      paddingHorizontal: brandComponentTokens.button.horizontalPaddingSmall,
    },
    md: {
      minHeight: brandComponentTokens.button.minHeight,
      paddingHorizontal: brandComponentTokens.button.horizontalPadding,
    },
    lg: {
      minHeight: brandComponentTokens.button.minHeightLarge,
      paddingHorizontal: brandComponentTokens.button.horizontalPaddingLarge,
    },
    primary: {
      backgroundColor: theme.componentColors.button.primaryBackground,
    },
    labelPrimary: {
      color: theme.semanticColors.onCtaPrimary,
    },
    glow: {
      backgroundColor: theme.visual.pill.fallback,
      experimental_backgroundImage: theme.visual.pill.image,
      boxShadow: theme.visual.pill.shadow,
      borderRadius: brandRadius.pill,
    },
    labelGlow: {
      color: theme.visual.pill.label,
      fontFamily: brandTypography.input.fontFamily,
    },
    secondary: {
      backgroundColor: theme.componentColors.button.secondaryBackground,
      borderWidth: 1,
      borderColor: theme.componentColors.button.secondaryBorder,
    },
    dangerSoft: {
      backgroundColor: theme.colors.errorSoft,
      borderWidth: 1,
      borderColor: theme.componentColors.notice.dangerBorder,
    },
    disabled: {
      opacity: 0.7,
    },
    label: {
      ...brandTypography.button,
      color: brandColors.white,
      textAlign: "center",
    },
    labelSmall: {
      ...brandTypography.meta,
    },
    labelSecondary: {
      color: theme.componentColors.button.secondaryLabel,
    },
    // DS-02: terracotta directly on errorSoft measured ~2.97:1 (WCAG fail); onSurface.danger
    // (Phase 4/12) supersedes Phase 2's interim textPrimary fix with the named token.
    labelDangerSoft: {
      color: theme.onSurface.danger,
    },
  })
}
