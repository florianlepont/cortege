import { brandMapTokens } from "../../app/brand-tokens"
import type { PublicParcelStatusItem } from "../../app/types"

type Position = [number, number]
type Ring = Position[]

export type ParcelFeatureProperties = {
  parcel_id: string
  fill: string
  stroke: string
  strokeWidth: number
}

export type ParcelFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ParcelFeatureProperties
>

const isFinitePosition = (value: unknown): value is Position => {
  if (!Array.isArray(value) || value.length < 2) return false
  const [lng, lat] = value as unknown[]
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

const toRing = (value: unknown): Ring | null => {
  if (!Array.isArray(value)) return null
  const ring = value.filter(isFinitePosition).map(([lng, lat]): Position => [lng, lat])
  return ring.length >= 3 ? ring : null
}

// A polygon is its outer ring then its holes; a polygon whose outer ring is unusable is dropped,
// and so is any hole that is.
const toPolygon = (value: unknown): Ring[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null
  const [outer, ...holes] = value as unknown[]
  const outerRing = toRing(outer)
  if (!outerRing) return null
  return [outerRing, ...holes.map(toRing).filter((ring): ring is Ring => ring !== null)]
}

const paint = (studied: boolean, selected: boolean) => {
  if (selected) {
    return {
      fill: brandMapTokens.parcelSelectedFill,
      stroke: brandMapTokens.parcelSelected,
      strokeWidth: brandMapTokens.strokeWidthSelected,
    }
  }
  return {
    fill: studied ? brandMapTokens.parcelStudiedFill : brandMapTokens.parcelNeutralFill,
    stroke: studied ? brandMapTokens.parcelStudied : brandMapTokens.parcelNeutral,
    strokeWidth: brandMapTokens.strokeWidthDefault,
  }
}

/**
 * The parcels of the current view as one GeoJSON collection for a single fill layer. The colours
 * are computed here (selected outranks studied, studied outranks the neutral default) and travel
 * as feature properties, so the layer reads them with `["get", ...]`.
 */
export function buildParcelFeatureCollection(
  items: PublicParcelStatusItem[],
  selectedParcelIds: string[] = [],
): ParcelFeatureCollection {
  const selectedIds = new Set(selectedParcelIds.map((id) => id.trim().toUpperCase()))
  const features: ParcelFeatureCollection["features"] = []

  for (const item of items) {
    const geometry = item.geometry
    if (!geometry || !Array.isArray(geometry.coordinates)) continue

    const selected = selectedIds.has(item.parcel_id.trim().toUpperCase())
    const properties: ParcelFeatureProperties = {
      parcel_id: item.parcel_id,
      ...paint(item.study_status === "studied", selected),
    }

    if (geometry.type === "Polygon") {
      const polygon = toPolygon(geometry.coordinates)
      if (polygon) {
        features.push({
          type: "Feature",
          properties,
          geometry: { type: "Polygon", coordinates: polygon },
        })
      }
    } else if (geometry.type === "MultiPolygon") {
      const polygons = (geometry.coordinates as unknown[])
        .map(toPolygon)
        .filter((polygon): polygon is Ring[] => polygon !== null)
      if (polygons.length > 0) {
        features.push({
          type: "Feature",
          properties,
          geometry: { type: "MultiPolygon", coordinates: polygons },
        })
      }
    }
  }

  return { type: "FeatureCollection", features }
}
