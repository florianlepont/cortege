import type { MapRegion } from "../app/map-viewport"

const KM_PER_DEGREE_LATITUDE = 111.32
/** Radius of the area offered around a survey (owner decision 2026-10-05: about 2 km). */
export const OFFLINE_PROMPT_RADIUS_KM = 2

/** The square region of `radiusKm` around a point (longitude span widened by the latitude). */
export function regionAround(
  point: { lat: number; lng: number },
  radiusKm: number = OFFLINE_PROMPT_RADIUS_KM,
): MapRegion {
  const latitudeDelta = (2 * radiusKm) / KM_PER_DEGREE_LATITUDE
  const longitudeDelta = latitudeDelta / Math.max(Math.cos((point.lat * Math.PI) / 180), 0.01)
  return { latitude: point.lat, longitude: point.lng, latitudeDelta, longitudeDelta }
}
