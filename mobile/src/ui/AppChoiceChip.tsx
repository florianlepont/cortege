import { useMemo } from "react"
import { Pressable, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { brandComponentTokens, brandRadius, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"

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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !isInteractive, selected: active }}
      disabled={!isInteractive}
      onPress={onPress}
      style={[
        styles.base,
        isInteractive ? styles.interactive : styles.static,
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
    </Pressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      minHeight: brandComponentTokens.choiceChip.minHeight,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.componentColors.choiceChip.border,
      backgroundColor: theme.componentColors.choiceChip.background,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    interactive: {
      borderColor: theme.componentColors.choiceChip.interactiveBorder,
      backgroundColor: theme.componentColors.choiceChip.interactiveBackground,
      shadowColor: theme.colors.black,
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
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
      borderColor: theme.componentColors.choiceChip.activeBorder,
      backgroundColor: theme.componentColors.choiceChip.activeBackground,
    },
    static: {
      opacity: 0.76,
    },
    label: {
      ...brandTypography.meta,
      color: theme.componentColors.choiceChip.text,
    },
    labelStatic: {
      color: theme.componentColors.choiceChip.staticText,
    },
    labelActive: {
      color: theme.componentColors.choiceChip.activeText,
    },
  })
}
