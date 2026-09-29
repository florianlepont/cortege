/**
 * The map viewport the app reasons in: a centre and the span shown. It has the shape of the old
 * react-native-maps `Region`, kept as the app's own type so the hooks did not change with the map
 * library (MapLibre reports bounds, converted in `map/maplibre/regions.ts`).
 */
export type MapRegion = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}
type Region = MapRegion

/** A point on the map, as the markers take it. */
export type MapCoordinate = { latitude: number; longitude: number }

export const DEFAULT_FRANCE_CENTER = { lat: 46.603354, lng: 1.888334 }

export function buildFocusedMapRegion(location: { lat: number; lng: number }): Region {
  return {
    latitude: location.lat,
    longitude: location.lng,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  }
}

export function computeRegionZoom(region: Region): number {
  const longitudeDelta = Math.max(region.longitudeDelta, 0.000001)
  return Math.round(Math.log2(360 / longitudeDelta))
}

export function areRegionsNearlyEqual(a: Region, b: Region, epsilon = 0.00001): boolean {
  return (
    Math.abs(a.latitude - b.latitude) <= epsilon &&
    Math.abs(a.longitude - b.longitude) <= epsilon &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) <= epsilon &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) <= epsilon
  )
}

function formatBbox(minLng: number, minLat: number, maxLng: number, maxLat: number): string {
  return `${minLng.toFixed(6)},${minLat.toFixed(6)},${maxLng.toFixed(6)},${maxLat.toFixed(6)}`
}

export type RegionBounds = { minLat: number; minLng: number; maxLat: number; maxLng: number }

/** The same clamped bounds computeRegionBbox encodes as a string, as plain numbers — for a
 * caller (Phase 8's offline-area download) that needs the bounds themselves, never unparsable
 * since they come straight from the region's own numbers, not a round trip through a string. */
export function computeRegionBounds(region: Region): RegionBounds {
  const halfLat = region.latitudeDelta / 2
  const halfLng = region.longitudeDelta / 2
  return {
    minLat: Math.max(-90, region.latitude - halfLat),
    maxLat: Math.min(90, region.latitude + halfLat),
    minLng: Math.max(-180, region.longitude - halfLng),
    maxLng: Math.min(180, region.longitude + halfLng),
  }
}

export function computeRegionBbox(region: Region): string {
  const { minLat, maxLat, minLng, maxLng } = computeRegionBounds(region)
  return formatBbox(minLng, minLat, maxLng, maxLat)
}

export function buildBboxAroundPoint(
  center: { lat: number; lng: number },
  radiusDeg: number,
): string {
  const minLat = Math.max(-90, center.lat - radiusDeg)
  const maxLat = Math.min(90, center.lat + radiusDeg)
  const minLng = Math.max(-180, center.lng - radiusDeg)
  const maxLng = Math.min(180, center.lng + radiusDeg)
  return formatBbox(minLng, minLat, maxLng, maxLat)
}

/** Parses a stored GPS coordinate; an empty string is "no position", not 0 (the Gulf of Guinea). */
export function parseGpsCoordinate(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value)
}
