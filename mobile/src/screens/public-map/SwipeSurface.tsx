import { memo } from "react"
import { StyleSheet, View } from "react-native"
import { GestureDetector, type PanGesture } from "react-native-gesture-handler"

type SwipeSurfaceProps = {
  /** The pan gesture of `useBasemapSwipe`. */
  gesture: PanGesture
}

/**
 * The gesture surface of the swipe mode: it fills the map area above the frozen maps and below the
 * controls, and owns every touch there (UI-SPEC section 3). It draws nothing.
 */
export const SwipeSurface = memo(function SwipeSurface({ gesture }: SwipeSurfaceProps) {
  return (
    <GestureDetector gesture={gesture}>
      <View testID="swipe-surface" style={styles.surface} />
    </GestureDetector>
  )
})

const styles = StyleSheet.create({
  surface: StyleSheet.absoluteFill,
})
