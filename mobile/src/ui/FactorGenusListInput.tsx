import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { CNPF_FACTOR_A_GENUS_CODES, type CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { AppText as Text } from "./AppText"
import { brandSpacing4, brandTypography } from "../app/brand-tokens"
import { parseGenusListValue, toggleGenusInListValue } from "../app/factor-a-genus-list"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppChoiceChip } from "./AppChoiceChip"
import { FactorInputShell, resolveFactorInputState } from "./FactorInputShell"

type FactorGenusListInputProps = {
  label: string
  /** Comma-joined CNPF genus codes - the shape FactorField.value uses everywhere (a plain string). */
  value: string
  onChange: (nextValue: string) => void
  touched: boolean
  onTouch: () => void
  error?: string | null
  testID?: string
}

/**
 * Factor A's genus list (Phase 5's data contract, this phase's UI): unlike FactorChipsInput, each
 * chip is a specific genus's own identity, not an interchangeable option counted toward a derived
 * total - a recognition suggestion (Phase 6) must be able to add one specific genus into whatever
 * is already selected, and reopening a draft must show the same genera again.
 */
export function FactorGenusListInput({
  label,
  value,
  onChange,
  touched,
  onTouch,
  error,
  testID,
}: FactorGenusListInputProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const selected = new Set(parseGenusListValue(value))
  const hasValue = selected.size > 0
  const showError = touched && Boolean(error)
  const state = resolveFactorInputState(hasValue, showError)

  const toggle = (genus: CnpfFactorAGenusCode): void => {
    onChange(toggleGenusInListValue(value, genus))
    onTouch()
  }

  return (
    <FactorInputShell
      label={label}
      state={state}
      errorText={showError ? error : null}
      testID={testID}
    >
      <View style={styles.row}>
        {CNPF_FACTOR_A_GENUS_CODES.map((genus) => (
          <AppChoiceChip
            key={genus}
            label={fr.genus.displayName[genus]}
            active={selected.has(genus)}
            onPress={() => toggle(genus)}
          />
        ))}
      </View>
      <Text style={styles.countText}>
        {fr.factorInput.chips.selectedCount({ count: selected.size })}
      </Text>
    </FactorInputShell>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.xs,
    },
    countText: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
