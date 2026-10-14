import type { PublicParcelStatusItem } from "../app/types"
import { parcelPolygonsFrom } from "../app/survey-pdf/map-projection"
import type { LngLat } from "../app/survey-pdf/map-projection"

// Phase 30, D-05: the prefill of the stand surface question of the mandatory route step. The API
// never fills `parcels.area_m2` (research 5.3) and the guide must work offline, so the surface is
// computed on the phone from the parcel geometry the selection screen already holds. A cadastral
// parcel is not a stand: the value is an editable estimate (research Pitfall 10, assumption A9:
// about 1 % is enough). Pure geometry, no rule of the method, and no geometry dependency on
// purpose (research "Don't Hand-Roll").

/** WGS84 equatorial radius, in metres. */
const EARTH_RADIUS_M = 6378137

const M2_PER_HA = 10000

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/**
 * The area of a ring on the sphere, in square metres: the formula of Chamberlain and Duquette
 * (2007), absolute value so the winding order does not matter. The closing point may be repeated or
 * left out (the closing edge is then taken from the last point to the first). Fewer than 3 points
 * give 0.
 */
export function ringAreaM2(ring: LngLat[]): number {
  if (ring.length < 3) return 0
  let sum = 0
  for (let i = 0; i < ring.length; i += 1) {
    const [lng1, lat1] = ring[i]
    const [lng2, lat2] = ring[(i + 1) % ring.length]
    sum += toRadians(lng2 - lng1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)))
  }
  return Math.abs((sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
}

/** The area of a polygon (its outer ring, then its holes), in square metres, never below 0. */
export function polygonAreaM2(rings: LngLat[][]): number {
  if (rings.length === 0) return 0
  const [outer, ...holes] = rings
  const holesArea = holes.reduce((total, hole) => total + ringAreaM2(hole), 0)
  return Math.max(0, ringAreaM2(outer) - holesArea)
}

/**
 * The surface of the wanted parcels in hectares, from their cached geometry (every polygon of a
 * MultiPolygon counts, ids matched without regard to case), or null when none of them has geometry
 * or the sum is 0: the observer then types the surface (nothing blocks offline, SEED-007).
 */
export function parcelAreaHa(items: PublicParcelStatusItem[], parcelIds: string[]): number | null {
  const totalM2 = parcelPolygonsFrom(items, parcelIds).reduce(
    (total, { rings }) => total + polygonAreaM2(rings),
    0,
  )
  return totalM2 > 0 ? totalM2 / M2_PER_HA : null
}
