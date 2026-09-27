import { Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import {
  brandColors,
  brandComponentTokens,
  brandRadius,
  brandSpacing4,
  brandTypography,
} from "../app/brand-tokens"
import { FactorInputShell, resolveFactorInputState } from "./FactorInputShell"

export type FactorSegmentedOption = { value: string; label: string }

type FactorSegmentedInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly FactorSegmentedOption[]
  touched: boolean
  onTouch: () => void
  error?: string | null
  testID?: string
}

/** FLOW-01 segmented-control variant (H, 0/2/5 only — BUG-2): a single-select row of pills. */
export function FactorSegmentedInput({
  label,
  value,
  onChange,
  options,
  touched,
  onTouch,
  error,
  testID,
}: FactorSegmentedInputProps) {
  const hasValue = value.trim().length > 0
  const showError = touched && Boolean(error)
  const state = resolveFactorInputState(hasValue, showError)

  return (
    <FactorInputShell
      label={label}
      state={state}
      errorText={showError ? error : null}
      testID={testID}
    >
      <View style={styles.row}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, checked: active }}
              accessibilityLabel={option.label}
              onPress={() => {
                onChange(option.value)
                onTouch()
              }}
              style={[styles.segment, active ? styles.segmentActive : null]}
              testID={testID ? `${testID}-${option.value}` : undefined}
            >
              <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </FactorInputShell>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: brandSpacing4.xs,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: brandRadius.field,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: brandSpacing4.sm,
    backgroundColor: brandComponentTokens.choiceChip.background,
    borderWidth: 1,
    borderColor: brandComponentTokens.choiceChip.border,
  },
  segmentActive: {
    backgroundColor: brandComponentTokens.choiceChip.activeBackground,
    borderColor: brandComponentTokens.choiceChip.activeBorder,
  },
  segmentText: {
    ...brandTypography.meta,
    color: brandColors.forest,
    textAlign: "center",
  },
  segmentTextActive: {
    color: brandComponentTokens.choiceChip.activeText,
  },
})
