import { Layer, RasterSource } from "@maplibre/maplibre-react-native"
import { useIsOffline } from "../../hooks/useIsOffline"
import { overlaySourceProps } from "../layer-styles"
import { CADASTRE_LAYER_ID } from "./CadastreLayer"

type ForestTypesLayerProps = {
  enabled: boolean
  /**
   * The style already carries the cadastre (a Plan pack file written before Phase 28): the forest
   * types go under that layer, as a child layer would otherwise land on top of it.
   */
  belowCadastre?: boolean
}

/**
 * The forest types of the IGN forest inventory as a translucent raster child of the map (an
 * overlay never swaps the base style). Past its last tile zoom MapLibre scales the last tile, so
 * the overlay never goes blank when zooming in; offline its tiles come from the native cache by
 * URL when the layer was downloaded.
 */
export function ForestTypesLayer({ enabled, belowCadastre = false }: ForestTypesLayerProps) {
  const offline = useIsOffline()
  if (!enabled) return null
  const { id, tiles, tileSize, minzoom, maxzoom, opacity } = overlaySourceProps({ offline })
  return (
    <RasterSource
      id={id}
      tiles={tiles}
      tileSize={tileSize}
      minzoom={minzoom}
      maxzoom={maxzoom}
      scheme="xyz"
      attribution="Source : IGN"
    >
      <Layer
        id={id}
        type="raster"
        paint={{ "raster-opacity": opacity }}
        beforeId={belowCadastre ? CADASTRE_LAYER_ID : undefined}
      />
    </RasterSource>
  )
}
