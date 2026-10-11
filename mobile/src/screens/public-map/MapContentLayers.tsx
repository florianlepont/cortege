import { brandMapTokens } from "../../app/brand-tokens"
import type { PublicParcelStatusItem } from "../../app/types"
import type { BaseLayerKey } from "../../map/layers"
import { CadastreLayer } from "../../map/maplibre/CadastreLayer"
import { ForestTypesLayer } from "../../map/maplibre/ForestTypesLayer"
import { ParcelPolygonsLayer } from "../../map/maplibre/ParcelPolygonsLayer"
import {
  parcelCasingVisible,
  parcelFillFactor,
  parcelsRendering,
  type ParcelsMode,
} from "../../map/parcels-visibility"

const NO_PARCELS: PublicParcelStatusItem[] = []

/**
 * The parcels the layer draws. From zoom 15 (`parcelLayerRenderable`) every parcel of the view is
 * drawn; between zoom 12 and 15 only the studied parcels (the API answers only those, and a set
 * kept from a closer view is filtered the same way); below, none.
 */
export function shownParcelsFor(
  parcelStatuses: PublicParcelStatusItem[],
  parcelLayerRenderable: boolean,
  studiedParcelsRenderable: boolean,
): PublicParcelStatusItem[] {
  if (parcelLayerRenderable) return parcelStatuses
  if (!studiedParcelsRenderable) return NO_PARCELS
  return parcelStatuses.filter((parcel) => parcel.study_status === "studied")
}

export type MapContentLayersProps = {
  /** The base this map shows: the old bases take the lightened fill and the casing. */
  base: BaseLayerKey
  forestOverlay: boolean
  parcelsMode: ParcelsMode
  /** From zoom 15, the zoom the cadastre tiles exist from. */
  cadastreEnabled: boolean
  /** The style already carries the cadastre (an older Plan pack file). */
  cadastreInStyle: boolean
  cadastreOpacity: number
  parcels: PublicParcelStatusItem[]
  selectedParcelIds?: string[]
  /** The author's own survey parcels (trimmed, upper case), for "Avec IBP". */
  surveyParcelIds?: ReadonlySet<string>
  /** False on a frozen map: parcels take no press. */
  interactive: boolean
  onParcelPress?: (parcelId: string) => void
}

/**
 * What a map draws over its base, in z-order: the forest types, the cadastre lines (Parcelles
 * "Toutes" only), then the parcels (casing, fill, outline). The same content is drawn on every
 * stacked map (wipe, curtain, side wipe, 28-14), so overlays and Parcelles apply to both sides of
 * a comparison (28-CONTEXT final decision 4).
 */
export function MapContentLayers({
  base,
  forestOverlay,
  parcelsMode,
  cadastreEnabled,
  cadastreInStyle,
  cadastreOpacity,
  parcels,
  selectedParcelIds,
  surveyParcelIds,
  interactive,
  onParcelPress,
}: MapContentLayersProps) {
  const rendering = parcelsRendering(parcelsMode)
  const factor = parcelFillFactor(base, brandMapTokens.parcelFillOldBaseFactor)
  return (
    <>
      <ForestTypesLayer enabled={forestOverlay} belowCadastre={cadastreInStyle} />
      <CadastreLayer
        enabled={cadastreEnabled && rendering.cadastre && !cadastreInStyle}
        opacity={cadastreOpacity}
      />
      <ParcelPolygonsLayer
        items={parcels}
        selectedParcelIds={selectedParcelIds}
        surveyParcelIds={surveyParcelIds}
        byScore
        mode={parcelsMode}
        casing={parcelCasingVisible(base, forestOverlay)}
        casingOpacity={factor}
        fillOpacity={factor}
        onParcelPress={interactive ? onParcelPress : undefined}
      />
    </>
  )
}
