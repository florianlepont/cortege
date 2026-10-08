import { bandTone, totalBand } from "@cortege/ibp-domain"
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

/** The fill and outline of a studied parcel from the band of its latest total (OA-126). */
const scorePaint = (total: number) => {
  const tone = bandTone(totalBand(total))
  return {
    fill: brandMapTokens.scoreParcelFill[tone],
    stroke: brandMapTokens.scoreMarker[tone],
    strokeWidth: brandMapTokens.strokeWidthDefault,
  }
}

const paint = (studied: boolean, selected: boolean, score: number | null, byScore: boolean) => {
  if (byScore && studied && score !== null) {
    const base = scorePaint(score)
    // The survey shown from its page keeps its score colour, with the heavy dark outline.
    return selected
      ? {
          ...base,
          stroke: brandMapTokens.scoreMarkerSelectedBorder,
          strokeWidth: brandMapTokens.strokeWidthSelected,
        }
      : base
  }
  if (selected) {
    return {
      fill: brandMapTokens.parcelSelectedFill,
      stroke: brandMapTokens.parcelSelected,
      strokeWidth: brandMapTokens.strokeWidthSelected,
    }
  }
  if (byScore) {
    // 12.2-19: on the Explorer every parcel without a score is the same warm grey, studied or
    // not, so green only ever means a high score there.
    return {
      fill: brandMapTokens.parcelUnscoredFill,
      stroke: brandMapTokens.parcelUnscored,
      strokeWidth: brandMapTokens.strokeWidthDefault,
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
 * are computed here (selected outranks studied, studied outranks the neutral default; with
 * `byScore`, a scored parcel takes its band colour and every other one the warm grey) and travel
 * as feature properties, so the layer reads them with `["get", ...]`.
 */
export function buildParcelFeatureCollection(
  items: PublicParcelStatusItem[],
  selectedParcelIds: string[] = [],
  options: { byScore?: boolean } = {},
): ParcelFeatureCollection {
  const selectedIds = new Set(selectedParcelIds.map((id) => id.trim().toUpperCase()))
  const features: ParcelFeatureCollection["features"] = []

  for (const item of items) {
    const geometry = item.geometry
    if (!geometry || !Array.isArray(geometry.coordinates)) continue

    const selected = selectedIds.has(item.parcel_id.trim().toUpperCase())
    const properties: ParcelFeatureProperties = {
      parcel_id: item.parcel_id,
      ...paint(
        item.study_status === "studied",
        selected,
        typeof item.latest_ibp_total === "number" && Number.isFinite(item.latest_ibp_total)
          ? item.latest_ibp_total
          : null,
        options.byScore === true,
      ),
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
