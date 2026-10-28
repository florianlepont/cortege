import { StyleSheet, View } from "react-native"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"

const t = fr.factorDetail.countingMode

/**
 * Phase 30 (D-07, spec section 9, O-12): the status badge of a factor counted in full, drawn in the
 * pager header under the factor's name. Non-interactive; only the factors the recorded route lifts
 * get it, the others show nothing. The label is the method's word: "Relevé déplafonné".
 */
export function CountingModeChip() {
  return (
    <View style={styles.chipHost} testID="counting-chip">
      <AppChoiceChip variant="status" tone="neutral" label={t.chip} />
    </View>
  )
}

const styles = StyleSheet.create({
  chipHost: {
    alignSelf: "flex-start",
  },
})
