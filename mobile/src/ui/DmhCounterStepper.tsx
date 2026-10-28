// Why custom: the F dendromicrohabitat rows need a counter of one line (48 pt) with a typeable count, where FactorCounterInput is a 110 to 130 pt shell; no native stepper offers both. The SwiftUI Stepper was rejected: its value cannot be typed and its targets are 32 pt.
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
import { feedback } from "./feedback"
import { useHoldRepeat } from "./useHoldRepeat"

// O-32-1: 48 pt, validated by the owner at plan 32-09 on 2026-10-27; one constant shared by the
// stepper and the row's +. Redesign 32-18 (A-I3): the stepper is one 112 x 48 capsule of two 56 x 48
// segments (the same 48 pt glove height), the count is plain text to its left.
export const DMH_STEPPER_SIZE = 48
const SEGMENT_WIDTH = 56
const COUNT_MIN_WIDTH = 44
const GLYPH_SIZE = 22
const SEGMENT_DIVIDER_HEIGHT = 24

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
  /**
   * The highest count, for the capped survey mode where a group holds at most 2 trees per hectare.
   * Absent: the counted-in-full bound (999). With it the "+" does nothing at the bound and the
   * spoken value and hint name the cap and the unit.
   */
  max?: number
  testID: string
}

/** Compact -/+ counter with a typeable count for a ticked dendromicrohabitat row (counting modes). One accessibility element (adjustable); the buttons and the count are hidden from it. */
export function DmhCounterStepper({
  label,
  value,
  onStep,
  onSubmitText,
  editable = true,
  max,
  testID,
}: DmhCounterStepperProps) {
  const upper = max ?? MAX_TREES
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(String(value))
  const committedRef = useRef(false)
  const { begin, end, tap } = useHoldRepeat({
    value,
    min: MIN_TREES,
    max: upper,
    // A repeat that reaches a bound keeps ticking until release: only a real change goes up. The
    // selection haptic is for a tap and the first step of a hold, never for the repeats.
    onChange: (next, kind) => {
      if (next === value) return
      if (kind !== "repeat") feedback.selection()
      onStep(next)
    },
  })

  const accessibilityLabel = t.label({ label })
  const accessibilityValue = {
    text: max === undefined ? t.value({ trees: value }) : t.valueCapped({ trees: value, max }),
  }
  const editHint = max === undefined ? t.editHint : t.editHintCapped({ max })

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
        if (value < upper) onStep(value + 1)
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
  const atMax = value >= upper

  return (
    <View
      accessible={!editing}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
      accessibilityHint={editHint}
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
            disableScale
            disableRipple
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

        <View style={styles.capsule}>
          <AppPressable
            disableScale
            disableRipple
            accessibilityRole="button"
            accessibilityLabel={t.decrement}
            accessibilityState={{ disabled: atMin }}
            onPressIn={() => {
              // Not the Pressable `disabled` prop: a button disabled mid-hold would never send its
              // press out and the repeat would run on. At 0 a press simply does nothing.
              if (atMin) return
              begin(-1)
            }}
            onPressOut={end}
            onPress={() => tap(-1)}
            style={({ pressed }) => [
              styles.segment,
              pressed && !atMin ? styles.segmentPressed : null,
            ]}
            testID={`${testID}-decrease`}
          >
            <Ionicons
              name="remove-outline"
              size={GLYPH_SIZE}
              color={theme.semanticColors.ctaPrimary}
              style={atMin ? styles.disabledGlyph : undefined}
            />
          </AppPressable>
          <View style={styles.segmentDivider} />
          <AppPressable
            disableScale
            disableRipple
            accessibilityRole="button"
            accessibilityLabel={t.increment}
            accessibilityState={{ disabled: atMax }}
            onPressIn={() => {
              // Like "-" at 0: at the bound a press does nothing.
              if (atMax) return
              begin(1)
            }}
            onPressOut={end}
            onPress={() => tap(1)}
            style={({ pressed }) => [
              styles.segment,
              pressed && !atMax ? styles.segmentPressed : null,
            ]}
            testID={`${testID}-increase`}
          >
            <Ionicons
              name="add-outline"
              size={GLYPH_SIZE}
              color={theme.semanticColors.ctaPrimary}
              style={atMax ? styles.disabledGlyph : undefined}
            />
          </AppPressable>
        </View>
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
    // One capsule of two halves, clipped so a pressed half takes the capsule's curve.
    capsule: {
      width: 2 * SEGMENT_WIDTH,
      height: DMH_STEPPER_SIZE,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: brandRadius.pill,
      overflow: "hidden",
      backgroundColor: theme.visual.control.fill,
    },
    segment: {
      width: SEGMENT_WIDTH,
      height: DMH_STEPPER_SIZE,
      minHeight: DMH_STEPPER_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentPressed: {
      backgroundColor: theme.colors.surfaceSoft,
    },
    segmentDivider: {
      width: 1,
      height: SEGMENT_DIVIDER_HEIGHT,
      backgroundColor: theme.colors.divider,
    },
    // The disabled "-" at 0 or "+" at the cap: the glyph alone dims, the capsule keeps its fill.
    disabledGlyph: {
      opacity: brandInteraction.disabledOpacity,
    },
    countCell: {
      minWidth: COUNT_MIN_WIDTH,
      height: DMH_STEPPER_SIZE,
      minHeight: DMH_STEPPER_SIZE,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    count: {
      ...brandTypeScale.title3,
      fontFamily: brandTypography.screenTitle.fontFamily,
      color: theme.colors.textPrimary,
      textAlign: "right",
    },
    // The typed count: same metrics as the plain count, a 2 pt underline while editing.
    input: {
      padding: 0,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.inputBorder,
    },
  })
}
