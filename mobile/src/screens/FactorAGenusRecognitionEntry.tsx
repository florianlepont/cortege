import { useState } from "react"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { addGenusToListValue } from "../app/factor-a-genus-list"
import type { FactorField } from "../app/types"
import { fr } from "../i18n"
import { AppButton } from "../ui/AppButton"
import { GenusRecognitionModal } from "../ui/GenusRecognitionModal"

type FactorAGenusRecognitionEntryProps = {
  /** Factor A's genus-list field (FIELD_VARIANTS.A[0] in FactorDetailScreen) - a confirmed
   * suggestion merges straight into whatever the surveyor already picked (ADR-002 D-11). */
  genusField: FactorField
}

/** The "photograph a tree" entry point for Factor A, split out to keep FactorDetailScreen small. */
export function FactorAGenusRecognitionEntry({ genusField }: FactorAGenusRecognitionEntryProps) {
  const [visible, setVisible] = useState(false)

  const handleConfirmGenus = (genus: CnpfFactorAGenusCode): void => {
    genusField.onChange(addGenusToListValue(genusField.value, genus))
  }

  return (
    <>
      <AppButton
        label={fr.genusRecognition.entryButton}
        variant="secondary"
        onPress={() => setVisible(true)}
        testID="factor-a-genus-recognition-entry"
      />
      <GenusRecognitionModal
        visible={visible}
        onClose={() => setVisible(false)}
        onConfirmGenus={handleConfirmGenus}
      />
    </>
  )
}
