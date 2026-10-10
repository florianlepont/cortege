import { useMemo, type ReactElement } from "react"
import { View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import type { IbpMethodVersion } from "@cortege/ibp-domain"
import { useBrandTheme } from "../app/theme"
import { helpForMethod } from "../app/constants"
import { parseFiniteNumberInput } from "../app/number-utils"
import {
  selectionOptionsFor,
  type SelectionFactor,
  type SelectionOption,
} from "../app/factor-selections"
import { FactorField, FactorKey, FactorRetainedScore } from "../app/types"
import { AppCard } from "../ui/AppCard"
import { AppField } from "../ui/AppField"
import { createDetailStyles } from "./factor-detail.styles"
import { FactorAGenusRecognitionEntry } from "./FactorAGenusRecognitionEntry"
import { FactorChipsInput } from "../ui/FactorChipsInput"
import { FactorCounterInput } from "../ui/FactorCounterInput"
import { FactorGenusListInput } from "../ui/FactorGenusListInput"
import { FactorSegmentedOption, FactorSegmentedInput } from "../ui/FactorSegmentedInput"
import { FactorSliderInput } from "../ui/FactorSliderInput"
import { fr } from "../i18n"
import { AppPressable } from "../ui/AppPressable"

const t = fr.factorDetail

// FLOW-01: which FactorInput variant each factor's fields render as, in the fixed order
// useSurveyForm's factorSections builds them. F's trees_per_ha has no natural discrete variant and
// stays numeric. Phase 25.1 (D-12): F and H carry an optional companion chip list under their
// scored field (dendromicrohabitat groups, continuity sources), and the chip options of B, I and J
// come from selectionOptionsFor so I and J follow the CNPF typology of the survey's method (D-09).
type OptionsFor = (selected: readonly string[] | null) => SelectionOption[]
type Companion = "F" | "H"

type FieldVariant =
  | { kind: "numeric"; companion?: Companion }
  | { kind: "counter" }
  | { kind: "segmented"; options: readonly FactorSegmentedOption[]; companion?: Companion }
  | { kind: "chips"; optionsFor: OptionsFor }
  | { kind: "genusList" }
  | { kind: "slider" }

const CHIP_COUNT_LABEL = (count: number): string => fr.factorInput.chips.selectedCount({ count })

const COMPANION_LABELS: Record<Companion, string> = {
  F: t.companionLabels.dmh_groups,
  H: t.companionLabels.evidence,
}

const ignoreSelectionChange = (): void => undefined

function fieldVariantsFor(
  factor: FactorKey,
  methodVersion: IbpMethodVersion | null,
): readonly FieldVariant[] {
  const chipsFor = (selectionFactor: SelectionFactor): FieldVariant => ({
    kind: "chips",
    optionsFor: (selected) => selectionOptionsFor(selectionFactor, methodVersion, selected),
  })
  switch (factor) {
    case "A":
      return [{ kind: "genusList" }, { kind: "numeric" }]
    case "B":
      return [chipsFor("B")]
    case "C":
    case "D":
    case "E":
      return [{ kind: "counter" }, { kind: "counter" }, { kind: "numeric" }]
    case "F":
      return [{ kind: "numeric", companion: "F" }]
    case "G":
      return [{ kind: "slider" }]
    case "H":
      return [{ kind: "segmented", options: fr.factorInput.continuityOptions, companion: "H" }]
    case "I":
      return [chipsFor("I")]
    case "J":
      return [chipsFor("J")]
  }
}

type FactorDetailScreenProps = {
  factor: FactorKey
  fields: FactorField[]
  retainedScore: FactorRetainedScore | null
  /** The survey's IBP method; null is an untagged legacy draft (v3.0 help, D-09). */
  methodVersion: IbpMethodVersion | null
  /** Opens the help sheet (a route of the survey stack) with the factor's texts. */
  onOpenHelp: (help: string, hints: readonly string[]) => void
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
  onOpenHelp,
}: FactorDetailScreenProps) {
  const theme = useBrandTheme()
  const detailStyles = useMemo(() => createDetailStyles(theme), [theme])
  const helpTexts = helpForMethod(methodVersion)
  // Phase 6 (ADR-002 D-11): the genus-list field is always A's first field (the first variant of A),
  // so a confirmed suggestion can be merged straight into whatever the surveyor already picked.
  const genusListField = factor === "A" ? fields[0] : null
  const variants = useMemo(() => fieldVariantsFor(factor, methodVersion), [factor, methodVersion])

  return (
    <View style={detailStyles.screen}>
      <AppCard variant="glass" padding={16} style={detailStyles.panel}>
        {genusListField ? <FactorAGenusRecognitionEntry genusField={genusListField} /> : null}
        <View style={detailStyles.fieldsList}>
          {fields.map((field, index) =>
            renderFactorField(factor, variants[index], field, methodVersion, detailStyles),
          )}
        </View>
      </AppCard>

      <View
        testID="factor-score-line"
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

      <AppPressable
        style={detailStyles.helpLink}
        onPress={() => onOpenHelp(helpTexts.help[factor], helpTexts.hints[factor])}
        accessibilityRole="button"
        accessibilityLabel={t.helpLink}
      >
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={theme.semanticColors.textStrong}
        />
        <Text style={detailStyles.helpLinkText}>{t.helpLink}</Text>
      </AppPressable>
    </View>
  )
}

