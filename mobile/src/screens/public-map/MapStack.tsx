import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import { StyleSheet, View, type NativeSyntheticEvent } from "react-native"
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated"
import {
  Camera,
  Map as MapLibreMap,
  type CameraRef,
  type StyleSpecification,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native"
import { brandMapTokens } from "../../app/brand-tokens"
import type { MapRegion } from "../../app/map-viewport"
import { useBrandTheme } from "../../app/theme"
import { boundsFromRegion } from "../../map/maplibre/regions"
import { useStackedReady } from "./useStackedReady"

// Why stacked maps (Phase 28, research "Curtain"): one MapLibre map has one style and cannot clip a
// raster layer by screen position (raster paint properties are not data-driven, the style spec has
// no clip layer), so a second layer on the same pixels is a second map. This file is that second
// (or third) map: a non-interactive MapLibre view clipped to a horizontal strip by a wrapper.
//   - Android: a GLSurfaceView ignores an ancestor's `overflow: hidden`; a TextureView honours it,
//     so the stacked map renders as a texture by default. The Explorer's own (left) map may stay a
//     surface view; the spike measures whether it must be a texture too.
//   - Every extra map follows the Explorer map: the Explorer map reports its camera while it
//     moves, `useMapSync().syncFrom` jumps this one to the same centre and zoom (north up, flat:
//     the Explorer map is locked to the same while a comparison is free).
//   - Touches pass through (`pointerEvents="none"` and every gesture prop false): the Explorer map
//     below owns them.
// It takes a style, not a layer key, so the wipe, the curtain and the side wipe all use it.
// Until its first style load it shows the map ground colour under the (still empty) map: the spike
// found the uncovered strip black before the first tiles arrive (28-01, DL-01).

/** How long (ms) a new style waits after the map was hidden: over two frames, the clip is on the UI thread. */
export const STYLE_SWAP_GAP_MS = 50

/** A stacked map's camera: the ref to pass to `MapStack` and the handler to feed from the Explorer map. */
export function useMapSync(): {
  cameraRef: RefObject<CameraRef | null>
  syncFrom: (event: NativeSyntheticEvent<ViewStateChangeEvent>) => void
} {
  const cameraRef = useRef<CameraRef | null>(null)
  const syncFrom = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const { center, zoom } = event.nativeEvent
    cameraRef.current?.jumpTo({ center, zoom, bearing: 0, pitch: 0 })
  }, [])
  return useMemo(() => ({ cameraRef, syncFrom }), [syncFrom])
}

export type MapStackProps = {
  mapStyle: string | StyleSpecification
  /** The strip shown, in points from the left edge of the map area (UI-thread values). */
  clipLeft: SharedValue<number>
  clipRight: SharedValue<number>
  /** The width of the map area: the inner map keeps it whatever the strip. */
  width: number
  initialRegion: MapRegion
  cameraRef: RefObject<CameraRef | null>
  /** Android only; a texture view honours the clip. */
  androidView?: "surface" | "texture"
  /** Layers drawn inside this map after its camera (parcels, cadastre). */
  children?: ReactNode
  /** The style finished loading (the map can draw its tiles). */
  onStyleLoaded?: () => void
  /** The map failed to load its style or its tiles. */
  onStyleFailed?: () => void
  /** The map is loaded and rendered with its current style (and about to be revealed). */
  onReady?: () => void
}

/** A non-interactive map clipped to the strip between `clipLeft` and `clipRight`. */
export function MapStack({
  mapStyle,
  clipLeft,
  clipRight,
  width,
  initialRegion,
  cameraRef,
  androidView = "texture",
  children,
  onStyleLoaded,
  onStyleFailed,
  onReady,
}: MapStackProps) {
  const { scheme } = useBrandTheme()
  const [styleLoaded, setStyleLoaded] = useState(false)
  // Not revealed until the current style is loaded and rendered (no blank or half-tiled strip).
  // The native style lags the wanted one by STYLE_SWAP_GAP_MS: the clip is zero (and has reached the
  // UI thread) before the swap, so the cleared map is never drawn for a frame.
  const [appliedStyle, setAppliedStyle] = useState(mapStyle)
  const stackedReady = useStackedReady(appliedStyle, onReady)
  const { ready, onStyleLoaded: readyStyleLoaded, hide, restore } = stackedReady
  // A render report while a style change is pending belongs to the old style: it must not reveal.
  const changing = useRef(false)
  changing.current = mapStyle !== appliedStyle
  const { onRenderedFully: readyRendered } = stackedReady
  const onRenderedFully = useCallback(() => {
    if (!changing.current) readyRendered()
  }, [readyRendered])
  useLayoutEffect(() => {
    if (mapStyle === appliedStyle) {
      restore()
      return undefined
    }
    hide()
    const timer = setTimeout(() => setAppliedStyle(mapStyle), STYLE_SWAP_GAP_MS)
    return () => clearTimeout(timer)
  }, [mapStyle, appliedStyle, hide, restore])
  const handleStyleLoaded = useCallback(() => {
    setStyleLoaded(true)
    readyStyleLoaded()
    onStyleLoaded?.()
  }, [onStyleLoaded, readyStyleLoaded])
  const ground =
    scheme === "dark" ? brandMapTokens.darkBasemapBackground : brandMapTokens.lightBasemapBackground
  const clipStyle = useAnimatedStyle(() => ({
    left: clipLeft.value,
    width: ready.value === 0 ? 0 : Math.max(clipRight.value - clipLeft.value, 0),
  }))
  const innerStyle = useAnimatedStyle(() => ({ left: -clipLeft.value, width }))
  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[styles.clip, clipStyle, styleLoaded ? null : { backgroundColor: ground }]}
      >
        <Animated.View pointerEvents="none" collapsable={false} style={[styles.inner, innerStyle]}>
          <MapLibreMap
            style={styles.map}
            mapStyle={appliedStyle}
            androidView={androidView}
            dragPan={false}
            touchZoom={false}
            touchRotate={false}
            touchPitch={false}
            doubleTapZoom={false}
            attribution={false}
            logo={false}
            onDidFinishLoadingStyle={handleStyleLoaded}
            onDidFinishRenderingMapFully={onRenderedFully}
            onDidFailLoadingMap={onStyleFailed}
          >
            <Camera
              ref={cameraRef}
              initialViewState={{ bounds: boundsFromRegion(initialRegion) }}
            />
            {children}
          </MapLibreMap>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: StyleSheet.absoluteFill,
  clip: { position: "absolute", top: 0, bottom: 0, overflow: "hidden" },
  inner: { position: "absolute", top: 0, bottom: 0 },
  map: { flex: 1 },
})
