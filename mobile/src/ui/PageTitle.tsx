import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { brandFontScaleCaps, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppText as Text } from "./AppText"

/**
 * The page's own large title, on the left (OA-21): the one title of a sub-page. The native header
 * keeps only its buttons, its title is hidden with `hiddenNativeTitle` (navigation/stacks).
 */
export function PageTitle({ children }: { children: string }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <Text
      style={styles.pageTitle}
      accessibilityRole="header"
      maxFontSizeMultiplier={brandFontScaleCaps.title}
    >
      {children}
    </Text>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    pageTitle: {
      ...brandTypography.screenTitle,
      color: theme.colors.textPrimary,
    },
  })
}
