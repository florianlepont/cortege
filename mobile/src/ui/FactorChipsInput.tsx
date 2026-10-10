// Why custom: multi-select chips with a per-choice score have no native control (Picker is single select, Menu hides the choices).
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { brandSpacing4, brandTypography } from "../app/brand-tokens"
import { fr } from "../i18n"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppChoiceChip } from "./AppChoiceChip"
import { FactorInputShell, resolveFactorInputState } from "./FactorInputShell"

export type FactorChipOption = { value: string; label: string }

type FactorChipsInputProps = {
  label: string
  options: readonly FactorChipOption[]
  /** The stored codes, or null when none is recorded (a draft saved before phase 25.1). */
  selected: readonly string[] | null
  /** Called with the next selection, in option order, on every tick or untick. */
  onSelectionChange: (next: string[]) => void
  touched: boolean
  onTouch: () => void
  error?: string | null
  countLabel: (count: number) => string
  /** The count ticked before the detail was stored; read only while `selected` is null. */
  legacyCount?: number | null
  /** Forces the filled shell state (a recorded zero for I or J has an empty selection). */
  filled?: boolean
  testID?: string
}

/**
 * FLOW-01 chips variant (B/I/J, and the optional F/H companions): controlled by the selection the
 * survey stores since phase 25.1 (D-12), so reopening a factor shows exactly what was ticked. A
 * draft saved before that holds a count and no selection: no chip is ticked, a line says how many
 * were, and the first tap starts a real selection.
 */
export function FactorChipsInput({
  label,
  options,
  selected,
  onSelectionChange,
  touched,
  onTouch,
  error,
  countLabel,
  legacyCount,
  filled,
  testID,
}: FactorChipsInputProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const hasValue = filled ?? (selected?.length ?? 0) > 0
  const showError = touched && Boolean(error)
  const state = resolveFactorInputState(hasValue, showError)
  const countText =
    selected === null && (legacyCount ?? 0) > 0
      ? fr.factorInput.chips.legacyCount({ count: legacyCount ?? 0 })
      : countLabel(selected?.length ?? 0)

  const toggle = (optionValue: string): void => {
    const next = new Set(selected ?? [])
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    onSelectionChange(options.filter((option) => next.has(option.value)).map((o) => o.value))
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
        {options.map((option) => (
          <AppChoiceChip
            key={option.value}
            label={option.label}
            active={selected?.includes(option.value) ?? false}
            onPress={() => toggle(option.value)}
          />
        ))}
      </View>
      <Text style={styles.countText}>{countText}</Text>
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
