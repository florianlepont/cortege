import { WEATHER_SKY_CODES, type WeatherSkyCode } from "@cortege/ibp-domain"
import { StyleSheet, View } from "react-native"
import { brandSpacing4 } from "../../../app/brand-tokens"
import { fr } from "../../../i18n"
import { AppChoiceChip } from "../../../ui/AppChoiceChip"

const t = fr.conditions.sky

type SkyChipsProps = {
  value: WeatherSkyCode | null
  onChange: (code: WeatherSkyCode | null) => void
}

/**
 * The eight sky values as single-select chips (UI-SPEC 1.2, U-09). Pressing the chosen chip again
 * clears the sky: the value is optional. The selection tick comes from `AppChoiceChip`.
 */
export function SkyChips({ value, onChange }: SkyChipsProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t.groupA11y}>
      {WEATHER_SKY_CODES.map((code) => (
        // The chip has no testID of its own: the wrapper carries it.
        <View key={code} testID={`conditions-sky-${code}`}>
          <AppChoiceChip
            label={t[code]}
            active={value === code}
            onPress={() => onChange(value === code ? null : code)}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: brandSpacing4.sm,
  },
})
