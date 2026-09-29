import { useMemo } from "react"
import type { NativeSyntheticEvent } from "react-native"
import { GeoJSONSource, Layer, type PressEventWithFeatures } from "@maplibre/maplibre-react-native"
import type { PublicParcelStatusItem } from "../../app/types"
import { buildParcelFeatureCollection } from "./parcel-features"

type ParcelPolygonsLayerProps = {
  items: PublicParcelStatusItem[]
  selectedParcelIds?: string[]
  onParcelPress?: (parcelId: string) => void
}

/**
 * The parcels of the view as one GeoJSON source with a fill and an outline layer (a native
 * polygon per parcel was what made the old map heavy). Colours come from the features.
 */
export function ParcelPolygonsLayer({
  items,
  selectedParcelIds,
  onParcelPress,
}: ParcelPolygonsLayerProps) {
  const data = useMemo(
    () => buildParcelFeatureCollection(items, selectedParcelIds),
    [items, selectedParcelIds],
  )

  const handlePress = onParcelPress
    ? (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
        const parcelId = event.nativeEvent.features[0]?.properties?.parcel_id
        if (typeof parcelId === "string") {
          onParcelPress(parcelId)
        }
      }
    : undefined

  return (
    <GeoJSONSource id="parcels" data={data} onPress={handlePress}>
      <Layer id="parcels-fill" type="fill" paint={{ "fill-color": ["get", "fill"] }} />
      <Layer
        id="parcels-outline"
        type="line"
        paint={{ "line-color": ["get", "stroke"], "line-width": ["get", "strokeWidth"] }}
      />
    </GeoJSONSource>
  )
}
