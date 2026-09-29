import type { LngLatBounds } from "@maplibre/maplibre-react-native"
import type { MapRegion } from "../../app/map-viewport"

/** What MapLibre reports when the camera settles. */
export type MapViewChange = {
  center: [longitude: number, latitude: number]
  bounds: LngLatBounds
  userInteraction: boolean
}

/** The viewport MapLibre shows, as the centre and span the app reasons in. */
export function regionFromViewChange(change: Pick<MapViewChange, "center" | "bounds">): MapRegion {
  const [west, south, east, north] = change.bounds
  return {
    latitude: change.center[1],
    longitude: change.center[0],
    latitudeDelta: Math.abs(north - south),
    longitudeDelta: Math.abs(east - west),
  }
}

/** The region a set of bounds shows (west, south, east, north). */
export function boundsToRegion(bounds: LngLatBounds): MapRegion {
  const [west, south, east, north] = bounds
  return regionFromViewChange({ center: [(west + east) / 2, (south + north) / 2], bounds })
}

/** The bounds to hand to the camera to show a region. */
export function boundsFromRegion(region: MapRegion): LngLatBounds {
  return [
    region.longitude - region.longitudeDelta / 2,
    region.latitude - region.latitudeDelta / 2,
    region.longitude + region.longitudeDelta / 2,
    region.latitude + region.latitudeDelta / 2,
  ]
}
