import { useMemo } from "react"
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native"
import { brandColors, brandMapTokens } from "../../app/brand-tokens"

type PlacePinLayerProps = {
  /** The place a search result centred the Explorer on; null draws nothing. */
  pin: { lat: number; lng: number } | null
}

/**
 * The static pin of a found place (D-05): one terracotta dot with a white ring, the colour of a
 * selected parcel. No animation and no press: it only says where the search result is.
 */
export function PlacePinLayer({ pin }: PlacePinLayerProps) {
  const data = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: pin
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
            },
          ]
        : [],
    }),
    [pin],
  )

  if (!pin) return null

  return (
    <GeoJSONSource id="search-place" data={data}>
      <Layer
        id="search-place-pin"
        type="circle"
        paint={{
          "circle-radius": 8,
          "circle-color": brandMapTokens.parcelSelected,
          "circle-stroke-color": brandColors.white,
          "circle-stroke-width": 2,
        }}
      />
    </GeoJSONSource>
  )
}
