import { buildParcelFeatureCollection } from "../../map/maplibre/parcel-features"
import type { PublicParcelStatusItem } from "../types"

// D-06: the parcel polygons of the PDF map are an SVG layer over a MapLibre snapshot. Both use the
// same Web Mercator formula, so the polygons lie on the basemap image. This file is pure: it must
// not import react-native nor a native module (map/offline-packs.ts pulls MapLibre in).

/**
 * MapLibre's zoom levels use a 512 px world (zoom 0 is one 512 px tile). The device spike
 * (plan 25.1-07) confirms it by laying these polygons over the cadastre raster of the snapshot.
 */
export const WORLD_SIZE_PX = 512

/** The zoom range of the offline packs (`OFFLINE_MIN_ZOOM` and `OFFLINE_MAX_ZOOM` in
 * map/offline-packs.ts, asserted equal in the test): the PDF never asks a zoom the pack did not store. */
export const OFFLINE_ZOOM_RANGE = { min: 13, max: 17 } as const

/** Longitude first, as in GeoJSON. */
export type LngLat = [number, number]
export type LngLatBounds = { west: number; south: number; east: number; north: number }
export type MapFrame = {
  centerLng: number
  centerLat: number
  zoom: number
  width: number
  height: number
}

const EARTH_CIRCUMFERENCE_M = 40075016.686
const MAX_CONTINUOUS_ZOOM = 22
const SCALE_BAR_STEPS_M = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

const worldSize = (zoom: number) => WORLD_SIZE_PX * 2 ** zoom

export function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * worldSize(zoom)
}

export function latToWorldY(lat: number, zoom: number): number {
  const sin = Math.sin((lat * Math.PI) / 180)
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize(zoom)
}

/** Inverse of `latToWorldY`. */
export function worldYToLat(y: number, zoom: number): number {
  const mercator = 2 * Math.PI * (0.5 - y / worldSize(zoom))
  return (Math.atan(Math.sinh(mercator)) * 180) / Math.PI
}

/** Pixel of a point in a frame (origin top left, north up). */
export function projectToFrame(point: LngLat, frame: MapFrame): { x: number; y: number } {
  return {
    x:
      lngToWorldX(point[0], frame.zoom) -
      lngToWorldX(frame.centerLng, frame.zoom) +
      frame.width / 2,
    y:
      latToWorldY(point[1], frame.zoom) -
      latToWorldY(frame.centerLat, frame.zoom) +
      frame.height / 2,
  }
}

export function metresPerPixel(lat: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / worldSize(zoom)
}

const isFinitePoint = (point: readonly number[]): boolean =>
  point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])

/** Bounding box of the finite points of some rings, or null when there is none. */
export function boundsOfRings(
  rings: readonly (readonly (readonly number[])[])[],
): LngLatBounds | null {
  let bounds: LngLatBounds | null = null
  for (const ring of rings) {
    for (const point of ring) {
      if (!isFinitePoint(point)) continue
      const [lng, lat] = point
      bounds = bounds
        ? {
            west: Math.min(bounds.west, lng),
            south: Math.min(bounds.south, lat),
            east: Math.max(bounds.east, lng),
            north: Math.max(bounds.north, lat),
          }
        : { west: lng, south: lat, east: lng, north: lat }
    }
  }
  return bounds
}

/**
 * The frame that holds the bbox with `paddingRatio` of the size kept free on each side. With a
 * `zoomRange` the zoom is the integer below the exact fit, clamped to the range (the snapshot case);
 * with `null` it is the exact fit (the outline without basemap, where any zoom is fine).
 */
export function fitFrameToBounds(
  bounds: LngLatBounds,
  size: { width: number; height: number },
  options: { paddingRatio: number; zoomRange: { min: number; max: number } | null },
): MapFrame {
  const widthAtZoom0 = ((bounds.east - bounds.west) / 360) * WORLD_SIZE_PX
  const heightAtZoom0 = latToWorldY(bounds.south, 0) - latToWorldY(bounds.north, 0)
  const keep = 1 - 2 * options.paddingRatio
  const ratio = Math.min(
    widthAtZoom0 > 0 ? (size.width * keep) / widthAtZoom0 : Infinity,
    heightAtZoom0 > 0 ? (size.height * keep) / heightAtZoom0 : Infinity,
  )
  const exact = Number.isFinite(ratio) ? Math.log2(ratio) : MAX_CONTINUOUS_ZOOM
  const zoom = options.zoomRange
    ? Math.min(options.zoomRange.max, Math.max(options.zoomRange.min, Math.floor(exact)))
    : Math.min(MAX_CONTINUOUS_ZOOM, exact)
  const middleY = (latToWorldY(bounds.south, zoom) + latToWorldY(bounds.north, zoom)) / 2
  return {
    centerLng: (bounds.west + bounds.east) / 2,
    centerLat: worldYToLat(middleY, zoom),
    zoom,
    width: size.width,
    height: size.height,
  }
}

/** The longest round distance whose bar fits a quarter of the frame width (10 m at least). */
export function chooseScaleBar(
  metresPerPx: number,
  frameWidth: number,
): { metres: number; px: number } {
  const room = frameWidth / 4
  let metres = SCALE_BAR_STEPS_M[0]
  for (const step of SCALE_BAR_STEPS_M) {
    if (step / metresPerPx <= room) metres = step
  }
  return { metres, px: metres / metresPerPx }
}

const oneDecimal = (value: number) => value.toFixed(1)

/** SVG path data: one `M ... Z` subpath per ring, a non finite point skipped. */
export function ringsToPathD(
  rings: readonly (readonly (readonly number[])[])[],
  frame: MapFrame,
): string {
  const subpaths: string[] = []
  for (const ring of rings) {
    const points = ring.filter(isFinitePoint).map((point) => {
      const { x, y } = projectToFrame([point[0], point[1]], frame)
      return `${oneDecimal(x)} ${oneDecimal(y)}`
    })
    if (points.length === 0) continue
    subpaths.push(`M${points.join(" L")} Z`)
  }
  return subpaths.join(" ")
}

/**
 * The polygons of the wanted parcels (outer ring then holes), a MultiPolygon giving one entry per
 * polygon. The coordinates are validated by `buildParcelFeatureCollection`, not again here.
 */
export function parcelPolygonsFrom(
  items: PublicParcelStatusItem[],
  parcelIds: string[],
): Array<{ parcelId: string; rings: LngLat[][] }> {
  const wanted = new Set(parcelIds.map((id) => id.trim().toUpperCase()))
  const polygons: Array<{ parcelId: string; rings: LngLat[][] }> = []
  for (const feature of buildParcelFeatureCollection(items, parcelIds).features) {
    const parcelId = feature.properties.parcel_id
    if (!wanted.has(parcelId.trim().toUpperCase())) continue
    const { geometry } = feature
    const rings =
      geometry.type === "Polygon"
        ? [geometry.coordinates as LngLat[][]]
        : (geometry.coordinates as LngLat[][][])
    for (const polygon of rings) polygons.push({ parcelId, rings: polygon })
  }
  return polygons
}
