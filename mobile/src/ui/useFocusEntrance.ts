import { useEffect, useRef } from "react"
import {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"
import { brandMotion } from "../app/brand-tokens"
import { useScreenVisible } from "./useScreenVisible"

/**
 * How long a screen that just left the view waits before its sections rewind to hidden. A push to
 * another page slides the screen away over about 350 ms; rewinding sooner would blank it mid-slide.
 */
export const ENTRANCE_REWIND_DELAY_MS = 600

/**
 * Slide-up entrance of one screen section (Accueil, 12.2-10), replayed each time the screen becomes
 * visible: focused in its navigator and not under an app overlay. The first version was a Reanimated
 * `entering` builder, which only runs at mount, and Accueil mounts at launch under the splash and
 * the sign-in overlay, so it had finished before anyone saw the screen.
 *
 * `index` sets the stagger (40 ms per section, capped like the lists). It is read when the entrance
 * starts, so a section appearing above does not replay the others. Under Reduce Motion the section
 * is simply shown. Returns an animated style: opacity and a translateY of 20 pt down to 0.
 *
 * Not for rows of virtualised lists, which stay first-mount-only (`useEntrance`, RESEARCH Pitfall 6).
 */
export function useFocusEntrance(index: number) {
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  const progress = useSharedValue(reduced ? 1 : 0)
  const indexRef = useRef(index)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    if (reduced) {
      cancelAnimation(progress)
      progress.value = 1
      return
    }
    if (!visible) {
      progress.value = withDelay(
        ENTRANCE_REWIND_DELAY_MS,
        withTiming(0, { duration: 0, reduceMotion: ReduceMotion.System }),
      )
      return
    }
    progress.value = 0
    progress.value = withDelay(
      Math.min(indexRef.current, brandMotion.staggerMax) * brandMotion.staggerMs,
      withTiming(1, {
        duration: brandMotion.durations.slow,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [visible, reduced, progress])

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * brandMotion.sectionEntranceTravel }],
  }))
}
