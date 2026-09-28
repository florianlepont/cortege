import { useMemo } from "react"
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { brandRadius, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"

export type AppStatusChipTone = "neutral" | "success" | "warning" | "danger" | "onDark"

type AppStatusChipProps = {
  label: string
  tone?: AppStatusChipTone
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
}

export function AppStatusChip({ label, tone = "neutral", style, labelStyle }: AppStatusChipProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.base, styles[tone], style]}>
      <Text style={[styles.label, tone === "onDark" && styles.labelOnDark, labelStyle]}>
        {label}
      </Text>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    neutral: {
      borderColor: theme.componentColors.statusChip.neutralBorder,
      backgroundColor: theme.componentColors.statusChip.neutralBackground,
    },
    success: {
      borderColor: theme.componentColors.statusChip.successBorder,
      backgroundColor: theme.componentColors.statusChip.successBackground,
    },
    warning: {
      borderColor: theme.componentColors.statusChip.warningBorder,
      backgroundColor: theme.componentColors.statusChip.warningBackground,
    },
    danger: {
      borderColor: theme.componentColors.statusChip.dangerBorder,
      backgroundColor: theme.componentColors.statusChip.dangerBackground,
    },
    onDark: {
      borderColor: theme.componentColors.statusChip.onDarkBorder,
      backgroundColor: theme.componentColors.statusChip.onDarkBackground,
    },
    label: {
      ...brandTypography.meta,
      color: theme.componentColors.statusChip.textColor,
    },
    labelOnDark: {
      color: theme.componentColors.statusChip.onDarkTextColor,
    },
  })
}
