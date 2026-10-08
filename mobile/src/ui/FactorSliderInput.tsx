import { useMemo, useRef, useState } from "react"
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandInteraction, brandRadius, brandSpacing4 } from "../app/brand-tokens"
import { parseFiniteNumberInput } from "../app/number-utils"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { FactorInputShell, resolveFactorInputState } from "./FactorInputShell"
import { AppPressable } from "./AppPressable"

const t = fr.factorInput.slider
const TRACK_HEIGHT = 8
const THUMB_SIZE = 28

type FactorSliderInputProps = {
  label: string
  /** A 0-100 percent, as text. */
  value: string
  onChange: (value: string) => void
  touched: boolean
  onTouch: () => void
  error?: string | null
  step?: number
  testID?: string
}

const clampPercent = (raw: number, step: number): number => {
  const stepped = Math.round(raw / step) * step
  return Math.min(100, Math.max(0, stepped))
}

/** FLOW-01 slider variant (G, 5% steps): a draggable/tappable track, plus +/- step buttons so the
 * field stays usable without fine gesture control (gloves, direct sunlight). */
export function FactorSliderInput({
  label,
  value,
  onChange,
  touched,
  onTouch,
  error,
  step = 5,
  testID,
}: FactorSliderInputProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [trackWidth, setTrackWidth] = useState(0)
  const trackWidthRef = useRef(0)

  const percent = parseFiniteNumberInput(value) ?? 0
  const hasValue = value.trim().length > 0
  const showError = touched && Boolean(error)
  const state = resolveFactorInputState(hasValue, showError)

  const handleLayout = (event: LayoutChangeEvent): void => {
    const width = event.nativeEvent.layout.width
    trackWidthRef.current = width
    setTrackWidth(width)
  }

  const updateFromLocationX = (locationX: number): void => {
    if (trackWidthRef.current <= 0) return
    const ratio = locationX / trackWidthRef.current
    onChange(String(clampPercent(ratio * 100, step)))
  }

  const applyStep = (delta: number): void => {
    onChange(String(clampPercent(percent + delta, step)))
    onTouch()
  }

  const thumbLeft = trackWidth > 0 ? (Math.min(100, Math.max(0, percent)) / 100) * trackWidth : 0

  return (
    <FactorInputShell
      label={t.fieldLabel({ label, percent })}
      state={state}
      errorText={showError ? error : null}
      testID={testID}
    >
      <View style={styles.row}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t.decrease({ label })}
          hitSlop={brandInteraction.hitTarget.min}
          onPress={() => applyStep(-step)}
          style={styles.stepButton}
          testID={testID ? `${testID}-decrease` : undefined}
        >
          <Ionicons name="remove-outline" size={18} color={theme.colors.forest} />
        </AppPressable>

        <View
          onLayout={handleLayout}
          style={styles.track}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t.valueLabel({ label, percent })}
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "increment") applyStep(step)
            if (event.nativeEvent.actionName === "decrement") applyStep(-step)
          }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(event: GestureResponderEvent) =>
            updateFromLocationX(event.nativeEvent.locationX)
          }
          onResponderMove={(event: GestureResponderEvent) =>
            updateFromLocationX(event.nativeEvent.locationX)
          }
          onResponderRelease={onTouch}
          testID={testID ? `${testID}-track` : undefined}
        >
          <View style={styles.trackFill} pointerEvents="none">
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, percent))}%` }]} />
          </View>
          <View style={[styles.thumb, { left: Math.max(0, thumbLeft - THUMB_SIZE / 2) }]} />
        </View>

        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t.increase({ label })}
          hitSlop={brandInteraction.hitTarget.min}
          onPress={() => applyStep(step)}
          style={styles.stepButton}
          testID={testID ? `${testID}-increase` : undefined}
        >
          <Ionicons name="add-outline" size={18} color={theme.colors.forest} />
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
      gap: brandSpacing4.sm,
    },
    stepButton: {
      width: 44,
      height: 44,
      borderRadius: brandRadius.field,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.chip.fill,
      borderWidth: 1,
      borderColor: theme.visual.chip.border,
    },
    track: {
      flex: 1,
      height: 44,
      justifyContent: "center",
    },
    trackFill: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: theme.visual.score.track,
      overflow: "hidden",
    },
    fill: {
      height: TRACK_HEIGHT,
      // D-16: the brand moss fails the 3:1 graphic contrast on light surfaces, the score green
      // (#728A2D in light) holds it.
      backgroundColor: theme.visual.score.high,
    },
    thumb: {
      position: "absolute",
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: theme.semanticColors.ctaPrimary,
      top: 22 - THUMB_SIZE / 2,
    },
  })
}