function humanizeFieldLabel(label: string): string {
  const labels: Record<string, string> = t.fieldLabels
  return Object.prototype.hasOwnProperty.call(labels, label)
    ? labels[label]
    : label.replace(/_/g, " ")
}

/** The count ticked before the detail was stored, read from the field text while no selection is. */
function legacyCountOf(field: FactorField): number | null {
  if (field.selection?.selected) return null
  const parsed = parseFiniteNumberInput(field.value)
  return parsed === null ? null : Math.max(0, Math.round(parsed))
}

function renderCompanion(
  companion: Companion,
  field: FactorField,
  methodVersion: IbpMethodVersion | null,
  key: string,
) {
  const selected = field.selection?.selected ?? null
  return (
    <FactorChipsInput
      key={`${key}-companion`}
      label={COMPANION_LABELS[companion]}
      options={selectionOptionsFor(companion, methodVersion, selected)}
      selected={selected}
      onSelectionChange={field.selection?.onChange ?? ignoreSelectionChange}
      touched={false}
      onTouch={ignoreSelectionChange}
      error={null}
      countLabel={CHIP_COUNT_LABEL}
    />
  )
}

function renderFactorField(
  factor: FactorKey,
  variant: FieldVariant | undefined,
  field: FactorField,
  methodVersion: IbpMethodVersion | null,
  detailStyles: ReturnType<typeof createDetailStyles>,
) {
  const current: FieldVariant = variant ?? { kind: "numeric" }
  const label = field.required
    ? t.requiredField({ label: humanizeFieldLabel(field.label) })
    : humanizeFieldLabel(field.label)
  const key = `${factor}-${field.label}`
  const withCompanion = (input: ReactElement): ReactElement | ReactElement[] =>
    "companion" in current && current.companion
      ? [input, renderCompanion(current.companion, field, methodVersion, key)]
      : input

  switch (current.kind) {
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
      return withCompanion(
        <FactorSegmentedInput
          key={key}
          label={label}
          value={field.value}
          onChange={field.onChange}
          options={current.options}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
        />,
      )
    case "chips": {
      const selected = field.selection?.selected ?? null
      return (
        <FactorChipsInput
          key={key}
          label={label}
          options={current.optionsFor(selected)}
          selected={selected}
          onSelectionChange={field.selection?.onChange ?? ignoreSelectionChange}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
          countLabel={CHIP_COUNT_LABEL}
          legacyCount={legacyCountOf(field)}
          filled={field.value.trim().length > 0}
        />
      )
    }
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
      return withCompanion(
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
        />,
      )
  }
}
