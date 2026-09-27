import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import {
  brandColors,
  brandFieldState,
  brandRadius,
  brandSpacing4,
  brandTypography,
} from "../app/brand-tokens"

/**
 * The three states every FactorInput variant can render (FLOW-02): empty is neutral (never
 * alarming before the user has done anything), error only shows once the caller has decided the
 * field was touched or submission was attempted, complete is a distinct, non-alarming moss.
 */
export type FactorInputState = "empty" | "error" | "complete"

export function resolveFactorInputState(hasValue: boolean, showError: boolean): FactorInputState {
  if (showError) return "error"
  if (hasValue) return "complete"
  return "empty"
}

type FactorInputShellProps = {
  label: string
  state: FactorInputState
  errorText?: string | null
  helperText?: string | null
  children: ReactNode
  testID?: string
}

/** Shared label + tri-state border/icon/error shell every FactorInput variant renders inside. */
export function FactorInputShell({
  label,
  state,
  errorText,
  helperText,
  children,
  testID,
}: FactorInputShellProps) {
  const tone = brandFieldState[state]

  return (
    <View
      style={[styles.container, { borderColor: tone.border, backgroundColor: tone.background }]}
      testID={testID}
    >
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: tone.text }]}>{label}</Text>
        {state === "complete" ? (
          <Ionicons name="checkmark-circle" size={18} color={tone.icon} />
        ) : null}
        {state === "error" ? <Ionicons name="alert-circle" size={18} color={tone.icon} /> : null}
      </View>
      {children}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      {state === "error" && errorText ? (
        <Text style={[styles.errorText, { color: tone.text }]}>{errorText}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: brandRadius.field,
    padding: brandSpacing4.md,
    gap: brandSpacing4.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: brandSpacing4.sm,
  },
  label: {
    ...brandTypography.label,
    flexShrink: 1,
  },
  helperText: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
  },
  errorText: {
    ...brandTypography.meta,
    fontWeight: "700",
  },
})
