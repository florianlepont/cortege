import { useMemo, useState } from "react"
import { Pressable, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import type { IbpMethodVersion } from "@cortege/ibp-domain"
import { brandColors } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { FACTOR_TITLES, helpForMethod } from "../app/constants"
import { FactorField, FactorKey, FactorRetainedScore } from "../app/types"
import { AppCard } from "../ui/AppCard"
import { AppField } from "../ui/AppField"
import { AppSectionHeader } from "../ui/AppSectionHeader"
import { AppStatusChip } from "../ui/AppStatusChip"
import { createDetailStyles } from "./factor-detail.styles"
import { FactorAGenusRecognitionEntry } from "./FactorAGenusRecognitionEntry"
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

export function FactorDetailScreen({
  factor,
  fields,
  retainedScore,
  methodVersion,
}: FactorDetailScreenProps) {
  const theme = useBrandTheme()
  const detailStyles = useMemo(() => createDetailStyles(theme), [theme])
  const [captureHelpExpanded, setCaptureHelpExpanded] = useState(false)
  const helpTexts = helpForMethod(methodVersion)
  const hints = helpTexts.hints[factor]
  const total = fields.length
  const filled = fields.filter((field) => field.value.trim().length > 0).length
  // Phase 6 (ADR-002 D-11): the genus-list field is always A's first field (FIELD_VARIANTS.A[0]),
  // so a confirmed suggestion can be merged straight into whatever the surveyor already picked.
  const genusListField = factor === "A" ? fields[0] : null

  return (
    <View style={detailStyles.screen}>
      <View style={detailStyles.heroCard}>
        <View style={detailStyles.heroAccentOrb} />
        <View style={detailStyles.heroHeaderRow}>
          <View style={detailStyles.heroFactorBadge}>
            <Text style={detailStyles.heroFactorBadgeText}>{factor}</Text>
          </View>
          <Text style={detailStyles.heroProgressText}>
            {t.fieldsProgress({ filledCount: filled, totalCount: total })}
          </Text>
        </View>
        <Text style={detailStyles.heroTitle}>{FACTOR_TITLES[factor]}</Text>
        <Text style={detailStyles.heroBody}>{helpTexts.help[factor]}</Text>
        <View style={detailStyles.heroScoreRow}>
          <View style={detailStyles.heroScoreCard}>
            <Text style={detailStyles.heroScoreLabel}>{t.retainedScore}</Text>
            <Text style={detailStyles.heroScoreValue}>
              {retainedScore ? t.scorePoints({ scoreCount: retainedScore.score }) : t.pending}
            </Text>
          </View>
          <Text style={detailStyles.heroScoreMeta}>
            {retainedScore ? retainedScore.selected_class : t.scoreHint}
          </Text>
        </View>
      </View>

      <AppCard variant="panelElevated" padding={18} style={detailStyles.panel}>
        <AppSectionHeader
          title={t.observationsTitle}
          subtitle={t.observationsSubtitle}
          trailing={
            retainedScore ? (
              <AppStatusChip label={retainedScore.selected_class} tone="success" />
            ) : (
              <AppStatusChip label={t.pending} tone="warning" />
            )
          }
          titleStyle={detailStyles.panelTitle}
          subtitleStyle={detailStyles.panelBody}
        />
        <View style={detailStyles.fieldsList}>
          {fields.map((field, index) => renderFactorField(factor, field, index, detailStyles))}
        </View>
        {genusListField ? <FactorAGenusRecognitionEntry genusField={genusListField} /> : null}
      </AppCard>

      <AppCard variant="panelElevated" padding={18} style={detailStyles.panel}>
        <Pressable
          style={detailStyles.panelToggle}
          onPress={() => setCaptureHelpExpanded((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={t.captureToggle}
          accessibilityState={{ expanded: captureHelpExpanded }}
        >
          <View style={detailStyles.panelToggleCopy}>
            <Text style={detailStyles.panelTitle}>{t.captureTitle}</Text>
            <Text style={detailStyles.panelToggleMeta}>{t.captureSubtitle}</Text>
          </View>
          <Ionicons
            name={captureHelpExpanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={20}
            color={brandColors.forest}
          />
        </Pressable>
        {captureHelpExpanded ? (
          <View style={detailStyles.hintsList}>
            {hints.map((hint) => (
              <View key={`hint-${factor}-${hint}`} style={detailStyles.hintRow}>
                <View style={detailStyles.hintDot} />
                <Text style={detailStyles.hintText}>{hint}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </AppCard>
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
