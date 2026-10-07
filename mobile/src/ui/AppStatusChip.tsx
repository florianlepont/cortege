import { useMemo } from "react"
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { brandColors, brandRadius, brandTypography } from "../app/brand-tokens"
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
      <Text
        style={[
          styles.label,
          tone === "success" && styles.labelSuccess,
          tone === "onDark" && styles.labelOnDark,
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // Phase 12.2: a glass hairline on every tone; the tone only changes the fill.
    base: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    neutral: {
      backgroundColor: theme.visual.chip.fill,
    },
    success: {
      backgroundColor: theme.componentColors.statusChip.successBackground,
    },
    warning: {
      backgroundColor: theme.componentColors.statusChip.warningBackground,
    },
    danger: {
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
    // The sketch's success green fails AA on the soft fill: forest in light (UI-SPEC forbidden list).
    labelSuccess: {
      color:
        theme.scheme === "dark" ? theme.componentColors.statusChip.textColor : brandColors.forest,
    },
    labelOnDark: {
      color: theme.componentColors.statusChip.onDarkTextColor,
    },
  })
}
