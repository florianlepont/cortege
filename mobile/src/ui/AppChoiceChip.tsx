import { useMemo } from "react"
import { StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import {
  brandComponentTokens,
  brandRadius,
  brandSpacing,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { feedback } from "./feedback"
import { AppPressable } from "./AppPressable"

export type AppChoiceChipTone = "neutral" | "success" | "warning" | "danger"

type AppChoiceChipProps = {
  label: string
  active?: boolean
  tone?: AppChoiceChipTone
  onPress?: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
}

export function AppChoiceChip({
  label,
  active = false,
  tone = "neutral",
  onPress,
  accessibilityLabel,
  style,
  labelStyle,
}: AppChoiceChipProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const isInteractive = typeof onPress === "function"
  // Principle 7: a selection tick on every interactive press, then the caller's handler.
  const handlePress = onPress
    ? () => {
        feedback.selection()
        onPress()
      }
    : undefined

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !isInteractive, selected: active }}
      disabled={!isInteractive}
      onPress={handlePress}
      style={[
        styles.base,
        isInteractive ? null : styles.static,
        styles[tone],
        active ? styles.active : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          !isInteractive ? styles.labelStatic : null,
          active ? styles.labelActive : null,
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </AppPressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      minHeight: brandComponentTokens.choiceChip.minHeight,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.chip.border,
      backgroundColor: theme.visual.chip.fill,
      paddingHorizontal: brandSpacing.sm,
      paddingVertical: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    neutral: {},
    success: {
      backgroundColor: theme.componentColors.choiceChip.successBackground,
    },
    warning: {
      backgroundColor: theme.componentColors.choiceChip.warningBackground,
    },
    danger: {
      backgroundColor: theme.componentColors.choiceChip.dangerBackground,
    },
    active: {
      borderColor: theme.visual.chip.activeBg,
      backgroundColor: theme.visual.chip.activeBg,
    },
    static: {
      opacity: 0.76,
    },
    label: {
      ...brandTypography.meta,
      color: theme.visual.chip.text,
    },
    labelStatic: {
      color: theme.componentColors.choiceChip.staticText,
    },
    labelActive: {
      color: theme.visual.chip.activeText,
    },
  })
}
