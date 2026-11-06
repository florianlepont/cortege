import { fr } from "../../i18n"
import { ValueSection } from "../../ui/value-rows/ValueSection"
import { NumberRow } from "../../ui/value-rows/NumberRow"
import { SURFACE_ROW } from "./renderValueFields"
import { SurfaceFromRouteRow } from "./SurfaceFromRouteRow"
import { useRouteSurfacePrefill } from "./useRouteSurfacePrefill"

const t = fr.factorDetail.countingMode

const ignoreTouch = (): void => undefined

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
 * route counts it in full: prefilled once from the route's zone like C, D and E, editable. Follow-up
 * 32-32: while it equals the zone, the section is replaced by one read-only caption line. Phase 32: the counts per group moved into the
 * group list (`DmhGroupList`); this block keeps only the surface. Follow-up 32-31: a grouped row with
 * the value typeable and a -/+ capsule of a tenth of a hectare. The trees per hectare is the
 * package's (`dmhDensityPerHa`, called by the form from the counts and this surface).
 */
export function DmhCountFields({
  surfaceText,
  zoneSurfaceHa,
  onChangeSurface,
  editable = true,
}: DmhCountFieldsProps) {
  const { fromRoute, zoneHa } = useRouteSurfacePrefill({
    zoneSurfaceHa,
    surfaceText,
    onChangeSurface,
    enabled: editable,
  })

  // Follow-up 32-32: while the surface is the route's, one read-only caption line stands in for the
  // section; a different value keeps the editable row.
  if (fromRoute && zoneHa !== null) {
    return <SurfaceFromRouteRow hectares={zoneHa} testID="dmh-surface-block" />
  }

  return (
    <ValueSection testID="dmh-surface-block" title={fr.factorDetail.valueRows.headers.surface}>
      <NumberRow
        label={t.dmhSurfaceLabel}
        value={surfaceText}
        onChange={onChangeSurface}
        onTouch={ignoreTouch}
        editable={editable}
        testID="dmh-surface-stepper"
        inputTestID="dmh-surface-field"
        {...SURFACE_ROW}
      />
    </ValueSection>
  )
}
