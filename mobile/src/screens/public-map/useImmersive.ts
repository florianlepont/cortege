import { useEffect, useRef } from "react"
import { Platform } from "react-native"
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { brandMotion } from "../../app/brand-tokens"
import {
  BUTTON_FADE_IN_DELAY_MS,
  BUTTON_FADE_MS,
  IMMERSIVE_IN_MS,
  IMMERSIVE_OUT_MS,
} from "../../map/swipe-machine"
import { LEFT_MAP_ANDROID_VIEW } from "./map-stack-mode"

/** Extra time (ms) after the timings should be over before the final state is written. */
export const FINAL_STATE_SLACK_MS = 300

export type Immersive = {
  /** The receded window's progress: 0 full size, 1 receded (scale, corner radius and shadow). */
  window: SharedValue<number>
  /** The map buttons' opacity: 1 shown, 0 faded out. */
  buttons: SharedValue<number>
}

/**
 * Whether the window transform (scale, rounded corners, shadow) is applied on this platform. A
 * surface map view on Android may ignore its wrapper's clip, so the window keeps its full size
 * there and only the buttons fade (UI-SPEC section 3c, platform notes; `LEFT_MAP_ANDROID_VIEW`).
 */
export function immersiveApplies(): boolean {
  return !(Platform.OS === "android" && LEFT_MAP_ANDROID_VIEW === "surface")
}

/**
 * The two progress values of the immersive effect of the swipe mode (Phase 28, UI-SPEC section 3c,
 * owner item 13 c). Entering: the window recedes in 360 ms (decelerate) while the buttons fade out
 * in 160 ms. Leaving: the window returns in 240 ms (standard) while the buttons fade back in over
 * 160 ms, starting 80 ms after the exit begins. Every timing carries `ReduceMotion.System`, and
 * under Reduce Motion the final state is set at once. A hook mounted with `on` true starts in the
 * final state without an animation. The effect never touches the comparison: the screen passes
 * `on` only while the swipe mode is on.
 */
export function useImmersive(on: boolean): Immersive {
  const reduceMotion = useReducedMotion()
  const window = useSharedValue(on ? 1 : 0)
  const buttons = useSharedValue(on ? 0 : 1)
  const previous = useRef(on)

  useEffect(() => {
    const changed = previous.current !== on
    previous.current = on
    if (reduceMotion) {
      window.value = on ? 1 : 0
      buttons.value = on ? 0 : 1
      return undefined
    }
    if (!changed) return undefined
    const fade = { duration: BUTTON_FADE_MS, reduceMotion: ReduceMotion.System }
    if (on) {
      window.value = withTiming(1, {
        duration: IMMERSIVE_IN_MS,
        easing: Easing.bezier(...brandMotion.easings.decelerate),
        reduceMotion: ReduceMotion.System,
      })
      buttons.value = withTiming(0, fade)
    } else {
      window.value = withTiming(0, {
        duration: IMMERSIVE_OUT_MS,
        easing: Easing.bezier(...brandMotion.easings.standard),
        reduceMotion: ReduceMotion.System,
      })
      buttons.value = withDelay(BUTTON_FADE_IN_DELAY_MS, withTiming(1, fade))
    }
    // A timing on the UI thread can lag or be lost (a busy thread, a detached view): once it should
    // be over the final state is written, so the window and the buttons never stay half way.
    const settle = setTimeout(
      () => {
        window.value = on ? 1 : 0
        buttons.value = on ? 0 : 1
      },
      (on ? IMMERSIVE_IN_MS : IMMERSIVE_OUT_MS) + BUTTON_FADE_IN_DELAY_MS + FINAL_STATE_SLACK_MS,
    )
    return () => clearTimeout(settle)
  }, [buttons, on, reduceMotion, window])

  useEffect(
    () => () => {
      cancelAnimation(window)
      cancelAnimation(buttons)
    },
    [buttons, window],
  )

  return { window, buttons }
}
