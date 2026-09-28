import { useMemo } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  resolveMethodVersion,
  type IbpCas,
  type IbpMethodVersion,
} from "@cortege/ibp-domain"
import { useBrandTheme } from "../../app/theme"
import { AppCard } from "../../ui/AppCard"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { createFormStyles } from "./styles"
import { fr } from "../../i18n"

/**
 * The survey's IBP method as the wizard sees it (01.8-13): the form state and its setters, grouped
 * so the screen takes one prop. `version` null is an untagged legacy draft, scored as v3.0 (D-02).
 */
export type SurveyFormMethod = {
  version: IbpMethodVersion | null
  cas: IbpCas | null
  cas3Scale: boolean
  /** The version is fixed once the survey is submitted (D-02). */
  locked: boolean
  setVersion: (next: IbpMethodVersion) => void
  setCas: (next: IbpCas) => void
  setCas3Scale: (next: boolean) => void
}

// v3.2 first: it is the default for new surveys (D-01).
const VERSION_CHOICES: IbpMethodVersion[] = [IBP_METHOD_V3_2, IBP_METHOD_V3_0]

// Top of the identity step: which IBP method the survey follows (D-02, D-13 step 1).
export function MethodVersionPicker({
  version,
  locked,
  onChange,
}: {
  version: IbpMethodVersion | null
  locked: boolean
  onChange: (next: IbpMethodVersion) => void
}) {
  const resolved = resolveMethodVersion(version)
  const theme = useBrandTheme()
  const formStyles = useMemo(() => createFormStyles(theme), [theme])

  return (
    <AppCard variant="panelElevated" style={formStyles.panel}>
      <AppSectionHeader
        title={fr.ibpMethod.versionTitle}
        subtitle={locked ? fr.ibpMethod.versionLockedHint : fr.ibpMethod.versionHint}
        titleStyle={formStyles.panelTitle}
        subtitleStyle={formStyles.panelBody}
      />
      <View style={formStyles.choiceRow}>
        {VERSION_CHOICES.map((choice) => (
          <AppChoiceChip
            key={choice}
            label={fr.ibpMethod.versions[choice]}
            active={resolved === choice}
            onPress={locked ? undefined : () => onChange(choice)}
          />
        ))}
      </View>
      {version === null ? (
        <Text style={formStyles.panelBody}>{fr.ibpMethod.legacyVersionLabel}</Text>
      ) : null}
    </AppCard>
  )
}
