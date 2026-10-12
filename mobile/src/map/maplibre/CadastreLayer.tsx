import { Layer, RasterSource } from "@maplibre/maplibre-react-native"
import { CADASTRE_TILES } from "./styles"

/** The id of the cadastre layer, also the one the offline pack file gives it (`offline-styles`). */
export const CADASTRE_LAYER_ID = "ign-cadastre"

type CadastreLayerProps = {
  enabled: boolean
  opacity?: number
}

/** The IGN cadastre as a raster layer over the basemap, from zoom 15 (nothing is drawn below). */
export function CadastreLayer({ enabled, opacity = 0.9 }: CadastreLayerProps) {
  if (!enabled) return null
  return (
    <RasterSource
      id={CADASTRE_LAYER_ID}
      tiles={[CADASTRE_TILES]}
      tileSize={256}
      minzoom={15}
      maxzoom={20}
      scheme="xyz"
      attribution="Source : IGN"
    >
      <Layer id={CADASTRE_LAYER_ID} type="raster" paint={{ "raster-opacity": opacity }} />
    </RasterSource>
  )
}
