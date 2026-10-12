import { memo, useCallback, useMemo } from "react"
import { StyleSheet, View, type AccessibilityActionEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { brandMotion } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { edgeExitCue, SPRINGBACK_MS } from "../../map/swipe-machine"
import { clampLine, edgeExitKeeps } from "../../map/wipe-geometry"
import { feedback } from "../../ui/feedback"

/** The grab zone: 44 x 44 pt centred on the bar, the only part of the line that takes a touch. */
export const GRABBER_HIT = 44
/** The bar itself: 4 pt wide, 36 pt tall (UI-SPEC section 5), plus its 1 pt graphite edge. */
export const GRABBER_WIDTH = 4
export const GRABBER_LENGTH = 36
const GRABBER_EDGE = 1
/** The grabber and the side tags sit at the vertical centre of the window (owner, 2026-10-12). */
export const GRABBER_HEIGHT_RATIO = 0.5

/** The y of the grabber's centre for a window of `height`: the side tags are centred on it too. */
export function grabberCenterY(height: number): number {
  return Math.round(height * GRABBER_HEIGHT_RATIO)
}

export type CompareGrabberProps = {
  /** The line's x, in points from the left edge (the clip hook owns it, this writes it). */
  lineX: SharedValue<number>
  /** The width of the map area. */
  width: number
  /** The height of the window the grabber covers: it is placed from it. */
  height: number
  /** Short names of the two layers, for the screen reader value. */
  leftName: string
  rightName: string
  /**
   * The line entered an edge exit zone (the layer a release there keeps: "B" at the left edge, "A"
   * at the right edge) or left it (null); also null once the drag ends, whatever its outcome.
   */
  onExitZone: (keeps: "A" | "B" | null) => void
  /** The line was let go in an edge zone, or an accessibility action: quit keeping side A or B. */
  onEdgeExit: (keeps: "A" | "B") => void
  /** A drag of the grabber began (true) or ended, whatever its outcome (false): the tags take no touch. */
  onDragging: (dragging: boolean) => void
}

const ACTIONS = [
  { name: "increment", label: fr.mapLayers.compare.actionKeepLeft },
  { name: "decrement", label: fr.mapLayers.compare.actionKeepRight },
]

// The tick of entering an exit zone; a plain function so the UI thread can hand it to the JS thread.
function playZoneTick() {
  feedback.selection()
}

/**
 * The slim grabber of the comparison line (UI-SPEC sections 4 and 5, owner item 13 b corrected): a
 * 4 x 36 pt white bar with the line's graphite edge, no glass and no icon, in a 44 x 44 pt hit area.
 * The line can be dragged only as an exit gesture. It follows the finger within 22 pt of the edges;
 * entering an edge zone (the outer fifth on each side) plays one tick and reports the zone; let go
 * in a zone, the comparison ends keeping the layer opposite to the edge (`onEdgeExit`); let go
 * elsewhere, or when the gesture is cancelled, the line springs back to the centre in 240 ms with no
 * haptic and never exits. The grabber is `adjustable`: its two actions quit keeping side A or B.
 */
export const CompareGrabber = memo(function CompareGrabber({
  lineX,
  width,
  height,
  leftName,
  rightName,
  onExitZone,
  onEdgeExit,
  onDragging,
}: CompareGrabberProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const startX = useSharedValue(0)
  // The zone the line is in (the layer a release there keeps), written on the UI thread.
  const zone = useSharedValue<"A" | "B" | null>(null)

  const position = useAnimatedStyle(() => ({ left: lineX.value - GRABBER_HIT / 2 }))

  const pan = useMemo(() => {
    const springBack = () => {
      "worklet"
      zone.value = null
      lineX.value = withTiming(width / 2, {
        duration: SPRINGBACK_MS,
        easing: Easing.bezier(...brandMotion.easings.standard),
        reduceMotion: ReduceMotion.System,
      })
      runOnJS(onExitZone)(null)
    }
    return Gesture.Pan()
      .onBegin(() => {
        // Grabbing the line while it springs back takes it over where it is.
        cancelAnimation(lineX)
        startX.value = lineX.value
        zone.value = null
        runOnJS(onDragging)(true)
      })
      .onUpdate((event) => {
        const x = clampLine(startX.value + event.translationX, width)
        lineX.value = x
        const next = edgeExitKeeps(x, width)
        if (next === zone.value) return
        const cue = edgeExitCue(zone.value, next)
        zone.value = next
        runOnJS(onExitZone)(next)
        if (cue === "tick") runOnJS(playZoneTick)()
      })
      .onEnd((_event, success) => {
        // A cancelled gesture is left to onFinalize: it never exits.
        if (!success) return
        const keeps = edgeExitKeeps(lineX.value, width)
        if (keeps === null) {
          springBack()
          return
        }
        zone.value = null
        runOnJS(onExitZone)(null)
        runOnJS(onEdgeExit)(keeps)
      })
      .onFinalize((_event, success) => {
        runOnJS(onDragging)(false)
        if (!success) springBack()
      })
  }, [lineX, onDragging, onEdgeExit, onExitZone, startX, width, zone])

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === "increment") onEdgeExit("A")
      else if (event.nativeEvent.actionName === "decrement") onEdgeExit("B")
    },
    [onEdgeExit],
  )

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID="compare-grabber"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={fr.mapLayers.compare.handleA11yLabel}
        accessibilityHint={fr.mapLayers.compare.handleA11yHint}
        accessibilityValue={{
          text: fr.mapLayers.compare.handleA11yValue({ left: leftName, right: rightName }),
        }}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={onAccessibilityAction}
        style={[styles.hit, { top: grabberCenterY(height) - GRABBER_HIT / 2 }, position]}
      >
        <View style={styles.edge} pointerEvents="none">
          <View style={styles.bar} />
        </View>
      </Animated.View>
    </GestureDetector>
  )
})

function createStyles(theme: BrandTheme) {
  const { curtain } = theme.visual
  return StyleSheet.create({
    hit: {
      position: "absolute",
      width: GRABBER_HIT,
      height: GRABBER_HIT,
      alignItems: "center",
      justifyContent: "center",
    },
    // The graphite edge is a 1 pt ring around the white bar: 6 x 38 pt in all, the bar 4 x 36 inside.
    edge: {
      padding: GRABBER_EDGE,
      borderRadius: (GRABBER_WIDTH + 2 * GRABBER_EDGE) / 2,
      backgroundColor: curtain.edge,
    },
    bar: {
      width: GRABBER_WIDTH,
      height: GRABBER_LENGTH,
      borderRadius: GRABBER_WIDTH / 2,
      backgroundColor: curtain.line,
    },
  })
}
