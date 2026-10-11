import { useMemo } from "react"
import type { NativeSyntheticEvent } from "react-native"
import { GeoJSONSource, Layer, type PressEventWithFeatures } from "@maplibre/maplibre-react-native"
import { brandMapTokens } from "../../app/brand-tokens"
import type { PublicParcelStatusItem } from "../../app/types"
import { parcelsRendering, type ParcelsMode } from "../parcels-visibility"
import { buildParcelFeatureCollection } from "./parcel-features"

type ParcelPolygonsLayerProps = {
  items: PublicParcelStatusItem[]
  selectedParcelIds?: string[]
  /** The Explorer: a studied parcel is filled by the band of its latest score (OA-126). */
  byScore?: boolean
  onParcelPress?: (parcelId: string) => void
  /** Phase 28 Parcelles state: "all" (today's rendering), "withIbp" or "none" (focus only). */
  mode?: ParcelsMode
  /** The parcels of the author's own surveys (trimmed, upper case), for the "withIbp" state. */
  surveyParcelIds?: ReadonlySet<string>
  /** A white casing under the outline (old bases, forest overlay, UI-SPEC U-09). */
  casing?: boolean
  casingOpacity?: number
  /** Multiplies the fill alpha below 1 (the old bases); at 1 the paint is today's. */
  fillOpacity?: number
}

/**
 * The parcels of the view as one GeoJSON source with a casing (optional), a fill and an outline
 * layer (a native polygon per parcel was what made the old map heavy). Colours come from the
 * features; the Parcelles state decides the layer filter (a focused parcel is always kept) and
 * whether a polygon answers a tap.
 */
export function ParcelPolygonsLayer({
  items,
  selectedParcelIds,
  byScore = false,
  onParcelPress,
  mode = "all",
  surveyParcelIds,
  casing = false,
  casingOpacity = 1,
  fillOpacity = 1,
}: ParcelPolygonsLayerProps) {
  const data = useMemo(
    () => buildParcelFeatureCollection(items, selectedParcelIds, { byScore, surveyParcelIds }),
    [items, selectedParcelIds, byScore, surveyParcelIds],
  )
  const rendering = parcelsRendering(mode)
  const filter = rendering.polygonFilter ?? undefined

  const handlePress =
    onParcelPress && rendering.tappable
      ? (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
          const parcelId = event.nativeEvent.features[0]?.properties?.parcel_id
          if (typeof parcelId === "string") {
            onParcelPress(parcelId)
          }
        }
      : undefined

  return (
    <GeoJSONSource id="parcels" data={data} onPress={handlePress}>
      {casing ? (
        <Layer
          id="parcels-casing"
          type="line"
          filter={filter}
          paint={{
            "line-color": brandMapTokens.parcelCasing,
            "line-width": ["+", ["get", "strokeWidth"], 2],
            "line-opacity": casingOpacity,
          }}
        />
      ) : null}
      <Layer
        id="parcels-fill"
        type="fill"
        filter={filter}
        paint={
          fillOpacity < 1
            ? { "fill-color": ["get", "fill"], "fill-opacity": fillOpacity }
            : { "fill-color": ["get", "fill"] }
        }
      />
      <Layer
        id="parcels-outline"
        type="line"
        filter={filter}
        paint={{ "line-color": ["get", "stroke"], "line-width": ["get", "strokeWidth"] }}
      />
    </GeoJSONSource>
  )
}
