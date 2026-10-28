import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { brandDefaultFontFamily, brandTypeScale } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppText as Text } from "../../ui/AppText"

const t = fr.factorDetail.countingMode

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

/**
 * "D'après le parcours": the line under a surface field that still holds the surface décrite of the
 * recorded route (spec section 7). It goes away as soon as the observer changes the value.
 */
export function FromRouteCaption() {
  const styles = useStyles()
  return (
    <Text style={styles.fromRoute} testID="surface-from-route">
      {t.fromRoute}
    </Text>
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
    fromRoute: {
      fontFamily: brandDefaultFontFamily,
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: brandTypeScale.footnote.lineHeight,
      color: theme.colors.textSecondary,
    },
  })
}
