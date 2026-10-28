// Why custom: native @expo/ui Slider is iOS only (excluded from Android autolinking) and has no brand track; evaluation in docs/design/component-inventory-phase-23.md 9. The typed value is the NumberRow over it (`PercentRow`).
import { useEffect, useMemo, useRef, useState } from "react"
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from "react-native"
import { brandSpacing4 } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../AppText"
import { feedback } from "../feedback"
import { useScrollLock } from "../ScrollLockContext"
import { createValueRowStyles } from "./value-rows.styles"

const t = fr.factorDetail.valueRows.slider
const TRACK_HEIGHT = 8
const THUMB_SIZE = 28
const TOUCH_HEIGHT = 44
/** The coarse step of the screen reader's slider actions. */
const ACCESSIBILITY_STEP = 5
/** The selection tick falls when a drag crosses a multiple of this many percent. */
export const TICK_EVERY_PERCENT = 5

/** The track maps a touch to a percent on its step (1 or 5), 0 to 100. */
export const percentAt = (locationX: number, width: number, step = 1): number =>
  width <= 0 ? 0 : Math.min(100, Math.max(0, Math.round(((locationX / width) * 100) / step) * step))

/** True when moving from one percent to the other crosses a multiple of the tick spacing. */
export const crossesTick = (from: number, to: number): boolean =>
  Math.floor(from / TICK_EVERY_PERCENT) !== Math.floor(to / TICK_EVERY_PERCENT)

type PercentTrackRowProps = {
  /** The spoken name of the track. */
  label: string
  /** The value, 0 to 100 (an empty field reads 0). */
  percent: number
  /** What a drag or a tap snaps to: 1 for G, 5 for A's cover and B's strata. */
  step: number
  /** True: the "0 %" and "100 %" ends are named over the track (G). */
  showEnds?: boolean
  onChangePercent: (percent: number) => void
  /** The finger left the track: the form may now show its error. */
  onTouch: () => void
  testID: string
}

/**
 * The draggable track of the percent rows (A's cover, B's strata cover, G), the lower half of a
 * `PercentRow`. A drag or a tap sets the percent on the row's step. Haptic: one selection tick when
 * the move crosses a multiple of 5, never one per percent, none on release. A screen reader moves it
 * by 5.
 *
 * Follow-up 32-33: the track keeps the touch for itself. It claims the responder in the capture
 * phase (start and move), refuses to hand it back, and holds the pages that scroll around it still
 * (`useScrollLock`) from the touch down to the release, so dragging the thumb never slides the view.
 */
export function PercentTrackRow({
  label,
  percent,
  step,
  showEnds = false,
  onChangePercent,
  onTouch,
  testID,
}: PercentTrackRowProps) {
  const theme = useBrandTheme()
  const rowStyles = useMemo(() => createValueRowStyles(theme), [theme])
  const styles = useMemo(() => createStyles(theme), [theme])
  const setScrollLocked = useScrollLock()
  const [trackWidth, setTrackWidth] = useState(0)
  const widthRef = useRef(0)
  const lastRef = useRef(percent)
  lastRef.current = percent

  // A track that goes away mid-drag (the page changes) must not leave the pages locked.
  useEffect(() => () => setScrollLocked(false), [setScrollLocked])

  const apply = (next: number): void => {
    if (next === lastRef.current) return
    if (crossesTick(lastRef.current, next)) feedback.selection()
    lastRef.current = next
    onChangePercent(next)
  }

  const onLayout = (event: LayoutChangeEvent): void => {
    widthRef.current = event.nativeEvent.layout.width
    setTrackWidth(event.nativeEvent.layout.width)
  }

  const fromTouch = (event: GestureResponderEvent): number =>
    percentAt(event.nativeEvent.locationX, widthRef.current, step)

  const held = Math.min(100, Math.max(0, percent))
  const thumbLeft = trackWidth > 0 ? (held / 100) * trackWidth : 0

  return (
    <View style={rowStyles.trackRow} testID={`${testID}-row`}>
      {showEnds ? (
        <View style={rowStyles.trackEnds} accessible={false} importantForAccessibility="no">
          <Text style={rowStyles.trackEnd}>{t.min}</Text>
          <Text style={rowStyles.trackEnd}>{t.max}</Text>
        </View>
      ) : null}
      <View
        onLayout={onLayout}
        style={styles.touch}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t.a11yLabel({ label, percent: held })}
        accessibilityHint={t.a11yHint}
        accessibilityValue={{ min: 0, max: 100, now: held }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName
          if (name === "increment") apply(Math.min(100, held + ACCESSIBILITY_STEP))
          if (name === "decrement") apply(Math.max(0, held - ACCESSIBILITY_STEP))
          onTouch()
        }}
        onStartShouldSetResponder={() => true}
        onStartShouldSetResponderCapture={() => true}
        onMoveShouldSetResponder={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event: GestureResponderEvent) => {
          setScrollLocked(true)
          apply(fromTouch(event))
        }}
        onResponderMove={(event: GestureResponderEvent) => apply(fromTouch(event))}
        onResponderRelease={() => {
          setScrollLocked(false)
          onTouch()
        }}
        onResponderTerminate={() => setScrollLocked(false)}
        testID={`${testID}-track`}
      >
        <View style={styles.rail} pointerEvents="none">
          <View style={[styles.fill, { width: `${held}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: Math.max(0, thumbLeft - THUMB_SIZE / 2) }]}
        />
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    touch: {
      height: TOUCH_HEIGHT,
      justifyContent: "center",
      marginBottom: brandSpacing4.xs,
    },
    rail: {
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
      top: TOUCH_HEIGHT / 2 - THUMB_SIZE / 2,
    },
  })
}
