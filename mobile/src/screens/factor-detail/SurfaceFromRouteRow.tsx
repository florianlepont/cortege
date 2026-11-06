import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { formatHectares } from "../../app/decimal-text"
import { type BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"

const t = fr.factorDetail.countingMode

type SurfaceFromRouteRowProps = {
  /** The surface (ha) the factor holds, equal to the route's surface décrite. */
  hectares: number
  testID: string
}

/**
 * Follow-up 32-32: the quiet read-only line that stands in for the "Surface" section of C, D, E and
 * of F counted in full while the surface is the one described in the route: "Surface décrite :
 * 2,0 ha, d'après le parcours". The stored value is unchanged; nothing is asked a second time. A
 * surface that differs from the route's, or a route with no surface, keeps the editable row.
 */
export function SurfaceFromRouteRow({ hectares, testID }: SurfaceFromRouteRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <Text style={styles.caption} testID={testID}>
      {t.surfaceFromRoute({ hectares: formatHectares(hectares) })}
    </Text>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      paddingHorizontal: brandSpacing4.xs,
    },
  })
}
