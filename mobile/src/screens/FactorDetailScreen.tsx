import { useMemo, useState } from "react"
import { Pressable, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import type { IbpMethodVersion } from "@cortege/ibp-domain"
import { useBrandTheme } from "../app/theme"
import { helpForMethod } from "../app/constants"
import { FactorField, FactorKey, FactorRetainedScore } from "../app/types"
import { AppCard } from "../ui/AppCard"
import { AppField } from "../ui/AppField"
import { createDetailStyles } from "./factor-detail.styles"
import { FactorAGenusRecognitionEntry } from "./FactorAGenusRecognitionEntry"
import { FactorHelpSheet } from "./FactorHelpSheet"
import { FactorChipOption, FactorChipsInput } from "../ui/FactorChipsInput"
import { FactorCounterInput } from "../ui/FactorCounterInput"
import { FactorGenusListInput } from "../ui/FactorGenusListInput"
import { FactorSegmentedOption, FactorSegmentedInput } from "../ui/FactorSegmentedInput"
import { FactorSliderInput } from "../ui/FactorSliderInput"
import { fr } from "../i18n"

const t = fr.factorDetail

// FLOW-01: which FactorInput variant each factor's fields render as, in the fixed order
// useSurveyForm's factorSections builds them. F's trees_per_ha has no natural discrete variant and
// stays numeric.
type FieldVariant =
  | { kind: "numeric" }
  | { kind: "counter" }
  | { kind: "segmented"; options: readonly FactorSegmentedOption[] }
  | { kind: "chips"; options: readonly FactorChipOption[]; countLabel: (count: number) => string }
  | { kind: "genusList" }
  | { kind: "slider" }

const CHIP_COUNT_LABEL = (count: number): string => fr.factorInput.chips.selectedCount({ count })

const FIELD_VARIANTS: Record<FactorKey, readonly FieldVariant[]> = {
  A: [{ kind: "genusList" }, { kind: "numeric" }],
  B: [{ kind: "chips", options: fr.factorInput.strataOptions, countLabel: CHIP_COUNT_LABEL }],
  C: [{ kind: "counter" }, { kind: "counter" }, { kind: "numeric" }],
  D: [{ kind: "counter" }, { kind: "counter" }, { kind: "numeric" }],
  E: [{ kind: "counter" }, { kind: "counter" }, { kind: "numeric" }],
  F: [{ kind: "numeric" }],
  G: [{ kind: "slider" }],
  H: [{ kind: "segmented", options: fr.factorInput.continuityOptions }],
  I: [
    { kind: "chips", options: fr.factorInput.aquaticHabitatOptions, countLabel: CHIP_COUNT_LABEL },
  ],
  J: [{ kind: "chips", options: fr.factorInput.rockyHabitatOptions, countLabel: CHIP_COUNT_LABEL }],
}

type FactorDetailScreenProps = {
  factor: FactorKey
  fields: FactorField[]
  retainedScore: FactorRetainedScore | null
  /** The survey's IBP method; null is an untagged legacy draft (v3.0 help, D-09). */
  methodVersion: IbpMethodVersion | null
}

/**
 * One factor's entry (OA-30): the input first, then the factor's score on one line, then a link to
 * the help. The factor's name and the running total are in the pager's header, not here. Factor A
 * opens with the photo identification (OA-31).
 */
export function FactorDetailScreen({
  factor,
  fields,
  retainedScore,
  methodVersion,
}: FactorDetailScreenProps) {
  const theme = useBrandTheme()
  const detailStyles = useMemo(() => createDetailStyles(theme), [theme])
  const [helpVisible, setHelpVisible] = useState(false)
  const helpTexts = helpForMethod(methodVersion)
  // Phase 6 (ADR-002 D-11): the genus-list field is always A's first field (FIELD_VARIANTS.A[0]),
  // so a confirmed suggestion can be merged straight into whatever the surveyor already picked.
  const genusListField = factor === "A" ? fields[0] : null

  return (
    <View style={detailStyles.screen}>
      <AppCard variant="panelElevated" padding={16} style={detailStyles.panel}>
        {genusListField ? <FactorAGenusRecognitionEntry genusField={genusListField} /> : null}
        <View style={detailStyles.fieldsList}>
          {fields.map((field, index) => renderFactorField(factor, field, index, detailStyles))}
        </View>
      </AppCard>

      <View
        style={[
          detailStyles.scoreLine,
          retainedScore ? detailStyles.scoreLineFilled : detailStyles.scoreLinePending,
        ]}
      >
        <Text style={detailStyles.scoreLineText}>
          {retainedScore
            ? t.scoreClass({ selectedClass: retainedScore.selected_class })
            : t.scoreHint}
        </Text>
        <Text style={detailStyles.scoreLinePoints}>
          {retainedScore ? t.scorePoints({ scoreCount: retainedScore.score }) : t.pending}
        </Text>
      </View>

      <Pressable
        style={detailStyles.helpLink}
        onPress={() => setHelpVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t.helpLink}
      >
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={theme.semanticColors.textStrong}
        />
        <Text style={detailStyles.helpLinkText}>{t.helpLink}</Text>
      </Pressable>

      <FactorHelpSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        help={helpTexts.help[factor]}
        hints={helpTexts.hints[factor]}
      />
    </View>
  )
}

function humanizeFieldLabel(label: string): string {
  const labels: Record<string, string> = t.fieldLabels
  return Object.prototype.hasOwnProperty.call(labels, label)
    ? labels[label]
    : label.replace(/_/g, " ")
}

function renderFactorField(
  factor: FactorKey,
  field: FactorField,
  index: number,
  detailStyles: ReturnType<typeof createDetailStyles>,
) {
  const variant = FIELD_VARIANTS[factor][index] ?? { kind: "numeric" as const }
  const label = field.required
    ? t.requiredField({ label: humanizeFieldLabel(field.label) })
    : humanizeFieldLabel(field.label)
  const key = `${factor}-${field.label}`

  switch (variant.kind) {
    case "counter":
      return (
        <FactorCounterInput
          key={key}
          label={label}
          value={field.value}
          onChange={field.onChange}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
        />
      )
    case "segmented":
      return (
        <FactorSegmentedInput
          key={key}
          label={label}
          value={field.value}
          onChange={field.onChange}
          options={variant.options}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
        />
      )
    case "chips":
      return (
        <FactorChipsInput
          key={key}
          label={label}
          value={field.value}
          onChange={field.onChange}
          options={variant.options}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
          countLabel={variant.countLabel}
        />
      )
    case "genusList":
      return (
        <FactorGenusListInput
          key={key}
          label={label}
          value={field.value}
          onChange={field.onChange}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
        />
      )
    case "slider":
      return (
        <FactorSliderInput
          key={key}
          label={label}
          value={field.value}
          onChange={field.onChange}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
        />
      )
    case "numeric":
    default:
      return (
        <AppField
          key={key}
          label={label}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onTouch}
          keyboardType="numeric"
          placeholder={t.numericPlaceholder}
          error={field.touched ? field.error : null}
          containerStyle={detailStyles.fieldBlock}
          labelStyle={detailStyles.fieldLabel}
          inputStyle={detailStyles.input}
        />
      )
  }
}
