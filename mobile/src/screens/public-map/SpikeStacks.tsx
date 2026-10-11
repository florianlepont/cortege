import { StyleSheet, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated"
import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import type { MapRegion } from "../../app/map-viewport"
import { useBrandTheme } from "../../app/theme"
import { useMapStyle } from "../../hooks/useMapStyle"
import type { BaseLayerKey } from "../../map/layers"
import { rasterStyleFor } from "../../map/layer-styles"
import type { SideKey } from "../../map/wipe-geometry"
import { MapStack, type useMapSync } from "./MapStack"

// PHASE 28 DEVICE SPIKE (temporary, deleted by plan 28-17): the stacked maps and the comparison
// line that `useSwipeSpike` renders. Split out of the driver for the 400 line cap.

// The line's touch strip (the drawn line is 4 pt: 1 pt edge, 2 pt core, 1 pt edge).
const HANDLE_WIDTH = 44

/**
 * The 1950 photographs as a style: the layer catalogue's, online. Named here because the spike
 * measures the heaviest pair, Plan against a photograph (research risk 3).
 */
export const SPIKE_PHOTOS_STYLE: StyleSpecification = rasterStyleFor("photos-1950", {
  offline: false,
})

export type SpikeIncoming = { layer: BaseLayerKey; side: SideKey }

export type StackShared = {
  zero: SharedValue<number>
  widthShared: SharedValue<number>
  lineX: SharedValue<number>
  inLeft: SharedValue<number>
  inRight: SharedValue<number>
}

type SpikeStacksProps = {
  width: number
  region: MapRegion
  underlay: BaseLayerKey
  coverA: BaseLayerKey
  coverB: BaseLayerKey | null
  incoming: SpikeIncoming | null
  shared: StackShared
  syncs: Record<"coverA" | "coverB" | "incoming", ReturnType<typeof useMapSync>>
}

/** The stacked maps: a cover per side that differs from the underlay, and the incoming wipe. */
export function SpikeStacks({
  width,
  region,
  underlay,
  coverA,
  coverB,
  incoming,
  shared,
  syncs,
}: SpikeStacksProps) {
  const plan = useMapStyle("map").mapStyle
  const satellite = useMapStyle("satellite").mapStyle
  const styleOf = (layer: BaseLayerKey): string | StyleSpecification => {
    if (layer === "map") return plan
    if (layer === "satellite") return satellite
    return SPIKE_PHOTOS_STYLE
  }
  return (
    <>
      {coverA !== underlay ? (
        <MapStack
          key="cover-a"
          mapStyle={styleOf(coverA)}
          clipLeft={shared.zero}
          clipRight={shared.lineX}
          width={width}
          initialRegion={region}
          cameraRef={syncs.coverA.cameraRef}
        />
      ) : null}
      {coverB !== null && coverB !== underlay ? (
        <MapStack
          key="cover-b"
          mapStyle={styleOf(coverB)}
          clipLeft={shared.lineX}
          clipRight={shared.widthShared}
          width={width}
          initialRegion={region}
          cameraRef={syncs.coverB.cameraRef}
        />
      ) : null}
      {incoming ? (
        <MapStack
          key="incoming"
          mapStyle={styleOf(incoming.layer)}
          clipLeft={shared.inLeft}
          clipRight={shared.inRight}
          width={width}
          initialRegion={region}
          cameraRef={syncs.incoming.cameraRef}
        />
      ) : null}
    </>
  )
}

type LineHandleProps = {
  lineX: SharedValue<number>
  gesture: ReturnType<typeof Gesture.Pan>
}

/** The comparison line: 1 pt edge, 2 pt white core, 1 pt edge, in a 44 pt touch strip. */
export function LineHandle({ lineX, gesture }: LineHandleProps) {
  const { curtain } = useBrandTheme().visual
  const position = useAnimatedStyle(() => ({ left: lineX.value - HANDLE_WIDTH / 2 }))
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View testID="spike-line-handle" style={[styles.handle, position]}>
        <View style={styles.line}>
          <View style={[styles.edge, { backgroundColor: curtain.edge }]} />
          <View style={[styles.core, { backgroundColor: curtain.line }]} />
          <View style={[styles.edge, { backgroundColor: curtain.edge }]} />
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  handle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    alignItems: "center",
  },
  line: { flex: 1, width: 4, flexDirection: "row" },
  edge: { width: 1 },
  core: { width: 2 },
})
