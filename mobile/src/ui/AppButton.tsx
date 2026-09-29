import { useMemo } from "react"
import { ActivityIndicator, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import {
  brandColors,
  brandComponentTokens,
  brandRadius,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppPressable } from "./AppPressable"
import { feedback } from "./feedback"

type AppButtonVariant = "primary" | "secondary" | "danger" | "dangerSoft"
type AppButtonSize = "sm" | "md" | "lg"

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
          : brandColors.white
  const iconSize = size === "lg" ? 18 : size === "sm" ? 15 : 16
  const isDisabled = disabled || loading

  return (
    <AppPressable
      accessibilityLabel={accessibilityLabel ?? label ?? fr.components.appButton.defaultLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
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

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      borderRadius: brandRadius.pill,
      flexDirection: "row",
      gap: 8,
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
    secondary: {
      backgroundColor: theme.componentColors.button.secondaryBackground,
      borderWidth: 1,
      borderColor: theme.componentColors.button.secondaryBorder,
    },
    danger: {
      backgroundColor: theme.componentColors.button.dangerBackground,
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
