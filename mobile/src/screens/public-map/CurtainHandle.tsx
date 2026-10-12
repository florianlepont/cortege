import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, View, type AccessibilityActionEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import {
  clampLine,
  edgeExitKeeps,
  lineFromPercent,
  linePercent,
  stepLinePercent,
} from "../../map/wipe-geometry"
import { GlassSurface } from "../../ui/GlassSurface"

/** The strip that owns the pan gesture, and the round knob in it (UI-SPEC section 5). */
export const HANDLE_WIDTH = 44
export const KNOB_SIZE = 44
/** The knob sits at 32 % of the window height, above the area an open card could cover. */
export const KNOB_HEIGHT_RATIO = 0.32
/** The line moves by this many points of the width for an accessibility increment or decrement. */
export const LINE_STEP_PERCENT = 10
const KNOB_GLYPH_SIZE = 22

/** The y of the knob's centre for a window of `height`: the side tags are centred on it too. */
export function knobCenterY(height: number): number {
  return Math.round(height * KNOB_HEIGHT_RATIO)
}

export type CurtainSideAction = "left" | "right"

export type CurtainHandleProps = {
  /** The line's x, in points from the left edge (the clip hook owns it, this writes it). */
  lineX: SharedValue<number>
  /** The width of the map area. */
  width: number
  /** The height of the window the handle covers: the knob is placed from it. */
  height: number
  /** Where the drawn line starts (the top safe area). */
  lineTop?: number
  /** Short names of the two layers, for the screen reader value. */
  leftName: string
  rightName: string
  /** The line was let go at `x`, away from the edges: the comparison stays. */
  onMoveLine: (x: number) => void
  /** The line was let go near an edge: the comparison ends keeping side A or B. */
  onEdgeExit: (keeps: "A" | "B") => void
  /** Accessibility: next (1) or previous (-1) layer for a side. */
  onSideAction: (side: CurtainSideAction, direction: 1 | -1) => void
  /** Accessibility: quit the comparison (keeps side A, like the pill). */
  onQuit: () => void
}

const ACTIONS = [
  { name: "increment" },
  { name: "decrement" },
  { name: "leftNext", label: fr.mapLayers.compare.actionLeftNext },
  { name: "leftPrevious", label: fr.mapLayers.compare.actionLeftPrevious },
  { name: "rightNext", label: fr.mapLayers.compare.actionRightNext },
  { name: "rightPrevious", label: fr.mapLayers.compare.actionRightPrevious },
  { name: "quit", label: fr.mapLayers.compare.exit },
]

/**
 * The comparison line (UI-SPEC sections 4 and 5, sketch 017 A): a 44 pt strip over the full map
 * height that owns the pan, with the 4 pt line (a white core between two graphite edges) and a
 * round glass knob. Dragging writes the clamped position straight to `lineX` on the UI thread (22 pt
 * from each edge, no snap, no haptic); on release in the outer fifth of the width the comparison ends
 * (`onEdgeExit`), else `onMoveLine` reports the position. The strip is `adjustable`: increment
 * and decrement move the line by 10 points of the width, and custom actions change either side's
 * layer or quit, the screen reader alternative to swiping a side.
 */
export const CurtainHandle = memo(function CurtainHandle({
  lineX,
  width,
  height,
  lineTop = 0,
  leftName,
  rightName,
  onMoveLine,
  onEdgeExit,
  onSideAction,
  onQuit,
}: CurtainHandleProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const startX = useSharedValue(0)
  // The JS-side copy of the line position, for the screen reader value only.
  const [percent, setPercent] = useState(() => linePercent(lineX.value, width))

  useEffect(() => {
    setPercent(linePercent(lineX.value, width))
  }, [lineX, width])

  const position = useAnimatedStyle(() => ({ left: lineX.value - HANDLE_WIDTH / 2 }))

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startX.value = lineX.value
        })
        .onUpdate((event) => {
          lineX.value = clampLine(startX.value + event.translationX, width)
        })
        .onEnd(() => {
          const x = lineX.value
          const keeps = edgeExitKeeps(x, width)
          if (keeps === null) {
            runOnJS(onMoveLine)(x)
          } else {
            runOnJS(onEdgeExit)(keeps)
          }
          runOnJS(setPercent)(linePercent(x, width))
        }),
    [lineX, onEdgeExit, onMoveLine, startX, width],
  )

  const step = useCallback(
    (delta: number) => {
      const next = lineFromPercent(stepLinePercent(linePercent(lineX.value, width), delta), width)
      lineX.value = next
      setPercent(linePercent(next, width))
      onMoveLine(next)
    },
    [lineX, onMoveLine, width],
  )

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      switch (event.nativeEvent.actionName) {
        case "increment":
          step(LINE_STEP_PERCENT)
          break
        case "decrement":
          step(-LINE_STEP_PERCENT)
          break
        case "leftNext":
          onSideAction("left", 1)
          break
        case "leftPrevious":
          onSideAction("left", -1)
          break
        case "rightNext":
          onSideAction("right", 1)
          break
        case "rightPrevious":
          onSideAction("right", -1)
          break
        case "quit":
          onQuit()
          break
        default:
          break
      }
    },
    [onQuit, onSideAction, step],
  )

  const knobTop = knobCenterY(height) - lineTop - KNOB_SIZE / 2

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID="curtain-handle"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={fr.mapLayers.compare.handleA11yLabel}
        accessibilityHint={fr.mapLayers.compare.handleA11yHint}
        accessibilityValue={{
          text: fr.mapLayers.compare.handleA11yValue({
            left: leftName,
            right: rightName,
            percent: Math.round(percent),
          }),
        }}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={onAccessibilityAction}
        style={[styles.strip, { top: lineTop, height: height - lineTop }, position]}
      >
        <View style={styles.line} pointerEvents="none">
          <View style={styles.edge} />
          <View style={styles.core} />
          <View style={styles.edge} />
        </View>
        <GlassSurface
          tone="auto"
          pointerEvents="none"
          surface={theme.visual.mapControl.glass}
          style={[styles.knob, { top: knobTop }]}
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={KNOB_GLYPH_SIZE}
            color={theme.visual.mapControl.icon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </GlassSurface>
      </Animated.View>
    </GestureDetector>
  )
})

function createStyles(theme: BrandTheme) {
  const { curtain, mapControl } = theme.visual
  return StyleSheet.create({
    strip: {
      position: "absolute",
      width: HANDLE_WIDTH,
      alignItems: "center",
    },
    // 1 pt graphite edge, 2 pt white core, 1 pt graphite edge: 4 pt wide.
    line: { flex: 1, width: 4, flexDirection: "row" },
    edge: { width: 1, backgroundColor: curtain.edge },
    core: { width: 2, backgroundColor: curtain.line },
    knob: {
      position: "absolute",
      width: KNOB_SIZE,
      height: KNOB_SIZE,
      borderRadius: KNOB_SIZE / 2,
      borderWidth: 1,
      borderColor: mapControl.hairline,
      alignItems: "center",
      justifyContent: "center",
    },
  })
}
