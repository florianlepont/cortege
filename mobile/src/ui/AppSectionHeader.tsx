import { ReactNode, useMemo } from "react"
import { AccessibilityRole, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { brandSpacing, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"

type AppSectionHeaderProps = {
  title: string
  subtitle?: string
  trailing?: ReactNode
  style?: StyleProp<ViewStyle>
  copyStyle?: StyleProp<ViewStyle>
  titleStyle?: StyleProp<TextStyle>
  /** Role of the title text alone ("header"), so a trailing link stays its own element. */
  titleAccessibilityRole?: AccessibilityRole
  subtitleStyle?: StyleProp<TextStyle>
}

export function AppSectionHeader({
  title,
  subtitle,
  trailing,
  style,
  copyStyle,
  titleStyle,
  titleAccessibilityRole,
  subtitleStyle,
}: AppSectionHeaderProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.header, style]}>
      <View style={[styles.copy, copyStyle]}>
        <Text style={[styles.title, titleStyle]} accessibilityRole={titleAccessibilityRole}>
          {title}
        </Text>
        {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: brandSpacing.md - 4,
    },
    copy: {
      flex: 1,
      gap: brandSpacing4.xs,
    },
    title: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
