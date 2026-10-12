import type { ReactNode, RefObject } from "react"
import type { SharedValue } from "react-native-reanimated"
import { UserLocation, type CameraRef } from "@maplibre/maplibre-react-native"
import type { MapRegion } from "../../app/map-viewport"
import { useMapStyle, type MapStyleChoice } from "../../hooks/useMapStyle"
import type { BaseLayerKey } from "../../map/layers"
import { MapStack } from "./MapStack"

/** What the style of the layer says about the content drawn over it. */
export type WipeLayerStyle = Pick<MapStyleChoice, "cadastreInStyle" | "cadastreOpacity">

export type WipeLayerProps = {
  /** The base this stacked map draws. */
  layer: BaseLayerKey
  /** The strip shown, in points from the left edge of the map area (UI-thread values). */
  clipLeft: SharedValue<number>
  clipRight: SharedValue<number>
  /** The width of the map area. */
  width: number
  initialRegion: MapRegion
  /** The camera ref from `useMapSync()`; the Explorer map feeds it through `syncFrom`. */
  cameraRef: RefObject<CameraRef | null>
  /**
   * What the map draws over its base: the screen passes `MapContentLayers` with the same overlay,
   * Parcelles state and parcels as the Explorer map (no touch: `interactive` false).
   */
  content: (style: WipeLayerStyle) => ReactNode
  /** The style hook's re-check after a download or a delete, and its forced reload. */
  styleRefreshKey?: number
  styleRetryKey?: number
  onStyleLoaded?: () => void
  onStyleFailed?: () => void
  /** The map is loaded and rendered with its layer's style, about to be revealed. */
  onReady?: () => void
  /** The map is visible (see `MapStack`): a cover over it can go. */
  onRevealed?: () => void
}

/**
 * One layer drawn as a stacked map, clipped by shared values, with the shared content and the load
 * events (Phase 28, UI-SPEC "Implementation notes").
 *
 * The incoming layer of a wipe and the second side of a comparison are the same map: the screen
 * (28-17) renders it as one `WipeLayer` with a stable `key`, in a stable tree position, whether it
 * serves a wipe or the curtain, so releasing a wipe in the middle turns it into the curtain
 * without reloading a tile. A change of `layer` swaps the style of the one map (the same
 * `MapLibreMap` instance). A side wipe of a comparison mounts a second `WipeLayer` (the third map)
 * only when `SIDE_WIPE` is "wipe" (`map-stack-mode.ts`); each extra map costs about 10 MB of GL
 * layer, so none is ever duplicated for a layer that is already drawn.
 */
export function WipeLayer({
  layer,
  clipLeft,
  clipRight,
  width,
  initialRegion,
  cameraRef,
  content,
  styleRefreshKey = 0,
  styleRetryKey = 0,
  onStyleLoaded,
  onStyleFailed,
  onReady,
  onRevealed,
}: WipeLayerProps) {
  const { mapStyle, cadastreInStyle, cadastreOpacity } = useMapStyle(
    layer,
    styleRefreshKey,
    styleRetryKey,
  )
  return (
    <MapStack
      mapStyle={mapStyle}
      clipLeft={clipLeft}
      clipRight={clipRight}
      width={width}
      initialRegion={initialRegion}
      cameraRef={cameraRef}
      onStyleLoaded={onStyleLoaded}
      onStyleFailed={onStyleFailed}
      onReady={onReady}
      onRevealed={onRevealed}
    >
      {content({ cadastreInStyle, cadastreOpacity })}
      {/* The device's position, over the cadastre and the parcels of this stacked map too. */}
      <UserLocation key="user-location" />
    </MapStack>
  )
}
