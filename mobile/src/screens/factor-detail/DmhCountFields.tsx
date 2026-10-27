import { StyleSheet, View } from "react-native"
import { brandSpacing4 } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { AppField } from "../../ui/AppField"
import { FromRouteCaption } from "./CountingModeStrip"
import { useRouteSurfacePrefill } from "./useRouteSurfacePrefill"

const t = fr.factorDetail.countingMode

type DmhCountFieldsProps = {
  /** F's own surface as typed (hectares). */
  surfaceText: string
  /** The surface décrite of the recorded route (ha): F's surface starts from it. Null: none. */
  zoneSurfaceHa: number | null
  onChangeSurface: (text: string) => void
  editable?: boolean
}

/**
 * Phase 30 (D-07, spec section 7, UI-SPEC section 11): F's own surface décrite when the recorded
 * route counts it in full: prefilled once from the route's zone like C, D and E, editable, captioned
 * "D'après le parcours" while it still equals the zone. Phase 32: the counts per group moved into the
 * group list above (`DmhGroupList`); this block keeps only the surface. The trees per hectare is the
 * package's (`dmhDensityPerHa`, called by the form from the counts and this surface).
 */
export function DmhCountFields({
  surfaceText,
  zoneSurfaceHa,
  onChangeSurface,
  editable = true,
}: DmhCountFieldsProps) {
  const { fromRoute } = useRouteSurfacePrefill({
    zoneSurfaceHa,
    surfaceText,
    onChangeSurface,
    enabled: editable,
  })

  return (
    <View style={styles.block} testID="dmh-surface-block">
      <AppField
        label={t.dmhSurfaceLabel}
        value={surfaceText}
        onChangeText={onChangeSurface}
        keyboardType="decimal-pad"
        editable={editable}
        testID="dmh-surface-field"
      />
      {fromRoute ? <FromRouteCaption /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    gap: brandSpacing4.sm,
  },
})
