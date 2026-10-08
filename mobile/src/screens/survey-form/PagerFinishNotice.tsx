import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { brandRadius, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"

/**
 * D-26: the calm message of a finish from the factor pager that did not finish (offline, last
 * changes not sent yet, a refusal), above the "Terminer le relevé" pill. The text is the status
 * message the finish set (catalogue); it floats over the page on its own glass, never straight on
 * the scrolling content (12.2-14 glass CTA rule). Nothing is drawn for an empty message.
 */
export function PagerFinishNotice({ message }: { message: string }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  if (message.trim() === "") return null
  return (
    <GlassSurface style={styles.notice}>
      <Text
        style={styles.text}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        testID="pager-finish-notice"
      >
        {message}
      </Text>
    </GlassSurface>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    notice: {
      borderRadius: brandRadius.badge,
      paddingHorizontal: brandSpacing4.smd,
      paddingVertical: brandSpacing4.sm,
    },
    text: {
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
  })
}
