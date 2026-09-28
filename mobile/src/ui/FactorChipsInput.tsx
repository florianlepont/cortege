import { useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { brandSpacing4, brandTypography } from "../app/brand-tokens"
import { parseFiniteNumberInput } from "../app/number-utils"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppChoiceChip } from "./AppChoiceChip"
import { FactorInputShell, resolveFactorInputState } from "./FactorInputShell"

export type FactorChipOption = { value: string; label: string }

type FactorChipsInputProps = {
  label: string
  /** The derived count, as text (what the field actually stores/sends). */
  value: string
  /** Called with the next derived count, as text, whenever the selection changes. */
  onChange: (nextCountText: string) => void
  options: readonly FactorChipOption[]
  touched: boolean
  onTouch: () => void
  error?: string | null
  countLabel: (count: number) => string
  testID?: string
}

/**
 * FLOW-01 chips variant (B/I/J, generically reusable for Phase 5's factor-A genus list too): the
 * domain package only ever reads the derived count (packages/ibp-domain/src/rules/common.ts), not
 * which options were checked, so this component owns its own selection state — initialized once
 * from the incoming count (the first N options are pre-checked) and tracked locally afterward.
 * Remount with a new `key` when switching to a different factor or draft.
 */
export function FactorChipsInput({
  label,
  value,
  onChange,
  options,
  touched,
  onTouch,
  error,
  countLabel,
  testID,
}: FactorChipsInputProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initialCount = Math.max(
      0,
      Math.min(options.length, Math.round(parseFiniteNumberInput(value) ?? 0)),
    )
    return new Set(options.slice(0, initialCount).map((option) => option.value))
  })

  const hasValue = value.trim().length > 0
  const showError = touched && Boolean(error)
  const state = resolveFactorInputState(hasValue, showError)

  const toggle = (optionValue: string): void => {
    const next = new Set(selected)
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    setSelected(next)
    onChange(String(next.size))
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
            active={selected.has(option.value)}
            onPress={() => toggle(option.value)}
          />
        ))}
      </View>
      <Text style={styles.countText}>{countLabel(selected.size)}</Text>
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
