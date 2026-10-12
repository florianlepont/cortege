import { memo } from "react"
import { StyleSheet, View } from "react-native"
import { fr } from "../../i18n"
import type { ParcelsMode } from "../../map/parcels-visibility"
import { AppChoiceChip } from "../../ui/AppChoiceChip"

const t = fr.mapLayers.overlays

const OPTIONS: readonly {
  mode: ParcelsMode
  testID: string
  label: string
  a11y: string
}[] = [
  { mode: "all", testID: "overlay-parcels-all", label: t.parcelsAll, a11y: t.allA11y },
  { mode: "withIbp", testID: "overlay-parcels-ibp", label: t.parcelsWithIbp, a11y: t.withIbpA11y },
  { mode: "none", testID: "overlay-parcels-none", label: t.parcelsNone, a11y: t.noneA11y },
]

export type ParcelsControlProps = {
  value: ParcelsMode
  onChange: (mode: ParcelsMode) => void
}

/**
 * The Parcelles three-state control of the overlay bubble (UI-SPEC section 2): Toutes, Avec IBP and
 * Aucune as three equal choice pills in a radio group, exactly one active. It covers the app's
 * parcel polygons and the cadastre lines together (`parcelsRendering`). Pressing the active pill
 * does nothing.
 */
export const ParcelsControl = memo(function ParcelsControl({
  value,
  onChange,
}: ParcelsControlProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t.parcelsGroupA11y} style={styles.row}>
      {OPTIONS.map((option) => (
        <AppChoiceChip
          key={option.mode}
          testID={option.testID}
          accessibilityRole="radio"
          accessibilityLabel={option.a11y}
          label={option.label}
          active={value === option.mode}
          onPress={() => onChange(option.mode)}
          style={styles.chip}
        />
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 4,
  },
})
