import { forwardRef, useImperativeHandle, useRef, type Ref } from "react"
import {
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import {
  Camera,
  Map as MapLibreMap,
  UserLocation,
  ViewAnnotation,
  type CameraRef,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native"
import { brandColors, brandMapTokens } from "../../app/brand-tokens"
import type { MapCoordinate, MapRegion } from "../../app/map-viewport"
import type { PublicParcelStatusItem } from "../../app/types"
import { useMapStyle } from "../../hooks/useMapStyle"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { BasemapKey } from "../basemaps"
import { CadastreLayer } from "./CadastreLayer"
import { ParcelPolygonsLayer } from "./ParcelPolygonsLayer"
import { boundsFromRegion, regionFromViewChange } from "./regions"

export type ParcelMapHandle = {
  /** Moves the camera to a region. Asked before the map has loaded, it moves once it has. */
  animateToRegion: (region: MapRegion, durationMs?: number) => void
}

type ParcelMapProps = {
  style?: StyleProp<ViewStyle>
  /** Where the camera starts; later moves go through the handle. */
  initialRegion: MapRegion
  basemap?: BasemapKey
  /** Whether the cadastre raster is drawn (the caller decides from the zoom). */
  cadastreEnabled: boolean
  parcels: PublicParcelStatusItem[]
  selectedParcelIds?: string[]
  onParcelPress?: (parcelId: string) => void
  /** A pin, for the captured GPS position. */
  marker?: MapCoordinate | null
  showUserLocation?: boolean
  /** False makes a still picture of the map (no pan, zoom, rotation or tilt). */
  interactive?: boolean
  onRegionChange?: (region: MapRegion) => void
}

/**
 * The map of the parcel steps (the form, the full-screen picker, the survey detail): the IGN plan,
 * the cadastre, the parcels as one pressable GeoJSON layer and an optional GPS pin. It hides
 * MapLibre's readiness handshake behind `animateToRegion`.
 */
export const ParcelMap = forwardRef(function ParcelMap(
  {
    style,
    initialRegion,
    basemap = "map",
    cadastreEnabled,
    parcels,
    selectedParcelIds,
    onParcelPress,
    marker,
    showUserLocation = false,
    interactive = true,
    onRegionChange,
  }: ParcelMapProps,
  ref: Ref<ParcelMapHandle>,
) {
  const { mapStyle, cadastreInStyle } = useMapStyle(basemap)
  const cameraRef = useRef<CameraRef | null>(null)
  const loadedRef = useRef(false)
  const pendingRef = useRef<{ region: MapRegion; durationMs: number } | null>(null)

  const move = (region: MapRegion, durationMs: number) => {
    cameraRef.current?.fitBounds(boundsFromRegion(region), { duration: durationMs })
  }

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, durationMs = 420) => {
      if (loadedRef.current) {
        move(region, durationMs)
      } else {
        pendingRef.current = { region, durationMs }
      }
    },
  }))

  const handleLoaded = useLatestCallback(() => {
    loadedRef.current = true
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending) move(pending.region, 0)
  })

  const handleRegionDidChange = useLatestCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, bounds } = event.nativeEvent
      onRegionChange?.(regionFromViewChange({ center, bounds }))
    },
  )

  return (
    <MapLibreMap
      style={style}
      mapStyle={mapStyle}
      attribution={false}
      logo={false}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      doubleTapHoldZoom={interactive}
      touchRotate={false}
      touchPitch={false}
      onDidFinishLoadingMap={handleLoaded}
      onRegionDidChange={handleRegionDidChange}
    >
      <Camera ref={cameraRef} initialViewState={{ bounds: boundsFromRegion(initialRegion) }} />
      {showUserLocation ? <UserLocation /> : null}
      <CadastreLayer enabled={cadastreEnabled && !cadastreInStyle} />
      <ParcelPolygonsLayer
        items={parcels}
        selectedParcelIds={selectedParcelIds}
        onParcelPress={onParcelPress}
      />
      {marker ? (
        <ViewAnnotation
          id="gps-marker"
          lngLat={[marker.longitude, marker.latitude]}
          anchor="center"
        >
          <View style={styles.pin} />
        </ViewAnnotation>
      ) : null}
    </MapLibreMap>
  )
})

const styles = StyleSheet.create({
  pin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: brandColors.white,
    backgroundColor: brandMapTokens.parcelSelected,
  },
})
