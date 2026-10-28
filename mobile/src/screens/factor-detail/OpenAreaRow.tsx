import { ROUTE_SURFACE_MAX_HA } from "@cortege/ibp-domain"
import { Ionicons } from "@expo/vector-icons"
import { View } from "react-native"
import { formatHectares } from "../../app/decimal-text"
import { parseFiniteNumberInput } from "../../app/number-utils"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { feedback } from "../../ui/feedback"
import { ValueStepper } from "../../ui/ValueStepper"
import type { OpenAreasStyles } from "./open-areas.styles"
import { useBrandTheme } from "../../app/theme"

const t = fr.factorDetail.openAreas
const rows = fr.factorDetail.valueRows

const AREA_STEP = 0.1
const REMOVE_GLYPH_SIZE = 22

type OpenAreaRowProps = {
  /** 1-based, as the label and the spoken texts name the zone. */
  position: number
  hectares: number
  onChange: (hectares: number) => void
  onRemove: () => void
  styles: OpenAreasStyles
}

const draw = (value: number): string => `${formatHectares(value)}${rows.hectaresSuffix}`

/**
 * Follow-up 32-35: one zone of G's list: "Zone N", its surface in hectares (the value stepper of the
 * other factors, tap to type, 0,1 ha per step) and a 44 pt remove button. The stepper is one
 * adjustable element for a screen reader; the remove button is its own, named after the zone.
 */
export function OpenAreaRow({ position, hectares, onChange, onRemove, styles }: OpenAreaRowProps) {
  const theme = useBrandTheme()
  const label = t.zone({ index: position })
  return (
    <View style={styles.zoneRow} testID={`open-area-${position - 1}-row`}>
      <Text style={styles.label}>{label}</Text>
      <ValueStepper
        value={hectares}
        onStep={onChange}
        onSubmitText={(text) => onChange(parseFiniteNumberInput(text) ?? 0)}
        accessibilityLabel={label}
        accessibilityValueText={rows.spoken.hectares({ text: formatHectares(hectares) })}
        editHint={rows.stepper.editHint}
        incrementLabel={rows.stepper.increment}
        decrementLabel={rows.stepper.decrement}
        min={0}
        max={ROUTE_SURFACE_MAX_HA}
        step={AREA_STEP}
        format={draw}
        keyboardType="decimal-pad"
        testID={`open-area-${position - 1}`}
      />
      <AppPressable
        disableScale
        disableRipple
        accessibilityRole="button"
        accessibilityLabel={t.remove.a11y({ index: position })}
        accessibilityHint={t.remove.hint}
        onPress={() => {
          feedback.selection()
          onRemove()
        }}
        style={styles.removeButton}
        testID={`open-area-remove-${position - 1}`}
      >
        <Ionicons
          name="trash-outline"
          size={REMOVE_GLYPH_SIZE}
          color={theme.colors.textSecondary}
        />
      </AppPressable>
    </View>
  )
}
