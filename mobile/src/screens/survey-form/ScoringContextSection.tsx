import { Switch, Text, View } from "react-native"
import { IBP_CAS_VALUES, IBP_METHOD_V3_2, type IbpCas } from "@cortege/ibp-domain"
import { brandColors } from "../../app/brand-tokens"
import { REGION_OPTIONS, VEGETATION_STAGE_OPTIONS_BY_REGION } from "../../app/constants"
import { RegionVersion, VegetationStage } from "../../app/types"
import { AppCard } from "../../ui/AppCard"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { WizardChip } from "./components"
import type { SurveyFormMethod } from "./MethodVersionPicker"
import { formStyles } from "./styles"
import { fr } from "../../i18n"

/**
 * The hero pills of the parcels step: the cas and the version for a v3.2 survey, the region and
 * stage for a v3.0 or untagged one (D-08 amended).
 */
export function scoringContextPills({
  version,
  cas,
  regionLabel,
  vegetationLabel,
}: {
  version: SurveyFormMethod["version"]
  cas: IbpCas | null
  regionLabel: string
  vegetationLabel: string
}): string[] {
  if (version === IBP_METHOD_V3_2) {
    return [
      cas === null ? fr.surveyForm.scoringContext.casMissing : fr.ibpMethod.casLabels[cas],
      fr.ibpMethod.versions[IBP_METHOD_V3_2],
    ]
  }
  return [regionLabel, vegetationLabel]
}

// v3.2: the cas (1-4) and the flag that applies the cas-3 scale to A and G.
function CasFields({ method }: { method: SurveyFormMethod }) {
  return (
    <>
      <Text style={formStyles.label}>{fr.ibpMethod.casTitle}</Text>
      {method.cas === null ? (
        <Text style={formStyles.panelBody}>{fr.surveyForm.scoringContext.casMissing}</Text>
      ) : null}
      {IBP_CAS_VALUES.map((cas) => (
        <View key={cas} style={formStyles.casRow}>
          <WizardChip
            label={fr.ibpMethod.casLabels[cas]}
            active={method.cas === cas}
            onPress={() => method.setCas(cas)}
          />
          <Text style={formStyles.casCaption}>{fr.ibpMethod.casCaptions[cas]}</Text>
        </View>
      ))}

      <View style={formStyles.switchRow}>
        <View style={formStyles.switchCopy}>
          <Text style={formStyles.label}>{fr.ibpMethod.cas3ScaleLabel}</Text>
          <Text style={formStyles.panelBody}>{fr.ibpMethod.cas3ScaleHint}</Text>
        </View>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={fr.ibpMethod.cas3ScaleLabel}
          accessibilityHint={fr.ibpMethod.cas3ScaleHint}
          value={method.cas3Scale}
          onValueChange={method.setCas3Scale}
          trackColor={{ true: brandColors.forest }}
        />
      </View>
    </>
  )
}

// v3.0 (and untagged drafts): the region version and the vegetation stage.
function RegionStageFields({
  regionVersion,
  vegetationStage,
  onRegionChange,
  setVegetationStage,
}: {
  regionVersion: RegionVersion
  vegetationStage: VegetationStage
  onRegionChange: (nextRegion: RegionVersion) => void
  setVegetationStage: (value: VegetationStage) => void
}) {
  return (
    <>
      <Text style={formStyles.label}>{fr.surveyForm.region.label}</Text>
      <View style={formStyles.choiceRow}>
        {REGION_OPTIONS.map((option) => (
          <WizardChip
            key={option.value}
            label={option.label}
            active={regionVersion === option.value}
            onPress={() => onRegionChange(option.value)}
          />
        ))}
      </View>

      <Text style={formStyles.label}>{fr.surveyForm.vegetation.label}</Text>
      <View style={formStyles.choiceRow}>
        {VEGETATION_STAGE_OPTIONS_BY_REGION[regionVersion].map((option) => (
          <WizardChip
            key={option.value}
            label={option.label}
            active={vegetationStage === option.value}
            onPress={() => setVegetationStage(option.value)}
          />
        ))}
      </View>
    </>
  )
}

// The scoring context of the parcels step; it follows the survey's method version (D-08 amended).
export function ScoringContextSection({
  method,
  regionVersion,
  vegetationStage,
  onRegionChange,
  setVegetationStage,
}: {
  method: SurveyFormMethod
  regionVersion: RegionVersion
  vegetationStage: VegetationStage
  onRegionChange: (nextRegion: RegionVersion) => void
  setVegetationStage: (value: VegetationStage) => void
}) {
  const isV32 = method.version === IBP_METHOD_V3_2

  return (
    <AppCard variant="panelElevated" style={formStyles.panel}>
      <AppSectionHeader
        title={fr.surveyForm.region.title}
        subtitle={isV32 ? fr.surveyForm.scoringContext.casSubtitle : fr.surveyForm.region.subtitle}
        titleStyle={formStyles.panelTitle}
        subtitleStyle={formStyles.panelBody}
      />
      {isV32 ? (
        <CasFields method={method} />
      ) : (
        <RegionStageFields
          regionVersion={regionVersion}
          vegetationStage={vegetationStage}
          onRegionChange={onRegionChange}
          setVegetationStage={setVegetationStage}
        />
      )}
    </AppCard>
  )
}
