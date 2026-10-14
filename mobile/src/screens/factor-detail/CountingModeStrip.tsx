import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandDefaultFontFamily, brandSpacing4, brandTypeScale } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppText as Text } from "../../ui/AppText"

const t = fr.factorDetail.countingMode

const CAPTION_GLYPH_SIZE = 18

/**
 * Phase 30 (D-07, spec section 9, O-12): the status badge of a factor counted in full, drawn in the
 * pager header under the factor's name. Non-interactive; only the factors the recorded route lifts
 * get it, the others show nothing. The label is the method's word: "Relevé déplafonné".
 */
export function CountingModeChip() {
  const styles = useStyles()
  return (
    <View style={styles.chipHost} testID="counting-chip">
      <AppChoiceChip variant="status" tone="neutral" label={t.chip} />
    </View>
  )
}

/** Factors that have a sentence: every factor but H, which is never counted in full. */
type CaptionFactor = Exclude<FactorKey, "H">

function hasCaption(factor: FactorKey): factor is CaptionFactor {
  return factor !== "H"
}

/**
 * The one-line explanation above the first field of a factor counted in full. One text element for
 * a screen reader; the glyph is decorative. H has no sentence and renders nothing.
 */
export function CountingModeCaption({ factor }: { factor: FactorKey }) {
  const theme = useBrandTheme()
  const styles = useStyles()
  if (!hasCaption(factor)) return null
  const sentence = t[factor]
  return (
    <View style={styles.caption} accessible accessibilityLabel={sentence} testID="counting-caption">
      <Ionicons
        name="trail-sign-outline"
        size={CAPTION_GLYPH_SIZE}
        color={theme.colors.textSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.captionText}>{sentence}</Text>
    </View>
  )
}

function useStyles() {
  const theme = useBrandTheme()
  return useMemo(() => createStyles(theme), [theme])
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    chipHost: {
      alignSelf: "flex-start",
    },
    caption: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.sm,
    },
    // 15 Regular, secondary ink; the glyph is muted to match.
    captionText: {
      flex: 1,
      fontFamily: brandDefaultFontFamily,
      fontSize: brandTypeScale.subhead.fontSize,
      lineHeight: brandTypeScale.subhead.lineHeight,
      color: theme.colors.textSecondary,
    },
  })
}
