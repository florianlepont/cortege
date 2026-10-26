// Why custom: the F dendromicrohabitat rows need a counter of one line (48 pt) with a typeable count, where FactorCounterInput is a 110 to 130 pt shell; no native stepper offers both.
import { useMemo, useRef, useState } from "react"
import { AccessibilityActionEvent, StyleSheet, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandFontScaleCaps,
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppPressable } from "./AppPressable"
import { AppText as Text } from "./AppText"
import { useHoldRepeat } from "./useHoldRepeat"

// O-32-1: 48 pt until the owner's after timing on the phone settles 48 or 56 (plan 32-16 changes
// only this constant).
export const DMH_STEPPER_SIZE = 48

const MIN_TREES = 0
const MAX_TREES = 999

const t = fr.factorDetail.dmhList.stepper

type DmhCounterStepperProps = {
  /** The group label, used in the accessibility label. */
  label: string
  value: number
  /** A step from a button, a hold repeat or an accessibility action: already clamped. */
  onStep: (next: number) => void
  /** The text typed in the count field, passed as is (an empty text included). */
  onSubmitText: (text: string) => void
  editable?: boolean
  testID: string
}

/** Compact -/+ counter with a typeable count for a ticked dendromicrohabitat row (full counting
 * mode). One accessibility element (adjustable); the buttons and the count are hidden from it. */
export function DmhCounterStepper({
  label,
  value,
  onStep,
  onSubmitText,
  editable = true,
  testID,
}: DmhCounterStepperProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(String(value))
  const committedRef = useRef(false)
  const { start, stop } = useHoldRepeat({
    value,
    min: MIN_TREES,
    max: MAX_TREES,
    // A repeat that reaches a bound keeps ticking until release: only a real change goes up.
    onChange: (next) => {
      if (next !== value) onStep(next)
    },
  })

  const accessibilityLabel = t.label({ label })
  const accessibilityValue = { text: t.value({ trees: value }) }

  if (!editable) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={accessibilityValue}
        style={styles.row}
        testID={testID}
      >
        <View style={styles.countCell}>
          <Text
            maxFontSizeMultiplier={brandFontScaleCaps.label}
            style={styles.count}
            testID={`${testID}-value`}
          >
            {String(value)}
          </Text>
        </View>
      </View>
    )
  }

  const openEdit = (): void => {
    committedRef.current = false
    setDraftText(String(value))
    setEditing(true)
  }

  const commitEdit = (): void => {
    if (committedRef.current) return
    committedRef.current = true
    onSubmitText(draftText)
    setEditing(false)
  }

  const onAccessibilityAction = (event: AccessibilityActionEvent): void => {
    switch (event.nativeEvent.actionName) {
      case "increment":
        onStep(Math.min(MAX_TREES, value + 1))
        break
      case "decrement":
        if (value > MIN_TREES) onStep(value - 1)
        break
      case "activate":
        openEdit()
        break
    }
  }

  const atMin = value <= MIN_TREES

  return (
    <View
      accessible={!editing}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
      accessibilityHint={t.editHint}
      accessibilityActions={[
        { name: "increment", label: t.increment },
        { name: "decrement", label: t.decrement },
        { name: "activate" },
      ]}
      onAccessibilityAction={onAccessibilityAction}
      style={styles.row}
      testID={testID}
    >
      <View
        style={styles.row}
        importantForAccessibility={editing ? "auto" : "no-hide-descendants"}
        accessibilityElementsHidden={!editing}
      >
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t.decrement}
          accessibilityState={{ disabled: atMin }}
          onPressIn={() => {
            // Not the Pressable `disabled` prop: a button disabled mid-hold would never send its
            // press out and the repeat would run on. At 0 a press simply does nothing.
            if (!atMin) start(-1)
          }}
          onPressOut={stop}
          style={[styles.button, atMin && styles.disabled]}
          testID={`${testID}-decrease`}
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
            inputAccessoryViewButtonLabel={fr.common.actions.keyboardDone}
            maxFontSizeMultiplier={brandFontScaleCaps.input}
            autoFocus
            style={[styles.countCell, styles.count, styles.input]}
            testID={`${testID}-input`}
          />
        ) : (
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t.editHint}
            onPress={openEdit}
            style={styles.countCell}
            testID={`${testID}-value`}
          >
            <Text maxFontSizeMultiplier={brandFontScaleCaps.label} style={styles.count}>
              {String(value)}
            </Text>
          </AppPressable>
        )}

        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t.increment}
          onPressIn={() => start(1)}
          onPressOut={stop}
          style={styles.button}
          testID={`${testID}-increase`}
        >
          <Ionicons name="add-outline" size={22} color={theme.colors.forest} />
        </AppPressable>
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: brandSpacing4.sm,
    },
    button: {
      width: DMH_STEPPER_SIZE,
      height: DMH_STEPPER_SIZE,
      minHeight: DMH_STEPPER_SIZE,
      borderRadius: brandRadius.field,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.chip.fill,
      borderWidth: 1,
      borderColor: theme.visual.chip.border,
    },
    disabled: {
      opacity: brandInteraction.disabledOpacity,
    },
    countCell: {
      width: DMH_STEPPER_SIZE,
      height: DMH_STEPPER_SIZE,
      minHeight: DMH_STEPPER_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    count: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.sectionHeader.fontFamily,
      color: theme.colors.textPrimary,
      textAlign: "center",
    },
    input: {
      padding: 0,
    },
  })
}
