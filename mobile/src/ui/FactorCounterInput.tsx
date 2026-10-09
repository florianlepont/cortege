// Why custom: no native stepper with a typeable value, 56 pt glove-sized buttons and the brand look; the SwiftUI Stepper is iOS only.
import { useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, TextInput, View } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandInteraction, brandRadius, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { parseFiniteNumberInput } from "../app/number-utils"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { FactorInputShell, resolveFactorInputState } from "./FactorInputShell"
import { AppPressable } from "./AppPressable"

const BUTTON_SIZE = 56
const REPEAT_INTERVAL_MS = 120
const ACCELERATE_AFTER_TICKS = 6
const ACCELERATE_FURTHER_AFTER_TICKS = 15

const t = fr.factorInput.counter

type FactorCounterInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  touched: boolean
  onTouch: () => void
  error?: string | null
  min?: number
  max?: number
  step?: number
  testID?: string
}

/** FLOW-01 counter variant (C/D/E): -/+ 56pt targets with long-press acceleration. Tapping the
 * number itself opens a comma-accepting text fallback for values a tap count would be tedious for. */
export function FactorCounterInput({
  label,
  value,
  onChange,
  touched,
  onTouch,
  error,
  min = 0,
  max = 999,
  step = 1,
  testID,
}: FactorCounterInputProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(value)
  const currentRef = useRef<number>(parseFiniteNumberInput(value) ?? min)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const parsed = parseFiniteNumberInput(value)
    if (parsed !== null) currentRef.current = parsed
  }, [value])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const hasValue = value.trim().length > 0
  const showError = touched && Boolean(error)
  const state = resolveFactorInputState(hasValue, showError)

  const applyDelta = (delta: number): void => {
    const next = Math.min(max, Math.max(min, currentRef.current + delta))
    currentRef.current = next
    onChange(String(next))
  }

  const stopRepeat = (): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    onTouch()
  }

  const startRepeat = (delta: number): void => {
    applyDelta(delta)
    let ticks = 0
    intervalRef.current = setInterval(() => {
      ticks += 1
      const accelerated =
        ticks > ACCELERATE_FURTHER_AFTER_TICKS
          ? delta * 5
          : ticks > ACCELERATE_AFTER_TICKS
            ? delta * 2
            : delta
      applyDelta(accelerated)
    }, REPEAT_INTERVAL_MS)
  }

  const openEdit = (): void => {
    setDraftText(value)
    setEditing(true)
  }

  const commitEdit = (): void => {
    onChange(draftText)
    onTouch()
    setEditing(false)
  }

  return (
    <FactorInputShell
      label={label}
      state={state}
      errorText={showError ? error : null}
      testID={testID}
    >
      <View style={styles.row}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t.decrease({ label })}
          hitSlop={brandInteraction.hitTarget.min}
          onPressIn={() => startRepeat(-step)}
          onPressOut={stopRepeat}
          style={styles.button}
          testID={testID ? `${testID}-decrease` : undefined}
        >
          <Ionicons name="remove-outline" size={22} color={theme.colors.forest} />
        </AppPressable>

        {editing ? (
          <TextInput
            value={draftText}
            onChangeText={setDraftText}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            keyboardType="numeric"
            autoFocus
            style={styles.input}
            testID={testID ? `${testID}-input` : undefined}
          />
        ) : (
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t.editValue({ label, value: hasValue ? value : "0" })}
            onPress={openEdit}
            style={styles.valueWrap}
            testID={testID ? `${testID}-value` : undefined}
          >
            <Text style={styles.value}>{hasValue ? value : "0"}</Text>
          </AppPressable>
        )}

        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t.increase({ label })}
          hitSlop={brandInteraction.hitTarget.min}
          onPressIn={() => startRepeat(step)}
          onPressOut={stopRepeat}
          style={styles.button}
          testID={testID ? `${testID}-increase` : undefined}
        >
          <Ionicons name="add-outline" size={22} color={theme.colors.forest} />
        </AppPressable>
      </View>
    </FactorInputShell>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.sm,
    },
    button: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: brandRadius.field,
      minHeight: BUTTON_SIZE,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.chip.fill,
      borderWidth: 1,
      borderColor: theme.visual.chip.border,
    },
    valueWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: BUTTON_SIZE,
    },
    value: {
      fontSize: 30,
      lineHeight: 34,
      fontWeight: "800",
      color: theme.colors.textPrimary,
    },
    input: {
      ...brandTypography.input,
      flex: 1,
      textAlign: "center",
      fontSize: 30,
      lineHeight: 34,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      minHeight: BUTTON_SIZE,
    },
  })
}
