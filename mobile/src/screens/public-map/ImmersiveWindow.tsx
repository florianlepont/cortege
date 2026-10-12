import type { ReactNode } from "react"
import { StyleSheet } from "react-native"
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated"
import { brandElevation, brandRadius } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"

export type ImmersiveWindowProps = {
  /** The window's progress from `useImmersive`: 0 full size, 1 receded. */
  progress: SharedValue<number>
  /** `immersiveApplies()`: false keeps the window at full size (no scale, corners, shadow, ring). */
  applied: boolean
  /** Where the receded window ends: its scales and its vertical shift in points (`immersiveTarget`). */
  target: { scaleX: number; scaleY: number; shiftY: number }
  children?: ReactNode
}

export type ImmersiveButtonsProps = {
  /** The buttons' opacity from `useImmersive`: 1 shown, 0 faded out. */
  opacity: SharedValue<number>
  /** True while the effect is on: no touch, hidden from accessibility. */
  hidden: boolean
  children?: ReactNode
}

/**
 * The map window of the Explorer that recedes in the swipe mode (Phase 28, UI-SPEC section 3c,
 * owner item 13 c): it scales to `target.scaleX` by `target.scaleY` about its centre and moves by `target.shiftY` points (it fits between the top margin and the info row), rounds its corners to `brandRadius.card`
 * and shows the shadow (light) or the hairline ring (dark) of `visual.immersive` over the
 * `colors.canvas` behind it. Rendering notes:
 *
 * - iOS: the shadow sits on the outer view, which has an opaque background and the window's corner
 *   radius, so React Native derives the shadow path from its bounds and iOS does not render an
 *   offscreen pass over the Metal map view. Never move the shadow to the clipping view or the map.
 * - Android: the shadow is the outer view's `elevation` (it needs that opaque background). Below
 *   API 28 the outset shadow may be lost, accepted by charter 13.9.
 * - The inner view clips the map with the animated radius. It stays mounted at radius 0 so the map
 *   is never re-parented when the effect starts; at rest it is a plain full-size view with
 *   `pointerEvents` "box-none", which changes neither layout nor touches (device check DL-02).
 * - `applied` false (a surface map view on Android) applies none of it.
 *
 * A touch on the receded window is measured in its own coordinates with `windowX` (`wipe-geometry`).
 */
export function ImmersiveWindow({ progress, applied, target, children }: ImmersiveWindowProps) {
  const theme = useBrandTheme()
  const { shadow, ring } = theme.visual.immersive
  // Plain values for the UI-thread worklets below, not the whole theme.
  const canvas = theme.colors.canvas
  const { scaleX, scaleY, shiftY } = target

  const outer = useAnimatedStyle(() => {
    if (!applied) return {}
    const p = progress.value
    return {
      // Moved first, so the window ends between the top margin and the info row.
      transform: [
        { translateY: shiftY * p },
        { scaleX: 1 - (1 - scaleX) * p },
        { scaleY: 1 - (1 - scaleY) * p },
      ],
      borderRadius: brandRadius.card * p,
      backgroundColor: canvas,
      shadowColor: shadow.color,
      shadowOpacity: shadow.opacity * p,
      shadowRadius: shadow.radius,
      shadowOffset: { width: 0, height: shadow.offsetY },
      elevation: brandElevation.level3.elevation * p,
    }
  })
  const clip = useAnimatedStyle(() =>
    applied ? { borderRadius: brandRadius.card * progress.value } : {},
  )
  const ringStyle = useAnimatedStyle(() => ({
    borderRadius: brandRadius.card * progress.value,
    opacity: progress.value,
  }))

  return (
    <Animated.View
      testID="immersive-window"
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, outer]}
    >
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.clip, clip]}>
        {children}
      </Animated.View>
      {applied && ring ? (
        <Animated.View
          testID="immersive-window-ring"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.ring, { borderColor: ring }, ringStyle]}
        />
      ) : null}
    </Animated.View>
  )
}

/**
 * The map buttons of the Explorer (capsule, download button, locate arrow, legend, offline badge,
 * download chip) as one fading layer: while `hidden` it takes no touch and hides its subtree from
 * accessibility, so a screen reader never lands on an invisible control (T-28-59).
 */
export function ImmersiveButtons({ opacity, hidden, children }: ImmersiveButtonsProps) {
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View
      testID="immersive-buttons"
      pointerEvents={hidden ? "none" : "box-none"}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      style={[StyleSheet.absoluteFill, fade]}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  ring: { borderWidth: 1 },
})
