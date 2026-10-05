import { useMemo, useState } from "react"
import { View } from "react-native"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { addGenusToListValue } from "../app/factor-a-genus-list"
import type { FactorField } from "../app/types"
import { brandSpacing4, brandTypography } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppButton } from "../ui/AppButton"
import { AppText as Text } from "../ui/AppText"
import { GenusRecognitionModal } from "../ui/GenusRecognitionModal"

type FactorAGenusRecognitionEntryProps = {
  /** Factor A's genus-list field (FIELD_VARIANTS.A[0] in FactorDetailScreen) - a confirmed
   * suggestion merges straight into whatever the surveyor already picked (ADR-002 D-11). */
  genusField: FactorField
}

/**
 * The "photograph a tree" entry point for Factor A (OA-31: first thing on the screen, above the
 * genus list). The button opens the camera directly (OA-33); the guidance sits under it.
 */
export function FactorAGenusRecognitionEntry({ genusField }: FactorAGenusRecognitionEntryProps) {
  const theme = useBrandTheme()
  const hintStyle = useMemo(
    () => ({ ...brandTypography.meta, color: theme.colors.textSecondary }),
    [theme],
  )
  const [visible, setVisible] = useState(false)

  const handleConfirmGenus = (genus: CnpfFactorAGenusCode): void => {
    genusField.onChange(addGenusToListValue(genusField.value, genus))
  }

  return (
    <View style={{ gap: brandSpacing4.xs }}>
      <AppButton
        label={fr.genusRecognition.entryButton}
        variant="secondary"
        leadingIcon="camera-outline"
        onPress={() => setVisible(true)}
        testID="factor-a-genus-recognition-entry"
      />
      <Text style={hintStyle}>{fr.genusRecognition.captureHint}</Text>
      <GenusRecognitionModal
        visible={visible}
        onClose={() => setVisible(false)}
        onConfirmGenus={handleConfirmGenus}
      />
    </View>
  )
}
