import type { PublicMapItem, PublicParcelStatusItem } from "../../app/types"

type Ring = Array<[number, number]>
type ScoredParcel = { surveyId: string | null; polygons: Ring[][]; bounds: Bounds }
type Bounds = { minLng: number; maxLng: number; minLat: number; maxLat: number }

const isPosition = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number" &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1])

const toRing = (value: unknown): Ring | null => {
  if (!Array.isArray(value)) return null
  const ring = value.filter(isPosition)
  return ring.length >= 3 ? ring : null
}

const toPolygon = (value: unknown): Ring[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null
  const [outer, ...holes] = value as unknown[]
  const outerRing = toRing(outer)
  if (!outerRing) return null
  return [outerRing, ...holes.map(toRing).filter((ring): ring is Ring => ring !== null)]
}

const polygonsOf = (geometry: PublicParcelStatusItem["geometry"]): Ring[][] => {
  if (!geometry || !Array.isArray(geometry.coordinates)) return []
  const candidates =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? (geometry.coordinates as unknown[])
        : []
  return candidates.map(toPolygon).filter((polygon): polygon is Ring[] => polygon !== null)
}

const boundsOf = (polygons: Ring[][]): Bounds => {
  const bounds = { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
  for (const [outer] of polygons) {
    for (const [lng, lat] of outer) {
      bounds.minLng = Math.min(bounds.minLng, lng)
      bounds.maxLng = Math.max(bounds.maxLng, lng)
      bounds.minLat = Math.min(bounds.minLat, lat)
      bounds.maxLat = Math.max(bounds.maxLat, lat)
    }
  }
  return bounds
}

// Even-odd ray casting; a ring is [lng, lat] positions, closed or not.
const ringContains = (ring: Ring, lng: number, lat: number): boolean => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const parcelContains = (parcel: ScoredParcel, lng: number, lat: number): boolean => {
  const { bounds } = parcel
  if (lng < bounds.minLng || lng > bounds.maxLng || lat < bounds.minLat || lat > bounds.maxLat) {
    return false
  }
  return parcel.polygons.some(
    ([outer, ...holes]) =>
      ringContains(outer, lng, lat) && !holes.some((hole) => ringContains(hole, lng, lat)),
  )
}

/** The drawn parcels that carry a score: studied, with a finite latest total and a polygon. */
function scoredParcels(parcels: PublicParcelStatusItem[]): ScoredParcel[] {
  const output: ScoredParcel[] = []
  for (const parcel of parcels) {
    const total = parcel.latest_ibp_total
    if (parcel.study_status !== "studied" || typeof total !== "number" || !Number.isFinite(total)) {
      continue
    }
    const polygons = polygonsOf(parcel.geometry)
    if (polygons.length === 0) continue
    output.push({
      surveyId: parcel.latest_submitted_survey_id ?? null,
      polygons,
      bounds: boundsOf(polygons),
    })
  }
  return output
}

/**
 * The surveys still drawn as markers once the parcels replace them, from zoom 15 (12.2-19). A
 * survey's score must never vanish at that switch: its marker goes only when a band-coloured
 * parcel shows it, that is a scored parcel whose latest survey it is, or a scored parcel that
 * contains its position (a newer survey of the same parcel). The author's own drafts always keep
 * their marker (OA-126). Any other survey keeps its dot: a parcel not loaded yet, an offline
 * cache older than the survey, or a survey the parcel statuses do not match.
 */
export function markerItemsAtParcelZoom(
  items: PublicMapItem[],
  parcels: PublicParcelStatusItem[],
  draftIds?: ReadonlySet<string>,
): PublicMapItem[] {
  const scored = scoredParcels(parcels)
  const shownSurveyIds = new Set(
    scored.map((parcel) => parcel.surveyId).filter((id): id is string => id !== null),
  )
  return items.filter((item) => {
    if (draftIds?.has(item.survey_id)) return true
    if (shownSurveyIds.has(item.survey_id)) return false
    const { lat, lng } = item.display_location
    return !scored.some((parcel) => parcelContains(parcel, lng, lat))
  })
}
