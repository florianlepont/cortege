import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { brandFontScaleCaps, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppText as Text } from "./AppText"
import { useFrameLargeTitle } from "./frame-large-title"

/**
 * The page's own large title, on the left (OA-21): the one title of a sub-page. The native header
 * keeps only its buttons, its title is hidden with `hiddenNativeTitle` (navigation/stacks).
 *
 * 12.2-17: under the native iOS large title (`<ScreenFrame largeTitle>`) the header names the page
 * and keeps the name on screen while it scrolls, so this renders nothing: the title is never shown
 * twice.
 */
export function PageTitle({ children }: { children: string }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const nativeTitle = useFrameLargeTitle()
  if (nativeTitle) return null
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
